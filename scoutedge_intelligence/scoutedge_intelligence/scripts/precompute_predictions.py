"""Precompute predictions cron script for ScoutEdge WC2026 (task P6.2).

Iterates over upcoming matches (kickoff within the next N hours), runs the
full TripleLayerEngine pipeline for each, and persists a new row in the
``predictions`` table.  The script is idempotent by design: each run always
produces a fresh row; old rows are retained for trend analysis.

Usage::

    python -m scoutedge_intelligence.scripts.precompute_predictions [OPTIONS]

    --horizon-hours  Lookahead window in hours (default: 168 / one week)
    --limit          Maximum matches to process per run (default: 64)
    --dry-run        Run the pipeline but skip all DB writes
    --match-ids      Comma-separated match IDs; ignores --horizon-hours/--limit
    --concurrency    Number of matches processed concurrently (default: 3)
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scoutedge_intelligence.db import queries
from scoutedge_intelligence.db.models import Match, MatchSchema, PredictionSchema
from scoutedge_intelligence.synthesis.engine import (
    FullPrediction,
    TripleLayerEngine,
    TripleLayerInputs,
)

logger: structlog.BoundLogger = structlog.get_logger(__name__)

DEFAULT_HORIZON_HOURS: int = 168  # one week ahead
DEFAULT_LIMIT: int = 64
DEFAULT_CONCURRENCY: int = 3


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments.

    Args:
        argv: Argument list; defaults to ``sys.argv[1:]`` when *None*.

    Returns:
        Parsed :class:`argparse.Namespace` with attributes:
        ``horizon_hours``, ``limit``, ``dry_run``, ``match_ids``,
        ``concurrency``.
    """
    parser = argparse.ArgumentParser(
        prog="precompute_predictions",
        description="Precompute triple-layer predictions for upcoming WC2026 matches.",
    )
    parser.add_argument(
        "--horizon-hours",
        type=int,
        default=DEFAULT_HORIZON_HOURS,
        dest="horizon_hours",
        help=(
            "Process matches with kickoff in [now, now+N hours] "
            f"(default: {DEFAULT_HORIZON_HOURS})."
        ),
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        dest="limit",
        help=f"Maximum number of matches to process per run (default: {DEFAULT_LIMIT}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        dest="dry_run",
        help="Run the pipeline but skip all DB writes.",
    )
    parser.add_argument(
        "--match-ids",
        type=str,
        default=None,
        dest="match_ids",
        help="Comma-separated match IDs to process; ignores --horizon-hours/--limit when set.",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=DEFAULT_CONCURRENCY,
        dest="concurrency",
        help=f"Number of matches processed concurrently (default: {DEFAULT_CONCURRENCY}).",
    )
    ns = parser.parse_args(argv)
    # Normalise match_ids to a list or None
    if ns.match_ids is not None:
        ns.match_ids = [mid.strip() for mid in ns.match_ids.split(",") if mid.strip()]
    return ns


# ---------------------------------------------------------------------------
# Query helper
# ---------------------------------------------------------------------------


async def fetch_target_matches(
    session: AsyncSession,
    *,
    horizon_hours: int,
    limit: int,
) -> list[MatchSchema]:
    """Return MatchSchema rows for upcoming (unfinished) matches within the window.

    Queries the ``matches`` table for rows where ``finished`` is *False* and
    ``kickoff_utc`` falls in ``[now, now + horizon_hours]``.

    Note: ``queries`` exposes ``list_finished_matches`` (finished=True).  A
    dedicated ``list_upcoming_matches`` helper does not yet exist; we query
    directly here following the same pattern as ``poly_snapshot.py``.

    TODO: Extract ``list_upcoming_matches(session, horizon_hours, limit)`` into
    ``scoutedge_intelligence.db.queries`` when this logic is needed by multiple
    callers.

    Args:
        session: Active async database session.
        horizon_hours: Look-ahead window in hours from now (UTC).
        limit: Maximum number of rows to return.

    Returns:
        List of :class:`MatchSchema` instances ordered by ascending kickoff.
    """
    now = datetime.now(UTC)
    cutoff = now + timedelta(hours=horizon_hours)

    result = await session.execute(
        select(Match)
        .where(Match.finished.is_(False))
        .where(Match.kickoff_utc >= now)
        .where(Match.kickoff_utc <= cutoff)
        .order_by(Match.kickoff_utc.asc())
        .limit(limit)
    )
    rows = result.scalars().all()
    logger.debug(
        "fetch_target_matches",
        count=len(rows),
        horizon_hours=horizon_hours,
        now=now.isoformat(),
        cutoff=cutoff.isoformat(),
    )
    return [MatchSchema.model_validate(r) for r in rows]


# ---------------------------------------------------------------------------
# Engine input builder
# ---------------------------------------------------------------------------


def build_engine_inputs(match: MatchSchema) -> TripleLayerInputs:
    """Map a MatchSchema row to TripleLayerInputs.

    Args:
        match: Validated match row from the database.

    Returns:
        A :class:`TripleLayerInputs` ready for ``TripleLayerEngine.predict_match``.

    Mapping notes:
        - ``home_team`` / ``away_team``: use team IDs (UUIDs) as team identifiers;
          the ML models are keyed by team ID in this codebase.
        - ``venue_city``: taken directly from ``match.venue_city``.
        - ``kickoff_iso``: ISO-8601 string derived from ``match.kickoff_utc``;
          None if the column is null.
        - ``intel_text``: always None here — intel ingestion is a separate pipeline.
        - ``wc_context``, ``sb_match_id``, ``poly_match_id``: all None; can be
          enriched in a future task.
    """
    kickoff_iso: str | None = (
        match.kickoff_utc.isoformat() if match.kickoff_utc is not None else None
    )
    return TripleLayerInputs(
        match_id=match.id,
        home_team=match.home_team_id or "",  # fallback to empty string to avoid None
        away_team=match.away_team_id or "",
        intel_text=None,  # intel ingestion is a separate pipeline
        venue_city=match.venue_city,
        kickoff_iso=kickoff_iso,
        wc_context=None,
        requested_language=None,
        sb_match_id=None,
        poly_match_id=None,
    )


# ---------------------------------------------------------------------------
# FullPrediction → PredictionSchema mapper
# ---------------------------------------------------------------------------


def _map_full_prediction(
    prediction: FullPrediction,
    inputs: TripleLayerInputs,
) -> PredictionSchema:
    """Map a FullPrediction to a PredictionSchema row ready for insertion.

    Field mapping notes (FullPrediction field → PredictionSchema field):
        ml_probs["home_win"]  → ml_home_win_prob
        ml_probs["draw"]      → ml_draw_prob
        ml_probs["away_win"]  → ml_away_win_prob
        sb_probs["home_win"]  → sb_home_win_prob
        sb_probs["draw"]      → sb_draw_prob
        sb_probs["away_win"]  → sb_away_win_prob
        poly_probs["home_win"]→ poly_home_win_prob  (None when poly absent)
        poly_probs["draw"]    → poly_draw_prob
        poly_probs["away_win"]→ poly_away_win_prob
        final_probs["home_win"] → blended_home_win_prob  (closest PredictionSchema field)
        final_probs["draw"]     → blended_draw_prob
        final_probs["away_win"] → blended_away_win_prob
        weights               → blend_weights             (JSON column)
        diagnosis is not None → claude_confidence set to 1.0 as a sentinel; see note¹
        diagnosis             → claude_key_factors        (JSON column, reused for diagnosis)
        synthesizer_raw       → ml_features              (JSON column; no dedicated field)
        confidence            → claude_narrative          (text field; closest available)
        expected_margin       → value_edge_pct            (numeric; closest semantic match)
        risk_factor           → claude_pick               (text field; closest available)
        rationale             → claude_narrative          (concatenated with confidence)
        divergence_features   → layer_divergence_score   (float; we store the max divergence)

    ¹ PredictionSchema does not have ``diagnosis_used``, ``diagnosis_payload``,
      ``weights_used``, ``synthesizer_raw``, ``confidence`` (string), ``risk_factor``
      (string), or ``rationale`` columns.  We reuse the closest existing columns and
      add inline mapping comments.  When the schema is extended these mappings
      should be migrated to dedicated columns.

    Args:
        prediction: FullPrediction output from TripleLayerEngine.
        inputs: TripleLayerInputs used to run this prediction.

    Returns:
        Populated :class:`PredictionSchema` (id=None → auto-assigned by DB).
    """
    ml = prediction.ml_probs
    sb = prediction.sb_probs
    poly = prediction.poly_probs
    final = prediction.final_probs

    # Blended / composite → final_probs is the synthesized probability vector
    blended_home = final.get("home_win")
    blended_draw = final.get("draw")
    blended_away = final.get("away_win")

    # Poly columns → None when polymarket layer was absent
    poly_home: float | None = poly.get("home_win") if poly else None
    poly_draw: float | None = poly.get("draw") if poly else None
    poly_away: float | None = poly.get("away_win") if poly else None

    # layer_divergence_score — use max divergence value from divergence_features
    div_feats = prediction.divergence_features
    layer_divergence: float | None = None
    if div_feats:
        numeric_vals = [v for v in div_feats.values() if isinstance(v, (int, float))]
        layer_divergence = max(numeric_vals) if numeric_vals else None

    # claude_narrative — concatenate confidence label + rationale (closest text column)
    # mapping: confidence (str) + rationale (str) → claude_narrative
    narrative_parts = []
    if prediction.confidence:
        narrative_parts.append(f"[{prediction.confidence}]")
    if prediction.rationale:
        narrative_parts.append(prediction.rationale)
    claude_narrative: str | None = " ".join(narrative_parts) if narrative_parts else None

    # claude_pick — reused for risk_factor (text)
    # mapping: risk_factor (str | None) → claude_pick
    claude_pick: str | None = prediction.risk_factor

    # value_edge_pct — reused for expected_margin (numeric, int → float)
    # mapping: expected_margin (int) → value_edge_pct
    value_edge_pct: float | None = float(prediction.expected_margin)

    # claude_key_factors — reused for diagnosis payload (JSON column)
    # mapping: diagnosis (dict | None) → claude_key_factors
    claude_key_factors: list[Any] | None = (
        [prediction.diagnosis] if prediction.diagnosis is not None else []
    )

    # ml_features — reused for synthesizer_raw (JSON column; no dedicated field exists)
    # mapping: synthesizer_raw (dict) → ml_features
    ml_features: dict[str, Any] | None = prediction.synthesizer_raw

    # blend_weights — weights from FullPrediction
    # mapping: weights (dict) → blend_weights
    blend_weights: dict[str, Any] | None = dict(prediction.weights)

    # claude_confidence — sentinel: 1.0 if diagnosis was present, else None
    # mapping: diagnosis is not None → claude_confidence
    claude_confidence_sentinel: float | None = 1.0 if prediction.diagnosis is not None else None

    return PredictionSchema(
        id=None,
        match_id=inputs.match_id,
        created_at=datetime.now(UTC),
        generated_at=datetime.now(UTC),
        home_win_prob=blended_home,
        draw_prob=blended_draw,
        away_win_prob=blended_away,
        predicted_home_goals=None,
        predicted_away_goals=None,
        recommended_pick=None,
        rationale_summary=claude_narrative,
        source="scoutedge",
        model_version="triple-layer-v1",
        facts_used=[],
        # ML layer
        ml_home_win_prob=ml.get("home_win"),
        ml_draw_prob=ml.get("draw"),
        ml_away_win_prob=ml.get("away_win"),
        ml_home_goals_exp=None,  # not produced by TripleLayerEngine
        ml_away_goals_exp=None,  # not produced by TripleLayerEngine
        ml_model_version=None,  # engine does not expose a version string
        ml_features=ml_features,  # reused: synthesizer_raw
        # Sportsbook layer
        sb_home_win_prob=sb.get("home_win"),
        sb_draw_prob=sb.get("draw"),
        sb_away_win_prob=sb.get("away_win"),
        sb_home_odds_dec=None,  # not available from FullPrediction
        sb_draw_odds_dec=None,
        sb_away_odds_dec=None,
        sb_source=None,
        sb_fetched_at=None,
        # Polymarket layer
        poly_home_win_prob=poly_home,
        poly_draw_prob=poly_draw,
        poly_away_win_prob=poly_away,
        poly_liquidity_usd=None,  # not available from FullPrediction
        poly_fetched_at=None,
        # Blended / composite (final_probs)
        blended_home_win_prob=blended_home,
        blended_draw_prob=blended_draw,
        blended_away_win_prob=blended_away,
        blend_weights=blend_weights,
        # Claude reasoning (reused for synthesizer outputs)
        claude_narrative=claude_narrative,  # confidence + rationale
        claude_key_factors=claude_key_factors,  # diagnosis payload list
        claude_pick=claude_pick,  # risk_factor
        claude_confidence=claude_confidence_sentinel,  # diagnosis sentinel
        claude_model_id=None,
        claude_generated_at=None,
        claude_prompt_tokens=None,
        claude_output_tokens=None,
        # Edge / value
        value_edge_pct=value_edge_pct,  # expected_margin
        recommended_bet_size=None,
        layer_divergence_score=layer_divergence,
    )


# ---------------------------------------------------------------------------
# Per-match worker
# ---------------------------------------------------------------------------


async def precompute_one(
    engine: TripleLayerEngine,
    session: AsyncSession,
    match: MatchSchema,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Run the prediction pipeline for a single match and persist the result.

    Args:
        engine: Fully-wired :class:`TripleLayerEngine` instance.
        session: Active async database session.
        match: Target match row.
        dry_run: When *True*, skip the ``insert_prediction`` DB call.

    Returns:
        Dict with keys: ``match_id``, ``ok`` (bool), ``error`` (str | None),
        ``prediction_id`` (str | None).  Never raises.
    """
    log = logger.bind(match_id=match.id)
    try:
        inputs = build_engine_inputs(match)
        prediction: FullPrediction = await engine.predict_match(inputs)
        schema = _map_full_prediction(prediction, inputs)

        prediction_id: str | None = None
        if not dry_run:
            prediction_id = await queries.insert_prediction(session, schema)
            log.info(
                "precompute_one.ok",
                prediction_id=prediction_id,
                confidence=prediction.confidence,
            )
        else:
            log.info("precompute_one.dry_run", confidence=prediction.confidence)

        return {"match_id": match.id, "ok": True, "error": None, "prediction_id": prediction_id}

    except Exception as exc:
        err_str = f"{type(exc).__name__}: {exc}"
        log.warning("precompute_one.failed", error=err_str)
        return {"match_id": match.id, "ok": False, "error": err_str, "prediction_id": None}


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


async def run(
    args: argparse.Namespace,
    *,
    engine_factory_override: Callable[[], TripleLayerEngine] | None = None,
) -> dict[str, int]:
    """Build the engine, fetch target matches, run precompute_one with bounded concurrency.

    Args:
        args: Parsed CLI args (from :func:`parse_args`).
        engine_factory_override: Injectable factory for tests; when *None*,
            :func:`_default_engine_factory` is used.

    Returns:
        Summary dict: ``{"total": int, "ok": int, "failed": int, "skipped_dry_run": int}``.
    """
    factory = (
        engine_factory_override if engine_factory_override is not None else _default_engine_factory
    )

    database_url = os.environ.get("DATABASE_URL", "")
    async_engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(async_engine, expire_on_commit=False)

    engine: TripleLayerEngine = factory()

    try:
        async with session_factory() as session:
            # Resolve target matches
            if args.match_ids:
                matches = []
                for mid in args.match_ids:
                    row = await queries.get_match(session, mid)
                    if row is not None:
                        matches.append(row)
                    else:
                        logger.warning("precompute.match_not_found", match_id=mid)
            else:
                matches = await fetch_target_matches(
                    session,
                    horizon_hours=args.horizon_hours,
                    limit=args.limit,
                )

            total = len(matches)
            logger.info("precompute.starting", total=total, dry_run=args.dry_run)

        sem = asyncio.Semaphore(args.concurrency)

        async def _bounded(match: MatchSchema) -> dict[str, Any]:
            async with sem, session_factory() as worker_session:
                return await precompute_one(
                    engine,
                    worker_session,
                    match,
                    dry_run=args.dry_run,
                )

        results = await asyncio.gather(*[_bounded(m) for m in matches])

        ok_count = sum(1 for r in results if r["ok"])
        failed_count = sum(1 for r in results if not r["ok"])
        skipped_dry_run = total if args.dry_run else 0

        summary: dict[str, int] = {
            "total": total,
            "ok": ok_count,
            "failed": failed_count,
            "skipped_dry_run": skipped_dry_run,
        }
        logger.info("precompute.done", **summary)
        return summary

    finally:
        await async_engine.dispose()


# ---------------------------------------------------------------------------
# Default engine factory (wires real collaborators; not called during tests)
# ---------------------------------------------------------------------------


def _default_engine_factory() -> TripleLayerEngine:  # pragma: no cover
    """Build a fully-wired TripleLayerEngine using environment variables.

    This factory is intentionally placed below ``run()`` so that the module's
    top-level import does NOT instantiate any live clients (Anthropic, Polymarket,
    etc.).  Tests inject ``engine_factory_override`` instead.

    Required environment variables:
        - ``ANTHROPIC_API_KEY``
        - ``ODDS_API_KEY``
        - ``DATABASE_URL``

    Optional:
        - ``POLYMARKET_API_URL``
    """
    from scoutedge_intelligence.analyst.divergence import DivergenceAnalyst
    from scoutedge_intelligence.analyst.triggers import TriggerConfig
    from scoutedge_intelligence.claude.feature_generator import FeatureGenerator
    from scoutedge_intelligence.claude.translator import Translator
    from scoutedge_intelligence.models.dixon_coles import DixonColesModel
    from scoutedge_intelligence.models.elo import FootballELO
    from scoutedge_intelligence.models.wc_adjustments import WCAdjustmentLayer
    from scoutedge_intelligence.sources.polymarket import PolymarketClient
    from scoutedge_intelligence.sources.sportsbook import SportsbookClient
    from scoutedge_intelligence.synthesis.synthesizer import JSONSynthesizer

    elo = FootballELO()
    dc = DixonColesModel()
    wc = WCAdjustmentLayer()
    polymarket = PolymarketClient()
    sportsbook = SportsbookClient(api_key=os.environ["ODDS_API_KEY"])
    feature_gen = FeatureGenerator()
    analyst = DivergenceAnalyst()
    synthesizer = JSONSynthesizer()
    translator = Translator()

    return TripleLayerEngine(
        elo=elo,
        dixon_coles=dc,
        wc_adjuster=wc,
        polymarket=polymarket,
        sportsbook=sportsbook,
        feature_generator=feature_gen,
        analyst=analyst,
        synthesizer=synthesizer,
        translator=translator,
        trigger_config=TriggerConfig(),
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    """CLI entry point.  Returns an exit code (0 = success, 1 = any failure).

    Returns:
        Integer exit code suitable for ``sys.exit``.
    """
    args = parse_args()
    summary = asyncio.run(run(args))
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
