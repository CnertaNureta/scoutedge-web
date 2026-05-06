"""Extra coverage for api.routes.remix: paths missed by test_routes_duel_remix.

Targets:
- _apply_modifier with non-1.0 modifier renormalises probs
- _apply_modifier returns input unchanged when adjusted total is non-positive
- POST /remix exercises the altitude/heat modifier branch (covers both 243-244
  and the 307/309 ``X_modifier in overrides`` branches)
- POST /remix with poly_present=False and poly_weight knob redistributes excess
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import get_db_session
from api.routes import remix as remix_module
from api.routes.remix import router as remix_router


def _make_prediction() -> MagicMock:
    p = MagicMock()
    p.id = 1
    p.match_id = "match-001"
    p.blended_home_win_prob = 0.50
    p.blended_draw_prob = 0.30
    p.blended_away_win_prob = 0.20
    p.ml_home_win_prob = 0.48
    p.ml_draw_prob = 0.32
    p.ml_away_win_prob = 0.20
    p.sb_home_win_prob = 0.52
    p.sb_draw_prob = 0.28
    p.sb_away_win_prob = 0.20
    p.poly_home_win_prob = None
    p.poly_draw_prob = None
    p.poly_away_win_prob = None
    return p


# ---------------------------------------------------------------------------
# _apply_modifier
# ---------------------------------------------------------------------------


def test_apply_modifier_boosts_target_and_renormalises() -> None:
    base = {"home_win": 0.5, "draw": 0.3, "away_win": 0.2}
    out = remix_module._apply_modifier(base, modifier=1.4, favours="home_win")

    assert sum(out.values()) == pytest.approx(1.0, abs=1e-9)
    assert out["home_win"] > base["home_win"]
    assert out["draw"] < base["draw"]


def test_apply_modifier_returns_original_when_total_is_zero() -> None:
    base = {"home_win": 0.0, "draw": 0.0, "away_win": 0.0}
    out = remix_module._apply_modifier(base, modifier=1.5, favours="home_win")
    # Function returns the original dict untouched when total <= 0.
    assert out == base


# ---------------------------------------------------------------------------
# Route-level: altitude / heat modifier path
# ---------------------------------------------------------------------------


def _build_remix_app(prediction: MagicMock) -> FastAPI:
    app = FastAPI()
    app.include_router(remix_router)
    mock_session = MagicMock()

    async def _override_db():  # type: ignore[misc]
        yield mock_session

    app.dependency_overrides[get_db_session] = _override_db
    return app


def test_remix_with_altitude_and_heat_modifiers() -> None:
    pred = _make_prediction()
    app = _build_remix_app(pred)

    with patch("api.routes.remix.get_latest_prediction", AsyncMock(return_value=pred)):
        client = TestClient(app, raise_server_exceptions=True)
        resp = client.post(
            "/api/predict/remix",
            json={
                "match_id": "match-001",
                "overrides": {
                    "altitude_modifier": 1.2,
                    "heat_modifier": 1.1,
                },
            },
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    fp = body["final_probs"]
    assert sum(fp.values()) == pytest.approx(1.0, abs=1e-5)
    applied = body["overrides_applied"]
    assert "altitude_modifier" in applied
    assert "heat_modifier" in applied
    assert applied["altitude_modifier"] == pytest.approx(1.2)
    assert applied["heat_modifier"] == pytest.approx(1.1)


def test_remix_no_poly_with_poly_weight_redistributes_excess() -> None:
    """Even when poly data is absent, supplying poly_weight must redistribute
    the requested poly weight between ml and sb (covers the redistribution
    block lines 258-266)."""
    pred = _make_prediction()
    # poly_*_prob are already None on the stub.
    app = _build_remix_app(pred)

    with patch("api.routes.remix.get_latest_prediction", AsyncMock(return_value=pred)):
        client = TestClient(app, raise_server_exceptions=True)
        resp = client.post(
            "/api/predict/remix",
            json={
                "match_id": "match-001",
                "overrides": {
                    "ml_weight": 0.4,
                    "sb_weight": 0.4,
                    "poly_weight": 0.2,
                },
            },
        )

    assert resp.status_code == 200, resp.text
    weights = resp.json()["weights_used"]
    # poly weight zeroed out; ml + sb absorb the 0.2 excess.
    assert weights["poly"] == pytest.approx(0.0, abs=1e-9)
    assert weights["ml"] + weights["sb"] == pytest.approx(1.0, abs=1e-9)
