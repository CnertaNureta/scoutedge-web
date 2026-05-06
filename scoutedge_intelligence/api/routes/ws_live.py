"""WebSocket route for live in-play probability streaming (task P5.5).

Endpoint: ``WebSocket /ws/live/{match_id}``

Protocol summary
----------------
On connect
~~~~~~~~~~
1. Look up the latest pre-match ``PredictionSchema`` from the DB.
2. If no prediction exists, close the connection with code 1008 (policy
   violation — client must have a valid match_id with a stored prediction).
3. Build an :class:`InPlayBayesianUpdater` seeded with a synthetic 9x9
   score matrix derived from the blended probability triple (see
   :func:`_probs_to_matrix`).
4. Send an ``"init"`` frame to the client.

After connect
~~~~~~~~~~~~~
The server enters a message loop.  Client messages control the push state:

- ``{"action": "subscribe"}``   — server starts pushing ticks every 5 s.
- ``{"action": "unsubscribe"}`` — server pauses pushing; connection stays open.
- ``{"action": "event", "event": {...}}`` — inject a caller-driven event
  (minute, type) directly into the updater; server emits a frame immediately.

The server also pushes frames on its own when the injected
:class:`EventSource` yields events (default: synthetic ticks every 5 s).

Frame schema
~~~~~~~~~~~~
All server-to-client messages are JSON objects::

    {
        "type": "init" | "tick" | "goal_home" | "goal_away"
                | "red_home" | "red_away" | "ft" | "error",
        "minute": int,
        "home_score": int,
        "away_score": int,
        "final_probs": {"home_win": float, "draw": float, "away_win": float}
    }

Error frames include an additional ``"detail"`` string key.

Dependency injection
~~~~~~~~~~~~~~~~~~~~
:func:`get_event_source` returns a :class:`StubEventSource` by default,
which emits synthetic ticks every 5 s (``STUB_TICK_INTERVAL_S``).  Tests
override this by passing a deterministic :class:`EventSource` implementation
via ``Depends(get_event_source)``.
"""

from __future__ import annotations

import asyncio
import contextlib
import math
from collections.abc import AsyncIterator
from typing import Any, Protocol

import numpy as np
import structlog
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from scipy.stats import poisson
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db_session
from scoutedge_intelligence.db.models import PredictionSchema
from scoutedge_intelligence.db.queries import get_latest_prediction
from scoutedge_intelligence.models.in_play import InPlayBayesianUpdater, InPlayEvent

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/ws", tags=["ws"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Default interval (seconds) between synthetic ticks from :class:`StubEventSource`.
STUB_TICK_INTERVAL_S: float = 5.0

#: WebSocket close code used when no prediction is found (custom 4404).
#: Note: RFC 6455 only defines 1000-1015; 4xxx codes are application-level.
WS_CLOSE_POLICY_VIOLATION: int = 1008

#: Lambda bounds for the heuristic probs → matrix conversion.
LAMBDA_MIN: float = 0.5
LAMBDA_MAX: float = 3.0

# ---------------------------------------------------------------------------
# EventSource Protocol + default stub
# ---------------------------------------------------------------------------


class EventSource(Protocol):
    """Protocol that the WS handler uses to receive in-play events.

    Implementations must be async generators yielding :class:`InPlayEvent`
    objects.  The generator may yield ``None`` to indicate "no event right
    now; just send a tick".  Generators should be interruptible via
    ``GeneratorExit`` (i.e. do not swallow it).
    """

    def events(self, match_id: str) -> AsyncIterator[InPlayEvent | None]:
        """Async iterator of events for the given match.

        Yields
        ------
        InPlayEvent | None
            A concrete event to inject, or ``None`` for a heartbeat tick.
        """
        ...  # pragma: no cover


class StubEventSource:
    """Default MVP event source: emits a ``tick`` event every 5 seconds.

    This is a placeholder for P8.* integration with a real live-event feed
    (e.g. a Stats Perform / Opta WebSocket or a Redis pub/sub channel).  It
    simulates the passage of match time by incrementing the minute counter on
    each yield.

    The minute counter wraps at 90 to avoid overshooting the match duration
    boundary in the ``InPlayBayesianUpdater``.
    """

    def __init__(self, tick_interval_s: float = STUB_TICK_INTERVAL_S) -> None:
        """Initialise the stub.

        Args:
            tick_interval_s: Seconds to sleep between ticks.  Defaults to
                :data:`STUB_TICK_INTERVAL_S` (5 s).
        """
        self._interval = tick_interval_s

    async def events(self, match_id: str) -> AsyncIterator[InPlayEvent | None]:
        """Yield a synthetic ``tick`` event every ``tick_interval_s`` seconds.

        The minute counter starts at 1 and advances by 1 per tick up to 90.

        Args:
            match_id: Unused by the stub; present to satisfy the protocol.

        Yields
        ------
        InPlayEvent
            A tick event with the current synthetic minute.
        """
        minute: int = 1
        while True:
            await asyncio.sleep(self._interval)
            yield InPlayEvent(minute=minute, type="tick")
            minute = min(minute + 1, 90)


# ---------------------------------------------------------------------------
# Dependency factory
# ---------------------------------------------------------------------------

_default_event_source: StubEventSource = StubEventSource()


def get_event_source() -> EventSource:
    """FastAPI dependency that returns the active :class:`EventSource`.

    Override this in tests by passing a custom :class:`EventSource`::

        app.dependency_overrides[get_event_source] = lambda: my_stub

    Returns
    -------
    EventSource
        The module-level :class:`StubEventSource` singleton.
    """
    return _default_event_source


# ---------------------------------------------------------------------------
# Score-matrix derivation from blended probabilities
# ---------------------------------------------------------------------------


def _probs_to_lambdas(p_home: float, p_draw: float, p_away: float) -> tuple[float, float]:
    """Derive expected-goals lambdas from 1X2 probabilities.

    Heuristic (placeholder — not match-model calibrated):

    * ``lambda_home ≈ -log(p_away + p_draw) * 1.5``
    * ``lambda_away ≈ -log(p_home + p_draw) * 1.5``

    Both are clamped to ``[LAMBDA_MIN, LAMBDA_MAX]`` to prevent degenerate
    Poisson distributions.  This heuristic is intentionally simple; a proper
    calibration using Dixon-Coles or a goal-rate lookup table should replace
    it in P8.*.

    Args:
        p_home: Blended home-win probability.
        p_draw: Blended draw probability.
        p_away: Blended away-win probability.

    Returns
    -------
    tuple[float, float]
        ``(lambda_home, lambda_away)`` expected goals for the full 90 minutes.
    """
    # Guard against log(0) when probabilities are extreme
    not_home_win = max(p_away + p_draw, 1e-9)
    not_away_win = max(p_home + p_draw, 1e-9)

    lam_h = -math.log(not_home_win) * 1.5
    lam_a = -math.log(not_away_win) * 1.5

    lam_h = float(np.clip(lam_h, LAMBDA_MIN, LAMBDA_MAX))
    lam_a = float(np.clip(lam_a, LAMBDA_MIN, LAMBDA_MAX))
    return lam_h, lam_a


def _probs_to_matrix(
    p_home: float, p_draw: float, p_away: float
) -> tuple[np.ndarray[Any, np.dtype[np.float64]], float, float]:
    """Build a synthetic 9x9 score-probability matrix from 1X2 probabilities.

    Uses an independent bivariate Poisson (Dixon-Coles without the correlation
    correction) with lambdas derived from :func:`_probs_to_lambdas`.

    This is a pragmatic fallback for when no pre-computed score matrix is
    stored on the ``PredictionSchema``.  The matrix is normalised to sum to 1.

    Args:
        p_home: Blended home-win probability.
        p_draw: Blended draw probability.
        p_away: Blended away-win probability.

    Returns
    -------
    tuple
        ``(matrix, lambda_home, lambda_away)`` where ``matrix`` is shape
        ``(9, 9)`` and normalised to sum to 1.0.
    """
    g = 9
    lam_h, lam_a = _probs_to_lambdas(p_home, p_draw, p_away)

    home_pmf = np.array([poisson.pmf(i, lam_h) for i in range(g)], dtype=np.float64)
    away_pmf = np.array([poisson.pmf(j, lam_a) for j in range(g)], dtype=np.float64)
    matrix: np.ndarray[Any, np.dtype[np.float64]] = np.outer(home_pmf, away_pmf).astype(np.float64)

    total = float(matrix.sum())
    if total > 0:
        matrix = matrix / total

    return matrix, lam_h, lam_a


# ---------------------------------------------------------------------------
# Helper: build updater from prediction
# ---------------------------------------------------------------------------


def _build_updater(prediction: PredictionSchema) -> InPlayBayesianUpdater:
    """Construct an :class:`InPlayBayesianUpdater` from a stored prediction.

    Reads ``blended_home_win_prob``, ``blended_draw_prob``, and
    ``blended_away_win_prob`` from *prediction*.  Falls back to equal
    probabilities (1/3 each) when any value is ``None``.

    Args:
        prediction: The latest pre-match prediction for this match.

    Returns
    -------
    InPlayBayesianUpdater
        A freshly initialised updater seeded with the derived score matrix.
    """
    p_home = prediction.blended_home_win_prob or (1.0 / 3)
    p_draw = prediction.blended_draw_prob or (1.0 / 3)
    p_away = prediction.blended_away_win_prob or (1.0 / 3)

    # Normalise in case the stored values don't sum to exactly 1.0
    total = p_home + p_draw + p_away
    if total > 0:
        p_home /= total
        p_draw /= total
        p_away /= total

    matrix, lam_h, lam_a = _probs_to_matrix(p_home, p_draw, p_away)

    return InPlayBayesianUpdater(
        pre_match_matrix=matrix,
        pre_match_lambda_home=lam_h,
        pre_match_lambda_away=lam_a,
    )


# ---------------------------------------------------------------------------
# Frame builders
# ---------------------------------------------------------------------------


def _build_frame(
    frame_type: str,
    updater: InPlayBayesianUpdater,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a JSON-serialisable frame dict from the current updater state.

    Args:
        frame_type: One of ``"init"``, ``"tick"``, ``"goal_home"``,
            ``"goal_away"``, ``"red_home"``, ``"red_away"``, ``"ft"``.
        updater: The in-play updater whose state is snapshotted.
        extra: Optional additional keys merged into the frame.

    Returns
    -------
    dict[str, Any]
        Frame ready for ``await websocket.send_json(frame)``.
    """
    state = updater.current_state
    probs = updater.derive_probabilities()

    frame: dict[str, Any] = {
        "type": frame_type,
        "minute": state.minute,
        "home_score": state.home_score,
        "away_score": state.away_score,
        "final_probs": probs,
    }
    if extra:
        frame.update(extra)
    return frame


def _error_frame(detail: str, updater: InPlayBayesianUpdater) -> dict[str, Any]:
    """Build an error frame with the current state attached for context.

    Args:
        detail: Human-readable error description.
        updater: The updater (state is included in the frame).

    Returns
    -------
    dict[str, Any]
        Error frame.
    """
    frame = _build_frame("error", updater)
    frame["detail"] = detail
    return frame


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------


@router.websocket("/live/{match_id}")
async def stream(
    websocket: WebSocket,
    match_id: str,
    session: AsyncSession = Depends(get_db_session),  # noqa: B008
    event_source: EventSource = Depends(get_event_source),  # noqa: B008
) -> None:
    """Live in-play probability stream for a single match.

    WebSocket endpoint at ``/ws/live/{match_id}``.

    On connect, the server:

    1. Fetches the latest pre-match prediction from the database.
    2. Closes with code 1008 if none is found.
    3. Builds an :class:`InPlayBayesianUpdater` from the blended probabilities.
    4. Sends an ``"init"`` frame.

    Thereafter the server listens for client messages (``subscribe``,
    ``unsubscribe``, ``event``) and pushes server-side events from
    *event_source* when subscribed.

    Args:
        websocket: The active WebSocket connection.
        match_id: UUID or string identifier for the match.
        session: SQLAlchemy async session (injected by :func:`~api.deps.get_db_session`).
        event_source: Event generator (injected by :func:`get_event_source`).
    """
    log: structlog.BoundLogger = logger.bind(match_id=match_id)

    await websocket.accept()
    log.info("ws.live.connect")

    # ------------------------------------------------------------------
    # 1. Fetch latest prediction; reject if not found
    # ------------------------------------------------------------------
    prediction: PredictionSchema | None = await get_latest_prediction(session, match_id)
    if prediction is None:
        log.warning("ws.live.no_prediction")
        await websocket.close(code=WS_CLOSE_POLICY_VIOLATION, reason="no prediction found")
        return

    # ------------------------------------------------------------------
    # 2. Build updater from prediction
    # ------------------------------------------------------------------
    updater: InPlayBayesianUpdater = _build_updater(prediction)
    log.info("ws.live.updater_ready")

    # ------------------------------------------------------------------
    # 3. Send init frame
    # ------------------------------------------------------------------
    init_frame = _build_frame("init", updater)
    init_frame["match_id"] = match_id
    await websocket.send_json(init_frame)

    # ------------------------------------------------------------------
    # 4. Message + event loop
    # ------------------------------------------------------------------
    subscribed: bool = False
    current_minute: int = 0

    async def _push_event(event: InPlayEvent) -> None:
        """Apply *event* to the updater and push a frame to the client."""
        nonlocal current_minute
        probs = updater.apply_event(event)
        state = updater.current_state
        current_minute = state.minute
        frame: dict[str, Any] = {
            "type": event.type,
            "minute": state.minute,
            "home_score": state.home_score,
            "away_score": state.away_score,
            "final_probs": probs,
        }
        await websocket.send_json(frame)

    # Wrap the event source generator
    event_gen = event_source.events(match_id)

    try:
        while True:
            # Concurrently wait for either a client message or the next
            # server-side event (when subscribed).
            receive_task = asyncio.ensure_future(websocket.receive_json())

            if subscribed:
                source_task = asyncio.ensure_future(event_gen.__anext__())
                done, pending = await asyncio.wait(
                    [receive_task, source_task],
                    return_when=asyncio.FIRST_COMPLETED,
                )
                # Cancel the task that didn't complete
                for t in pending:
                    t.cancel()
                    with contextlib.suppress(asyncio.CancelledError, StopAsyncIteration):
                        await t
            else:
                # Not subscribed — only wait for client messages.
                done = {receive_task}
                # Cancel any lingering source task from a previous iteration
                # (not applicable here since we don't create one, but kept
                # for symmetry / future-proofing).
                await receive_task

            for task in done:
                if task.cancelled():
                    continue
                exc = task.exception()
                if exc is not None:
                    if isinstance(exc, StopAsyncIteration):
                        # Event source exhausted (e.g. FT reached in stub)
                        ft_frame = _build_frame("ft", updater)
                        await websocket.send_json(ft_frame)
                        log.info("ws.live.ft")
                        return
                    # Unexpected — let WebSocketDisconnect propagate
                    raise exc

                result = task.result()

                # ----------------------------------------------------------
                # Client message handling
                # ----------------------------------------------------------
                if task is receive_task and isinstance(result, dict):
                    action = result.get("action")
                    if action == "subscribe":
                        subscribed = True
                        log.debug("ws.live.subscribed")
                    elif action == "unsubscribe":
                        subscribed = False
                        log.debug("ws.live.unsubscribed")
                    elif action == "event":
                        raw_evt = result.get("event", {})
                        evt_minute = int(raw_evt.get("minute", current_minute))
                        evt_type = str(raw_evt.get("type", "tick"))

                        # Reject stale events (minute regression)
                        if evt_minute < current_minute:
                            await websocket.send_json(
                                _error_frame(
                                    f"event minute {evt_minute} is before "
                                    f"current minute {current_minute}",
                                    updater,
                                )
                            )
                        else:
                            try:
                                payload = dict(raw_evt.get("payload", {}))
                                evt = InPlayEvent(
                                    minute=evt_minute,
                                    type=evt_type,
                                    payload=payload,
                                )
                                await _push_event(evt)
                            except ValueError as exc:
                                await websocket.send_json(_error_frame(str(exc), updater))
                    # Ignore unknown actions silently
                    continue

                # ----------------------------------------------------------
                # Server-side event from EventSource
                # ----------------------------------------------------------
                if subscribed and task is not receive_task and result is not None:
                    server_evt: InPlayEvent = result
                    try:
                        await _push_event(server_evt)
                    except ValueError as exc:
                        await websocket.send_json(_error_frame(str(exc), updater))

    except WebSocketDisconnect:
        log.info("ws.live.disconnect")
    finally:
        # Clean up updater state on disconnect
        updater.reset()
        log.info("ws.live.cleanup")
