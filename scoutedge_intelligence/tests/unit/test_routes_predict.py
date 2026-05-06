"""Unit tests for api/routes/predict.py and api/routes/divergence_feedback.py (task P5.2).

All tests use :class:`fastapi.testclient.TestClient` (synchronous) and mock
away every real dependency: no Anthropic calls, no real DB, no HTTP clients.

Test inventory (≥ 9 tests):
 1. GET /api/predict/match/{id} happy path → FullPrediction-shaped JSON.
 2. language param causes engine to receive ``requested_language`` in inputs.
 3. GET /api/predict/match/{id}/explain → {explanation, match_id, confidence, risk_factor}.
 4. GET /api/predict/match/{id}/live with cached prediction → 200 + final_probs.
 5. GET /api/predict/match/{id}/live with no prediction → 404.
 6. Match not found → 404 on predict endpoint.
 7. Match not found → 404 on explain endpoint.
 8. POST /api/divergence/feedback happy path → {ok: True, id: <int>}.
 9. POST /api/divergence/feedback with invalid user_action → 422.
10. POST /api/divergence/feedback with challenged but no challenge_reason → 422.
11. GET /api/predict/match/{id} with no match → 404 (alias of test 6 from explain side).
"""

from __future__ import annotations

import contextlib
import datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import EngineFactory, Settings
from api.main import create_app
from scoutedge_intelligence.db.models import MatchSchema, PredictionSchema
from scoutedge_intelligence.synthesis.engine import FullPrediction, TripleLayerInputs

# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

MATCH_ID = "match-abc-123"
HOME_TEAM_ID = "team-home-01"
AWAY_TEAM_ID = "team-away-02"

# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------


def _stub_settings(**overrides: Any) -> Settings:
    """Return Settings with test-safe, env-free defaults."""
    defaults: dict[str, Any] = {
        "database_url": "sqlite+aiosqlite:///./test_predict.db",
        "redis_url": "redis://localhost:6379",
        "cors_origins": ["http://localhost:3000"],
        "api_key": None,
        "rate_limit_per_minute": 9999,
        "log_level": "DEBUG",
    }
    defaults.update(overrides)
    return Settings.model_construct(**defaults)


def _stub_match(match_id: str = MATCH_ID) -> MatchSchema:
    """Return a minimal MatchSchema for the given match_id."""
    return MatchSchema(
        id=match_id,
        home_team_id=HOME_TEAM_ID,
        away_team_id=AWAY_TEAM_ID,
        kickoff_utc=datetime.datetime(2026, 6, 15, 18, 0, tzinfo=datetime.UTC),
        venue_city="Los Angeles",
    )


def _stub_full_prediction(match_id: str = MATCH_ID, language: str | None = None) -> FullPrediction:
    """Return a minimal FullPrediction for use in engine mocks."""
    return FullPrediction(
        match_id=match_id,
        final_probs={"home_win": 0.50, "draw": 0.25, "away_win": 0.25},
        ml_probs={"home_win": 0.52, "draw": 0.24, "away_win": 0.24},
        sb_probs={"home_win": 0.48, "draw": 0.26, "away_win": 0.26},
        poly_probs=None,
        weights={"ml": 0.4, "sb": 0.6},
        diagnosis=None,
        synthesizer_raw={},
        confidence="medium",
        expected_margin=1,
        risk_factor="low",
        rationale="Home team has a slight edge.",
        flags=[],
        feature_generator_output=None,
        divergence_features={},
        explanation_text=("Translated explanation" if language else None),
    )


def _stub_cached_prediction(match_id: str = MATCH_ID) -> PredictionSchema:
    """Return a PredictionSchema row as if fetched from get_latest_prediction."""
    return PredictionSchema(
        id="00000000-0000-0000-0000-000000000001",
        match_id=match_id,
        created_at=datetime.datetime(2026, 6, 14, 10, 0, tzinfo=datetime.UTC),
        blended_home_win_prob=0.50,
        blended_draw_prob=0.25,
        blended_away_win_prob=0.25,
    )


# ---------------------------------------------------------------------------
# Client factory
# ---------------------------------------------------------------------------


@contextlib.contextmanager
def _make_client(
    mock_get_match: MatchSchema | None,
    mock_engine_build: FullPrediction | None = None,
    mock_get_latest: PredictionSchema | None = None,
    mock_insert_feedback: str | None = None,
) -> contextlib.AbstractContextManager[TestClient]:  # type: ignore[misc]
    """Context manager that yields a :class:`TestClient` with all heavy singletons mocked out.

    Must be used as ``with _make_client(...) as client:`` so that all patches
    remain active for the full duration of the test.

    Strategy:
    - Patch all constructor-level singletons in api.deps so lifespan does not
      open real DB connections or load real ML models.
    - Patch query-level helpers at the route module level to control DB returns.
    - Override FastAPI dependency functions via ``app.dependency_overrides`` for
      engine and db session injection.

    Args:
        mock_get_match: Return value for ``get_match``; ``None`` simulates not-found.
        mock_engine_build: Return value for ``engine.predict_match``; required for
            predict/explain tests.
        mock_get_latest: Return value for ``get_latest_prediction``; required for
            live tests.
        mock_insert_feedback: Return value for the inline ``_insert_feedback``
            helper; required for divergence feedback tests.

    Yields:
        A :class:`TestClient` with ``._test_captured_inputs`` attached.
    """
    from api.deps import get_db_session
    from api.routes.predict import get_engine

    captured_inputs: list[TripleLayerInputs] = []

    async def _capturing_predict(inputs: TripleLayerInputs) -> FullPrediction:
        captured_inputs.append(inputs)
        return mock_engine_build  # type: ignore[return-value]

    mock_engine = MagicMock()
    if mock_engine_build is not None:
        mock_engine.predict_match = _capturing_predict

    async def _override_get_engine() -> MagicMock:
        return mock_engine

    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    mock_execute_result = MagicMock()
    mock_execute_result.scalars.return_value.first.return_value = None
    mock_execute_result.scalar.return_value = 1
    mock_session.execute = AsyncMock(return_value=mock_execute_result)
    mock_session.commit = AsyncMock()

    async def _override_get_db_session():  # type: ignore[return]
        yield mock_session

    with contextlib.ExitStack() as stack:
        for target in [
            "api.deps.FootballELO",
            "api.deps.DixonColesModel",
            "api.deps.PolymarketClient",
            "api.deps.SportsbookClient",
            "api.deps.FeatureGenerator",
            "api.deps.DivergenceAnalyst",
            "api.deps.JSONSynthesizer",
            "api.deps.Translator",
        ]:
            stack.enter_context(patch(target, return_value=MagicMock()))

        mock_db_engine = MagicMock()
        mock_db_engine.dispose = AsyncMock()
        stack.enter_context(patch("api.deps.create_async_engine", return_value=mock_db_engine))

        mock_factory = MagicMock(spec=EngineFactory)
        mock_factory.aclose = AsyncMock()
        stack.enter_context(patch("api.main.EngineFactory", return_value=mock_factory))
        stack.enter_context(patch("api.main.async_sessionmaker", return_value=MagicMock()))
        stack.enter_context(
            patch(
                "api.routes.predict.get_match",
                new=AsyncMock(return_value=mock_get_match),
            )
        )
        stack.enter_context(
            patch(
                "api.routes.predict.get_latest_prediction",
                new=AsyncMock(return_value=mock_get_latest),
            )
        )
        stack.enter_context(
            patch(
                "api.routes.divergence_feedback._insert_feedback",
                new=AsyncMock(return_value=(mock_insert_feedback or "uuid-0000-0000")),
            )
        )

        app = create_app(settings=_stub_settings())
        app.dependency_overrides[get_engine] = _override_get_engine
        app.dependency_overrides[get_db_session] = _override_get_db_session

        client = TestClient(app, raise_server_exceptions=True)
        client._test_captured_inputs = captured_inputs  # type: ignore[attr-defined]
        yield client


# ---------------------------------------------------------------------------
# Test 1: GET /api/predict/match/{id} happy path → FullPrediction-shaped JSON
# ---------------------------------------------------------------------------


def test_predict_match_happy_path() -> None:
    """Full prediction endpoint returns 200 with a FullPrediction JSON body."""
    prediction = _stub_full_prediction()
    with _make_client(
        mock_get_match=_stub_match(),
        mock_engine_build=prediction,
    ) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}")
    assert resp.status_code == 200

    data = resp.json()
    assert data["match_id"] == MATCH_ID
    assert "final_probs" in data
    assert "home_win" in data["final_probs"]
    assert data["confidence"] == "medium"


# ---------------------------------------------------------------------------
# Test 2: language param passes ``requested_language`` to engine inputs
# ---------------------------------------------------------------------------


def test_predict_match_language_passed_to_engine() -> None:
    """When ?language=fr the engine receives requested_language='fr' in inputs."""
    prediction = _stub_full_prediction(language="fr")
    with _make_client(
        mock_get_match=_stub_match(),
        mock_engine_build=prediction,
    ) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}?language=fr")
        captured: list[TripleLayerInputs] = client._test_captured_inputs  # type: ignore[attr-defined]

    assert resp.status_code == 200
    assert len(captured) == 1
    assert captured[0].requested_language == "fr"


# ---------------------------------------------------------------------------
# Test 3: GET /api/predict/match/{id}/explain → {explanation, match_id, confidence, risk_factor}
# ---------------------------------------------------------------------------


def test_explain_match_returns_explain_response() -> None:
    """Explain endpoint returns the four required fields."""
    prediction = _stub_full_prediction(language="en")
    with _make_client(
        mock_get_match=_stub_match(),
        mock_engine_build=prediction,
    ) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}/explain?language=en")
    assert resp.status_code == 200

    data = resp.json()
    assert set(data.keys()) >= {"explanation", "match_id", "confidence", "risk_factor"}
    assert data["match_id"] == MATCH_ID
    assert data["explanation"] == "Translated explanation"
    assert data["confidence"] == "medium"
    assert data["risk_factor"] == "low"


# ---------------------------------------------------------------------------
# Test 4: GET /api/predict/match/{id}/live with cached prediction → 200
# ---------------------------------------------------------------------------


def test_live_match_with_cached_prediction() -> None:
    """Live endpoint returns 200 and final_probs when a cached prediction exists."""
    with _make_client(
        mock_get_match=_stub_match(),
        mock_get_latest=_stub_cached_prediction(),
    ) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}/live")
    assert resp.status_code == 200

    data = resp.json()
    assert "final_probs" in data
    assert "home_win" in data["final_probs"]
    assert data["minute"] == 0
    assert data["is_live"] is False
    assert "snapshot_time" in data


# ---------------------------------------------------------------------------
# Test 5: GET /api/predict/match/{id}/live with no prediction → 404
# ---------------------------------------------------------------------------


def test_live_match_no_cached_prediction_returns_404() -> None:
    """Live endpoint returns 404 when no cached prediction row exists."""
    with _make_client(
        mock_get_match=_stub_match(),
        mock_get_latest=None,
    ) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}/live")
    assert resp.status_code == 404
    assert "cached prediction" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 6: Match not found → 404 on predict endpoint
# ---------------------------------------------------------------------------


def test_predict_match_not_found_returns_404() -> None:
    """When get_match returns None the predict endpoint returns 404."""
    with _make_client(mock_get_match=None) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}")
    assert resp.status_code == 404
    assert MATCH_ID in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 7: Match not found → 404 on explain endpoint
# ---------------------------------------------------------------------------


def test_explain_match_not_found_returns_404() -> None:
    """When get_match returns None the explain endpoint returns 404."""
    with _make_client(mock_get_match=None) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}/explain")
    assert resp.status_code == 404
    assert MATCH_ID in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 8: POST /api/divergence/feedback happy path → {ok: True, id: <int>}
# ---------------------------------------------------------------------------


def test_post_feedback_happy_path() -> None:
    """Feedback endpoint returns 200 with ok=True and an integer id."""
    payload = {
        "user_id": "user-001",
        "match_id": MATCH_ID,
        "diagnosis_id": None,
        "expanded": True,
        "user_action": "agreed",
        "challenge_reason": None,
        "challenge_alternative_probs": None,
    }
    with _make_client(
        mock_get_match=_stub_match(),
        mock_insert_feedback="uuid-9abc-def0",
    ) as client:
        resp = client.post("/api/divergence/feedback", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert data["ok"] is True
    assert isinstance(data["id"], int)


# ---------------------------------------------------------------------------
# Test 9: POST /api/divergence/feedback with invalid user_action → 422
# ---------------------------------------------------------------------------


def test_post_feedback_invalid_user_action_returns_422() -> None:
    """user_action must be one of agreed/challenged/shared/dismissed."""
    payload = {
        "user_id": "user-001",
        "match_id": MATCH_ID,
        "diagnosis_id": None,
        "expanded": False,
        "user_action": "ignored",  # not a valid literal
    }
    with _make_client(mock_get_match=_stub_match()) as client:
        resp = client.post("/api/divergence/feedback", json=payload)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test 10: POST /api/divergence/feedback with challenged but no challenge_reason → 422
# ---------------------------------------------------------------------------


def test_post_feedback_challenged_requires_challenge_reason() -> None:
    """When user_action is 'challenged', challenge_reason must be provided."""
    payload = {
        "user_id": "user-001",
        "match_id": MATCH_ID,
        "diagnosis_id": None,
        "expanded": True,
        "user_action": "challenged",
        "challenge_reason": None,  # missing!
    }
    with _make_client(mock_get_match=_stub_match()) as client:
        resp = client.post("/api/divergence/feedback", json=payload)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test 11: explain endpoint falls back to rationale when explanation_text is None
# ---------------------------------------------------------------------------


def test_explain_falls_back_to_rationale_when_no_translation() -> None:
    """When explanation_text is None the explain endpoint uses rationale as fallback."""
    # Build prediction with no translation
    prediction = _stub_full_prediction(language=None)
    assert prediction.explanation_text is None

    with _make_client(
        mock_get_match=_stub_match(),
        mock_engine_build=prediction,
    ) as client:
        resp = client.get(f"/api/predict/match/{MATCH_ID}/explain")
    assert resp.status_code == 200

    data = resp.json()
    assert data["explanation"] == prediction.rationale
