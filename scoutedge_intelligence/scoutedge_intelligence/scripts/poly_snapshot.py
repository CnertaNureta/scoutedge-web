"""Hourly Polymarket snapshot cron script for ScoutEdge WC2026.

Iterates over upcoming matches (kickoff within the next N days), fetches the
Polymarket market for each, and stores a ``polymarket_snapshots`` row.  The
script is idempotent (upsert-on-conflict) and robust to per-match failures.

Usage::

    python -m scoutedge_intelligence.scripts.poly_snapshot [OPTIONS]

    --horizon-days    Lookahead window in days (default: 14)
    --rate-limit-qps  Max requests per second to Gamma API (default: 2.0)
    --dry-run         Fetch but skip DB writes
    --match-ids       Comma-separated list of match IDs; ignores --horizon-days
"""

from __future__ import annotations

import argparse
import asyncio
import datetime
import os
import sys
import uuid
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scoutedge_intelligence.db import queries
from scoutedge_intelligence.db.models import Match, PolymarketSnapshotSchema
from scoutedge_intelligence.sources.polymarket import PolymarketClient
from scoutedge_intelligence.utils.db_urls import coerce_async_database_url

logger: structlog.BoundLogger = structlog.get_logger(__name__)

DEFAULT_HORIZON_DAYS: int = 14
DEFAULT_RATE_LIMIT_QPS: float = 2.0
DEFAULT_TIMEOUT_S: int = 10


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments.

    Args:
        argv: Argument list; defaults to ``sys.argv[1:]`` when *None*.

    Returns:
        Parsed :class:`argparse.Namespace` with attributes:
        ``horizon_days``, ``rate_limit_qps``, ``dry_run``, ``match_ids``.
    """
    parser = argparse.ArgumentParser(
        prog="poly_snapshot",
        description="Fetch hourly Polymarket snapshots for upcoming WC2026 matches.",
    )
    parser.add_argument(
        "--horizon-days",
        type=int,
        default=DEFAULT_HORIZON_DAYS,
        dest="horizon_days",
        help=f"Fetch matches with kickoff in [now, now+N days] (default: {DEFAULT_HORIZON_DAYS}).",
    )
    parser.add_argument(
        "--rate-limit-qps",
        type=float,
        default=DEFAULT_RATE_LIMIT_QPS,
        dest="rate_limit_qps",
        help=f"Max requests per second to Polymarket API (default: {DEFAULT_RATE_LIMIT_QPS}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        dest="dry_run",
        help="Fetch data but skip all DB writes.",
    )
    parser.add_argument(
        "--match-ids",
        type=str,
        default=None,
        dest="match_ids",
        help="Comma-separated match IDs to process; ignores --horizon-days when set.",
    )
    ns = parser.parse_args(argv)
    return ns


# ---------------------------------------------------------------------------
# Queries helpers
# ---------------------------------------------------------------------------


async def fetch_target_match_ids(session: AsyncSession, *, horizon_days: int) -> list[str]:
    """Return IDs of upcoming (unfinished) matches within the lookahead window.

    Queries the ``matches`` table for rows where ``finished`` is *False* and
    ``kickoff_utc`` falls in ``[now, now + horizon_days]``.

    Note: ``queries`` does not expose a ``list_upcoming_matches`` helper as of
    writing.  ``list_finished_matches`` filters ``finished=True``, so we query
    directly here.

    TODO: Add ``list_upcoming_matches(session, horizon_days)`` to
    ``scoutedge_intelligence.db.queries`` when the helper is needed by multiple
    callers.

    Args:
        session: Active async SQLAlchemy session.
        horizon_days: Number of days ahead to include.

    Returns:
        List of match ID strings.
    """
    now = datetime.datetime.now(tz=datetime.UTC)
    cutoff = now + datetime.timedelta(days=horizon_days)

    result = await session.execute(
        select(Match.id)
        .where(Match.finished.is_(False))
        .where(Match.kickoff_utc >= now)
        .where(Match.kickoff_utc <= cutoff)
        .order_by(Match.kickoff_utc)
    )
    ids: list[str] = [row[0] for row in result.all()]
    logger.info(
        "fetch_target_match_ids",
        count=len(ids),
        horizon_days=horizon_days,
        now=now.isoformat(),
        cutoff=cutoff.isoformat(),
    )
    return ids


# ---------------------------------------------------------------------------
# Per-match snapshot
# ---------------------------------------------------------------------------


async def snapshot_match(
    poly_client: PolymarketClient,
    session: AsyncSession,
    match_id: str,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Fetch and persist a single Polymarket snapshot for *match_id*.

    This function never raises; exceptions are caught, logged, and returned
    in the result dict so callers can tally failures without aborting the run.

    Args:
        poly_client: Configured :class:`PolymarketClient` instance.
        session: Active async SQLAlchemy session.
        match_id: WC2026 match / Polymarket market identifier.
        dry_run: When *True*, skip the DB write.

    Returns:
        A dict with keys:
        ``match_id`` (str), ``ok`` (bool), ``error`` (str | None),
        ``data`` (dict | None).
    """
    log = logger.bind(match_id=match_id, dry_run=dry_run)
    try:
        market_data: dict[str, Any] = await poly_client.fetch_market(match_id)

        now = datetime.datetime.now(tz=datetime.UTC)
        snapshot = PolymarketSnapshotSchema(
            id=str(uuid.uuid4()),
            match_id=match_id,
            market_slug=match_id,
            market_id=market_data.get("raw", {}).get("id"),
            home_win_prob=market_data.get("prob_home"),
            draw_prob=market_data.get("prob_draw"),
            away_win_prob=market_data.get("prob_away"),
            total_liquidity=market_data.get("liquidity"),
            open_interest=None,
            volume_24h=market_data.get("volume_24h"),
            num_traders=None,
            raw_payload=market_data.get("raw"),
            fetched_at=now,
            created_at=now,
        )

        if dry_run:
            log.info("snapshot_match_dry_run_skip", prob_home=market_data.get("prob_home"))
        else:
            await queries.upsert_polymarket_snapshot(session, snapshot)
            log.info(
                "snapshot_match_ok",
                prob_home=round(market_data.get("prob_home", 0), 4),
                prob_draw=round(market_data.get("prob_draw", 0), 4),
                prob_away=round(market_data.get("prob_away", 0), 4),
                liquidity=market_data.get("liquidity"),
            )

        return {"match_id": match_id, "ok": True, "error": None, "data": market_data}

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        log.error("snapshot_match_failed", error=error_msg)
        return {"match_id": match_id, "ok": False, "error": error_msg, "data": None}


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


async def run(args: argparse.Namespace) -> dict[str, int]:
    """Top-level orchestrator for the snapshot run.

    Resolves the list of match IDs (via CLI override or DB query), then
    iterates through them sequentially with rate-limiting, calling
    :func:`snapshot_match` for each.

    Args:
        args: Parsed CLI namespace from :func:`parse_args`.

    Returns:
        Summary dict: ``{"total": int, "ok": int, "failed": int,
        "skipped_dry_run": int}``.
    """
    database_url: str = os.environ.get("DATABASE_URL", "")
    engine = create_async_engine(coerce_async_database_url(database_url), echo=False)
    session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
        engine, expire_on_commit=False
    )
    poly_client = PolymarketClient()

    try:
        async with session_factory() as session:
            if args.match_ids:
                match_ids: list[str] = [
                    mid.strip() for mid in args.match_ids.split(",") if mid.strip()
                ]
                logger.info("run_using_explicit_match_ids", count=len(match_ids))
            else:
                match_ids = await fetch_target_match_ids(session, horizon_days=args.horizon_days)

        total = len(match_ids)
        ok_count = 0
        failed_count = 0
        skipped_dry_run_count = 0
        sleep_interval: float = 1.0 / args.rate_limit_qps

        for idx, match_id in enumerate(match_ids):
            # Rate-limit: sleep between calls (after the first).
            if idx > 0:
                await asyncio.sleep(sleep_interval)

            async with session_factory() as session:
                result = await snapshot_match(
                    poly_client,
                    session,
                    match_id,
                    dry_run=args.dry_run,
                )

            if args.dry_run:
                skipped_dry_run_count += 1
                if result["ok"]:
                    ok_count += 1
                else:
                    failed_count += 1
            elif result["ok"]:
                ok_count += 1
            else:
                failed_count += 1

        summary: dict[str, int] = {
            "total": total,
            "ok": ok_count,
            "failed": failed_count,
            "skipped_dry_run": skipped_dry_run_count,
        }
        logger.info("run_complete", **summary)
        return summary

    finally:
        await poly_client.aclose()
        await engine.dispose()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    """CLI entry point; wraps :func:`run` in an asyncio event loop.

    Returns:
        Exit code: 0 on success, 1 if any match failed.
    """
    args = parse_args()
    summary = asyncio.run(run(args))
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
