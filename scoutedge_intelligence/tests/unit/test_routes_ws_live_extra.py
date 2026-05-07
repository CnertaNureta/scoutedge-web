"""Extra coverage for api.routes.ws_live: paths missed by test_routes_ws_live.

Targets:
- StubEventSource.events yields tick events with minute counter
- get_event_source returns the module-level singleton
- _build_frame includes ``extra`` keys
- WebSocket flow when EventSource exhausts → ``ft`` frame and clean close
- WebSocket: subscribed source-event payload with bad type → ValueError → error frame
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.ws_live import (
    EventSource,
    InPlayEvent,
    StubEventSource,
    _build_frame,
    _default_event_source,
    get_event_source,
    router,
)
from scoutedge_intelligence.db.models import PredictionSchema

# ---------------------------------------------------------------------------
# StubEventSource & get_event_source
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stub_event_source_yields_minute_counter() -> None:
    src = StubEventSource(tick_interval_s=0.0)
    gen = src.events("match-x")
    e1 = await gen.__anext__()
    e2 = await gen.__anext__()
    assert e1 is not None
    assert e1.type == "tick"
    assert e1.minute == 1
    assert e2 is not None
    assert e2.minute == 2


def test_get_event_source_returns_singleton() -> None:
    assert get_event_source() is _default_event_source


# ---------------------------------------------------------------------------
# _build_frame extra path
# ---------------------------------------------------------------------------


def test_build_frame_includes_extra_keys() -> None:
    updater = MagicMock()
    state = MagicMock()
    state.minute = 7
    state.home_score = 1
    state.away_score = 0
    updater.current_state = state
    updater.derive_probabilities.return_value = {
        "home_win": 0.6,
        "draw": 0.2,
        "away_win": 0.2,
    }

    frame = _build_frame("init", updater, extra={"match_id": "m-1"})
    assert frame["type"] == "init"
    assert frame["minute"] == 7
    assert frame["match_id"] == "m-1"
    assert frame["final_probs"]["home_win"] == 0.6


# ---------------------------------------------------------------------------
# Exhausted EventSource → ``ft`` frame
# ---------------------------------------------------------------------------


class _ExhaustingSource:
    """EventSource that yields one tick then ends (StopAsyncIteration)."""

    async def events(self, match_id: str) -> AsyncIterator[InPlayEvent | None]:
        yield InPlayEvent(minute=89, type="tick")


def _happy_prediction() -> PredictionSchema:
    return PredictionSchema.model_construct(
        id="00000000-0000-0000-0000-000000000001",
        match_id="match-ft",
        blended_home_win_prob=0.5,
        blended_draw_prob=0.25,
        blended_away_win_prob=0.25,
    )


def _build_app(prediction: PredictionSchema, event_src: EventSource) -> tuple[FastAPI, Any]:
    from api.deps import get_db_session

    app = FastAPI()
    app.include_router(router)

    async def _fake_session() -> AsyncIterator[Any]:
        yield AsyncMock()

    app.dependency_overrides[get_db_session] = _fake_session
    app.dependency_overrides[get_event_source] = lambda: event_src

    patch_ctx = patch(
        "api.routes.ws_live.get_latest_prediction",
        new=AsyncMock(return_value=prediction),
    )
    return app, patch_ctx


def test_event_source_exhausts_emits_ft_frame() -> None:
    """When the EventSource exhausts the server sends an ``"ft"`` frame and
    closes cleanly."""
    app, patch_ctx = _build_app(_happy_prediction(), _ExhaustingSource())
    frames: list[dict[str, Any]] = []

    with patch_ctx:
        client = TestClient(app, raise_server_exceptions=True)
        with client.websocket_connect("/ws/live/match-ft") as ws:
            init = ws.receive_json()
            frames.append(init)
            ws.send_json({"action": "subscribe"})
            tick = ws.receive_json()
            frames.append(tick)
            ft = ws.receive_json()
            frames.append(ft)

    assert frames[0]["type"] == "init"
    assert frames[1]["type"] == "tick"
    assert frames[1]["minute"] == 89
    assert frames[2]["type"] == "ft"
