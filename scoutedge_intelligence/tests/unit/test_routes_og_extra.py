"""Extra coverage for api.routes.og: paths missed by test_routes_bracket_og.

Targets:
- /og/match/{id} when claude_pick == "away" → predicted_winner uses away_team
- /og/match/{id} prefers recommended_pick when claude_pick is reused metadata
- /og/match/{id} when claude_pick is a legacy team code → uses matching probability
- /og/match/{id} when the pick is "draw" → predicted_winner uses draw probability
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


def _fake_team(team_id: str, name: str) -> MagicMock:
    """Return a mock Team ORM object compatible with TeamSchema.model_validate.

    Note: MagicMock reserves the ``name`` attribute for its own repr; assigning
    via ``configure_mock`` is required to actually override it.
    """
    t = MagicMock()
    t.configure_mock(
        id=team_id,
        name=name,
        fifa_code=None,
        base_altitude_m=None,
        squad_avg_age=None,
        avg_caps=None,
        wc_appearances=0,
        prev_wc_best=None,
        home_continent=None,
        style_tags=[],
        press_intensity=None,
        defensive_block=None,
        transition_speed=None,
    )
    return t


def _seq_execute(match: Any, pred: Any) -> Any:
    """Build an execute side_effect matching og_match's query order:

    1. match lookup → match
    2. home_team lookup → None (route falls back to match.home_team_id)
    3. away_team lookup → None (route falls back to match.away_team_id)
    4. prediction lookup → pred
    """

    call_index = 0

    async def _execute(*args: Any, **kwargs: Any) -> MagicMock:
        nonlocal call_index
        call_index += 1
        if call_index == 1:
            return _scalar_result(match)
        if call_index in (2, 3):
            return _scalar_result(None)
        return _scalar_result(pred)

    return _execute


# ---------------------------------------------------------------------------
# /og/match — away-pick branch
# ---------------------------------------------------------------------------


def test_og_match_resolves_team_uuids_to_names() -> None:
    """Regression test: GET /og/match returns team display names, not raw FK UUIDs.

    Reproduces the WC2022 Argentina-vs-France final bug where the response body
    contained `"home_team": "9f6d3687-..."` and `"headline": "9f6d... vs bdb6..."`
    instead of the readable team names.
    """
    home_id = "9f6d3687-b7a6-4fbe-a08e-c38e1b77141e"
    away_id = "bdb6a429-3a49-4897-85f5-396554e98bd5"

    match = _fake_match()
    match.home_team_id = home_id
    match.away_team_id = away_id

    home_team = _fake_team(home_id, "Argentina")
    away_team = _fake_team(away_id, "France")

    pred = MagicMock()
    pred.claude_pick = "home"
    pred.blended_home_win_prob = 0.55
    pred.blended_away_win_prob = 0.30

    session = AsyncMock()
    call_index = 0

    async def _execute(*args: Any, **kwargs: Any) -> MagicMock:
        nonlocal call_index
        call_index += 1
        if call_index == 1:
            return _scalar_result(match)
        if call_index == 2:
            return _scalar_result(home_team)
        if call_index == 3:
            return _scalar_result(away_team)
        return _scalar_result(pred)

    session.execute = AsyncMock(side_effect=_execute)

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get(f"/og/match/{match.id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["home_team"] == "Argentina"
    assert body["away_team"] == "France"
    assert "Argentina" in body["headline"]
    assert "France" in body["headline"]
    assert home_id not in body["headline"]
    assert away_id not in body["headline"]
    assert body["home_team"] != home_id
    assert body["away_team"] != away_id


def test_og_match_missing_team_rows_do_not_leak_uuid_fallbacks() -> None:
    home_id = "9f6d3687-b7a6-4fbe-a08e-c38e1b77141e"
    away_id = "bdb6a429-3a49-4897-85f5-396554e98bd5"

    match = _fake_match()
    match.home_team_id = home_id
    match.away_team_id = away_id

    session = AsyncMock()
    session.execute = AsyncMock(side_effect=_seq_execute(match, None))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get(f"/og/match/{match.id}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["home_team"] == "HOME"
    assert body["away_team"] == "AWAY"
    assert home_id not in body["headline"]
    assert away_id not in body["headline"]


def test_og_match_prefers_recommended_pick_over_claude_pick() -> None:
    pred = MagicMock()
    pred.recommended_pick = "away_win"
    pred.claude_pick = "high"
    pred.blended_home_win_prob = 0.30
    pred.blended_away_win_prob = 0.50

    session = AsyncMock()
    session.execute = AsyncMock(side_effect=_seq_execute(_fake_match(), pred))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/match/m-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["predicted_winner"] == "ARG"
    assert body["predicted_p_win"] == 0.5
    assert "high" not in body["headline"]


def test_og_match_legacy_team_code_pick_uses_matching_probability() -> None:
    pred = MagicMock()
    pred.claude_pick = "ARG"
    pred.blended_home_win_prob = 0.30
    pred.blended_away_win_prob = 0.50

    session = AsyncMock()
    session.execute = AsyncMock(side_effect=_seq_execute(_fake_match(), pred))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/match/m-1")

    assert resp.status_code == 200
    body = resp.json()
    assert body["predicted_winner"] == "ARG"
    assert body["predicted_p_win"] == 0.5


def test_og_match_away_pick_uses_away_team() -> None:
    pred = MagicMock()
    pred.claude_pick = "away"
    pred.blended_home_win_prob = 0.30
    pred.blended_away_win_prob = 0.50

    session = AsyncMock()
    session.execute = AsyncMock(side_effect=_seq_execute(_fake_match(), pred))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/match/m-1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["predicted_winner"] == "ARG"
    assert body["predicted_p_win"] == 0.5


def test_og_match_latest_prediction_query_puts_null_timestamps_last() -> None:
    pred = MagicMock()
    pred.claude_pick = "home"
    pred.blended_home_win_prob = 0.62
    pred.blended_away_win_prob = 0.20

    session = AsyncMock()
    session.execute = AsyncMock(side_effect=_seq_execute(_fake_match(), pred))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/match/m-1")

    assert resp.status_code == 200
    # Prediction query is the 4th execute call (after match + 2 team lookups).
    latest_prediction_query = session.execute.await_args_list[3].args[0]
    assert "NULLS LAST" in str(latest_prediction_query)


def test_og_match_draw_pick_uses_draw_probability() -> None:
    pred = MagicMock()
    pred.claude_pick = "draw"
    pred.blended_home_win_prob = 0.40
    pred.blended_draw_prob = 0.30
    pred.blended_away_win_prob = 0.30

    session = AsyncMock()
    session.execute = AsyncMock(side_effect=_seq_execute(_fake_match(), pred))

    app = _make_app(session)
    with TestClient(app) as client:
        resp = client.get("/og/match/m-1")
    assert resp.status_code == 200
    body = resp.json()
    assert body["predicted_winner"] == "Draw"
    assert body["predicted_p_win"] == 0.3
    assert "30% draw" in body["headline"]


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
