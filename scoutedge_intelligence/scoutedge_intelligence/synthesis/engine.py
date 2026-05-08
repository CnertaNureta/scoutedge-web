"""TripleLayerEngine — top-level orchestrator for the WC2026 prediction pipeline.

This module wires together every layer in the system:

    1. ML layer (Football ELO + Dixon-Coles + optional WC adjustment)
    2. Polymarket layer (optional; soft-fail)
    3. Sportsbook layer (soft-fail; uniform 1/3 fallback when no data)
    4. Claude Role 1 (Feature Generator, Haiku)            — soft-fail
    5. Divergence feature computation (pure)
    6. Analyst trigger gate + Claude Role 2 (Analyst, Sonnet) — soft-fail
    7. Adaptive weighting + Claude Role 3 (Synthesizer, Sonnet) — required
    8. Optional Claude Role 4 (Translator, Haiku)            — soft-fail

The single public entry point :meth:`TripleLayerEngine.predict_match` returns a
fully-validated :class:`FullPrediction` containing every layer's output so that
downstream API routes (e.g. P5.* FastAPI endpoints) can render the response
without having to re-call any sub-component.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import httpx
import structlog
from pydantic import BaseModel, Field

from scoutedge_intelligence.analyst.divergence import (
    AnalystInput,
    AnalystOutput,
    DivergenceAnalyst,
)
from scoutedge_intelligence.analyst.triggers import (
    TriggerConfig,
    should_invoke_analyst,
)
from scoutedge_intelligence.claude.feature_generator import (
    FeatureGenerator,
    FeatureGenInput,
)
from scoutedge_intelligence.claude.translator import Translator
from scoutedge_intelligence.features.divergence import compute_divergence_features
from scoutedge_intelligence.models.dixon_coles import DixonColesModel
from scoutedge_intelligence.models.elo import FootballELO
from scoutedge_intelligence.models.wc_adjustments import (
    WCAdjustmentLayer,
    WCMatchContext,
)
from scoutedge_intelligence.sources.polymarket import PolymarketClient
from scoutedge_intelligence.sources.sportsbook import OddsAPIError, SportsbookClient
from scoutedge_intelligence.synthesis.synthesizer import (
    JSONSynthesizer,
    SynthesizerInput,
)
from scoutedge_intelligence.synthesis.weights import (
    WeightInputs,
)
from scoutedge_intelligence.synthesis.weights import (
    synthesize as synthesize_weighted,
)

if TYPE_CHECKING:  # pragma: no cover
    from scoutedge_intelligence.synthesis.synthesizer import SynthesisResult


logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# ML layer is a 50/50 blend of ELO and Dixon-Coles base probabilities. Both
# models are sound but capture complementary signal (ratings vs scoring rate).
_ELO_BLEND_WEIGHT: float = 0.5
_DC_BLEND_WEIGHT: float = 0.5

# Uniform 1X2 distribution returned by the sportsbook layer when The Odds API
# has no data for a match yet (mirrors the Polymarket soft-fail and the
# Dixon-Coles unfitted-fallback patterns). Callers receive a copy.
_UNIFORM_PROBS: dict[str, float] = {
    "home_win": 1 / 3,
    "draw": 1 / 3,
    "away_win": 1 / 3,
}


# ---------------------------------------------------------------------------
# Public Pydantic models
# ---------------------------------------------------------------------------


class TripleLayerInputs(BaseModel):
    """Inputs accepted by :meth:`TripleLayerEngine.predict_match`."""

    match_id: str
    home_team: str
    away_team: str
    intel_text: str | None = None
    venue_city: str | None = None
    kickoff_iso: str | None = None
    wc_context: dict[str, Any] | None = None
    requested_language: str | None = None
    sb_match_id: str | None = None
    poly_match_id: str | None = None


class FullPrediction(BaseModel):
    """Validated output of the full triple-layer pipeline."""

    match_id: str
    final_probs: dict[str, float]
    ml_probs: dict[str, float]
    sb_probs: dict[str, float]
    poly_probs: dict[str, float] | None
    weights: dict[str, float]
    diagnosis: dict[str, Any] | None
    synthesizer_raw: dict[str, Any]
    confidence: str
    expected_margin: int
    risk_factor: str | None
    rationale: str
    flags: list[str] = Field(default_factory=list)
    feature_generator_output: dict[str, Any] | None
    divergence_features: dict[str, Any]
    explanation_text: str | None


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


class TripleLayerEngine:
    """Orchestrates ML, market, and Claude layers into a single prediction."""

    def __init__(
        self,
        *,
        elo: FootballELO,
        dixon_coles: DixonColesModel,
        wc_adjuster: WCAdjustmentLayer | None = None,
        polymarket: PolymarketClient | None = None,
        sportsbook: SportsbookClient,
        feature_generator: FeatureGenerator | None = None,
        analyst: DivergenceAnalyst | None = None,
        synthesizer: JSONSynthesizer,
        translator: Translator | None = None,
        trigger_config: TriggerConfig | None = None,
    ) -> None:
        """Construct the engine.

        Required collaborators are ``elo``, ``dixon_coles``, ``sportsbook``,
        and ``synthesizer``. All other layers are optional; when omitted the
        engine degrades gracefully (skipping that step and recording the
        decision via structlog).
        """
        self._elo = elo
        self._dc = dixon_coles
        self._wc = wc_adjuster
        self._poly = polymarket
        self._sb = sportsbook
        self._feature_gen = feature_generator
        self._analyst = analyst
        self._synthesizer = synthesizer
        self._translator = translator
        self._trigger_config = trigger_config or TriggerConfig()

        logger.info(
            "triple_layer_engine.init",
            has_wc_adjuster=wc_adjuster is not None,
            has_polymarket=polymarket is not None,
            has_feature_generator=feature_generator is not None,
            has_analyst=analyst is not None,
            has_translator=translator is not None,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def predict_match(self, inputs: TripleLayerInputs) -> FullPrediction:
        """Run the full pipeline for a single match.

        Args:
            inputs: All fields needed to run the pipeline. ``match_id`` is the
                canonical id and is also used as the default Polymarket /
                Sportsbook id when ``poly_match_id`` / ``sb_match_id`` are
                not supplied.

        Returns:
            A :class:`FullPrediction` containing every layer's output.

        Raises:
            Exception: Propagates from the Synthesizer (the only remaining
                hard-fail layer); ML, Polymarket, and Sportsbook failures are
                caught and the layer degrades gracefully (uniform fallback for
                Sportsbook, ``None`` for Polymarket).
        """
        log = logger.bind(match_id=inputs.match_id)

        # ---- Step 1: ML layer ---------------------------------------------
        log.info("triple_layer.step", step=1, name="ml_layer")
        ml_probs = self._run_ml_layer(inputs)

        # ---- Step 2: Polymarket layer (soft-fail) -------------------------
        log.info("triple_layer.step", step=2, name="polymarket")
        poly_probs, poly_metadata = await self._fetch_polymarket(inputs)

        # ---- Step 3: Sportsbook layer (hard-fail) -------------------------
        log.info("triple_layer.step", step=3, name="sportsbook")
        sb_probs, sb_books_used = await self._fetch_sportsbook(inputs)

        # ---- Step 4: Feature generator (soft-fail) ------------------------
        log.info("triple_layer.step", step=4, name="feature_generator")
        feature_generator_output = await self._run_feature_generator(inputs)
        context_intel: dict[str, Any] = (
            dict(feature_generator_output) if feature_generator_output else {}
        )

        # ---- Step 5: Divergence features ---------------------------------
        log.info("triple_layer.step", step=5, name="divergence_features")
        divergence_features = compute_divergence_features(
            ml=ml_probs,
            sb=sb_probs,
            poly=poly_probs,
            poly_volume_24h=(poly_metadata.get("volume_24h") if poly_metadata else None),
            poly_bid_ask_spread=(poly_metadata.get("bid_ask_spread") if poly_metadata else None),
        )

        # ---- Step 6: Analyst trigger + run (soft-fail) -------------------
        log.info("triple_layer.step", step=6, name="analyst")
        diagnosis = await self._maybe_run_analyst(
            ml_probs=ml_probs,
            sb_probs=sb_probs,
            poly_probs=poly_probs,
            divergence_features=divergence_features,
            poly_metadata=poly_metadata,
            context_intel=context_intel,
        )

        # ---- Step 7: Adaptive weights ------------------------------------
        log.info("triple_layer.step", step=7, name="weights")
        weighted = synthesize_weighted(
            ml=ml_probs,
            sb=sb_probs,
            poly=poly_probs,
            inputs=WeightInputs(
                ml_max_prob=max(ml_probs.values()),
                sb_books_used=max(1, sb_books_used),
                poly_volume_24h=(poly_metadata.get("volume_24h") if poly_metadata else None),
                poly_bid_ask_spread=(
                    poly_metadata.get("bid_ask_spread") if poly_metadata else None
                ),
                poly_present=poly_probs is not None,
            ),
        )

        # ---- Step 8: JSON Synthesizer (Claude Role 3, required) ----------
        log.info("triple_layer.step", step=8, name="synthesizer")
        synthesis = await self._synthesizer.synthesize(
            SynthesizerInput(
                ml=ml_probs,
                sb=sb_probs,
                poly=poly_probs,
                diagnosis=diagnosis,
                polymarket_metadata=poly_metadata,
                divergence_features=divergence_features,
                context_intel=context_intel,
            )
        )

        # ---- Step 9: Translator (Claude Role 4, soft-fail) ---------------
        explanation_text: str | None = None
        if inputs.requested_language and self._translator is not None:
            log.info("triple_layer.step", step=9, name="translator")
            explanation_text = await self._maybe_translate(
                synthesis=synthesis,
                language=inputs.requested_language,
            )

        # ---- Assemble ----------------------------------------------------
        return FullPrediction(
            match_id=inputs.match_id,
            final_probs=synthesis.final_probs,
            ml_probs=ml_probs,
            sb_probs=sb_probs,
            poly_probs=poly_probs,
            weights=synthesis.weights_used,
            diagnosis=diagnosis,
            synthesizer_raw={
                "final_probs": synthesis.final_probs,
                "confidence": synthesis.confidence,
                "expected_margin": synthesis.expected_margin,
                "risk_factor": synthesis.risk_factor,
                "weights_used": synthesis.weights_used,
                "rationale": synthesis.rationale,
                "flags": synthesis.flags,
                "weighted_probs": weighted.final_probs,
                "weighted_weights": weighted.weights,
                "weighted_notes": weighted.notes,
            },
            confidence=synthesis.confidence,
            expected_margin=synthesis.expected_margin,
            risk_factor=synthesis.risk_factor,
            rationale=synthesis.rationale,
            flags=list(synthesis.flags),
            feature_generator_output=(
                dict(feature_generator_output) if feature_generator_output else None
            ),
            divergence_features=dict(divergence_features),
            explanation_text=explanation_text,
        )

    async def aclose(self) -> None:
        """Close any owned async clients (Polymarket and Sportsbook)."""
        if self._poly is not None:
            try:
                await self._poly.aclose()
            except Exception as exc:  # pragma: no cover — defensive
                logger.warning("triple_layer.poly_close_failed", error=str(exc))
        try:
            await self._sb.aclose()
        except Exception as exc:  # pragma: no cover — defensive
            logger.warning("triple_layer.sb_close_failed", error=str(exc))

    # ------------------------------------------------------------------
    # Step implementations
    # ------------------------------------------------------------------

    def _run_ml_layer(self, inputs: TripleLayerInputs) -> dict[str, float]:
        """Compute the in-process ML probability vector.

        Strategy:
          - Compute ELO probabilities for the fixture.
          - Compute Dixon-Coles 1X2 probabilities, explicitly using the
            uniform fallback when fitted parameters are unavailable for this
            production pipeline path.
          - Average the two distributions 50/50.
          - If a WC context is supplied, apply the WC adjustment layer.
        """
        elo_probs = self._elo.predict_outcomes(inputs.home_team, inputs.away_team)
        dc_probs = self._dc.predict_1x2(
            inputs.home_team,
            inputs.away_team,
            fallback_mode=True,
        )

        blended: dict[str, float] = {
            key: (_ELO_BLEND_WEIGHT * elo_probs[key] + _DC_BLEND_WEIGHT * dc_probs[key])
            for key in ("home_win", "draw", "away_win")
        }
        total = sum(blended.values())
        ml_probs = {k: v / total for k, v in blended.items()} if total > 0 else blended

        if self._wc is not None and inputs.wc_context is not None:
            ctx = WCMatchContext(**inputs.wc_context)
            ml_probs = self._wc.adjust_probabilities(ml_probs, ctx)

        return ml_probs

    async def _fetch_polymarket(
        self, inputs: TripleLayerInputs
    ) -> tuple[dict[str, float] | None, dict[str, Any] | None]:
        """Fetch Polymarket probabilities and metadata; soft-fail to None."""
        if self._poly is None:
            return None, None

        market_id = inputs.poly_match_id or inputs.match_id
        try:
            raw = await self._poly.fetch_market(market_id)
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning(
                "triple_layer.polymarket_failed",
                match_id=inputs.match_id,
                error=str(exc),
            )
            return None, None

        probs: dict[str, float] = {
            "home_win": float(raw["prob_home"]),
            "draw": float(raw["prob_draw"]),
            "away_win": float(raw["prob_away"]),
        }
        metadata: dict[str, Any] = {
            "liquidity": raw.get("liquidity", 0.0),
            "volume_24h": raw.get("volume_24h", 0.0),
            "bid_ask_spread": raw.get("bid_ask_spread", 0.0),
            "age_h": raw.get("age_h"),
        }
        return probs, metadata

    async def _fetch_sportsbook(self, inputs: TripleLayerInputs) -> tuple[dict[str, float], int]:
        """Fetch sportsbook consensus; soft-fail to a uniform 1X2 fallback.

        Mirrors the Polymarket soft-fail pattern. When The Odds API has no
        data for the match yet (or any transient HTTP / parse error occurs),
        we degrade to a uniform 1/3 distribution and signal ``books_used=0``
        so downstream weighting can de-emphasise the sportsbook layer.
        """
        match_id = inputs.sb_match_id or inputs.match_id
        try:
            raw = await self._sb.fetch_consensus(match_id)
        except (httpx.HTTPError, OddsAPIError, ValueError, KeyError) as exc:
            logger.warning(
                "triple_layer.sportsbook_failed_soft",
                match_id=inputs.match_id,
                error=str(exc),
                sb_layer_status="fallback",
            )
            return _UNIFORM_PROBS.copy(), 0

        probs: dict[str, float] = {
            "home_win": float(raw["prob_home"]),
            "draw": float(raw["prob_draw"]),
            "away_win": float(raw["prob_away"]),
        }
        books_used_raw = raw.get("books_used") or []
        books_used = len(books_used_raw) if isinstance(books_used_raw, list) else 1
        return probs, books_used

    async def _run_feature_generator(self, inputs: TripleLayerInputs) -> dict[str, Any] | None:
        """Run the Claude Role-1 feature generator; soft-fail to None."""
        if self._feature_gen is None or not inputs.intel_text:
            return None

        try:
            output = await self._feature_gen.generate(
                FeatureGenInput(
                    home_team=inputs.home_team,
                    away_team=inputs.away_team,
                    intel_text=inputs.intel_text,
                    venue_city=inputs.venue_city,
                    kickoff_iso=inputs.kickoff_iso,
                )
            )
        except Exception as exc:
            logger.warning(
                "triple_layer.feature_generator_failed",
                match_id=inputs.match_id,
                error=str(exc),
            )
            return None

        return output.model_dump()

    async def _maybe_run_analyst(
        self,
        *,
        ml_probs: dict[str, float],
        sb_probs: dict[str, float],
        poly_probs: dict[str, float] | None,
        divergence_features: dict[str, Any],
        poly_metadata: dict[str, Any] | None,
        context_intel: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Apply trigger gate and optionally run the Analyst (Role 2)."""
        decision = should_invoke_analyst(divergence_features, self._trigger_config)
        if not decision.invoke or self._analyst is None:
            logger.info(
                "triple_layer.analyst_skipped",
                invoke=decision.invoke,
                reasons=list(decision.reasons),
                priority=decision.estimated_priority,
            )
            return None

        try:
            output: AnalystOutput = await self._analyst.diagnose(
                AnalystInput(
                    ml=ml_probs,
                    sb=sb_probs,
                    poly=poly_probs,
                    triggered_signals=list(decision.triggered_signals),
                    divergence_metrics=dict(divergence_features),
                    polymarket_metadata=poly_metadata,
                    context_intel=context_intel,
                    ml_metadata={"layer": "elo+dixon_coles"},
                )
            )
        except Exception as exc:
            logger.warning("triple_layer.analyst_failed", error=str(exc))
            return None

        return output.model_dump()

    async def _maybe_translate(
        self,
        *,
        synthesis: SynthesisResult,
        language: str,
    ) -> str | None:
        """Run the Translator (Role 4); soft-fail to None."""
        assert self._translator is not None

        payload: dict[str, Any] = {
            "final_probs": synthesis.final_probs,
            "confidence": synthesis.confidence,
            "expected_margin": synthesis.expected_margin,
            "risk_factor": synthesis.risk_factor,
            "rationale": synthesis.rationale,
            "weights_used": synthesis.weights_used,
            "flags": list(synthesis.flags),
        }
        try:
            return await self._translator.translate(payload, language=language)
        except Exception as exc:
            logger.warning(
                "triple_layer.translator_failed",
                language=language,
                error=str(exc),
            )
            return None
