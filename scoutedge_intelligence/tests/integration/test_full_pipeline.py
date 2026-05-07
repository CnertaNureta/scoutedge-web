"""Integration tests for :class:`TripleLayerEngine` (P3.9).

All external collaborators (Polymarket, Sportsbook, Feature Generator,
Analyst, Synthesizer, Translator) are mocked. The ML layer uses a real
:class:`FootballELO` and a manually-constructed :class:`DixonColesParams`
so the test does not call ``DixonColesModel.fit`` (slow, requires data).
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from scoutedge_intelligence.analyst.divergence import AnalystOutput
from scoutedge_intelligence.analyst.triggers import TriggerConfig
from scoutedge_intelligence.models.dixon_coles import (
    DixonColesModel,
    DixonColesParams,
)
from scoutedge_intelligence.models.elo import FootballELO
from scoutedge_intelligence.models.wc_adjustments import WCAdjustmentLayer
from scoutedge_intelligence.synthesis.engine import (
    FullPrediction,
    TripleLayerEngine,
    TripleLayerInputs,
)
from scoutedge_intelligence.synthesis.synthesizer import SynthesisResult

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

HOME = "Brazil"
AWAY = "Germany"


@pytest.fixture(scope="module")
def elo() -> FootballELO:
    """Real ELO with a small differential between the two test teams."""
    rater = FootballELO()
    # Seed ratings so predictions are deterministic and not equal.
    rater._ratings[HOME] = 1820.0
    rater._ratings[AWAY] = 1700.0
    return rater


@pytest.fixture(scope="module")
def dixon_coles() -> DixonColesModel:
    """Real DC model with hand-built params (skip the expensive fit step)."""
    params = DixonColesParams(
        attack={HOME: 0.30, AWAY: 0.10},
        defense={HOME: -0.15, AWAY: 0.05},
        home_advantage=0.20,
        rho=-0.10,
    )
    return DixonColesModel(params=params)


@pytest.fixture
def mock_sportsbook() -> MagicMock:
    sb = MagicMock()
    sb.fetch_consensus = AsyncMock(
        return_value={
            "prob_home": 0.55,
            "prob_draw": 0.25,
            "prob_away": 0.20,
            "books_used": ["pinnacle", "bet365", "williamhill"],
            "vig_removed": True,
        }
    )
    sb.aclose = AsyncMock()
    return sb


@pytest.fixture
def mock_polymarket() -> MagicMock:
    poly = MagicMock()
    poly.fetch_market = AsyncMock(
        return_value={
            "prob_home": 0.50,
            "prob_draw": 0.27,
            "prob_away": 0.23,
            "liquidity": 75_000.0,
            "volume_24h": 120_000.0,
            "bid_ask_spread": 0.01,
            "raw": {},
        }
    )
    poly.aclose = AsyncMock()
    return poly


def _make_synth_result() -> SynthesisResult:
    return SynthesisResult(
        final_probs={"home_win": 0.54, "draw": 0.26, "away_win": 0.20},
        confidence="medium",
        expected_margin=2,
        risk_factor="Primary cause: SHARP_MONEY_MOVE",
        weights_used={"ml": 0.40, "sb": 0.45, "poly": 0.15},
        rationale="Confidence: MEDIUM. Cause: SHARP_MONEY_MOVE.",
        flags=["SHARP_MONEY_MOVE"],
    )


@pytest.fixture
def mock_synthesizer() -> MagicMock:
    s = MagicMock()
    s.synthesize = AsyncMock(return_value=_make_synth_result())
    return s


@pytest.fixture
def mock_feature_generator() -> MagicMock:
    fg = MagicMock()
    out = MagicMock()
    out.model_dump = MagicMock(
        return_value={
            "home_key_player_availability": 0.95,
            "away_key_player_availability": 0.80,
            "home_lineup_certainty": 0.90,
            "away_lineup_certainty": 0.85,
            "weather_adversity": 0.10,
            "home_travel_fatigue": 0.05,
            "away_travel_fatigue": 0.45,
            "crowd_advantage": 0.70,
            "intel_confidence": 0.75,
        }
    )
    fg.generate = AsyncMock(return_value=out)
    return fg


def _make_analyst_output() -> AnalystOutput:
    return AnalystOutput(
        polymarket_reliability="high",
        ml_staleness_risk="low",
        sb_signal_quality="high",
        largest_gap_leg="home",
        largest_gap_pair="ml_sb",
        primary_cause="SHARP_MONEY_MOVE",
        cause_confidence=0.7,
        source_trust_ranking=["sportsbook", "ml", "polymarket"],
        ml_weight_adjustment=-0.05,
        sb_weight_adjustment=0.05,
        pm_weight_adjustment=0.0,
        unexpected_trigger=False,
        diagnosis_notes="test",
    )


@pytest.fixture
def mock_analyst() -> MagicMock:
    a = MagicMock()
    a.diagnose = AsyncMock(return_value=_make_analyst_output())
    return a


@pytest.fixture
def mock_translator() -> MagicMock:
    t = MagicMock()
    t.translate = AsyncMock(return_value="yu ce: ba xi sheng, zhong deng zhi xin du.")
    return t


@pytest.fixture
def force_invoke_trigger_config() -> TriggerConfig:
    """Force the analyst trigger gate to ALWAYS invoke for full-path coverage."""
    # Setting AGREEMENT_SKIP_THRESHOLD above 1.0 makes consensus_skip
    # unreachable (agreement_score is bounded by 1.0), so the trigger
    # always falls through to the always_on_fallback path.
    return TriggerConfig(AGREEMENT_SKIP_THRESHOLD=1.5)


@pytest.fixture
def force_skip_trigger_config() -> TriggerConfig:
    """Force the analyst trigger gate to always skip (consensus_skip)."""
    # AGREEMENT_SKIP_THRESHOLD just below 1.0 means even tiny disagreement
    # still skips — provided actual three_way_agreement_score >= threshold.
    # We instead disable the analyst entirely via flag.
    return TriggerConfig(ANALYST_ENABLED=False)


def _basic_inputs(**overrides: Any) -> TripleLayerInputs:
    base: dict[str, Any] = {
        "match_id": "match-123",
        "home_team": HOME,
        "away_team": AWAY,
        "intel_text": "Brazil's Neymar fit; Germany's Kroos doubtful.",
        "venue_city": "Mexico City",
        "kickoff_iso": "2026-06-15T20:00:00Z",
    }
    base.update(overrides)
    return TripleLayerInputs(**base)


def _make_engine(
    *,
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    sportsbook: MagicMock,
    synthesizer: MagicMock,
    polymarket: MagicMock | None = None,
    feature_generator: MagicMock | None = None,
    analyst: MagicMock | None = None,
    translator: MagicMock | None = None,
    wc_adjuster: WCAdjustmentLayer | None = None,
    trigger_config: TriggerConfig | None = None,
) -> TripleLayerEngine:
    return TripleLayerEngine(
        elo=elo,
        dixon_coles=dixon_coles,
        wc_adjuster=wc_adjuster,
        polymarket=polymarket,  # type: ignore[arg-type]
        sportsbook=sportsbook,  # type: ignore[arg-type]
        feature_generator=feature_generator,  # type: ignore[arg-type]
        analyst=analyst,  # type: ignore[arg-type]
        synthesizer=synthesizer,  # type: ignore[arg-type]
        translator=translator,  # type: ignore[arg-type]
        trigger_config=trigger_config,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_full_happy_path(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_polymarket: MagicMock,
    mock_synthesizer: MagicMock,
    mock_feature_generator: MagicMock,
    mock_analyst: MagicMock,
    mock_translator: MagicMock,
    force_invoke_trigger_config: TriggerConfig,
) -> None:
    """All four Claude roles fire and FullPrediction is fully populated."""
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        polymarket=mock_polymarket,
        feature_generator=mock_feature_generator,
        analyst=mock_analyst,
        translator=mock_translator,
        trigger_config=force_invoke_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs(requested_language="zh"))

    assert isinstance(result, FullPrediction)
    assert result.match_id == "match-123"
    assert set(result.final_probs.keys()) == {"home_win", "draw", "away_win"}
    assert abs(sum(result.final_probs.values()) - 1.0) < 1e-6
    assert result.poly_probs is not None
    assert result.diagnosis is not None
    assert result.feature_generator_output is not None
    assert result.explanation_text == "yu ce: ba xi sheng, zhong deng zhi xin du."
    assert result.confidence == "medium"
    # All four Claude roles called exactly once
    mock_feature_generator.generate.assert_awaited_once()
    mock_analyst.diagnose.assert_awaited_once()
    mock_synthesizer.synthesize.assert_awaited_once()
    mock_translator.translate.assert_awaited_once()


async def test_polymarket_failure_soft_fails(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_polymarket: MagicMock,
    mock_synthesizer: MagicMock,
    mock_analyst: MagicMock,
    force_invoke_trigger_config: TriggerConfig,
) -> None:
    """Polymarket HTTPError → poly_probs=None and pipeline continues."""
    mock_polymarket.fetch_market = AsyncMock(side_effect=httpx.ConnectError("boom"))
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        polymarket=mock_polymarket,
        analyst=mock_analyst,
        trigger_config=force_invoke_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs())

    assert result.poly_probs is None
    # Analyst still receives poly=None gracefully
    if mock_analyst.diagnose.await_count > 0:
        kwargs = mock_analyst.diagnose.await_args.args[0]
        assert kwargs.poly is None


async def test_trigger_skip_yields_no_diagnosis(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_synthesizer: MagicMock,
    mock_analyst: MagicMock,
    force_skip_trigger_config: TriggerConfig,
) -> None:
    """When the trigger says skip, diagnosis must be None and analyst not called."""
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        analyst=mock_analyst,
        trigger_config=force_skip_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs())

    assert result.diagnosis is None
    mock_analyst.diagnose.assert_not_awaited()


async def test_feature_generator_off(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_synthesizer: MagicMock,
    force_skip_trigger_config: TriggerConfig,
) -> None:
    """No feature generator → feature_generator_output=None and context_intel={}."""
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        feature_generator=None,
        trigger_config=force_skip_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs())

    assert result.feature_generator_output is None
    # Synthesizer should have received an empty context_intel dict
    payload = mock_synthesizer.synthesize.await_args.args[0]
    assert payload.context_intel == {}


async def test_wc_context_changes_ml_probs(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_synthesizer: MagicMock,
    force_skip_trigger_config: TriggerConfig,
) -> None:
    """Providing a punishing WC context shifts ml_probs vs the no-context baseline."""
    wc_adjuster = WCAdjustmentLayer()

    # Baseline (no WC context)
    engine_a = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        wc_adjuster=wc_adjuster,
        trigger_config=force_skip_trigger_config,
    )
    baseline = await engine_a.predict_match(_basic_inputs())

    # With high-altitude / heat / travel context for the home team
    wc_ctx = {
        "venue_city": "La Paz",
        "altitude_m": 3640,
        "temperature_c": 32.0,
        "humidity_pct": 70.0,
        "home_team_base_altitude": 0,
        "away_team_base_altitude": 3000,
        "home_team_pressing_intensity": 0.9,
        "away_team_pressing_intensity": 0.4,
        "home_team_travel_km": 9000,
        "away_team_travel_km": 100,
        "home_team_rest_days": 2,
        "away_team_rest_days": 5,
        "stage": "knockout",
    }
    engine_b = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        wc_adjuster=wc_adjuster,
        trigger_config=force_skip_trigger_config,
    )
    adjusted = await engine_b.predict_match(_basic_inputs(wc_context=wc_ctx))

    # Home team should be measurably penalised under the harsh WC context.
    assert adjusted.ml_probs["home_win"] < baseline.ml_probs["home_win"]


async def test_translator_with_chinese(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_synthesizer: MagicMock,
    mock_translator: MagicMock,
    force_skip_trigger_config: TriggerConfig,
) -> None:
    """Requesting language='zh' produces a non-empty explanation_text."""
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        translator=mock_translator,
        trigger_config=force_skip_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs(requested_language="zh"))

    assert result.explanation_text is not None
    assert len(result.explanation_text) > 0
    mock_translator.translate.assert_awaited_once()
    # Verify language was passed correctly
    assert mock_translator.translate.await_args.kwargs["language"] == "zh"


async def test_translator_omitted(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_synthesizer: MagicMock,
    mock_translator: MagicMock,
    force_skip_trigger_config: TriggerConfig,
) -> None:
    """Translator stays untouched when requested_language is None."""
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        translator=mock_translator,
        trigger_config=force_skip_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs(requested_language=None))

    assert result.explanation_text is None
    mock_translator.translate.assert_not_awaited()


async def test_aclose_closes_clients(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_polymarket: MagicMock,
    mock_synthesizer: MagicMock,
) -> None:
    """aclose() awaits aclose on both Polymarket and Sportsbook."""
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        polymarket=mock_polymarket,
    )
    await engine.aclose()

    mock_polymarket.aclose.assert_awaited_once()
    mock_sportsbook.aclose.assert_awaited_once()


async def test_translator_failure_soft_fails(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_synthesizer: MagicMock,
    mock_translator: MagicMock,
    force_skip_trigger_config: TriggerConfig,
) -> None:
    """Translator raising → explanation_text=None, pipeline still returns."""
    mock_translator.translate = AsyncMock(side_effect=RuntimeError("translator down"))
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        translator=mock_translator,
        trigger_config=force_skip_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs(requested_language="en"))

    assert result.explanation_text is None
    # Other layers must still have produced their outputs
    assert result.confidence == "medium"


async def test_feature_generator_failure_soft_fails(
    elo: FootballELO,
    dixon_coles: DixonColesModel,
    mock_sportsbook: MagicMock,
    mock_synthesizer: MagicMock,
    mock_feature_generator: MagicMock,
    force_skip_trigger_config: TriggerConfig,
) -> None:
    """Feature generator raising → feature_generator_output=None and context_intel={}."""
    mock_feature_generator.generate = AsyncMock(side_effect=RuntimeError("haiku down"))
    engine = _make_engine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=mock_sportsbook,
        synthesizer=mock_synthesizer,
        feature_generator=mock_feature_generator,
        trigger_config=force_skip_trigger_config,
    )
    result = await engine.predict_match(_basic_inputs())

    assert result.feature_generator_output is None
    payload = mock_synthesizer.synthesize.await_args.args[0]
    assert payload.context_intel == {}
