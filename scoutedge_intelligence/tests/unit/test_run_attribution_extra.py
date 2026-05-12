"""Extra coverage for run_attribution: paths missed by test_run_attribution.

Targets:
- find_pending_matches filters out already-audited matches
- _derive_outcome branches: home_win, away_win, draw
- _derive_outcome raises when goals are None
- attribute_one returns ok=False when match not found
- run() returns early when DATABASE_URL env var is missing
- run() with explicit --match-id (single-match branch)
- main() exits 0 on success and 1 when all matches fail
"""

from __future__ import annotations

import os
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.db.models import MatchSchema
from scoutedge_intelligence.scripts.run_attribution import (
    _derive_outcome,
    attribute_one,
    find_pending_matches,
    main,
    run,
)


def _match(mid: str, *, home: int = 2, away: int = 1) -> MatchSchema:
    return MatchSchema(
        id=mid,
        finished=True,
        finished_at=datetime(2026, 6, 15, 20, 0, tzinfo=UTC),
        home_goals=home,
        away_goals=away,
    )


# ---------------------------------------------------------------------------
# find_pending_matches
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_find_pending_matches_filters_audited() -> None:
    candidates = [_match("a"), _match("b"), _match("c")]
    # Existing audit rows for "a" and "c" — only "b" should remain pending.
    result = MagicMock()
    result.all.return_value = [("a",), ("c",)]
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)

    with patch(
        "scoutedge_intelligence.scripts.run_attribution.list_finished_matches",
        new=AsyncMock(return_value=candidates),
    ):
        pending = await find_pending_matches(
            session, since=datetime(2026, 6, 1, tzinfo=UTC), limit=10
        )

    assert [m.id for m in pending] == ["b"]


@pytest.mark.asyncio
async def test_find_pending_matches_short_circuits_when_empty() -> None:
    session = MagicMock()
    session.execute = AsyncMock()
    with patch(
        "scoutedge_intelligence.scripts.run_attribution.list_finished_matches",
        new=AsyncMock(return_value=[]),
    ):
        out = await find_pending_matches(session, since=datetime(2026, 6, 1, tzinfo=UTC), limit=10)
    assert out == []
    session.execute.assert_not_awaited()


# ---------------------------------------------------------------------------
# _derive_outcome
# ---------------------------------------------------------------------------


def test_derive_outcome_home_win() -> None:
    assert _derive_outcome(_match("m", home=3, away=1)) == "home_win"


def test_derive_outcome_away_win() -> None:
    assert _derive_outcome(_match("m", home=0, away=2)) == "away_win"


def test_derive_outcome_draw() -> None:
    assert _derive_outcome(_match("m", home=1, away=1)) == "draw"


def test_derive_outcome_raises_when_goals_none() -> None:
    bad = MatchSchema(id="m", finished=True, home_goals=None, away_goals=None)
    with pytest.raises(ValueError, match="cannot derive actual_outcome"):
        _derive_outcome(bad)


# ---------------------------------------------------------------------------
# attribute_one: match-not-found
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_attribute_one_returns_error_when_match_missing() -> None:
    session = MagicMock()
    with patch(
        "scoutedge_intelligence.scripts.run_attribution.get_match",
        new=AsyncMock(return_value=None),
    ):
        result = await attribute_one(session, "missing", dry_run=False)

    assert result["ok"] is False
    assert "not found" in (result["error"] or "")
    assert result["skipped_no_prediction"] is False


# ---------------------------------------------------------------------------
# run() — DATABASE_URL guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_returns_zero_totals_when_database_url_missing() -> None:
    args = MagicMock()
    args.lookback_hours = 24
    args.limit = 50
    args.dry_run = False
    args.match_id = None

    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("DATABASE_URL", None)
        totals = await run(args)

    assert totals == {"total": 0, "ok": 0, "failed": 0, "skipped_no_prediction": 0}


# ---------------------------------------------------------------------------
# run() — explicit --match-id branch
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_with_explicit_match_id_skips_pending_lookup() -> None:
    args = MagicMock()
    args.lookback_hours = 24
    args.limit = 50
    args.dry_run = True
    args.match_id = "m-only"

    # Build a session_factory that returns an async-context-manager session.
    session = MagicMock()
    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=session)
    session_cm.__aexit__ = AsyncMock(return_value=False)
    session_factory = MagicMock(return_value=session_cm)

    attribute_mock = AsyncMock(
        return_value={
            "ok": True,
            "error": None,
            "skipped_no_prediction": False,
            "match_id": "m-only",
        }
    )
    find_pending = AsyncMock()  # must NOT be called

    with (
        patch.dict(os.environ, {"DATABASE_URL": "postgresql+asyncpg://stub/db"}),
        patch(
            "scoutedge_intelligence.scripts.run_attribution.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.run_attribution.async_sessionmaker",
            return_value=session_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.run_attribution.find_pending_matches",
            new=find_pending,
        ),
        patch(
            "scoutedge_intelligence.scripts.run_attribution.attribute_one",
            new=attribute_mock,
        ),
    ):
        totals = await run(args)

    assert totals == {"total": 1, "ok": 1, "failed": 0, "skipped_no_prediction": 0}
    find_pending.assert_not_awaited()
    attribute_mock.assert_awaited_once()


# ---------------------------------------------------------------------------
# main()
# ---------------------------------------------------------------------------


def test_main_returns_0_when_some_succeed() -> None:
    fake_args = MagicMock()
    with (
        patch(
            "scoutedge_intelligence.scripts.run_attribution.parse_args",
            return_value=fake_args,
        ),
        patch(
            "scoutedge_intelligence.scripts.run_attribution.asyncio.run",
            return_value={"total": 3, "ok": 2, "failed": 1, "skipped_no_prediction": 0},
        ),
    ):
        assert main() == 0


def test_main_returns_1_when_all_fail() -> None:
    fake_args = MagicMock()
    with (
        patch(
            "scoutedge_intelligence.scripts.run_attribution.parse_args",
            return_value=fake_args,
        ),
        patch(
            "scoutedge_intelligence.scripts.run_attribution.asyncio.run",
            return_value={"total": 2, "ok": 0, "failed": 2, "skipped_no_prediction": 0},
        ),
    ):
        assert main() == 1


def test_main_returns_0_when_no_matches() -> None:
    fake_args = MagicMock()
    with (
        patch(
            "scoutedge_intelligence.scripts.run_attribution.parse_args",
            return_value=fake_args,
        ),
        patch(
            "scoutedge_intelligence.scripts.run_attribution.asyncio.run",
            return_value={"total": 0, "ok": 0, "failed": 0, "skipped_no_prediction": 0},
        ),
    ):
        assert main() == 0
