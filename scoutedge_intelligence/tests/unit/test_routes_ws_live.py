"""Unit tests for api/routes/ws_live.py (task P5.5).

Acceptance criteria (≥ 7 tests):
  1.  No-prediction match → server closes with code 1008.
  2.  Happy connect → receives ``"init"`` frame with ``final_probs`` summing
      to 1.0 (within floating-point tolerance).
  3.  subscribe → next server push is a ``"tick"`` frame.
  4.  unsubscribe → no further frames arrive; client-injected event still works.
  5.  Injected ``"goal_home"`` event → ``home_score`` increases by 1.
  6.  Injected event with ``minute < current minute`` → server stays alive
      and emits an ``"error"`` frame (not a disconnect).
  7.  Clean disconnect → updater ``.reset()`` is called (state sentinel).
  8.  ``_probs_to_matrix`` returns a (9, 9) array that sums to ~1.0.
  9.  ``_probs_to_lambdas`` clamps output to [LAMBDA_MIN, LAMBDA_MAX].
 10.  ``_build_updater`` falls back to equal probs when blended fields are None.

All WebSocket tests use ``fastapi.testclient.TestClient`` with
``client.websocket_connect()``.  Database calls are mocked via
``dependency_overrides`` + ``unittest.mock.patch``.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from api.routes.ws_live import (
    LAMBDA_MAX,
    LAMBDA_MIN,
    EventSource,
    _build_updater,
    _probs_to_lambdas,
    _probs_to_matrix,
    get_event_source,
    router,
)
from scoutedge_intelligence.db.models import PredictionSchema
from scoutedge_intelligence.models.in_play import InPlayBayesianUpdater, InPlayEvent

# ---------------------------------------------------------------------------
# Deterministic EventSource stubs
# ---------------------------------------------------------------------------


class _NoTickSource:
    """EventSource that never yields; used for client-only / unsubscribe tests."""

    async def events(self, match_id: str) -> AsyncIterator[InPlayEvent | None]:
        await asyncio.sleep(9999)
        yield None  # pragma: no cover — never reached; satisfies protocol


class _SingleTickSource:
    """EventSource that yields exactly one tick at *minute* then blocks."""

    def __init__(self, minute: int = 10) -> None:
        self._minute = minute

    async def events(self, match_id: str) -> AsyncIterator[InPlayEvent | None]:
        yield InPlayEvent(minute=self._minute, type="tick")
        await asyncio.sleep(9999)


# ---------------------------------------------------------------------------
# App builder helper
# ---------------------------------------------------------------------------


def _build_app(
    prediction: PredictionSchema | None,
    event_src: EventSource | None = None,
) -> tuple[FastAPI, Any]:
    """Return ``(app, patch_ctx)`` ready for use as a context manager.

    The *patch_ctx* patches ``get_latest_prediction`` to return *prediction*
    for the lifetime of a ``with`` block.  The app has DB and event-source
    dependencies overridden so no real infrastructure is needed.
    """
    app = FastAPI()
    app.include_router(router)

    from api.deps import get_db_session

    async def _fake_session() -> AsyncIterator[Any]:
        yield AsyncMock()

    app.dependency_overrides[get_db_session] = _fake_session

    if event_src is not None:
        app.dependency_overrides[get_event_source] = lambda: event_src

    patch_ctx = patch(
        "api.routes.ws_live.get_latest_prediction",
        new=AsyncMock(return_value=prediction),
    )
    return app, patch_ctx


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def happy_prediction() -> PredictionSchema:
    """A well-formed prediction with balanced probabilities."""
    return PredictionSchema.model_construct(
        id="00000000-0000-0000-0000-000000000001",
        match_id="match-001",
        blended_home_win_prob=0.5,
        blended_draw_prob=0.25,
        blended_away_win_prob=0.25,
    )


# ---------------------------------------------------------------------------
# Test 1: no prediction → close 1008
# ---------------------------------------------------------------------------


def test_no_prediction_closes_1008() -> None:
    """Server must close with code 1008 when no prediction exists."""
    app, patch_ctx = _build_app(prediction=None, event_src=_NoTickSource())
    close_code: int | None = None

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=False)
        try:
            with client.websocket_connect("/ws/live/nonexistent-match") as ws:
                ws.receive_json()  # triggers close frame → WebSocketDisconnect
        except WebSocketDisconnect as exc:
            close_code = exc.code

    assert close_code == 1008, f"Expected close code 1008, got {close_code}"


# ---------------------------------------------------------------------------
# Test 2: happy connect → init frame with final_probs summing to 1.0
# ---------------------------------------------------------------------------


def test_happy_connect_init_frame(happy_prediction: PredictionSchema) -> None:
    """On a valid connect the server sends an ``"init"`` frame."""
    app, patch_ctx = _build_app(happy_prediction, event_src=_NoTickSource())

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-001") as ws:
            frame = ws.receive_json()

    assert frame["type"] == "init"
    assert frame["match_id"] == "match-001"
    assert frame["minute"] == 0
    assert frame["home_score"] == 0
    assert frame["away_score"] == 0

    probs = frame["final_probs"]
    assert set(probs.keys()) == {"home_win", "draw", "away_win"}
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 1e-6


# ---------------------------------------------------------------------------
# Test 3: subscribe → next frame is a tick
# ---------------------------------------------------------------------------


def test_subscribe_receives_tick(happy_prediction: PredictionSchema) -> None:
    """After ``subscribe``, the server pushes a ``"tick"`` frame."""
    app, patch_ctx = _build_app(happy_prediction, event_src=_SingleTickSource(minute=5))

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-001") as ws:
            init_frame = ws.receive_json()
            assert init_frame["type"] == "init"

            ws.send_json({"action": "subscribe"})
            tick_frame = ws.receive_json()

    assert tick_frame["type"] == "tick"
    assert tick_frame["minute"] == 5
    probs = tick_frame["final_probs"]
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 1e-6


# ---------------------------------------------------------------------------
# Test 4: unsubscribe → no more server pushes; client events still work
# ---------------------------------------------------------------------------


def test_unsubscribe_stops_server_pushes(happy_prediction: PredictionSchema) -> None:
    """After ``unsubscribe``, client-injected events still produce frames."""
    app, patch_ctx = _build_app(happy_prediction, event_src=_NoTickSource())

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-001") as ws:
            ws.receive_json()  # init

            ws.send_json({"action": "subscribe"})
            ws.send_json({"action": "unsubscribe"})

            # Client-driven event must still produce a response
            ws.send_json({"action": "event", "event": {"minute": 1, "type": "tick"}})
            response = ws.receive_json()

    # Response came from the client-injected tick, not a server-side push
    assert response["type"] == "tick"
    assert response["minute"] == 1


# ---------------------------------------------------------------------------
# Test 5: injected goal_home → home_score +1
# ---------------------------------------------------------------------------


def test_injected_goal_home_increments_score(happy_prediction: PredictionSchema) -> None:
    """Caller-injected ``goal_home`` event must increment ``home_score`` by 1."""
    app, patch_ctx = _build_app(happy_prediction, event_src=_NoTickSource())

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-001") as ws:
            init_frame = ws.receive_json()
            assert init_frame["home_score"] == 0

            ws.send_json({"action": "event", "event": {"minute": 20, "type": "goal_home"}})
            goal_frame = ws.receive_json()

    assert goal_frame["type"] == "goal_home"
    assert goal_frame["home_score"] == 1
    assert goal_frame["away_score"] == 0
    assert goal_frame["minute"] == 20

    probs = goal_frame["final_probs"]
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 1e-6


# ---------------------------------------------------------------------------
# Test 6: stale event minute → error frame, server stays alive
# ---------------------------------------------------------------------------


def test_stale_event_minute_emits_error(happy_prediction: PredictionSchema) -> None:
    """An event with minute < current minute must emit ``"error"``; no disconnect."""
    app, patch_ctx = _build_app(happy_prediction, event_src=_NoTickSource())

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-001") as ws:
            ws.receive_json()  # init

            # Advance current minute to 30 via a valid event
            ws.send_json({"action": "event", "event": {"minute": 30, "type": "tick"}})
            ws.receive_json()  # tick at 30

            # Inject a stale event (minute 10 < 30)
            ws.send_json({"action": "event", "event": {"minute": 10, "type": "goal_home"}})
            error_frame = ws.receive_json()

    assert error_frame["type"] == "error"
    assert "detail" in error_frame
    # Detail should mention the stale minute or the current minute
    assert "10" in error_frame["detail"] or "30" in error_frame["detail"]


# ---------------------------------------------------------------------------
# Test 7: clean disconnect → updater.reset() is called
# ---------------------------------------------------------------------------


def test_disconnect_calls_updater_reset(happy_prediction: PredictionSchema) -> None:
    """On client disconnect the handler must call ``updater.reset()``."""
    app, patch_ctx = _build_app(happy_prediction, event_src=_NoTickSource())

    reset_called: list[bool] = []
    original_build_updater = _build_updater

    def _patched_build_updater(pred: PredictionSchema) -> InPlayBayesianUpdater:
        updater = original_build_updater(pred)
        original_reset = updater.reset

        def _spy_reset() -> None:
            reset_called.append(True)
            original_reset()

        updater.reset = _spy_reset  # type: ignore[method-assign]
        return updater

    with (
        patch_ctx,
        patch(
            "api.routes.ws_live._build_updater",
            side_effect=_patched_build_updater,
        ),
    ):
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-001") as ws:
            ws.receive_json()  # init — unblock the handler

    assert reset_called, "updater.reset() was not called on disconnect"


# ---------------------------------------------------------------------------
# Test 8: _probs_to_matrix returns (9, 9) summing to ~1.0
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "p_home,p_draw,p_away",
    [
        (0.5, 0.25, 0.25),
        (0.33, 0.34, 0.33),
        (0.1, 0.2, 0.7),
        (0.9, 0.05, 0.05),
    ],
)
def test_probs_to_matrix_shape_and_sum(p_home: float, p_draw: float, p_away: float) -> None:
    """``_probs_to_matrix`` must return shape (9, 9) normalised to 1.0."""
    matrix, lam_h, lam_a = _probs_to_matrix(p_home, p_draw, p_away)
    assert matrix.shape == (9, 9)
    assert abs(float(matrix.sum()) - 1.0) < 1e-9
    assert LAMBDA_MIN <= lam_h <= LAMBDA_MAX
    assert LAMBDA_MIN <= lam_a <= LAMBDA_MAX


# ---------------------------------------------------------------------------
# Test 9: _probs_to_lambdas clamps output to [LAMBDA_MIN, LAMBDA_MAX]
# ---------------------------------------------------------------------------


def test_probs_to_lambdas_clamped() -> None:
    """Lambda outputs must be within [LAMBDA_MIN, LAMBDA_MAX] for extreme inputs."""
    lam_h, lam_a = _probs_to_lambdas(0.99, 0.005, 0.005)
    assert LAMBDA_MIN <= lam_h <= LAMBDA_MAX
    assert LAMBDA_MIN <= lam_a <= LAMBDA_MAX

    lam_h2, lam_a2 = _probs_to_lambdas(0.005, 0.005, 0.99)
    assert LAMBDA_MIN <= lam_h2 <= LAMBDA_MAX
    assert LAMBDA_MIN <= lam_a2 <= LAMBDA_MAX


# ---------------------------------------------------------------------------
# Test 10: _build_updater falls back gracefully when blended fields are None
# ---------------------------------------------------------------------------


def test_build_updater_none_probs_fallback() -> None:
    """``_build_updater`` must not raise when blended prob fields are ``None``."""
    pred = PredictionSchema.model_construct(
        id="00000000-0000-0000-0000-000000000099",
        match_id="match-xxx",
        blended_home_win_prob=None,
        blended_draw_prob=None,
        blended_away_win_prob=None,
    )
    updater = _build_updater(pred)
    probs = updater.derive_probabilities()
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Regression test: production WS hit `TypeError: get_db_session() missing 1
# required positional argument: 'request'`. FastAPI cannot inject `Request`
# into a WebSocket route — only WebSocket. Switching `get_db_session` to take
# `HTTPConnection` (the parent of both Request and WebSocket) fixes it.
#
# This test exercises the *real* `get_db_session` dependency (no
# `app.dependency_overrides`) so that the DI mismatch would surface as a 500
# / TypeError at handshake time, like in production.
# ---------------------------------------------------------------------------


def test_ws_live_uses_real_get_db_session_dependency(
    happy_prediction: PredictionSchema,
) -> None:
    """The WS route must resolve ``get_db_session`` without a Request param.

    Regression for prod 500:
        TypeError: get_db_session() missing 1 required positional argument: 'request'

    We wire ``app.state.session_factory`` exactly as the real lifespan does
    and rely on FastAPI to satisfy ``Depends(get_db_session)`` from the
    WebSocket scope. We do NOT install ``app.dependency_overrides`` for it.
    """
    app = FastAPI()
    app.include_router(router)

    # Real session_factory contract: a zero-arg callable returning an async
    # context manager that yields an AsyncSession-like object.
    session_obj = AsyncMock(name="async_session")
    session_cm = AsyncMock()
    session_cm.__aenter__.return_value = session_obj
    session_cm.__aexit__.return_value = None
    app.state.session_factory = lambda: session_cm

    # Only the event-source dep is overridden so the test is deterministic.
    app.dependency_overrides[get_event_source] = lambda: _NoTickSource()

    patch_ctx = patch(
        "api.routes.ws_live.get_latest_prediction",
        new=AsyncMock(return_value=happy_prediction),
    )

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-001") as ws:
            frame = ws.receive_json()

    # If DI for get_db_session were broken, the handshake would 500 before
    # we ever saw an init frame.
    assert frame["type"] == "init"
    assert frame["match_id"] == "match-001"
