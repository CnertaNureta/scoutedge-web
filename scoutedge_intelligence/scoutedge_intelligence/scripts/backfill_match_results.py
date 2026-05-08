"""Backfill historical match results into the prod ``matches`` table.

One-shot script that queries the API-Football v3 historical fixtures
endpoint for the configured leagues / seasons, matches each finished
remote fixture against a local pending row in ``matches`` (by team
names + kickoff window, with alias and reversed-pair fallbacks), and
issues an idempotent UPDATE setting goals, ``finished``, ``finished_at``,
and ``actual_outcome``.

Train-ML and seed-ELO both need this data; without it the Dixon-Coles
fit can't run and ``/api/predict/match/{id}`` falls back to uniform 1/3.

Usage
-----
::

    python -m scoutedge_intelligence.scripts.backfill_match_results \\
        --since 2022-01-01 \\
        --leagues 1,4,5,9,10,32 \\
        --seasons 2022,2023,2024,2025,2026 \\
        --max-fixtures 5000 \\
        --dry-run \\
        --unmatched-out unmatched.csv

The default leagues cover senior international football: FIFA World Cup
(1), UEFA Euro (4), UEFA Nations League (5), Copa America (9),
International Friendlies (10), and World Cup European Qualifiers (32).
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import os
import sys
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import structlog
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scoutedge_intelligence.db.models import Match, Team
from scoutedge_intelligence.scripts.team_aliases import normalise_team_name
from scoutedge_intelligence.sources.api_football import APIFootballClient
from scoutedge_intelligence.utils.db_urls import coerce_async_database_url

logger = structlog.get_logger(__name__)

_DEFAULT_SINCE = "2022-01-01"
_DEFAULT_LEAGUES = "1,4,5,9,10,32"
_DEFAULT_SEASONS = "2022,2023,2024,2025,2026"
_DEFAULT_MAX_FIXTURES = 5000
_KICKOFF_WINDOW = timedelta(hours=24)
_FT_OFFSET = timedelta(hours=2)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for the backfill script."""
    parser = argparse.ArgumentParser(
        prog="backfill_match_results",
        description=(
            "Backfill historical match results from API-Football into "
            "the matches table (UPDATE only, never INSERT)."
        ),
    )
    parser.add_argument(
        "--since",
        default=_DEFAULT_SINCE,
        help=f"ISO-8601 date lower bound on kickoff_utc. Default: {_DEFAULT_SINCE!r}",
    )
    parser.add_argument(
        "--leagues",
        default=_DEFAULT_LEAGUES,
        help=(
            "Comma-separated API-Football league IDs. "
            f"Default: {_DEFAULT_LEAGUES!r} (WC, Euro, Nations, Copa, "
            "Friendlies, WC EU Qualifiers)."
        ),
    )
    parser.add_argument(
        "--seasons",
        default=_DEFAULT_SEASONS,
        help=f"Comma-separated season years. Default: {_DEFAULT_SEASONS!r}",
    )
    parser.add_argument(
        "--max-fixtures",
        type=int,
        default=_DEFAULT_MAX_FIXTURES,
        dest="max_fixtures",
        help=(
            "Cap on remote fixtures aggregated across league/season combos. "
            f"Default: {_DEFAULT_MAX_FIXTURES}"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="Compute matches but do not issue any UPDATE statements.",
    )
    parser.add_argument(
        "--unmatched-out",
        default=None,
        dest="unmatched_out",
        help="Path to write a CSV of local matches that could not be matched.",
    )
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class LocalPending:
    """A local match awaiting a result, with team names already joined."""

    match_id: str
    home_team_id: str
    away_team_id: str
    home_team_name: str
    away_team_name: str
    kickoff_utc: datetime


@dataclass(frozen=True)
class RemoteResult:
    """A finished API-Football fixture in normalised form."""

    home_team_name: str
    away_team_name: str
    kickoff_utc: datetime
    home_goals: int
    away_goals: int


@dataclass(frozen=True)
class Unmatched:
    """A local match that could not be paired to a remote result."""

    match_id: str
    home_team_id: str
    away_team_id: str
    kickoff_utc: datetime
    reason: str


def _derive_outcome(home_goals: int, away_goals: int) -> str:
    """Return ``home_win | draw | away_win`` from a final score."""
    if home_goals > away_goals:
        return "home_win"
    if home_goals < away_goals:
        return "away_win"
    return "draw"


def _coerce_async_url(url: str) -> str:
    """Coerce plain Postgres URLs to ``postgresql+asyncpg://`` if needed."""
    return coerce_async_database_url(url)


def _parse_csv_ints(raw: str, *, name: str) -> list[int]:
    """Parse a comma-separated list of ints, raising on malformed input."""
    items = [piece.strip() for piece in raw.split(",") if piece.strip()]
    if not items:
        raise ValueError(f"--{name} must list at least one value")
    return [int(piece) for piece in items]


def _parse_remote_kickoff(raw: Any) -> datetime | None:
    """Parse the API-Football ISO-8601 kickoff string into an aware datetime."""
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=UTC)
    if not isinstance(raw, str):
        return None
    text_value = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text_value)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


# ---------------------------------------------------------------------------
# Local pending fetch
# ---------------------------------------------------------------------------


async def list_local_pending(
    session: AsyncSession,
    *,
    since: datetime,
    now: datetime,
) -> list[LocalPending]:
    """Return local matches that are unfinished and already kicked off (>6h ago).

    Joins ``teams.name`` for both sides so the matcher can compare against
    API-Football team names without a second round-trip.
    """
    cutoff = now - timedelta(hours=6)
    stmt = (
        select(
            Match.id,
            Match.home_team_id,
            Match.away_team_id,
            Match.kickoff_utc,
        )
        .where(Match.finished.is_(False))
        .where(Match.kickoff_utc < cutoff)
        .where(Match.kickoff_utc >= since)
        .where(Match.home_team_id.is_not(None))
        .where(Match.away_team_id.is_not(None))
        .where(Match.kickoff_utc.is_not(None))
    )
    result = await session.execute(stmt)
    raw_rows = result.all()

    if not raw_rows:
        return []

    team_ids: set[str] = set()
    for row in raw_rows:
        team_ids.add(row.home_team_id)
        team_ids.add(row.away_team_id)

    team_stmt = select(Team.id, Team.name).where(Team.id.in_(team_ids))
    team_result = await session.execute(team_stmt)
    name_by_id: dict[str, str] = {
        tid: (name or "") for tid, name in team_result.all()
    }

    return [
        LocalPending(
            match_id=row.id,
            home_team_id=row.home_team_id,
            away_team_id=row.away_team_id,
            home_team_name=name_by_id.get(row.home_team_id, ""),
            away_team_name=name_by_id.get(row.away_team_id, ""),
            kickoff_utc=row.kickoff_utc,
        )
        for row in raw_rows
    ]


# ---------------------------------------------------------------------------
# Remote fetch & normalisation
# ---------------------------------------------------------------------------


async def fetch_remote_finished(
    client: APIFootballClient,
    *,
    leagues: list[int],
    seasons: list[int],
    max_fixtures: int,
) -> list[RemoteResult]:
    """Fetch FT fixtures for every (league, season) combo, capped at ``max_fixtures``."""
    out: list[RemoteResult] = []
    for league_id in leagues:
        for season in seasons:
            try:
                raw = await client.fetch_fixtures(league_id, season)
            except Exception as exc:
                logger.warning(
                    "backfill.fetch_fixtures_failed",
                    league_id=league_id,
                    season=season,
                    error=str(exc),
                    error_type=type(exc).__name__,
                )
                continue

            for fixture in raw:
                if fixture.get("status") != "FT":
                    continue
                kickoff = _parse_remote_kickoff(fixture.get("kickoff_utc"))
                home_goals = fixture.get("home_goals")
                away_goals = fixture.get("away_goals")
                home_name = fixture.get("home_team_name") or ""
                away_name = fixture.get("away_team_name") or ""
                if (
                    kickoff is None
                    or home_goals is None
                    or away_goals is None
                    or not home_name
                    or not away_name
                ):
                    continue
                out.append(
                    RemoteResult(
                        home_team_name=home_name,
                        away_team_name=away_name,
                        kickoff_utc=kickoff,
                        home_goals=int(home_goals),
                        away_goals=int(away_goals),
                    )
                )
                if len(out) >= max_fixtures:
                    return out
    return out


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MatchPairing:
    """A successful local→remote pairing ready for UPDATE."""

    local: LocalPending
    remote: RemoteResult
    strategy: str  # "exact" | "fuzzy" | "reversed"


def _match_local_to_remote(
    local: LocalPending,
    remotes: list[RemoteResult],
) -> MatchPairing | None:
    """Find a remote result matching ``local`` using exact → fuzzy → reversed.

    Returns ``None`` when no candidate falls inside the 24h kickoff window.
    """
    local_home_norm = normalise_team_name(local.home_team_name)
    local_away_norm = normalise_team_name(local.away_team_name)

    exact_hit: RemoteResult | None = None
    fuzzy_hit: RemoteResult | None = None
    reversed_hit: RemoteResult | None = None

    for remote in remotes:
        diff = abs(remote.kickoff_utc - local.kickoff_utc)
        if diff > _KICKOFF_WINDOW:
            continue

        # Exact name match (case-sensitive equality on the raw API names).
        if (
            exact_hit is None
            and remote.home_team_name == local.home_team_name
            and remote.away_team_name == local.away_team_name
        ):
            exact_hit = remote
            continue

        remote_home_norm = normalise_team_name(remote.home_team_name)
        remote_away_norm = normalise_team_name(remote.away_team_name)

        if (
            fuzzy_hit is None
            and remote_home_norm == local_home_norm
            and remote_away_norm == local_away_norm
        ):
            fuzzy_hit = remote
            continue

        if (
            reversed_hit is None
            and remote_home_norm == local_away_norm
            and remote_away_norm == local_home_norm
        ):
            reversed_hit = remote

    if exact_hit is not None:
        return MatchPairing(local=local, remote=exact_hit, strategy="exact")
    if fuzzy_hit is not None:
        return MatchPairing(local=local, remote=fuzzy_hit, strategy="fuzzy")
    if reversed_hit is not None:
        return MatchPairing(local=local, remote=reversed_hit, strategy="reversed")
    return None


def pair_local_remote(
    locals_: list[LocalPending],
    remotes: list[RemoteResult],
) -> tuple[list[MatchPairing], list[Unmatched]]:
    """Pair every local pending row to a remote result, collecting unmatched."""
    pairings: list[MatchPairing] = []
    unmatched: list[Unmatched] = []
    remaining_remotes = list(remotes)
    for local in locals_:
        hit = _match_local_to_remote(local, remaining_remotes)
        if hit is None:
            unmatched.append(
                Unmatched(
                    match_id=local.match_id,
                    home_team_id=local.home_team_id,
                    away_team_id=local.away_team_id,
                    kickoff_utc=local.kickoff_utc,
                    reason="no_remote_within_24h",
                )
            )
        else:
            pairings.append(hit)
            remaining_remotes.remove(hit.remote)
    return pairings, unmatched


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def apply_updates(
    session: AsyncSession,
    pairings: list[MatchPairing],
) -> int:
    """Issue idempotent UPDATEs for each pairing; commit once at the end."""
    updated = 0
    for pair in pairings:
        if pair.strategy == "reversed":
            home_goals = pair.remote.away_goals
            away_goals = pair.remote.home_goals
        else:
            home_goals = pair.remote.home_goals
            away_goals = pair.remote.away_goals
        outcome = _derive_outcome(home_goals, away_goals)
        stmt = (
            update(Match)
            .where(Match.id == pair.local.match_id)
            .where(Match.finished.is_(False))
            .values(
                home_goals=home_goals,
                away_goals=away_goals,
                finished=True,
                finished_at=pair.remote.kickoff_utc + _FT_OFFSET,
                actual_outcome=outcome,
            )
        )
        result = await session.execute(stmt)
        rowcount = getattr(result, "rowcount", None)
        if isinstance(rowcount, int) and rowcount > 0:
            updated += rowcount
        else:
            # Fallback when the driver doesn't expose rowcount cleanly.
            updated += 1
    await session.commit()
    return updated


# ---------------------------------------------------------------------------
# Unmatched CSV output
# ---------------------------------------------------------------------------


def write_unmatched_csv(path: str, rows: list[Unmatched]) -> None:
    """Write unmatched local fixtures to CSV at ``path``."""
    with open(path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            [
                "match_id",
                "home_team_id",
                "away_team_id",
                "kickoff_utc",
                "reason",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row.match_id,
                    row.home_team_id,
                    row.away_team_id,
                    row.kickoff_utc.isoformat(),
                    row.reason,
                ]
            )


# ---------------------------------------------------------------------------
# Main async entrypoint
# ---------------------------------------------------------------------------


async def main_async(args: argparse.Namespace) -> int:
    """Run the full backfill pipeline.

    Returns exit code: 0 on success, 1 on configuration / fatal error.
    """
    started = time.perf_counter()
    log = logger.bind(
        since=args.since,
        leagues=args.leagues,
        seasons=args.seasons,
        max_fixtures=args.max_fixtures,
        dry_run=args.dry_run,
        unmatched_out=args.unmatched_out,
    )
    log.info("backfill.start")

    try:
        since_dt = datetime.fromisoformat(args.since).replace(tzinfo=UTC)
    except ValueError as exc:
        log.error("backfill.bad_since", error=str(exc))
        return 1

    try:
        leagues = _parse_csv_ints(args.leagues, name="leagues")
        seasons = _parse_csv_ints(args.seasons, name="seasons")
    except ValueError as exc:
        log.error("backfill.bad_csv_arg", error=str(exc))
        return 1

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        log.error("backfill.missing_database_url")
        return 1

    api_key = os.environ.get("API_FOOTBALL_KEY", "")
    if not api_key:
        log.error("backfill.missing_api_football_key")
        return 1

    async_url = _coerce_async_url(database_url)
    client = APIFootballClient(api_key=api_key)

    try:
        engine = create_async_engine(async_url, echo=False)
        session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with session_factory() as session:
            now = datetime.now(tz=UTC)
            locals_ = await list_local_pending(session, since=since_dt, now=now)
            log.info("backfill.local_pending_loaded", count=len(locals_))

            if not locals_:
                log.info(
                    "backfill.complete",
                    local_pending=0,
                    remote_fixtures=0,
                    matched=0,
                    updated=0,
                    unmatched=0,
                    dry_run=args.dry_run,
                    latency_ms=int((time.perf_counter() - started) * 1000),
                )
                await client.aclose()
                return 0

            remotes = await fetch_remote_finished(
                client,
                leagues=leagues,
                seasons=seasons,
                max_fixtures=args.max_fixtures,
            )
            log.info("backfill.remote_fixtures_loaded", count=len(remotes))

            pairings, unmatched = pair_local_remote(locals_, remotes)
            log.info(
                "backfill.paired",
                matched=len(pairings),
                unmatched=len(unmatched),
            )

            if args.unmatched_out:
                write_unmatched_csv(args.unmatched_out, unmatched)

            updated = 0
            if args.dry_run:
                for pair in pairings:
                    log.debug(
                        "backfill.would_update",
                        match_id=pair.local.match_id,
                        strategy=pair.strategy,
                        home_goals=(
                            pair.remote.away_goals
                            if pair.strategy == "reversed"
                            else pair.remote.home_goals
                        ),
                        away_goals=(
                            pair.remote.home_goals
                            if pair.strategy == "reversed"
                            else pair.remote.away_goals
                        ),
                    )
            else:
                updated = await apply_updates(session, pairings)
                # Touch the connection so SQLAlchemy doesn't leak a warning when
                # there were zero updates and no other statements ran.
                if updated == 0:
                    await session.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover — defensive top-level guard
        log.error(
            "backfill.failed",
            error=str(exc),
            error_type=type(exc).__name__,
        )
        await client.aclose()
        return 1

    await client.aclose()

    log.info(
        "backfill.complete",
        local_pending=len(locals_),
        remote_fixtures=len(remotes),
        matched=len(pairings),
        updated=updated,
        unmatched=len(unmatched),
        dry_run=args.dry_run,
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
        logger.error(
            "backfill.crash",
            error=str(exc),
            error_type=type(exc).__name__,
        )
        return 1


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
