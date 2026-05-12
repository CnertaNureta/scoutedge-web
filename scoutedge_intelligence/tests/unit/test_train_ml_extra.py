"""Extra coverage for train_ml: paths missed by test_train_ml.

Targets:
- fetch_matches delegates to list_finished_matches and logs counts
- matches_to_dataframe skips rows missing home_team / away_team / date
- persist_params falls back to datetime.now() when fitted_at is malformed
- main_async: matches fetch raises -> returns 1
- main_async: model.fit raises -> returns 1
- main_async: model.params is None after fit -> returns 1
- main_async: persist_params raises -> returns 1
- main() forwards the exit code from main_async
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.scripts import train_ml as tm


def _make_match_full(**overrides: Any) -> SimpleNamespace:
    base = {
        "home_team_id": "T1",
        "away_team_id": "T2",
        "home_team": "T1",
        "away_team": "T2",
        "kickoff_utc": datetime(2026, 6, 1, tzinfo=UTC),
        "date": datetime(2026, 6, 1, tzinfo=UTC),
        "home_goals": 2,
        "away_goals": 1,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def _good_args(**overrides: Any) -> Any:
    args = MagicMock()
    args.since = "2024-01-01"
    args.decay_factor = 0.0065
    args.output_dir = MagicMock()
    args.max_matches = 5000
    args.dry_run = False
    for k, v in overrides.items():
        setattr(args, k, v)
    return args


# ---------------------------------------------------------------------------
# fetch_matches
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_matches_delegates_to_list_finished_matches() -> None:
    sentinel = [_make_match_full()]
    session = MagicMock()
    with patch(
        "scoutedge_intelligence.scripts.train_ml.list_finished_matches",
        new=AsyncMock(return_value=sentinel),
    ) as mock_list:
        out = await tm.fetch_matches(session, since=datetime(2024, 1, 1, tzinfo=UTC), limit=10)
    assert out is sentinel
    mock_list.assert_awaited_once()


# ---------------------------------------------------------------------------
# matches_to_dataframe — missing-team / missing-date row is skipped
# ---------------------------------------------------------------------------


def test_matches_to_dataframe_skips_rows_missing_team_or_date() -> None:
    good = _make_match_full()
    no_team = _make_match_full(home_team=None, home_team_id=None)
    no_date = _make_match_full(date=None, kickoff_utc=None)
    df = tm.matches_to_dataframe([good, no_team, no_date])
    assert len(df) == 1


# ---------------------------------------------------------------------------
# persist_params — malformed fitted_at falls back to now
# ---------------------------------------------------------------------------


def test_persist_params_uses_now_when_fitted_at_malformed(tmp_path) -> None:
    params: dict[str, Any] = {
        "attack": {"T1": 0.1},
        "defense": {"T1": 0.2},
        "home_advantage": 0.25,
        "rho": -0.05,
        "fitted_at": "not-a-date",
    }
    dest = tm.persist_params(params, tmp_path)
    assert dest.exists()
    assert dest.name.startswith("params_")


# ---------------------------------------------------------------------------
# main_async error paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_main_async_returns_1_when_fetch_raises() -> None:
    args = _good_args()
    with (
        patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://stub/db"}),
        patch(
            "scoutedge_intelligence.scripts.train_ml.create_async_engine",
            return_value=MagicMock(),
        ),
        patch("scoutedge_intelligence.scripts.train_ml.async_sessionmaker") as sm_factory,
    ):
        # Make session_factory() raise when entered.
        session_cm = MagicMock()
        session_cm.__aenter__ = AsyncMock(side_effect=RuntimeError("db down"))
        session_cm.__aexit__ = AsyncMock(return_value=False)
        sm_factory.return_value = MagicMock(return_value=session_cm)

        code = await tm.main_async(args)

    assert code == 1


def _patch_db_session(matches: list[Any]):
    """Build patches that wire fetch_matches via a real async-context session."""
    return [
        patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://stub/db"}),
        patch(
            "scoutedge_intelligence.scripts.train_ml.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.train_ml.fetch_matches",
            new=AsyncMock(return_value=matches),
        ),
    ]


@pytest.mark.asyncio
async def test_main_async_returns_1_when_model_fit_raises() -> None:
    args = _good_args(dry_run=True)
    matches = [_make_match_full() for _ in range(5)]

    with (
        patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://stub/db"}),
        patch(
            "scoutedge_intelligence.scripts.train_ml.create_async_engine",
            return_value=MagicMock(),
        ),
        patch("scoutedge_intelligence.scripts.train_ml.async_sessionmaker") as sm_factory,
        patch(
            "scoutedge_intelligence.scripts.train_ml.fetch_matches",
            new=AsyncMock(return_value=matches),
        ),
        patch("scoutedge_intelligence.scripts.train_ml.DixonColesModel") as model_cls,
    ):
        session_cm = MagicMock()
        session_cm.__aenter__ = AsyncMock(return_value=MagicMock())
        session_cm.__aexit__ = AsyncMock(return_value=False)
        sm_factory.return_value = MagicMock(return_value=session_cm)

        instance = MagicMock()
        instance.fit = MagicMock(side_effect=RuntimeError("fit boom"))
        model_cls.return_value = instance

        code = await tm.main_async(args)

    assert code == 1


@pytest.mark.asyncio
async def test_main_async_returns_1_when_params_is_none() -> None:
    args = _good_args(dry_run=True)
    matches = [_make_match_full() for _ in range(5)]

    with (
        patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://stub/db"}),
        patch(
            "scoutedge_intelligence.scripts.train_ml.create_async_engine",
            return_value=MagicMock(),
        ),
        patch("scoutedge_intelligence.scripts.train_ml.async_sessionmaker") as sm_factory,
        patch(
            "scoutedge_intelligence.scripts.train_ml.fetch_matches",
            new=AsyncMock(return_value=matches),
        ),
        patch("scoutedge_intelligence.scripts.train_ml.DixonColesModel") as model_cls,
    ):
        session_cm = MagicMock()
        session_cm.__aenter__ = AsyncMock(return_value=MagicMock())
        session_cm.__aexit__ = AsyncMock(return_value=False)
        sm_factory.return_value = MagicMock(return_value=session_cm)

        instance = MagicMock()
        instance.fit = MagicMock(return_value=None)
        instance.params = None
        model_cls.return_value = instance

        code = await tm.main_async(args)

    assert code == 1


@pytest.mark.asyncio
async def test_main_async_returns_1_when_persist_raises() -> None:
    args = _good_args(dry_run=False)
    matches = [_make_match_full() for _ in range(5)]

    fake_params = SimpleNamespace(
        attack={"T1": 0.0},
        defense={"T1": 0.0},
        home_advantage=0.25,
        rho=-0.05,
    )

    with (
        patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://stub/db"}),
        patch(
            "scoutedge_intelligence.scripts.train_ml.create_async_engine",
            return_value=MagicMock(),
        ),
        patch("scoutedge_intelligence.scripts.train_ml.async_sessionmaker") as sm_factory,
        patch(
            "scoutedge_intelligence.scripts.train_ml.fetch_matches",
            new=AsyncMock(return_value=matches),
        ),
        patch("scoutedge_intelligence.scripts.train_ml.DixonColesModel") as model_cls,
        patch(
            "scoutedge_intelligence.scripts.train_ml.persist_params",
            side_effect=OSError("disk full"),
        ),
    ):
        session_cm = MagicMock()
        session_cm.__aenter__ = AsyncMock(return_value=MagicMock())
        session_cm.__aexit__ = AsyncMock(return_value=False)
        sm_factory.return_value = MagicMock(return_value=session_cm)

        instance = MagicMock()
        instance.fit = MagicMock(return_value=None)
        instance.params = fake_params
        model_cls.return_value = instance

        code = await tm.main_async(args)

    assert code == 1


# ---------------------------------------------------------------------------
# Sync entry point
# ---------------------------------------------------------------------------


def test_main_forwards_exit_code() -> None:
    fake_args = MagicMock()
    with (
        patch(
            "scoutedge_intelligence.scripts.train_ml.parse_args",
            return_value=fake_args,
        ),
        patch(
            "scoutedge_intelligence.scripts.train_ml.asyncio.run",
            return_value=7,
        ),
    ):
        assert tm.main() == 7
