"""Unit tests for ``scoutedge_intelligence.scripts.seed_elo``.

Tests are fully isolated — no real database is required. The async session
factory is mocked at the module level so SQLAlchemy async machinery is
never exercised.
"""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.scripts.seed_elo import (
    build_rating_rows,
    compute_team_ratings,
    main,
    main_async,
    parse_args,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _match(
    home_team_id: str,
    away_team_id: str,
    home_goals: int,
    away_goals: int,
    kickoff: str = "2023-06-01T18:00:00+00:00",
) -> SimpleNamespace:
    """Duck-typed match object compatible with ``compute_team_ratings``."""
    return SimpleNamespace(
        id="match-" + home_team_id + "-" + away_team_id,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        home_goals=home_goals,
        away_goals=away_goals,
        kickoff_utc=datetime.fromisoformat(kickoff),
    )


# ---------------------------------------------------------------------------
# parse_args
# ---------------------------------------------------------------------------


class TestParseArgsDefaults:
    """parse_args should produce sensible defaults when called with no args."""

    def test_parse_args_defaults(self) -> None:
        ns = parse_args([])
        assert ns.since == "2018-01-01"
        assert ns.decay == pytest.approx(0.0)
        assert ns.batch_size == 1000
        assert ns.dry_run is False


class TestParseArgsCustom:
    """parse_args should correctly forward user-supplied values."""

    def test_parse_args_custom_values(self) -> None:
        ns = parse_args(
            [
                "--since",
                "2020-06-15",
                "--decay",
                "0.05",
                "--batch-size",
                "250",
                "--dry-run",
            ]
        )
        assert ns.since == "2020-06-15"
        assert ns.decay == pytest.approx(0.05)
        assert ns.batch_size == 250
        assert ns.dry_run is True


# ---------------------------------------------------------------------------
# compute_team_ratings + build_rating_rows
# ---------------------------------------------------------------------------


class TestComputeTeamRatings:
    """compute_team_ratings should drive FootballELO over the matches."""

    def test_two_matches_updates_ratings(self) -> None:
        matches = [
            _match("team-a", "team-b", 2, 1),
            _match("team-a", "team-b", 3, 0, kickoff="2023-06-08T18:00:00+00:00"),
        ]
        ratings = compute_team_ratings(matches)  # type: ignore[arg-type]
        assert set(ratings.keys()) == {"team-a", "team-b"}
        # team-a won both — its rating must rise above default (1500)
        assert ratings["team-a"] > 1500.0
        assert ratings["team-b"] < 1500.0

    def test_skips_matches_with_missing_data(self) -> None:
        matches = [
            _match("team-a", "team-b", 1, 0),
            SimpleNamespace(
                id="bad",
                home_team_id=None,
                away_team_id="team-c",
                home_goals=1,
                away_goals=0,
                kickoff_utc=datetime.now(tz=UTC),
            ),
        ]
        ratings = compute_team_ratings(matches)  # type: ignore[arg-type]
        assert "team-c" not in ratings


class TestBuildRatingRows:
    """build_rating_rows should produce one EloRatingSchema per team."""

    def test_one_row_per_team_with_metadata(self) -> None:
        ratings = {"team-a": 1550.0, "team-b": 1450.0}
        rows = build_rating_rows(
            ratings=ratings,
            matches_used=2,
            computed_at=datetime(2024, 1, 1, tzinfo=UTC),
        )
        assert len(rows) == 2
        teams = {row.team_id for row in rows}
        assert teams == {"team-a", "team-b"}
        for row in rows:
            assert row.model_version == "elo-v1-seed"
            assert row.metadata_ == {
                "seeded_from": "seed_elo.py",
                "matches_used": 2,
            }
            assert row.altitude_bonus == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# main_async
# ---------------------------------------------------------------------------


def _build_args(**overrides: object) -> argparse.Namespace:
    base = {
        "since": "2018-01-01",
        "decay": 0.0,
        "batch_size": 1000,
        "dry_run": False,
    }
    base.update(overrides)
    return argparse.Namespace(**base)


async def test_seed_elo_runs_full_pipeline_with_two_matches(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Full pipeline: fetch 2 matches in chrono order → batched insert called once."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")

    matches = [
        _match("team-a", "team-b", 1, 0, kickoff="2022-01-01T12:00:00+00:00"),
        _match("team-a", "team-b", 2, 0, kickoff="2022-02-01T12:00:00+00:00"),
    ]

    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=session)
    session_cm.__aexit__ = AsyncMock(return_value=None)

    fake_factory = MagicMock(return_value=session_cm)

    with (
        patch(
            "scoutedge_intelligence.scripts.seed_elo.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.seed_elo.async_sessionmaker",
            return_value=fake_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.seed_elo.list_finished_matches_chronological",
            new=AsyncMock(return_value=matches),
        ),
    ):
        rc = await main_async(_build_args())

    assert rc == 0
    # Exactly one batched insert (2 teams fit in default batch_size of 1000)
    assert session.execute.await_count == 1
    session.commit.assert_awaited_once()


async def test_dry_run_skips_persist(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Dry-run mode must NOT call session.execute or commit."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")

    matches = [_match("team-a", "team-b", 1, 0)]

    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=session)
    session_cm.__aexit__ = AsyncMock(return_value=None)

    fake_factory = MagicMock(return_value=session_cm)

    with (
        patch(
            "scoutedge_intelligence.scripts.seed_elo.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.seed_elo.async_sessionmaker",
            return_value=fake_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.seed_elo.list_finished_matches_chronological",
            new=AsyncMock(return_value=matches),
        ),
    ):
        rc = await main_async(_build_args(dry_run=True))

    assert rc == 0
    session.execute.assert_not_awaited()
    session.commit.assert_not_awaited()


async def test_returns_zero_when_no_matches(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An empty match list should exit cleanly with rc=0 and no DB writes."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")

    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=session)
    session_cm.__aexit__ = AsyncMock(return_value=None)

    fake_factory = MagicMock(return_value=session_cm)

    with (
        patch(
            "scoutedge_intelligence.scripts.seed_elo.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.seed_elo.async_sessionmaker",
            return_value=fake_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.seed_elo.list_finished_matches_chronological",
            new=AsyncMock(return_value=[]),
        ),
    ):
        rc = await main_async(_build_args())

    assert rc == 0
    session.execute.assert_not_awaited()


async def test_main_async_normalizes_plain_postgres_database_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Managed Postgres URLs should be upgraded before create_async_engine."""
    monkeypatch.setenv("DATABASE_URL", "postgres://x/y")

    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=session)
    session_cm.__aexit__ = AsyncMock(return_value=None)

    fake_factory = MagicMock(return_value=session_cm)

    with (
        patch(
            "scoutedge_intelligence.scripts.seed_elo.create_async_engine",
            return_value=MagicMock(),
        ) as create_engine_mock,
        patch(
            "scoutedge_intelligence.scripts.seed_elo.async_sessionmaker",
            return_value=fake_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.seed_elo.list_finished_matches_chronological",
            new=AsyncMock(return_value=[]),
        ),
    ):
        rc = await main_async(_build_args())

    assert rc == 0
    assert create_engine_mock.call_args.args[0] == "postgresql+asyncpg://x/y"


def test_main_returns_1_when_database_url_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Missing DATABASE_URL must surface as exit code 1."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setattr("sys.argv", ["seed_elo"])
    rc = main()
    assert rc == 1
