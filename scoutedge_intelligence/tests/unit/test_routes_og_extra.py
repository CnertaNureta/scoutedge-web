"""Extra coverage for api.routes.og: paths missed by test_routes_bracket_og.

Targets:
- /og/match/{id} when claude_pick == "away" → predicted_winner uses away_team
- /og/match/{id} when claude_pick is some other string → falls through else branch
- /og/bracket/{fork_id} → 404 when fork is missing
- /og/bracket/{fork_id} when max_possible is None → alternate "title · ScoutEdge ..." headline
- /og/slayer/{user_id} when user has no recorded picks → headline contains "no picks recorded"
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_db_session
from api.routes.og import router as og_router


def _scalar_result(value: Any) -> MagicMock:
    scalars = MagicMock()
    scalars.first.return_value = value
    scalars.all.return_value = [] if value is None else [value]
    result = MagicMock()
    result.scalars.return_value = scalars
    return result


def _scalars_all_result(items: list[Any]) -> MagicMock:
    scalars = MagicMock()
    scalars.all.return_value = items
    scalars.first.return_value = items[0] if items else None
    result = MagicMock()
    result.scalars.return_value = scalars
    return result


def _make_app(mock_session: AsyncMock) -> FastAPI:
    app = FastAPI()
    app.include_router(og_router)

    async def _get_session():  # type: ignore[return]
        yield mock_session

    app.dependency_overrides[get_db_session] = _get_session
    return app


def _fake_match() -> MagicMock:
    import datetime

    m = MagicMock()
    m.id = "m-1"
    m.home_team_id = "BRA"
    m.away_team_id = "ARG"
    m.kickoff_utc = datetime.datetime(2026, 6, 14, 18, 0, tzinfo=datetime.UTC)
    m.stage = "final"
    m.venue_city = "New York"
    return m


# ---------------------------------------------------------------------------
# /og/match — away-pick branch
# ---------------------------------------------------------------------------


def test_og_match_away_pick_uses_away_team() -> None:
    pred = MagicMock()
    pred.claude_pick = "away"
    pred.blended_home_win_prob = 0.30
    pred.blended_away_win_prob = 0.50

    session = AsyncMock()
    call_index = 0

    async def _execute(*args: Any, **kwargs: Any) -> MagicMock:
        nonlocal call_index
        call_index += 1
        return _scalar_result(_fake_match()) if call_index == 1 else _scalar_result(pred)

    session.execute = AsyncMock(side_effect=_execute)

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/match/m-1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["predicted_winner"] == "ARG"
    assert body["predicted_p_win"] == 0.5


def test_og_match_unknown_pick_falls_through_else_branch() -> None:
    pred = MagicMock()
    pred.claude_pick = "draw"
    pred.blended_home_win_prob = 0.40
    pred.blended_away_win_prob = 0.30

    session = AsyncMock()
    call_index = 0

    async def _execute(*args: Any, **kwargs: Any) -> MagicMock:
        nonlocal call_index
        call_index += 1
        return _scalar_result(_fake_match()) if call_index == 1 else _scalar_result(pred)

    session.execute = AsyncMock(side_effect=_execute)

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/match/m-1")
    assert resp.status_code == 200
    body = resp.json()
    # else-branch: predicted_winner stays as raw claude_pick ("draw"); p_win
    # falls back to home_win prob.
    assert body["predicted_winner"] == "draw"
    assert body["predicted_p_win"] == 0.4


# ---------------------------------------------------------------------------
# /og/bracket — 404 + alt-headline
# ---------------------------------------------------------------------------


def test_og_bracket_missing_returns_404() -> None:
    session = AsyncMock()
    session.execute = AsyncMock(return_value=_scalar_result(None))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/bracket/missing")
    assert resp.status_code == 404


def test_og_bracket_no_max_possible_uses_title_headline() -> None:
    fork = MagicMock()
    fork.id = "f-1"
    fork.user_id = "u-1"
    fork.title = "My Bold Bracket"
    fork.points_earned = 0
    fork.max_possible = None
    fork.rank_global = None
    fork.rank_percentile = None

    session = AsyncMock()
    session.execute = AsyncMock(return_value=_scalar_result(fork))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/bracket/f-1")

    assert resp.status_code == 200
    headline = resp.json()["headline"]
    assert "My Bold Bracket" in headline
    assert "ScoutEdge" in headline


# ---------------------------------------------------------------------------
# /og/slayer — empty picks
# ---------------------------------------------------------------------------


def test_og_slayer_no_picks_yields_zero_accuracy_headline() -> None:
    session = AsyncMock()
    session.execute = AsyncMock(return_value=_scalars_all_result([]))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/slayer/00000000-1111-2222-3333-444444444444")

    assert resp.status_code == 200
    body = resp.json()
    assert body["total_picks"] == 0
    assert body["correct_picks"] == 0
    assert body["accuracy_pct"] == 0.0
    assert "no picks recorded" in body["headline"]
