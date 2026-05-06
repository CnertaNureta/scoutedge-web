"""Dixon-Coles model training script for ScoutEdge WC2026.

CLI entry point that loads historical match data from the database,
fits a DixonColesModel, and persists the resulting parameters to disk
as a JSON artifact. Supports both initial training and weekly re-training.

Usage
-----
    python -m scoutedge_intelligence.scripts.train_ml \\
        --since 2020-01-01 \\
        --decay-factor 0.0065 \\
        --output-dir artifacts/dixon_coles \\
        --max-matches 5000

    # Skip DB writes and file persistence:
    python -m scoutedge_intelligence.scripts.train_ml --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd
import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scoutedge_intelligence.db.queries import list_finished_matches
from scoutedge_intelligence.models.dixon_coles import DixonColesModel

logger = structlog.get_logger(__name__)

DEFAULT_OUTPUT_DIR = Path("artifacts/dixon_coles")
_DEFAULT_SINCE = "2018-01-01"
_DEFAULT_DECAY = 0.0065
_DEFAULT_MAX_MATCHES = 5000


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments for the training script.

    Parameters
    ----------
    argv:
        Argument list to parse. Defaults to ``sys.argv[1:]`` when ``None``.

    Returns
    -------
    argparse.Namespace
        Parsed namespace with attributes:

        - ``since`` (str) — ISO-8601 date lower bound for match fetch.
        - ``decay_factor`` (float) — Exponential time-decay parameter.
        - ``output_dir`` (Path) — Directory for JSON artifact output.
        - ``max_matches`` (int) — Maximum number of matches to fetch.
        - ``dry_run`` (bool) — When ``True``, skip persistence and DB writes.
    """
    parser = argparse.ArgumentParser(
        prog="train_ml",
        description="Fit a Dixon-Coles model on historical matches.",
    )
    parser.add_argument(
        "--since",
        default=_DEFAULT_SINCE,
        help=(
            "ISO-8601 date (YYYY-MM-DD) lower bound for finished matches. "
            f"Default: {_DEFAULT_SINCE!r}"
        ),
    )
    parser.add_argument(
        "--decay-factor",
        type=float,
        default=_DEFAULT_DECAY,
        dest="decay_factor",
        help=(
            "Exponential time-decay parameter passed to DixonColesModel.fit. "
            f"Default: {_DEFAULT_DECAY}"
        ),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        dest="output_dir",
        help=f"Directory for JSON artifact output. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=_DEFAULT_MAX_MATCHES,
        dest="max_matches",
        help=f"Maximum number of finished matches to load from DB. Default: {_DEFAULT_MAX_MATCHES}",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        dest="dry_run",
        help="Log the fitted params summary without writing files or DB rows.",
    )
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------
# Data fetch + transformation
# ---------------------------------------------------------------------------


async def fetch_matches(
    session: AsyncSession,
    since: datetime,
    limit: int,
) -> list[Any]:
    """Fetch finished matches from the database.

    Delegates to :func:`scoutedge_intelligence.db.queries.list_finished_matches`.

    Parameters
    ----------
    session:
        An open SQLAlchemy async session.
    since:
        Lower bound on ``finished_at``; only matches on or after this datetime
        are returned.
    limit:
        Maximum number of rows to return.

    Returns
    -------
    list[MatchSchema]
        Validated Pydantic schema objects for each finished match.
    """
    log = logger.bind(since=since.isoformat(), limit=limit)
    log.info("train_ml.fetch_matches: starting")
    rows = await list_finished_matches(session, since=since, limit=limit)
    log.info("train_ml.fetch_matches: done", count=len(rows))
    return rows


def matches_to_dataframe(matches: Sequence[Any]) -> pd.DataFrame:
    """Convert a sequence of match schema objects to a model-ready DataFrame.

    Each match object is expected to expose the following attributes
    (any may be ``None``, in which case the row is skipped):

    - ``home_team_id`` / ``home_team`` — identifier for the home side.
    - ``away_team_id`` / ``away_team`` — identifier for the away side.
    - ``kickoff_utc`` / ``date`` — datetime of the fixture.
    - ``home_goals`` — integer goals scored by the home team.
    - ``away_goals`` — integer goals scored by the away team.

    The function prefers the ``home_team`` / ``away_team`` attribute names
    produced by a MatchSchema-like object, falling back to ``home_team_id`` /
    ``away_team_id`` if the former are absent.

    Parameters
    ----------
    matches:
        Iterable of match schema objects (e.g. ``list[MatchSchema]``).

    Returns
    -------
    pd.DataFrame
        DataFrame with columns: ``home_team``, ``away_team``, ``date``,
        ``home_goals``, ``away_goals``. Rows with missing scores are excluded.

    Raises
    ------
    ValueError
        If the resulting DataFrame is empty (no matches with valid scores).
    """
    rows: list[dict[str, Any]] = []
    skipped = 0
    for m in matches:
        home_goals = getattr(m, "home_goals", None)
        away_goals = getattr(m, "away_goals", None)
        if home_goals is None or away_goals is None:
            skipped += 1
            continue

        # Resolve team identifier — prefer a pre-resolved name attribute
        home_team = getattr(m, "home_team", None) or getattr(m, "home_team_id", None)
        away_team = getattr(m, "away_team", None) or getattr(m, "away_team_id", None)
        date = getattr(m, "date", None) or getattr(m, "kickoff_utc", None)

        if home_team is None or away_team is None or date is None:
            skipped += 1
            continue

        rows.append(
            {
                "home_team": home_team,
                "away_team": away_team,
                "date": date,
                "home_goals": int(home_goals),
                "away_goals": int(away_goals),
            }
        )

    if skipped:
        logger.info("matches_to_dataframe: skipped rows", skipped=skipped)

    if not rows:
        raise ValueError("No matches with valid scores found. Cannot fit the Dixon-Coles model.")

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    logger.info("matches_to_dataframe: built dataframe", rows=len(df))
    return df


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


def persist_params(
    params: dict[str, Any],
    output_dir: Path,
) -> Path:
    """Write fitted Dixon-Coles parameters to a timestamped JSON file.

    The file is named ``params_<YYYYMMDD_HHMM>.json`` and written under
    ``output_dir``, which is created if it does not exist.

    Parameters
    ----------
    params:
        Dictionary containing at minimum the keys ``attack``, ``defense``,
        ``home_advantage``, ``rho``, and ``fitted_at``.
    output_dir:
        Destination directory for the artifact.

    Returns
    -------
    Path
        Absolute path of the file that was written.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    fitted_at: str = params.get("fitted_at", datetime.now(tz=UTC).isoformat())
    # Use the timestamp embedded in the params for the filename
    try:
        ts = datetime.fromisoformat(fitted_at)
    except ValueError:
        ts = datetime.now(tz=UTC)
    stamp = ts.strftime("%Y%m%d_%H%M")
    dest = output_dir / f"params_{stamp}.json"
    dest.write_text(json.dumps(params, indent=2))
    logger.info("persist_params: wrote artifact", path=str(dest))
    return dest


# ---------------------------------------------------------------------------
# Main async entrypoint
# ---------------------------------------------------------------------------


async def main_async(args: argparse.Namespace) -> int:
    """Run the full Dixon-Coles training pipeline.

    Steps:
    1. Parse the ``--since`` date and create a DB session.
    2. Fetch finished matches via :func:`fetch_matches`.
    3. Convert to a DataFrame via :func:`matches_to_dataframe`.
    4. Fit the Dixon-Coles model.
    5. Persist parameters to disk (skipped when ``--dry-run``).

    Parameters
    ----------
    args:
        Parsed CLI namespace produced by :func:`parse_args`.

    Returns
    -------
    int
        Exit code: ``0`` on success, non-zero on failure.
    """
    log = logger.bind(
        since=args.since,
        decay_factor=args.decay_factor,
        max_matches=args.max_matches,
        dry_run=args.dry_run,
    )
    log.info("train_ml: starting")

    # --- Parse since date ---
    try:
        since_dt = datetime.fromisoformat(args.since).replace(tzinfo=UTC)
    except ValueError as exc:
        log.error("train_ml: invalid --since date", error=str(exc))
        return 1

    # --- Build DB session ---
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url and not args.dry_run:
        log.error("train_ml: DATABASE_URL env var is not set")
        return 1

    try:
        if database_url:
            engine = create_async_engine(database_url, echo=False)
            session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
                engine, class_=AsyncSession, expire_on_commit=False
            )
            async with session_factory() as session:
                matches = await fetch_matches(session, since=since_dt, limit=args.max_matches)
        else:
            # dry-run with no DB URL — produce an empty list so we surface the
            # ValueError from matches_to_dataframe below and exit cleanly.
            matches = []
    except Exception as exc:
        log.error("train_ml: failed to fetch matches", error=str(exc))
        return 1

    # --- Convert to DataFrame ---
    try:
        df = matches_to_dataframe(matches)
    except ValueError as exc:
        log.error("train_ml: cannot build dataframe", error=str(exc))
        return 1

    # --- Fit the model ---
    try:
        model = DixonColesModel()
        log.info("train_ml: fitting model", n_matches=len(df), decay_factor=args.decay_factor)
        model.fit(df, decay_factor=args.decay_factor)
    except Exception as exc:
        log.error("train_ml: model fit failed", error=str(exc))
        return 1

    if model.params is None:
        log.error("train_ml: model.params is None after fit — unexpected state")
        return 1

    fitted_at = datetime.now(tz=UTC).isoformat()
    params_dict: dict[str, Any] = {
        "attack": model.params.attack,
        "defense": model.params.defense,
        "home_advantage": model.params.home_advantage,
        "rho": model.params.rho,
        "fitted_at": fitted_at,
    }

    summary = (
        f"home_advantage={model.params.home_advantage:.4f} "
        f"rho={model.params.rho:.4f} "
        f"n_teams={len(model.params.attack)} "
        f"n_matches={len(df)}"
    )

    if args.dry_run:
        log.info("train_ml: dry-run — skipping persistence", summary=summary)
        print(f"[dry-run] Dixon-Coles params: {summary}")
        return 0

    # --- Persist parameters ---
    try:
        artifact_path = persist_params(params_dict, args.output_dir)
    except Exception as exc:
        log.error("train_ml: failed to persist params", error=str(exc))
        return 1

    print(f"Dixon-Coles params written to: {artifact_path}")
    log.info("train_ml: complete", artifact=str(artifact_path), summary=summary)
    return 0


# ---------------------------------------------------------------------------
# Sync wrapper
# ---------------------------------------------------------------------------


def main() -> int:
    """Synchronous entry point; delegates to :func:`main_async` via asyncio.

    Returns
    -------
    int
        Exit code forwarded from :func:`main_async`.
    """
    args = parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
