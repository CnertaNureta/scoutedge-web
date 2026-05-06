"""Unit tests for scoutedge_intelligence.scripts.train_ml (task P6.3).

All tests are fully isolated — no real database is required. The
``fetch_matches`` coroutine is patched at the module level so SQLAlchemy
async machinery is never exercised.
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest

from scoutedge_intelligence.scripts.train_ml import (
    DEFAULT_OUTPUT_DIR,
    main_async,
    matches_to_dataframe,
    parse_args,
    persist_params,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_match(
    home_team: str = "Arsenal",
    away_team: str = "Chelsea",
    date: str = "2023-06-01",
    home_goals: int | None = 2,
    away_goals: int | None = 1,
) -> SimpleNamespace:
    """Build a minimal duck-typed match object."""
    return SimpleNamespace(
        home_team=home_team,
        away_team=away_team,
        kickoff_utc=datetime.fromisoformat(date),
        date=None,  # prefer home_team/away_team, fallback is kickoff_utc
        home_team_id=None,
        away_team_id=None,
        home_goals=home_goals,
        away_goals=away_goals,
    )


def _make_match_with_date_attr(**kwargs: Any) -> SimpleNamespace:
    """Build a match object that uses ``date`` instead of ``kickoff_utc``."""
    m = _make_match(**kwargs)
    m.date = m.kickoff_utc
    m.kickoff_utc = None
    return m


def _synthetic_matches(n: int = 12) -> list[SimpleNamespace]:
    """Return a list of n scoreable match objects across 4 teams."""
    teams = ["Alpha", "Beta", "Gamma", "Delta"]
    rows: list[SimpleNamespace] = []
    base = datetime(2022, 1, 1, tzinfo=UTC)
    idx = 0
    for i, home in enumerate(teams):
        for j, away in enumerate(teams):
            if i == j:
                continue
            rows.append(
                _make_match(
                    home_team=home,
                    away_team=away,
                    date=(base + timedelta(days=idx * 7)).date().isoformat(),
                    home_goals=idx % 4,
                    away_goals=(idx + 1) % 3,
                )
            )
            idx += 1
            if idx >= n:
                return rows
    return rows


# ---------------------------------------------------------------------------
# parse_args — defaults
# ---------------------------------------------------------------------------


class TestParseArgsDefaults:
    """parse_args should produce sensible defaults when called with no args."""

    def test_since_default(self) -> None:
        ns = parse_args([])
        assert ns.since == "2018-01-01"

    def test_decay_factor_default(self) -> None:
        ns = parse_args([])
        assert ns.decay_factor == pytest.approx(0.0065)

    def test_output_dir_default(self) -> None:
        ns = parse_args([])
        assert ns.output_dir == DEFAULT_OUTPUT_DIR

    def test_max_matches_default(self) -> None:
        ns = parse_args([])
        assert ns.max_matches == 5000

    def test_dry_run_default_false(self) -> None:
        ns = parse_args([])
        assert ns.dry_run is False


# ---------------------------------------------------------------------------
# parse_args — custom values
# ---------------------------------------------------------------------------


class TestParseArgsCustom:
    """parse_args should correctly forward user-supplied values."""

    def test_decay_factor_override(self) -> None:
        ns = parse_args(["--decay-factor", "0.005"])
        assert ns.decay_factor == pytest.approx(0.005)

    def test_since_override(self) -> None:
        ns = parse_args(["--since", "2020-06-15"])
        assert ns.since == "2020-06-15"

    def test_max_matches_override(self) -> None:
        ns = parse_args(["--max-matches", "1000"])
        assert ns.max_matches == 1000

    def test_dry_run_flag(self) -> None:
        ns = parse_args(["--dry-run"])
        assert ns.dry_run is True

    def test_output_dir_override(self) -> None:
        ns = parse_args(["--output-dir", "/tmp/dc"])
        assert ns.output_dir == Path("/tmp/dc")


# ---------------------------------------------------------------------------
# matches_to_dataframe
# ---------------------------------------------------------------------------


class TestMatchesToDataframe:
    """matches_to_dataframe should produce a clean DataFrame or raise."""

    def test_basic_conversion(self) -> None:
        matches = [_make_match("Arsenal", "Chelsea", "2023-01-10", 2, 1)]
        df = matches_to_dataframe(matches)
        assert list(df.columns) == ["home_team", "away_team", "date", "home_goals", "away_goals"]
        assert len(df) == 1
        assert df.iloc[0]["home_team"] == "Arsenal"
        assert df.iloc[0]["home_goals"] == 2

    def test_skips_matches_with_none_home_goals(self) -> None:
        matches = [
            _make_match("A", "B", home_goals=None, away_goals=1),
            _make_match("C", "D", home_goals=1, away_goals=0),
        ]
        df = matches_to_dataframe(matches)
        assert len(df) == 1
        assert df.iloc[0]["home_team"] == "C"

    def test_skips_matches_with_none_away_goals(self) -> None:
        matches = [
            _make_match("A", "B", home_goals=1, away_goals=None),
            _make_match("C", "D", home_goals=0, away_goals=0),
        ]
        df = matches_to_dataframe(matches)
        assert len(df) == 1

    def test_skips_matches_with_both_goals_none(self) -> None:
        matches = [
            _make_match(home_goals=None, away_goals=None),
            _make_match("E", "F", home_goals=3, away_goals=2),
        ]
        df = matches_to_dataframe(matches)
        assert len(df) == 1

    def test_empty_list_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="No matches with valid scores"):
            matches_to_dataframe([])

    def test_all_no_scores_raises_value_error(self) -> None:
        matches = [_make_match(home_goals=None, away_goals=None) for _ in range(3)]
        with pytest.raises(ValueError, match="No matches with valid scores"):
            matches_to_dataframe(matches)

    def test_date_column_is_datetime(self) -> None:
        matches = [_make_match()]
        df = matches_to_dataframe(matches)
        assert pd.api.types.is_datetime64_any_dtype(df["date"])

    def test_fallback_to_kickoff_utc(self) -> None:
        """home_team_id / kickoff_utc fallback path."""
        m = SimpleNamespace(
            home_team=None,
            away_team=None,
            home_team_id="team-1",
            away_team_id="team-2",
            kickoff_utc=datetime(2023, 3, 1, tzinfo=UTC),
            date=None,
            home_goals=1,
            away_goals=2,
        )
        df = matches_to_dataframe([m])
        assert df.iloc[0]["home_team"] == "team-1"
        assert df.iloc[0]["away_team"] == "team-2"


# ---------------------------------------------------------------------------
# persist_params
# ---------------------------------------------------------------------------


class TestPersistParams:
    """persist_params should write a correctly structured JSON file."""

    def test_writes_json_file(self, tmp_path: Path) -> None:
        params: dict[str, Any] = {
            "attack": {"A": 0.1, "B": -0.1},
            "defense": {"A": -0.05, "B": 0.05},
            "home_advantage": 0.25,
            "rho": -0.08,
            "fitted_at": "2024-03-15T10:30:00+00:00",
        }
        dest = persist_params(params, tmp_path / "artifacts")
        assert dest.exists()
        loaded = json.loads(dest.read_text())
        assert set(loaded.keys()) == {"attack", "defense", "home_advantage", "rho", "fitted_at"}
        assert loaded["home_advantage"] == pytest.approx(0.25)

    def test_filename_contains_timestamp(self, tmp_path: Path) -> None:
        params: dict[str, Any] = {
            "attack": {},
            "defense": {},
            "home_advantage": 0.1,
            "rho": -0.05,
            "fitted_at": "2024-07-04T09:15:00+00:00",
        }
        dest = persist_params(params, tmp_path)
        # Expect params_20240704_0915.json
        assert dest.name == "params_20240704_0915.json"

    def test_creates_parent_dirs(self, tmp_path: Path) -> None:
        nested = tmp_path / "deep" / "nested" / "dir"
        params: dict[str, Any] = {
            "attack": {},
            "defense": {},
            "home_advantage": 0.0,
            "rho": 0.0,
            "fitted_at": datetime.now(tz=UTC).isoformat(),
        }
        dest = persist_params(params, nested)
        assert dest.exists()


# ---------------------------------------------------------------------------
# main_async — integration-style (fully mocked)
# ---------------------------------------------------------------------------


class TestMainAsync:
    """main_async should return exit-code 0 on happy path, non-zero on failure."""

    @pytest.fixture()
    def good_args(self, tmp_path: Path) -> argparse.Namespace:
        ns = argparse.Namespace(
            since="2020-01-01",
            decay_factor=0.0065,
            output_dir=tmp_path / "artifacts",
            max_matches=100,
            dry_run=False,
        )
        return ns

    @pytest.fixture()
    def dry_run_args(self, tmp_path: Path) -> argparse.Namespace:
        ns = argparse.Namespace(
            since="2020-01-01",
            decay_factor=0.0065,
            output_dir=tmp_path / "artifacts",
            max_matches=100,
            dry_run=True,
        )
        return ns

    async def test_returns_zero_on_success(
        self, good_args: Any, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Happy path: mocked fetch + real model fit → exit 0."""
        synthetic = _synthetic_matches(12)
        monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://fake/db")

        with (
            patch(
                "scoutedge_intelligence.scripts.train_ml.fetch_matches",
                new_callable=AsyncMock,
                return_value=synthetic,
            ),
            patch(
                "scoutedge_intelligence.scripts.train_ml.create_async_engine",
                return_value=MagicMock(),
            ),
            patch(
                "scoutedge_intelligence.scripts.train_ml.async_sessionmaker",
                return_value=_fake_session_maker(synthetic),
            ),
        ):
            code = await main_async(good_args)
        assert code == 0

    async def test_dry_run_skips_persist_params(
        self, dry_run_args: Any, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """--dry-run should call model.fit but NOT call persist_params."""
        synthetic = _synthetic_matches(12)
        monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://fake/db")

        persist_mock = MagicMock(side_effect=AssertionError("persist_params must not be called"))

        with (
            patch(
                "scoutedge_intelligence.scripts.train_ml.fetch_matches",
                new_callable=AsyncMock,
                return_value=synthetic,
            ),
            patch(
                "scoutedge_intelligence.scripts.train_ml.create_async_engine",
                return_value=MagicMock(),
            ),
            patch(
                "scoutedge_intelligence.scripts.train_ml.async_sessionmaker",
                return_value=_fake_session_maker(synthetic),
            ),
            patch(
                "scoutedge_intelligence.scripts.train_ml.persist_params",
                persist_mock,
            ),
        ):
            code = await main_async(dry_run_args)

        assert code == 0
        persist_mock.assert_not_called()

    async def test_returns_nonzero_on_bad_since(self, tmp_path: Path) -> None:
        """Invalid --since date should yield exit code 1 without raising."""
        bad_args = argparse.Namespace(
            since="not-a-date",
            decay_factor=0.0065,
            output_dir=tmp_path,
            max_matches=100,
            dry_run=False,
        )
        code = await main_async(bad_args)
        assert code != 0

    async def test_returns_nonzero_when_no_scored_matches(
        self, good_args: Any, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """If fetch_matches returns matches all lacking scores, return non-zero."""
        unscored = [_make_match(home_goals=None, away_goals=None) for _ in range(5)]
        monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://fake/db")

        with (
            patch(
                "scoutedge_intelligence.scripts.train_ml.fetch_matches",
                new_callable=AsyncMock,
                return_value=unscored,
            ),
            patch(
                "scoutedge_intelligence.scripts.train_ml.create_async_engine",
                return_value=MagicMock(),
            ),
            patch(
                "scoutedge_intelligence.scripts.train_ml.async_sessionmaker",
                return_value=_fake_session_maker(unscored),
            ),
        ):
            code = await main_async(good_args)

        assert code != 0

    async def test_missing_database_url_returns_nonzero(
        self, good_args: Any, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Absent DATABASE_URL env var on non-dry-run should return non-zero."""
        monkeypatch.delenv("DATABASE_URL", raising=False)
        code = await main_async(good_args)
        assert code != 0


# ---------------------------------------------------------------------------
# Internal helpers for tests
# ---------------------------------------------------------------------------


def _fake_session_maker(
    matches: list[Any],
) -> Any:
    """Return a fake sessionmaker whose context manager yields a mock session."""
    session_mock = AsyncMock()
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=session_mock)
    cm.__aexit__ = AsyncMock(return_value=False)
    factory = MagicMock(return_value=cm)
    return factory
