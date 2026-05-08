"""Post-match attribution cron script for ScoutEdge WC2026.

Designed to be run every 30 minutes by GitHub Actions.  For each finished
match that does not yet have a ``prediction_audit`` row, the script:

1. Fetches the latest prediction for that match.
2. Builds an :class:`AttributionInput` from the match outcome + prediction.
3. Calls :func:`generate_attribution` to produce an :class:`AttributionReport`.
4. Persists the result via :func:`update_prediction_audit`.

Usage
-----
    python -m scoutedge_intelligence.scripts.run_attribution
    python -m scoutedge_intelligence.scripts.run_attribution --lookback-hours 24
    python -m scoutedge_intelligence.scripts.run_attribution --match-id <uuid>
    python -m scoutedge_intelligence.scripts.run_attribution --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import os
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scoutedge_intelligence.audit.attribution import (
    AttributionInput,
    AttributionReport,
    ProbDict,
    generate_attribution,
)
from scoutedge_intelligence.db.models import (
    MatchSchema,
    PredictionAuditSchema,
    PredictionSchema,
)
from scoutedge_intelligence.db.queries import (
    get_latest_prediction,
    get_match,
    list_finished_matches,
    update_prediction_audit,
)
from scoutedge_intelligence.utils.db_urls import coerce_async_database_url

logger = structlog.get_logger(__name__)

DEFAULT_LOOKBACK_HOURS: int = 72
DEFAULT_LIMIT: int = 200


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for the attribution cron script.

    Parameters
    ----------
    argv:
        Explicit argument list (useful for testing); uses ``sys.argv`` when
        ``None``.

    Returns
    -------
    argparse.Namespace
        Parsed arguments with fields:
        - ``lookback_hours`` (int)
        - ``limit`` (int)
        - ``dry_run`` (bool)
        - ``match_id`` (str | None)
    """
    parser = argparse.ArgumentParser(
        prog="run_attribution",
        description="Post-match attribution cron script for ScoutEdge WC2026.",
    )
    parser.add_argument(
        "--lookback-hours",
        type=int,
        default=DEFAULT_LOOKBACK_HOURS,
        help=f"Look back this many hours for finished matches (default: {DEFAULT_LOOKBACK_HOURS}).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Maximum number of matches to process per run (default: {DEFAULT_LIMIT}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Generate attribution reports but skip persistence.",
    )
    parser.add_argument(
        "--match-id",
        type=str,
        default=None,
        help="Process only this specific match UUID (skips lookback query).",
    )
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


async def find_pending_matches(
    session: AsyncSession,
    *,
    since: datetime,
    limit: int,
) -> list[MatchSchema]:
    """Return finished matches that do not yet have a prediction_audit row.

    Uses :func:`~scoutedge_intelligence.db.queries.list_finished_matches` to
    fetch candidates, then filters in-process against existing audit rows.

    .. todo::
        Replace the in-process filter with a server-side LEFT JOIN / NOT EXISTS
        query once a ``list_finished_matches_without_audit`` helper is added to
        ``queries.py``.  The current approach is correct but performs an
        additional round-trip to check each match's audit status for large
        batch sizes.

    Parameters
    ----------
    session:
        Active async SQLAlchemy session.
    since:
        Only consider matches finished on or after this timestamp.
    limit:
        Maximum number of candidates to return.

    Returns
    -------
    list[MatchSchema]
        Matches that are finished and lack an audit row.
    """
    from sqlalchemy import select

    from scoutedge_intelligence.db.models import PredictionAudit

    candidates = await list_finished_matches(session, since=since, limit=limit)
    if not candidates:
        return []

    candidate_ids = [m.id for m in candidates]

    # Fetch existing audit match_ids in one query
    result = await session.execute(
        select(PredictionAudit.match_id).where(PredictionAudit.match_id.in_(candidate_ids))
    )
    audited_ids: frozenset[str] = frozenset(row for (row,) in result.all())

    pending = [m for m in candidates if m.id not in audited_ids]
    logger.debug(
        "find_pending_matches: filtered",
        candidates=len(candidates),
        already_audited=len(audited_ids),
        pending=len(pending),
    )
    return pending


# ---------------------------------------------------------------------------
# Input building
# ---------------------------------------------------------------------------


def _build_prob_dict(home: float | None, draw: float | None, away: float | None) -> ProbDict:
    """Construct a ProbDict from three raw probability floats.

    Parameters
    ----------
    home, draw, away:
        Probability values for each 1X2 outcome.  Must all be non-None.

    Returns
    -------
    ProbDict
        Mapping of outcome label to probability.
    """
    return {
        "home_win": float(home),  # type: ignore[arg-type]
        "draw": float(draw),  # type: ignore[arg-type]
        "away_win": float(away),  # type: ignore[arg-type]
    }


def _derive_outcome(match: MatchSchema) -> str:
    """Derive actual outcome from home/away goals when the field is absent.

    Parameters
    ----------
    match:
        Finished match with populated ``home_goals`` and ``away_goals``.

    Returns
    -------
    str
        One of ``"home_win"``, ``"draw"``, or ``"away_win"``.

    Raises
    ------
    ValueError
        If both ``actual_outcome`` and goal columns are None.
    """
    if match.home_goals is None or match.away_goals is None:
        raise ValueError(
            f"match {match.id}: cannot derive actual_outcome — "
            "actual_outcome is None and home_goals/away_goals are also None"
        )
    if match.home_goals > match.away_goals:
        return "home_win"
    if match.home_goals < match.away_goals:
        return "away_win"
    return "draw"


def build_attribution_input(
    match: MatchSchema,
    prediction: PredictionSchema,
) -> AttributionInput:
    """Map a :class:`MatchSchema` + :class:`PredictionSchema` to :class:`AttributionInput`.

    Converts the flat ``ml_*_prob``, ``sb_*_prob``, ``poly_*_prob``, and
    ``blended_*_prob`` columns into the three-key :data:`ProbDict` shape
    expected by :func:`generate_attribution`.

    Poly layer is treated as *absent* (``poly_probs=None``) when **all three**
    ``poly_*_prob`` columns are ``None``.  If any single poly column is non-None
    but not all three, a :exc:`ValueError` is raised to surface the data
    integrity issue early.

    Parameters
    ----------
    match:
        Finished match.  ``actual_outcome`` is read directly; if it is ``None``,
        the outcome is derived from ``home_goals`` / ``away_goals``.
    prediction:
        Latest prediction row for the match.

    Returns
    -------
    AttributionInput
        Fully populated input ready for :func:`generate_attribution`.

    Raises
    ------
    ValueError
        If final (blended) probabilities are missing, or if partial poly
        columns are present (some but not all are non-None).
    """
    # --- actual outcome -------------------------------------------------------
    actual_outcome = match.actual_outcome or _derive_outcome(match)

    # --- actual scores --------------------------------------------------------
    home_goals: int = match.home_goals if match.home_goals is not None else 0
    away_goals: int = match.away_goals if match.away_goals is not None else 0

    # --- final (blended) probs — required ------------------------------------
    final_home = prediction.blended_home_win_prob
    final_draw = prediction.blended_draw_prob
    final_away = prediction.blended_away_win_prob
    if final_home is None or final_draw is None or final_away is None:
        raise ValueError(
            f"match {match.id}: blended/final probabilities are missing — "
            "cannot produce AttributionInput"
        )
    final_probs = _build_prob_dict(final_home, final_draw, final_away)

    # --- ml probs — required -------------------------------------------------
    ml_probs = _build_prob_dict(
        prediction.ml_home_win_prob,
        prediction.ml_draw_prob,
        prediction.ml_away_win_prob,
    )

    # --- sb probs — required -------------------------------------------------
    sb_probs = _build_prob_dict(
        prediction.sb_home_win_prob,
        prediction.sb_draw_prob,
        prediction.sb_away_win_prob,
    )

    # --- poly probs — optional -----------------------------------------------
    poly_vals = (
        prediction.poly_home_win_prob,
        prediction.poly_draw_prob,
        prediction.poly_away_win_prob,
    )
    all_none = all(v is None for v in poly_vals)
    any_none = any(v is None for v in poly_vals)

    if all_none:
        poly_probs: ProbDict | None = None
    elif any_none:
        raise ValueError(
            f"match {match.id}: partial poly probabilities — "
            "some poly_*_prob columns are None but not all"
        )
    else:
        poly_probs = _build_prob_dict(*poly_vals)

    # --- optional context fields ---------------------------------------------
    risk_factor_text: str | None = None  # not stored on prediction yet
    diagnosis: dict[str, Any] | None = None  # not stored on prediction yet

    return AttributionInput(
        match_id=match.id,
        actual_outcome=actual_outcome,
        actual_home_score=home_goals,
        actual_away_score=away_goals,
        final_probs=final_probs,
        ml_probs=ml_probs,
        sb_probs=sb_probs,
        poly_probs=poly_probs,
        risk_factor_text=risk_factor_text,
        diagnosis=diagnosis,
    )


# ---------------------------------------------------------------------------
# Single-match processing
# ---------------------------------------------------------------------------


async def attribute_one(
    session: AsyncSession,
    match_id: str,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Attribute a single match: fetch, compute, optionally persist.

    Pulls the match row and its latest prediction, calls
    :func:`generate_attribution`, and upserts the resulting audit row unless
    ``dry_run`` is ``True``.

    Errors are caught and surfaced in the return dict — this function never
    raises.

    Parameters
    ----------
    session:
        Active async SQLAlchemy session.
    match_id:
        UUID string identifying the match.
    dry_run:
        When ``True``, generate and log the report but skip
        :func:`update_prediction_audit`.

    Returns
    -------
    dict with keys:
        - ``match_id`` (str)
        - ``ok`` (bool)
        - ``error`` (str | None)
        - ``skipped_no_prediction`` (bool)
    """
    log = logger.bind(match_id=match_id, dry_run=dry_run)
    result: dict[str, Any] = {
        "match_id": match_id,
        "ok": False,
        "error": None,
        "skipped_no_prediction": False,
    }

    try:
        t0 = time.monotonic()

        # --- fetch match -------------------------------------------------------
        match = await get_match(session, match_id)
        if match is None:
            result["error"] = f"match {match_id} not found"
            log.warning("attribute_one: match not found")
            return result

        # --- fetch latest prediction ------------------------------------------
        prediction = await get_latest_prediction(session, match_id)
        if prediction is None:
            result["skipped_no_prediction"] = True
            result["error"] = "no prediction found"
            log.info("attribute_one: skipped — no prediction")
            return result

        # --- build input & generate attribution --------------------------------
        attribution_input = build_attribution_input(match, prediction)
        report: AttributionReport = generate_attribution(attribution_input)

        latency_ms = int((time.monotonic() - t0) * 1000)

        log.info(
            "attribute_one: attribution generated",
            final_correct=report.final_correct,
            final_brier=round(report.final_brier, 4),
            actual_outcome=report.actual_outcome,
            latency_ms=latency_ms,
        )

        # --- persist (unless dry_run) -----------------------------------------
        if not dry_run:
            now = datetime.now(UTC)
            audit = PredictionAuditSchema(
                id=str(uuid.uuid4()),
                prediction_id=str(prediction.id),
                match_id=match_id,
                ml_snapshot={
                    "brier": report.layer_brier.get("ml"),
                    "log_loss": report.layer_log_loss.get("ml"),
                },
                sb_snapshot={
                    "brier": report.layer_brier.get("sb"),
                    "log_loss": report.layer_log_loss.get("sb"),
                },
                poly_snapshot={
                    "brier": report.layer_brier.get("poly"),
                    "log_loss": report.layer_log_loss.get("poly"),
                }
                if "poly" in report.layer_brier
                else None,
                blended_snapshot={
                    "brier": report.final_brier,
                    "final_correct": report.final_correct,
                    "final_predicted_winner": report.final_predicted_winner,
                },
                claude_snapshot={
                    "diagnosis_quality_score": report.diagnosis_quality_score,
                    "diagnosis_directional_correct": report.diagnosis_directional_correct,
                    "diagnosis_edge_realized": report.diagnosis_edge_realized,
                    "risk_factor_text": report.risk_factor_text,
                    "risk_factor_hit": report.risk_factor_hit,
                },
                trigger_event="scheduled",
                model_version="v1",
                latency_ms=latency_ms,
                audited_at=report.audit_completed_at,
                created_at=now,
            )
            await update_prediction_audit(session, audit)
            log.info("attribute_one: audit persisted", audit_id=audit.id)
        else:
            log.info("attribute_one: dry-run, skipping persistence")

        result["ok"] = True

    except Exception as exc:
        result["error"] = str(exc)
        log.exception("attribute_one: unhandled error", error=str(exc))

    return result


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


async def run(args: argparse.Namespace) -> dict[str, int]:
    """Top-level orchestrator.

    Builds a DB session, finds pending matches, and calls
    :func:`attribute_one` for each.  If ``--match-id`` is given, processes
    only that single match.

    Parameters
    ----------
    args:
        Parsed CLI namespace.

    Returns
    -------
    dict with keys:
        - ``total`` (int)
        - ``ok`` (int)
        - ``failed`` (int)
        - ``skipped_no_prediction`` (int)
    """
    log = logger.bind(
        lookback_hours=args.lookback_hours,
        limit=args.limit,
        dry_run=args.dry_run,
        match_id=args.match_id,
    )
    log.info("run_attribution: starting")

    totals: dict[str, int] = {
        "total": 0,
        "ok": 0,
        "failed": 0,
        "skipped_no_prediction": 0,
    }

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        log.error("run_attribution: DATABASE_URL env var is not set")
        return totals

    engine = create_async_engine(coerce_async_database_url(database_url), echo=False)
    session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_factory() as session:
        # --- determine match list ---------------------------------------------
        if args.match_id:
            match_ids = [args.match_id]
        else:
            since = datetime.now(UTC) - timedelta(hours=args.lookback_hours)
            pending = await find_pending_matches(session, since=since, limit=args.limit)
            match_ids = [m.id for m in pending]

        totals["total"] = len(match_ids)
        log.info("run_attribution: matches to process", count=totals["total"])

        for mid in match_ids:
            outcome = await attribute_one(session, mid, dry_run=args.dry_run)
            if outcome["ok"]:
                totals["ok"] += 1
            elif outcome.get("skipped_no_prediction"):
                totals["skipped_no_prediction"] += 1
            else:
                totals["failed"] += 1

    log.info(
        "run_attribution: complete",
        total=totals["total"],
        ok=totals["ok"],
        failed=totals["failed"],
        skipped_no_prediction=totals["skipped_no_prediction"],
    )
    return totals


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    """Synchronous entry point; delegates to :func:`run` via asyncio.

    Returns
    -------
    int
        Exit code: ``0`` on success (even partial), ``1`` if all matches
        failed or a fatal error occurred.
    """
    args = parse_args()
    totals = asyncio.run(run(args))
    failed = totals.get("failed", 0)
    total = totals.get("total", 0)
    # Exit 1 only when every match failed (and there was at least one)
    if total > 0 and failed == total:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
