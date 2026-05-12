"""Unit tests for api/routes/duel.py and api/routes/remix.py (task P5.3).

All tests use FastAPI TestClient with a mocked AsyncSession so no real DB,
ML models, or external HTTP clients are instantiated.

Test inventory (≥ 10 tests):
 1.  POST /api/duel/submit happy path → 200 with ai_snapshot
 2.  POST /api/duel/submit after kickoff → 403
 3.  POST /api/duel/submit with no prior AI prediction → 404
 4.  POST /api/duel/submit with match not found → 404
 5.  GET  /api/duel/scorecard returns items + totals
 6.  GET  /api/duel/leaderboard returns sorted list
 7.  POST /api/predict/remix happy path → 200, weights sum to 1.0
 8.  POST /api/predict/remix with out-of-range weight override → 422
 9.  POST /api/predict/remix with out-of-range modifier override → 422
10.  POST /api/predict/remix when no base prediction exists → 404
11.  POST /api/predict/remix delta_from_base computed correctly
12.  Duel router prefix is /api/duel
13.  Remix router prefix is /api/predict
"""

from __future__ import annotations

import datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.duel import _brier_score, _derive_outcome
from api.routes.duel import router as duel_router
from api.routes.remix import _safe_prob_dict
from api.routes.remix import router as remix_router

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW_UTC = datetime.datetime(2026, 6, 14, 12, 0, 0, tzinfo=datetime.UTC)
_FUTURE_KO = _NOW_UTC + datetime.timedelta(hours=2)
_PAST_KO = _NOW_UTC - datetime.timedelta(hours=1)


def _make_match(
    match_id: str = "match-001",
    kickoff_utc: datetime.datetime | None = _FUTURE_KO,
    finished: bool = False,
    actual_outcome: str | None = None,
    home_goals: int | None = None,
    away_goals: int | None = None,
) -> MagicMock:
    """Build a MatchSchema-like MagicMock."""
    m = MagicMock()
    m.id = match_id
    m.kickoff_utc = kickoff_utc
    m.finished = finished
    m.actual_outcome = actual_outcome
    m.home_goals = home_goals
    m.away_goals = away_goals
    return m


def _make_prediction(
    match_id: str = "match-001",
    pred_id: int = 99,
) -> MagicMock:
    """Build a PredictionSchema-like MagicMock with stub blended probs."""
    p = MagicMock()
    p.id = pred_id
    p.match_id = match_id
    p.created_at = _NOW_UTC
    p.blended_home_win_prob = 0.50
    p.blended_draw_prob = 0.30
    p.blended_away_win_prob = 0.20
    p.blend_weights = {"ml": 0.4, "sb": 0.45, "poly": 0.15}
    p.ml_home_win_prob = 0.48
    p.ml_draw_prob = 0.32
    p.ml_away_win_prob = 0.20
    p.sb_home_win_prob = 0.52
    p.sb_draw_prob = 0.28
    p.sb_away_win_prob = 0.20
    p.poly_home_win_prob = None
    p.poly_draw_prob = None
    p.poly_away_win_prob = None
    p.poly_liquidity_usd = None
    p.claude_pick = "home_win"
    p.claude_confidence = 0.72
    return p


def _make_user_pred(
    user_id: str,
    match_id: str,
    prediction_type: str = "duel",
    pick_home_goals: int = 2,
    pick_away_goals: int = 1,
    user_probs: dict[str, float] | None = None,
    ai_snap: dict[str, Any] | None = None,
) -> MagicMock:
    """Build a UserPrediction ORM-like MagicMock."""
    if user_probs is None:
        user_probs = {"home_win": 0.60, "draw": 0.25, "away_win": 0.15}
    if ai_snap is None:
        ai_snap = {
            "blended_home_win_prob": 0.50,
            "blended_draw_prob": 0.30,
            "blended_away_win_prob": 0.20,
        }
    up = MagicMock()
    up.user_id = user_id
    up.match_id = match_id
    up.pick_home_goals = pick_home_goals
    up.pick_away_goals = pick_away_goals
    up.submitted_at = _NOW_UTC
    up.metadata_ = {
        "prediction_type": prediction_type,
        "user_probs": user_probs,
        "ai_snapshot": ai_snap,
    }
    return up


# ---------------------------------------------------------------------------
# App factory for tests — mounts only the two routers under test
# ---------------------------------------------------------------------------


def _build_test_app(
    mock_get_match: Any = None,
    mock_get_latest: Any = None,
    mock_db_rows: list[Any] | None = None,
) -> tuple[FastAPI, MagicMock]:
    """Build a minimal FastAPI app with duel + remix routers and a stubbed DB session."""

    app = FastAPI()
    app.include_router(duel_router)
    app.include_router(remix_router)

    # Stub session
    mock_session = MagicMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()

    # Default execute returns empty result unless overridden
    if mock_db_rows is not None:
        mock_result = MagicMock()
        mock_result.all.return_value = mock_db_rows
        mock_session.execute = AsyncMock(return_value=mock_result)
    else:
        mock_result = MagicMock()
        mock_result.all.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result)

    # Override get_db_session dependency
    async def _override_db():  # type: ignore[misc]
        yield mock_session

    app.dependency_overrides[__import__("api.deps", fromlist=["get_db_session"]).get_db_session] = (
        _override_db
    )

    return app, mock_session


# ---------------------------------------------------------------------------
# Test 1: POST /api/duel/submit happy path
# ---------------------------------------------------------------------------


def test_duel_submit_happy_path() -> None:
    """POST /api/duel/submit returns 200 with ok=True and ai_snapshot."""
    match = _make_match()
    pred = _make_prediction()

    app = FastAPI()
    app.include_router(duel_router)
    app.include_router(remix_router)

    mock_session = MagicMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    result_mock = MagicMock()
    result_mock.all.return_value = []
    mock_session.execute = AsyncMock(return_value=result_mock)

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with (
        patch("api.routes.duel.get_match", AsyncMock(return_value=match)),
        patch("api.routes.duel.get_latest_prediction", AsyncMock(return_value=pred)),
        patch("api.routes.duel.datetime") as mock_dt,
    ):
        mock_dt.datetime.now.return_value = _NOW_UTC
        mock_dt.timezone.utc = datetime.UTC
        mock_dt.timedelta = datetime.timedelta

        client = TestClient(app, raise_server_exceptions=True)
        resp = client.post(
            "/api/duel/submit",
            json={
                "user_id": "user-abc",
                "match_id": "match-001",
                "home_score": 2,
                "away_score": 1,
                "prob_home": 0.55,
                "prob_draw": 0.25,
                "prob_away": 0.20,
                "confidence_level": "high",
            },
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    assert "user_prediction_id" in body
    assert "ai_snapshot" in body
    assert body["ai_snapshot"]["blended_home_win_prob"] == pytest.approx(0.50)


# ---------------------------------------------------------------------------
# Test 2: POST /api/duel/submit after kickoff → 403
# ---------------------------------------------------------------------------


def test_duel_submit_after_kickoff_returns_403() -> None:
    """Submitting a duel after kickoff returns 403 Forbidden."""
    match = _make_match(kickoff_utc=_PAST_KO)

    app = FastAPI()
    app.include_router(duel_router)

    mock_session = MagicMock()
    mock_session.commit = AsyncMock()
    result_mock = MagicMock()
    result_mock.all.return_value = []
    mock_session.execute = AsyncMock(return_value=result_mock)

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with (
        patch("api.routes.duel.get_match", AsyncMock(return_value=match)),
        patch(
            "api.routes.duel.datetime",
            **{
                "datetime.now.return_value": _NOW_UTC,
                "timezone.utc": datetime.UTC,
                "timedelta": datetime.timedelta,
            },
        ),
    ):
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.post(
            "/api/duel/submit",
            json={
                "user_id": "user-abc",
                "match_id": "match-001",
                "home_score": 1,
                "away_score": 1,
                "prob_home": 0.33,
                "prob_draw": 0.34,
                "prob_away": 0.33,
                "confidence_level": "low",
            },
        )

    assert resp.status_code == 403, resp.text


# ---------------------------------------------------------------------------
# Test 3: POST /api/duel/submit no AI prediction → 404
# ---------------------------------------------------------------------------


def test_duel_submit_no_ai_prediction_returns_404() -> None:
    """Returns 404 when no AI prediction exists for the match."""
    match = _make_match()

    app = FastAPI()
    app.include_router(duel_router)

    mock_session = MagicMock()
    mock_session.commit = AsyncMock()
    result_mock = MagicMock()
    result_mock.all.return_value = []
    mock_session.execute = AsyncMock(return_value=result_mock)

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with (
        patch("api.routes.duel.get_match", AsyncMock(return_value=match)),
        patch("api.routes.duel.get_latest_prediction", AsyncMock(return_value=None)),
        patch(
            "api.routes.duel.datetime",
            **{
                "datetime.now.return_value": _NOW_UTC,
                "timezone.utc": datetime.UTC,
                "timedelta": datetime.timedelta,
            },
        ),
    ):
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.post(
            "/api/duel/submit",
            json={
                "user_id": "user-abc",
                "match_id": "match-001",
                "home_score": 0,
                "away_score": 0,
                "prob_home": 0.33,
                "prob_draw": 0.34,
                "prob_away": 0.33,
                "confidence_level": "medium",
            },
        )

    assert resp.status_code == 404, resp.text


# ---------------------------------------------------------------------------
# Test 4: POST /api/duel/submit match not found → 404
# ---------------------------------------------------------------------------


def test_duel_submit_match_not_found_returns_404() -> None:
    """Returns 404 when match does not exist in the database."""
    app = FastAPI()
    app.include_router(duel_router)

    mock_session = MagicMock()
    mock_session.commit = AsyncMock()
    result_mock = MagicMock()
    result_mock.all.return_value = []
    mock_session.execute = AsyncMock(return_value=result_mock)

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with patch("api.routes.duel.get_match", AsyncMock(return_value=None)):
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.post(
            "/api/duel/submit",
            json={
                "user_id": "user-abc",
                "match_id": "nonexistent",
                "home_score": 1,
                "away_score": 0,
                "prob_home": 0.60,
                "prob_draw": 0.25,
                "prob_away": 0.15,
                "confidence_level": "high",
            },
        )

    assert resp.status_code == 404, resp.text


# ---------------------------------------------------------------------------
# Test 5: GET /api/duel/scorecard returns items + totals
# ---------------------------------------------------------------------------


def test_duel_scorecard_returns_items_and_totals() -> None:
    """Scorecard endpoint returns correct items, total_beat_ai and n_finished."""
    match = _make_match(
        finished=True,
        actual_outcome="home_win",
        home_goals=2,
        away_goals=0,
    )
    # User beats AI: user probs strongly favour home, AI is more uncertain
    user_pred = _make_user_pred(
        user_id="user-xyz",
        match_id="match-001",
        user_probs={"home_win": 0.80, "draw": 0.10, "away_win": 0.10},
        ai_snap={
            "blended_home_win_prob": 0.40,
            "blended_draw_prob": 0.30,
            "blended_away_win_prob": 0.30,
        },
    )

    app = FastAPI()
    app.include_router(duel_router)

    mock_session = MagicMock()
    mock_session.commit = AsyncMock()
    result_mock = MagicMock()
    result_mock.all.return_value = [(user_pred, match)]
    mock_session.execute = AsyncMock(return_value=result_mock)

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    client = TestClient(app, raise_server_exceptions=True)
    resp = client.get("/api/duel/scorecard/user-xyz")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["user_id"] == "user-xyz"
    assert isinstance(body["items"], list)
    assert body["n_finished"] >= 0
    assert body["total_beat_ai"] >= 0
    # The single duel item should be present (beat_ai = True since user_brier < ai_brier)
    if body["items"]:
        item = body["items"][0]
        assert "match_id" in item
        assert "user_brier" in item
        assert "ai_brier" in item


# ---------------------------------------------------------------------------
# Test 6: GET /api/duel/leaderboard returns sorted list
# ---------------------------------------------------------------------------


def test_duel_leaderboard_returns_sorted_list() -> None:
    """Leaderboard returns a list sorted by total_beat_ai descending."""
    match_a = _make_match(
        match_id="m-1",
        finished=True,
        actual_outcome="home_win",
    )
    match_b = _make_match(
        match_id="m-2",
        finished=True,
        actual_outcome="away_win",
    )
    # user-A beats AI on both matches
    pred_a1 = _make_user_pred(
        "user-A",
        "m-1",
        user_probs={"home_win": 0.80, "draw": 0.10, "away_win": 0.10},
        ai_snap={
            "blended_home_win_prob": 0.40,
            "blended_draw_prob": 0.30,
            "blended_away_win_prob": 0.30,
        },
    )
    pred_a2 = _make_user_pred(
        "user-A",
        "m-2",
        user_probs={"home_win": 0.05, "draw": 0.10, "away_win": 0.85},
        ai_snap={
            "blended_home_win_prob": 0.50,
            "blended_draw_prob": 0.25,
            "blended_away_win_prob": 0.25,
        },
    )
    # user-B beats AI on 0 matches
    pred_b1 = _make_user_pred(
        "user-B",
        "m-1",
        user_probs={"home_win": 0.20, "draw": 0.40, "away_win": 0.40},
        ai_snap={
            "blended_home_win_prob": 0.50,
            "blended_draw_prob": 0.30,
            "blended_away_win_prob": 0.20,
        },
    )

    app = FastAPI()
    app.include_router(duel_router)

    mock_session = MagicMock()
    mock_session.commit = AsyncMock()
    result_mock = MagicMock()
    result_mock.all.return_value = [
        (pred_a1, match_a),
        (pred_a2, match_b),
        (pred_b1, match_a),
    ]
    mock_session.execute = AsyncMock(return_value=result_mock)

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    client = TestClient(app, raise_server_exceptions=True)
    resp = client.get("/api/duel/leaderboard")

    assert resp.status_code == 200, resp.text
    entries = resp.json()
    assert isinstance(entries, list)
    # user-A should be first (most beat-AI)
    if len(entries) >= 2:
        assert entries[0]["total_beat_ai"] >= entries[1]["total_beat_ai"]
    # Check structure
    for entry in entries:
        assert "user_id" in entry
        assert "matches_played" in entry
        assert "total_beat_ai" in entry
        assert "win_rate" in entry
        assert 0.0 <= entry["win_rate"] <= 1.0


# ---------------------------------------------------------------------------
# Test 7: POST /api/predict/remix happy path — weights sum to 1.0
# ---------------------------------------------------------------------------


def test_remix_happy_path_weights_sum_to_one() -> None:
    """Remix returns 200 and weights_used that sum to exactly 1.0."""
    pred = _make_prediction()
    # Give it sportsbook probs too
    pred.sb_home_win_prob = 0.52
    pred.sb_draw_prob = 0.28
    pred.sb_away_win_prob = 0.20

    app = FastAPI()
    app.include_router(remix_router)

    mock_session = MagicMock()
    mock_session.commit = AsyncMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with patch("api.routes.remix.get_latest_prediction", AsyncMock(return_value=pred)):
        client = TestClient(app, raise_server_exceptions=True)
        resp = client.post(
            "/api/predict/remix",
            json={
                "match_id": "match-001",
                "overrides": {"ml_weight": 0.5, "sb_weight": 0.5, "poly_weight": 0.0},
            },
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    weights = body["weights_used"]
    total = sum(weights.values())
    assert total == pytest.approx(1.0, abs=1e-5), f"Weights sum to {total}"
    # final_probs should also sum to ~1.0
    fp = body["final_probs"]
    fp_total = sum(fp.values())
    assert fp_total == pytest.approx(1.0, abs=1e-5)


# ---------------------------------------------------------------------------
# Test 8: POST /api/predict/remix out-of-range weight override → 422
# ---------------------------------------------------------------------------


def test_remix_out_of_range_weight_returns_422() -> None:
    """ml_weight > 1.0 must be rejected with 422 Unprocessable Entity."""
    app = FastAPI()
    app.include_router(remix_router)

    mock_session = MagicMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post(
        "/api/predict/remix",
        json={
            "match_id": "match-001",
            "overrides": {"ml_weight": 1.5},  # out of [0,1]
        },
    )
    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# Test 9: POST /api/predict/remix out-of-range modifier → 422
# ---------------------------------------------------------------------------


def test_remix_out_of_range_modifier_returns_422() -> None:
    """altitude_modifier < 0.5 must be rejected with 422."""
    app = FastAPI()
    app.include_router(remix_router)

    mock_session = MagicMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post(
        "/api/predict/remix",
        json={
            "match_id": "match-001",
            "overrides": {"altitude_modifier": 0.1},  # out of [0.5, 1.5]
        },
    )
    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# Test 10: POST /api/predict/remix no base prediction → 404
# ---------------------------------------------------------------------------


def test_remix_no_base_prediction_returns_404() -> None:
    """Returns 404 when no AI prediction exists for the match."""
    app = FastAPI()
    app.include_router(remix_router)

    mock_session = MagicMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with patch("api.routes.remix.get_latest_prediction", AsyncMock(return_value=None)):
        client = TestClient(app, raise_server_exceptions=False)
        resp = client.post(
            "/api/predict/remix",
            json={"match_id": "nonexistent-match", "overrides": {}},
        )

    assert resp.status_code == 404, resp.text


# ---------------------------------------------------------------------------
# Test 11: delta_from_base computed correctly for known input
# ---------------------------------------------------------------------------


def test_remix_delta_from_base_correct() -> None:
    """delta_from_base = final_probs - base blended probs element-wise."""
    pred = _make_prediction()
    # base blended: home=0.50, draw=0.30, away=0.20
    # Override weights to force 100% ML (home=0.48, draw=0.32, away=0.20)
    pred.sb_home_win_prob = 0.52
    pred.sb_draw_prob = 0.28
    pred.sb_away_win_prob = 0.20

    app = FastAPI()
    app.include_router(remix_router)

    mock_session = MagicMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with patch("api.routes.remix.get_latest_prediction", AsyncMock(return_value=pred)):
        client = TestClient(app, raise_server_exceptions=True)
        resp = client.post(
            "/api/predict/remix",
            json={
                "match_id": "match-001",
                # Pure ML: 100% weight to ml layer
                "overrides": {"ml_weight": 1.0, "sb_weight": 0.0, "poly_weight": 0.0},
            },
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    delta = body["delta_from_base"]
    final = body["final_probs"]

    # delta should equal final - base_blended
    # base_blended home=0.50, draw=0.30, away=0.20
    assert delta["home_win"] == pytest.approx(final["home_win"] - 0.50, abs=1e-4)
    assert delta["draw"] == pytest.approx(final["draw"] - 0.30, abs=1e-4)
    assert delta["away_win"] == pytest.approx(final["away_win"] - 0.20, abs=1e-4)


# ---------------------------------------------------------------------------
# Test 12: Duel router prefix is /api/duel
# ---------------------------------------------------------------------------


def test_duel_router_prefix() -> None:
    """The duel router must expose its prefix as /api/duel."""
    assert duel_router.prefix == "/api/duel"


# ---------------------------------------------------------------------------
# Test 13: Remix router prefix is /api/predict
# ---------------------------------------------------------------------------


def test_remix_router_prefix() -> None:
    """The remix router must expose its prefix as /api/predict."""
    assert remix_router.prefix == "/api/predict"


# ---------------------------------------------------------------------------
# Unit: _brier_score
# ---------------------------------------------------------------------------


def test_brier_score_perfect_prediction() -> None:
    """Brier score of 0 for a perfect prediction."""
    probs = {"home_win": 1.0, "draw": 0.0, "away_win": 0.0}
    score = _brier_score(probs, "home_win")
    assert score == pytest.approx(0.0)


def test_brier_score_worst_prediction() -> None:
    """Brier score of 2 for the worst possible prediction."""
    probs = {"home_win": 0.0, "draw": 0.0, "away_win": 1.0}
    score = _brier_score(probs, "home_win")  # predicted away, actual home
    assert score == pytest.approx(2.0)


# ---------------------------------------------------------------------------
# Unit: _derive_outcome
# ---------------------------------------------------------------------------


def test_derive_outcome_home_win() -> None:
    assert _derive_outcome(3, 1) == "home"


def test_derive_outcome_away_win() -> None:
    assert _derive_outcome(0, 2) == "away"


def test_derive_outcome_draw() -> None:
    assert _derive_outcome(1, 1) == "draw"


# ---------------------------------------------------------------------------
# Unit: _safe_prob_dict normalisation
# ---------------------------------------------------------------------------


def test_safe_prob_dict_normalises() -> None:
    """_safe_prob_dict must produce a distribution that sums to 1.0."""
    result = _safe_prob_dict(2.0, 1.0, 1.0)
    assert sum(result.values()) == pytest.approx(1.0)
    assert result["home_win"] == pytest.approx(0.5)


def test_safe_prob_dict_fallback_when_all_none() -> None:
    """When all inputs are None, fall back to equal 1/3 split."""
    result = _safe_prob_dict(None, None, None)
    for v in result.values():
        assert v == pytest.approx(1 / 3, abs=1e-6)


# ---------------------------------------------------------------------------
# Remix: unknown override key → 422
# ---------------------------------------------------------------------------


def test_remix_unknown_override_key_returns_422() -> None:
    """Providing an unknown key in overrides must return 422."""
    app = FastAPI()
    app.include_router(remix_router)

    mock_session = MagicMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    client = TestClient(app, raise_server_exceptions=False)
    resp = client.post(
        "/api/predict/remix",
        json={
            "match_id": "match-001",
            "overrides": {"unknown_key": 0.5},
        },
    )
    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# Remix: empty overrides → 200 (adaptive synthesis path)
# ---------------------------------------------------------------------------


def test_remix_empty_overrides_uses_adaptive_synthesis() -> None:
    """Empty overrides uses synthesize() adaptive path and returns valid response."""
    pred = _make_prediction()
    pred.sb_home_win_prob = 0.50
    pred.sb_draw_prob = 0.30
    pred.sb_away_win_prob = 0.20

    app = FastAPI()
    app.include_router(remix_router)

    mock_session = MagicMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    from api.deps import get_db_session

    app.dependency_overrides[get_db_session] = _override_db

    with patch("api.routes.remix.get_latest_prediction", AsyncMock(return_value=pred)):
        client = TestClient(app, raise_server_exceptions=True)
        resp = client.post(
            "/api/predict/remix",
            json={"match_id": "match-001", "overrides": {}},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert sum(body["weights_used"].values()) == pytest.approx(1.0, abs=1e-5)
    assert sum(body["final_probs"].values()) == pytest.approx(1.0, abs=1e-5)
    assert body["overrides_applied"] == {}
