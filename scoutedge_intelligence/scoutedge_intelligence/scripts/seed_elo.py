"""ELO seeder for ScoutEdge — populate ``elo_ratings`` from finished matches.

Reads completed matches from the Supabase database in chronological order,
runs them through :class:`FootballELO`, and writes one current-snapshot row
per team into the ``elo_ratings`` table. Designed to be invoked daily by
the cron workflow so ``EngineFactory`` warm-up always has rating data to
seed from.

Usage
-----
    python -m scoutedge_intelligence.scripts.seed_elo \\
        --since 2018-01-01 \\
        --decay 0.0 \\
        --batch-size 1000

    # Skip DB writes (read + compute only):
    python -m scoutedge_intelligence.scripts.seed_elo --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from sqlalchemy import insert as sa_insert
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scoutedge_intelligence.db.models import EloRating, EloRatingSchema, Match, MatchSchema
from scoutedge_intelligence.models.elo import FootballELO
from scoutedge_intelligence.utils.db_urls import coerce_async_database_url

logger = structlog.get_logger(__name__)

_DEFAULT_SINCE = "2018-01-01"
_DEFAULT_DECAY = 0.0
_DEFAULT_BATCH_SIZE = 1000
_MODEL_VERSION = "elo-v1-seed"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for the seeder.

    Parameters
    ----------
    argv:
        Argument list to parse. Defaults to ``sys.argv[1:]`` when ``None``.

    Returns
    -------
    argparse.Namespace
        Parsed namespace with attributes ``since``, ``decay``, ``batch_size``,
        and ``dry_run``.
    """
    parser = argparse.ArgumentParser(
        prog="seed_elo",
        description="Seed elo_ratings from finished matches via FootballELO.",
    )
    parser.add_argument(
        "--since",
        default=_DEFAULT_SINCE,
        help=f"ISO-8601 date (YYYY-MM-DD) lower bound. Default: {_DEFAULT_SINCE!r}",
    )
    parser.add_argument(
        "--decay",
        type=float,
        default=_DEFAULT_DECAY,
        help=f"Reserved time-decay parameter (currently unused). Default: {_DEFAULT_DECAY}",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_DEFAULT_BATCH_SIZE,
        dest="batch_size",
        help=f"Number of rows per INSERT chunk. Default: {_DEFAULT_BATCH_SIZE}",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="Compute ELOs but do not write any rows to elo_ratings.",
    )
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------
# Data fetch (chronological)
# ---------------------------------------------------------------------------


async def list_finished_matches_chronological(
    session: AsyncSession,
    since: datetime,
) -> list[MatchSchema]:
    """Return finished matches with valid scores ordered by ``kickoff_utc`` ASC.

    Defined inline here rather than in :mod:`scoutedge_intelligence.db.queries`
    so the public queries module stays untouched. The seeder needs strict
    chronological ordering for the ELO rolling update to be deterministic.

    Parameters
    ----------
    session:
        Open SQLAlchemy async session.
    since:
        Lower bound on ``finished_at``; only matches finished on or after this
        datetime are returned.

    Returns
    -------
    list[MatchSchema]
        Validated schema objects with ``home_team_id``, ``away_team_id``,
        ``home_goals``, ``away_goals``, and ``kickoff_utc`` populated.
    """
    result = await session.execute(
        select(Match)
        .where(Match.finished.is_(True))
        .where(Match.finished_at >= since)
        .where(Match.home_goals.is_not(None))
        .where(Match.away_goals.is_not(None))
        .where(Match.home_team_id.is_not(None))
        .where(Match.away_team_id.is_not(None))
        .order_by(Match.kickoff_utc.asc())
    )
    rows = result.scalars().all()
    logger.debug(
        "seed_elo.list_finished_matches_chronological: fetched",
        count=len(rows),
        since=since.isoformat(),
    )
    return [MatchSchema.model_validate(r) for r in rows]


# ---------------------------------------------------------------------------
# ELO computation
# ---------------------------------------------------------------------------


def compute_team_ratings(matches: list[MatchSchema]) -> dict[str, float]:
    """Run ``FootballELO`` over matches in order and return final ratings.

    The team's ``id`` (UUID string) is used as the rating key — the ELO model
    is name-agnostic, so any stable identifier works.

    Parameters
    ----------
    matches:
        Finished matches in chronological order. Rows missing any of
        ``home_team_id``, ``away_team_id``, ``home_goals``, or ``away_goals``
        are skipped.

    Returns
    -------
    dict[str, float]
        Mapping of ``team_id`` → final ELO rating.
    """
    elo = FootballELO()
    processed = 0
    for m in matches:
        if (
            m.home_team_id is None
            or m.away_team_id is None
            or m.home_goals is None
            or m.away_goals is None
        ):
            continue
        elo.update(
            m.home_team_id,
            m.away_team_id,
            int(m.home_goals),
            int(m.away_goals),
        )
        processed += 1

    # FootballELO exposes ratings via _ratings (single underscore — module-private,
    # not name-mangled). Snapshot as a plain dict copy to avoid sharing state.
    ratings: dict[str, float] = dict(elo._ratings)
    logger.info(
        "seed_elo.compute_team_ratings: done",
        matches_processed=processed,
        teams=len(ratings),
    )
    return ratings


def build_rating_rows(
    ratings: dict[str, float],
    matches_used: int,
    computed_at: datetime,
) -> list[EloRatingSchema]:
    """Construct one ``EloRatingSchema`` per team."""
    return [
        EloRatingSchema(
            id=str(uuid.uuid4()),
            team_id=team_id,
            elo=float(rating),
            attack_elo=None,
            defense_elo=None,
            set_piece_elo=None,
            altitude_bonus=0.0,
            form_bonus=0.0,
            motivation_bonus=0.0,
            computed_at=computed_at,
            model_version=_MODEL_VERSION,
            metadata_={
                "seeded_from": "seed_elo.py",
                "matches_used": matches_used,
            },
        )
        for team_id, rating in ratings.items()
    ]


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def persist_ratings(
    session: AsyncSession,
    rows: list[EloRatingSchema],
    batch_size: int,
) -> None:
    """Insert rating rows into ``elo_ratings`` in batched chunks.

    Existing rows are not deleted; downstream readers select the latest
    snapshot by ``computed_at``.
    """
    if not rows:
        return

    payloads: list[dict[str, Any]] = [row.model_dump() for row in rows]

    for start in range(0, len(payloads), batch_size):
        chunk = payloads[start : start + batch_size]
        await session.execute(sa_insert(EloRating).values(chunk))
    await session.commit()


# ---------------------------------------------------------------------------
# Main async entrypoint
# ---------------------------------------------------------------------------


async def main_async(args: argparse.Namespace) -> int:
    """Run the full ELO seeder pipeline.

    Returns
    -------
    int
        Exit code: ``0`` on success, ``1`` on failure.
    """
    started = time.perf_counter()
    log = logger.bind(
        since=args.since,
        decay=args.decay,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
    )
    log.info("seed_elo.start")

    try:
        since_dt = datetime.fromisoformat(args.since).replace(tzinfo=UTC)
    except ValueError as exc:
        log.error("seed_elo.bad_since", error=str(exc))
        return 1

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        log.error("seed_elo.missing_database_url")
        return 1

    try:
        engine = create_async_engine(coerce_async_database_url(database_url), echo=False)
        session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with session_factory() as session:
            matches = await list_finished_matches_chronological(session, since=since_dt)
            log.info("seed_elo.matches_loaded", count=len(matches))

            if not matches:
                log.info(
                    "seed_elo.complete",
                    matches_processed=0,
                    teams_seeded=0,
                    dry_run=args.dry_run,
                    latency_ms=int((time.perf_counter() - started) * 1000),
                )
                return 0

            ratings = compute_team_ratings(matches)
            rows = build_rating_rows(
                ratings=ratings,
                matches_used=len(matches),
                computed_at=datetime.now(tz=UTC),
            )

            if args.dry_run:
                log.info(
                    "seed_elo.complete",
                    matches_processed=len(matches),
                    teams_seeded=len(rows),
                    dry_run=True,
                    latency_ms=int((time.perf_counter() - started) * 1000),
                )
                return 0

            await persist_ratings(session, rows, batch_size=args.batch_size)
    except Exception as exc:  # pragma: no cover — defensive top-level guard
        log.error("seed_elo.failed", error=str(exc), error_type=type(exc).__name__)
        return 1

    log.info(
        "seed_elo.complete",
        matches_processed=len(matches),
        teams_seeded=len(rows),
        dry_run=False,
        latency_ms=int((time.perf_counter() - started) * 1000),
    )
    return 0


# ---------------------------------------------------------------------------
# Sync wrapper
# ---------------------------------------------------------------------------


def main() -> int:
    """Synchronous CLI entry point."""
    args = parse_args()
    try:
        return asyncio.run(main_async(args))
    except Exception as exc:  # pragma: no cover — surface unexpected crashes
        logger.error("seed_elo.crash", error=str(exc), error_type=type(exc).__name__)
        return 1


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
