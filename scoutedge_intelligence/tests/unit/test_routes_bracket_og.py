"""Unit tests for bracket + OG-metadata FastAPI routes (task P5.4).

Test inventory (≥ 9 tests):
 1.  GET /api/bracket/base  happy path → 200 with stages dict
 2.  GET /api/bracket/base  with no DB predictions → returns skeleton
 3.  POST /api/bracket/fork  happy path → 200 with id + share_url
 4.  POST /api/bracket/fork  retries on IntegrityError, then succeeds
 5.  POST /api/bracket/fork  increments parent fork_count when parent_fork_id given
 6.  GET /api/bracket/{fork_id}  → 404 when fork not found
 7.  GET /api/bracket/{fork_id}  → 200 with bracket_data when found
 8.  GET /og/match/{id}  returns expected OG fields (happy path)
 9.  GET /og/match/{id}  → 404 when match not found
10.  GET /og/bracket/{fork_id}  → 200 with bracket-shaped metadata
11.  GET /og/slayer/{user_id}  → 200 happy path with accuracy stats

All tests use FastAPI TestClient with a fully mocked AsyncSession so that
no real database connection is required.
"""

from __future__ import annotations

import datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from api.deps import Settings
from api.routes.bracket import (
    _build_skeleton_bracket,
    _new_fork_id,
)
from api.routes.bracket import (
    router as bracket_router,
)
from api.routes.og import (
    _badge_tier,
    _make_match_headline,
)
from api.routes.og import (
    router as og_router,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime.datetime(2026, 6, 14, 15, 0, 0, tzinfo=datetime.UTC)


def _stub_settings(**overrides: Any) -> Settings:
    """Return a test-safe Settings instance (no real DB / API keys)."""
    defaults: dict[str, Any] = {
        "database_url": "sqlite+aiosqlite:///./test_bracket_og.db",
        "redis_url": "redis://localhost:6379",
        "cors_origins": ["http://localhost:3000"],
        "api_key": None,
        "rate_limit_per_minute": 120,
        "log_level": "DEBUG",
    }
    defaults.update(overrides)
    return Settings.model_construct(**defaults)


def _make_app(mock_session: AsyncMock) -> FastAPI:
    """Build a minimal FastAPI app with bracket + og routers and a mocked session."""
    app = FastAPI()
    app.include_router(bracket_router)
    app.include_router(og_router)

    async def _get_session() -> AsyncMock:  # type: ignore[return]
        yield mock_session

    # Override the DbSession dependency on both routers
    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _get_session
    return app


def _make_mock_session() -> AsyncMock:
    """Return a fully mocked AsyncSession."""
    session = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


def _scalar_result(value: Any) -> MagicMock:
    """Build a mock execute() return whose .scalars().first() returns value."""
    scalars_mock = MagicMock()
    scalars_mock.first.return_value = value
    scalars_mock.all.return_value = [] if value is None else [value]
    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock
    return result_mock


def _scalars_all_result(items: list[Any]) -> MagicMock:
    """Build a mock execute() return whose .scalars().all() returns items."""
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = items
    scalars_mock.first.return_value = items[0] if items else None
    result_mock = MagicMock()
    result_mock.scalars.return_value = scalars_mock
    return result_mock


def _fake_fork(
    fork_id: str = "abc12345",
    user_id: str = "user-001",
    parent_fork_id: str | None = None,
) -> MagicMock:
    """Return a mock BracketFork ORM object."""
    fork = MagicMock()
    fork.id = fork_id
    fork.user_id = user_id
    fork.parent_fork_id = parent_fork_id
    fork.bracket_state = {"stages": {"group": []}}
    fork.points_earned = 42
    fork.max_possible = 100
    fork.rank_global = 3
    fork.rank_percentile = 95.5
    fork.title = "My Bracket"
    fork.created_at = _NOW
    return fork


def _fake_match(match_id: str = "match-001") -> MagicMock:
    """Return a mock Match ORM object."""
    match = MagicMock()
    match.id = match_id
    match.home_team_id = "BRA"
    match.away_team_id = "ARG"
    match.kickoff_utc = _NOW
    match.stage = "final"
    match.venue_city = "New York"
    return match


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


def _fake_prediction() -> MagicMock:
    """Return a mock Prediction ORM object."""
    pred = MagicMock()
    pred.claude_pick = "home"
    pred.blended_home_win_prob = 0.56
    pred.blended_away_win_prob = 0.30
    return pred


def _fake_user_pick(outcome: str = "home_win", actual: str = "home_win") -> MagicMock:
    pick = MagicMock()
    pick.pick_outcome = outcome
    pick.actual_outcome = actual
    return pick


# ---------------------------------------------------------------------------
# Test 1: GET /api/bracket/base  happy path → 200 with stages dict
# ---------------------------------------------------------------------------


def test_get_base_bracket_happy_path() -> None:
    """GET /api/bracket/base returns 200 and a stages dict with all required keys."""
    session = _make_mock_session()
    # Simulate DB returning some predictions
    pred = _fake_prediction()
    session.execute = AsyncMock(return_value=_scalars_all_result([pred]))

    app = _make_app(session)
    with TestClient(app) as client:
        response = client.get("/api/bracket/base")

    assert response.status_code == 200
    body = response.json()
    assert "version" in body
    assert "stages" in body
    stages = body["stages"]
    for key in ("group", "r16", "qf", "sf", "final"):
        assert key in stages, f"Missing key '{key}' in stages"


# ---------------------------------------------------------------------------
# Test 2: GET /api/bracket/base  no predictions → returns skeleton
# ---------------------------------------------------------------------------


def test_get_base_bracket_no_predictions_returns_skeleton() -> None:
    """GET /api/bracket/base with empty DB returns placeholder skeleton."""
    session = _make_mock_session()
    session.execute = AsyncMock(return_value=_scalars_all_result([]))

    app = _make_app(session)
    with TestClient(app) as client:
        response = client.get("/api/bracket/base")

    assert response.status_code == 200
    body = response.json()
    stages = body["stages"]
    # Skeleton should have 8 groups
    assert len(stages["group"]) == 8
    # First group code should be "A"
    assert stages["group"][0]["group"] == "A"
    # Skeleton uses placeholder team codes like "A1"
    assert "A1" in stages["group"][0]["teams"]


# ---------------------------------------------------------------------------
# Test 3: POST /api/bracket/fork  happy path → 200 with id + share_url
# ---------------------------------------------------------------------------


def test_post_fork_happy_path() -> None:
    """POST /api/bracket/fork returns 200 with a non-empty id and share_url."""
    session = _make_mock_session()
    session.execute = AsyncMock(return_value=MagicMock())

    app = _make_app(session)
    payload = {
        "user_id": "user-abc",
        "parent_fork_id": None,
        "bracket_data": {"stages": {}},
        "forked_at_match_id": None,
    }
    with TestClient(app) as client:
        response = client.post("/api/bracket/fork", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body.get("id")
    assert body["share_url"].startswith("/bracket/")
    assert body["id"] in body["share_url"]


# ---------------------------------------------------------------------------
# Test 4: POST /api/bracket/fork  retries on IntegrityError, then succeeds
# ---------------------------------------------------------------------------


def test_post_fork_retries_on_integrity_error() -> None:
    """POST /api/bracket/fork retries id generation when IntegrityError is raised."""
    session = _make_mock_session()

    call_count = 0

    async def _side_effect(*args: Any, **kwargs: Any) -> MagicMock:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # Simulate insert; raise on flush
            return MagicMock()
        return MagicMock()

    # Make flush raise IntegrityError on the first attempt only
    flush_call = 0

    async def _flush_side_effect() -> None:
        nonlocal flush_call
        flush_call += 1
        if flush_call == 1:
            raise IntegrityError("UNIQUE constraint failed", params={}, orig=None)

    session.execute = AsyncMock(side_effect=_side_effect)
    session.flush = AsyncMock(side_effect=_flush_side_effect)

    app = _make_app(session)
    payload = {
        "user_id": "user-retry",
        "parent_fork_id": None,
        "bracket_data": {},
        "forked_at_match_id": None,
    }
    with TestClient(app) as client:
        response = client.post("/api/bracket/fork", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["id"]


# ---------------------------------------------------------------------------
# Test 5: POST /api/bracket/fork  increments parent share_count
# ---------------------------------------------------------------------------


def test_post_fork_increments_parent_fork_count() -> None:
    """When parent_fork_id is given, an UPDATE to increment fork_count is executed."""
    session = _make_mock_session()
    execute_calls: list[Any] = []

    async def _execute_side_effect(stmt: Any, *args: Any, **kwargs: Any) -> MagicMock:
        execute_calls.append(stmt)
        return MagicMock()

    session.execute = AsyncMock(side_effect=_execute_side_effect)

    app = _make_app(session)
    payload = {
        "user_id": "user-child",
        "parent_fork_id": "parent-id-001",
        "bracket_data": {"stages": {}},
        "forked_at_match_id": None,
    }
    with TestClient(app) as client:
        response = client.post("/api/bracket/fork", json=payload)

    assert response.status_code == 200
    # There should be at least 2 execute calls: INSERT + UPDATE
    assert len(execute_calls) >= 2


# ---------------------------------------------------------------------------
# Test 6: GET /api/bracket/{fork_id}  → 404 when fork not found
# ---------------------------------------------------------------------------


def test_get_fork_not_found_returns_404() -> None:
    """GET /api/bracket/{fork_id} returns 404 when the fork doesn't exist."""
    session = _make_mock_session()
    session.execute = AsyncMock(return_value=_scalar_result(None))

    app = _make_app(session)
    with TestClient(app) as client:
        response = client.get("/api/bracket/nonexistent-id")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 7: GET /api/bracket/{fork_id}  → 200 with bracket_data when found
# ---------------------------------------------------------------------------


def test_get_fork_found_returns_200() -> None:
    """GET /api/bracket/{fork_id} returns 200 with bracket_data when found."""
    session = _make_mock_session()
    fork = _fake_fork(fork_id="testfork1")
    session.execute = AsyncMock(return_value=_scalar_result(fork))

    app = _make_app(session)
    with TestClient(app) as client:
        response = client.get("/api/bracket/testfork1")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "testfork1"
    assert "bracket_data" in body
    assert "parent_fork_id" in body


# ---------------------------------------------------------------------------
# Test 8: GET /og/match/{id}  returns expected OG fields (happy path)
# ---------------------------------------------------------------------------


def test_og_match_happy_path() -> None:
    """GET /og/match/{id} returns OG metadata with team display names."""
    session = _make_mock_session()
    match = _fake_match("match-finale")
    # Use UUID-shaped FKs so the team-resolution path is exercised.
    match.home_team_id = "9f6d3687-b7a6-4fbe-a08e-c38e1b77141e"
    match.away_team_id = "bdb6a429-3a49-4897-85f5-396554e98bd5"
    home_team = _fake_team(match.home_team_id, "Argentina")
    away_team = _fake_team(match.away_team_id, "France")
    pred = _fake_prediction()

    call_index = 0

    async def _execute(*args: Any, **kwargs: Any) -> MagicMock:
        nonlocal call_index
        call_index += 1
        # og_match query order: match → home_team → away_team → prediction.
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
        response = client.get("/og/match/match-finale")

    assert response.status_code == 200
    body = response.json()
    required = {
        "match_id",
        "home_team",
        "away_team",
        "kickoff_utc",
        "stage",
        "venue_city",
        "predicted_winner",
        "predicted_p_win",
        "headline",
        "ts",
    }
    assert required <= body.keys()
    assert body["match_id"] == "match-finale"
    assert body["home_team"] == "Argentina"
    assert body["away_team"] == "France"
    # Regression guard for the UUID-leak bug: the headline must contain the
    # readable names, never the raw FK UUIDs.
    assert "Argentina" in body["headline"]
    assert match.home_team_id not in body["headline"]
    assert match.away_team_id not in body["headline"]


# ---------------------------------------------------------------------------
# Test 9: GET /og/match/{id}  → 404 when match not found
# ---------------------------------------------------------------------------


def test_og_match_not_found_returns_404() -> None:
    """GET /og/match/{id} returns 404 when the match doesn't exist."""
    session = _make_mock_session()
    session.execute = AsyncMock(return_value=_scalar_result(None))

    app = _make_app(session)
    with TestClient(app) as client:
        response = client.get("/og/match/does-not-exist")

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Test 10: GET /og/bracket/{fork_id}  → 200 with bracket-shaped metadata
# ---------------------------------------------------------------------------


def test_og_bracket_returns_metadata() -> None:
    """GET /og/bracket/{fork_id} returns 200 with bracket OG metadata."""
    session = _make_mock_session()
    fork = _fake_fork(fork_id="bracketfork1")
    session.execute = AsyncMock(return_value=_scalar_result(fork))

    app = _make_app(session)
    with TestClient(app) as client:
        response = client.get("/og/bracket/bracketfork1")

    assert response.status_code == 200
    body = response.json()
    assert body["fork_id"] == "bracketfork1"
    assert "headline" in body
    assert "ts" in body
    assert "share_url" in body
    assert body["share_url"] == "/bracket/bracketfork1"


# ---------------------------------------------------------------------------
# Test 11: GET /og/slayer/{user_id}  happy path
# ---------------------------------------------------------------------------


def test_og_slayer_happy_path() -> None:
    """GET /og/slayer/{user_id} returns 200 with accuracy stats and badge tier."""
    session = _make_mock_session()
    picks = [
        _fake_user_pick("home_win", "home_win"),  # correct
        _fake_user_pick("home_win", "home_win"),  # correct
        _fake_user_pick("away_win", "home_win"),  # wrong
        _fake_user_pick("draw", "away_win"),  # wrong
    ]
    session.execute = AsyncMock(return_value=_scalars_all_result(picks))

    app = _make_app(session)
    with TestClient(app) as client:
        response = client.get("/og/slayer/user-slayer-001")

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == "user-slayer-001"
    assert body["total_picks"] == 4
    assert body["correct_picks"] == 2
    assert body["accuracy_pct"] == 50.0
    assert body["badge_tier"] in ("bronze", "silver", "gold", "platinum")
    assert "headline" in body
    assert "ts" in body


# ---------------------------------------------------------------------------
# Unit tests for pure helper functions
# ---------------------------------------------------------------------------


def test_build_skeleton_bracket_structure() -> None:
    """_build_skeleton_bracket returns a BracketStages with correct lengths."""
    stages = _build_skeleton_bracket()
    assert len(stages.group) == 8
    assert len(stages.r16) == 8
    assert len(stages.qf) == 4
    assert len(stages.sf) == 2
    assert stages.final.predicted_winner == "A1"


def test_new_fork_id_length() -> None:
    """_new_fork_id returns an ~8-char URL-safe string without padding."""
    fork_id = _new_fork_id()
    assert len(fork_id) >= 7
    # Must be URL-safe (no + or / from standard base64)
    assert "+" not in fork_id
    assert "/" not in fork_id


def test_make_match_headline_with_winner() -> None:
    """_make_match_headline composes a percentage headline when winner + p_win given."""
    headline = _make_match_headline("BRA", "ARG", "BRA", 0.56)
    assert "BRA" in headline
    assert "56%" in headline
    assert "ARG" in headline


def test_make_match_headline_no_winner() -> None:
    """_make_match_headline falls back to 'X vs Y' when no winner data."""
    headline = _make_match_headline("ENG", "FRA", None, None)
    assert "ENG" in headline and "FRA" in headline


def test_badge_tier_thresholds() -> None:
    """_badge_tier returns correct tier for each accuracy band."""
    assert _badge_tier(80.0) == "platinum"
    assert _badge_tier(75.0) == "platinum"
    assert _badge_tier(74.9) == "gold"
    assert _badge_tier(60.0) == "gold"
    assert _badge_tier(59.9) == "silver"
    assert _badge_tier(45.0) == "silver"
    assert _badge_tier(44.9) == "bronze"
    assert _badge_tier(0.0) == "bronze"
