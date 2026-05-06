"""FastAPI routes for the predict domain (task P5.2).

Registers three endpoints under the ``/api/predict`` prefix:

- ``GET /api/predict/match/{match_id}``        — full triple-layer prediction.
- ``GET /api/predict/match/{match_id}/explain`` — human-readable explanation.
- ``GET /api/predict/match/{match_id}/live``   — polling fallback for live probs.

Language passthrough:
    When the ``language`` query param is supplied, it is forwarded to
    :class:`TripleLayerInputs` as ``requested_language``. The engine's
    :meth:`TripleLayerEngine.predict_match` then invokes the Translator
    (Role 4) if a non-None language is present and the translator is
    configured.

Cached-prediction lookup (``/live``):
    :func:`get_latest_prediction` is called to retrieve the most-recent
    :class:`PredictionSchema` row from the DB.  If none exists, the
    endpoint returns **404** (no fallback to a live engine call — that
    comes in P5.5 ``ws_live``).
"""

from __future__ import annotations

import datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.deps import AppEngineFactory, DbSession
from scoutedge_intelligence.db.queries import get_latest_prediction, get_match
from scoutedge_intelligence.synthesis.engine import (
    FullPrediction,
    TripleLayerEngine,
    TripleLayerInputs,
)

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/predict", tags=["predict"])

# ---------------------------------------------------------------------------
# Dependency: build a fresh TripleLayerEngine for the current request
# ---------------------------------------------------------------------------


async def get_engine(factory: AppEngineFactory) -> TripleLayerEngine:
    """FastAPI dependency: build a per-request :class:`TripleLayerEngine`.

    Delegates to :meth:`EngineFactory.build`, which returns a new engine
    wrapping the app-scoped singleton collaborators.

    Args:
        factory: The app-scoped :class:`EngineFactory` from ``app.state``.

    Returns:
        A ready-to-use :class:`TripleLayerEngine`.
    """
    return await factory.build()


EngineDep = Annotated[TripleLayerEngine, Depends(get_engine)]

# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class ExplainResponse(BaseModel):
    """Response body for the ``/explain`` endpoint."""

    explanation: str
    match_id: str
    confidence: str
    risk_factor: str | None


class LiveProbsResponse(BaseModel):
    """Response body for the ``/live`` polling endpoint."""

    final_probs: dict[str, float]
    minute: int
    home_score: int
    away_score: int
    snapshot_time: str
    is_live: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_inputs(
    match_id: str,
    home_team_id: str | None,
    away_team_id: str | None,
    venue_city: str | None,
    kickoff_utc: datetime.datetime | None,
    language: str | None,
) -> TripleLayerInputs:
    """Construct a :class:`TripleLayerInputs` from a :class:`MatchSchema` row.

    Both ``home_team`` and ``away_team`` fall back to the empty string when
    the DB row has no team id (graceful degradation rather than a hard crash).

    Args:
        match_id: Canonical match identifier.
        home_team_id: Home team ID from the DB row.
        away_team_id: Away team ID from the DB row.
        venue_city: Venue city from the DB row.
        kickoff_utc: Kickoff datetime from the DB row.
        language: Requested language tag, e.g. ``"fr"`` or ``None``.

    Returns:
        Populated :class:`TripleLayerInputs`.
    """
    return TripleLayerInputs(
        match_id=match_id,
        home_team=home_team_id or "",
        away_team=away_team_id or "",
        venue_city=venue_city,
        kickoff_iso=kickoff_utc.isoformat() if kickoff_utc else None,
        requested_language=language,
    )


def _request_id(request: Request) -> str:
    """Return the request-id attached by the middleware, or an empty string."""
    return getattr(request.state, "request_id", "")


# ---------------------------------------------------------------------------
# GET /api/predict/match/{match_id}
# ---------------------------------------------------------------------------


@router.get(
    "/match/{match_id}",
    response_model=FullPrediction,
    summary="Run full triple-layer prediction for a match",
)
async def predict_match(
    match_id: str,
    request: Request,
    engine: EngineDep,
    db: DbSession,
    language: str | None = None,
) -> FullPrediction:
    """Run the full WC2026 triple-layer prediction pipeline for a single match.

    Args:
        match_id: UUID-style match identifier (path param).
        request: FastAPI request (provides ``request.state.request_id``).
        engine: Per-request :class:`TripleLayerEngine` (injected).
        db: Async DB session (injected).
        language: Optional BCP-47 language tag; when supplied the Translator
            (Role 4) produces a localised ``explanation_text``.

    Returns:
        A fully-populated :class:`FullPrediction` Pydantic model.

    Raises:
        HTTPException 404: Match not found in the database.
        HTTPException 500: Unexpected engine or DB error (FastAPI default).
    """
    log = logger.bind(match_id=match_id, request_id=_request_id(request))
    log.info("predict_match.start", language=language)

    match = await get_match(db, match_id)
    if match is None:
        log.warning("predict_match.not_found")
        raise HTTPException(status_code=404, detail=f"Match '{match_id}' not found.")

    inputs = _build_inputs(
        match_id=match.id,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        venue_city=match.venue_city,
        kickoff_utc=match.kickoff_utc,
        language=language,
    )

    prediction = await engine.predict_match(inputs)
    log.info("predict_match.done", confidence=prediction.confidence)
    return prediction


# ---------------------------------------------------------------------------
# GET /api/predict/match/{match_id}/explain
# ---------------------------------------------------------------------------


@router.get(
    "/match/{match_id}/explain",
    response_model=ExplainResponse,
    summary="Return a human-readable explanation for a match prediction",
)
async def explain_match(
    match_id: str,
    request: Request,
    engine: EngineDep,
    db: DbSession,
    language: str = "en",
) -> ExplainResponse:
    """Return a localised, human-readable explanation for a match prediction.

    Always invokes the Translator (via ``requested_language`` in inputs),
    even when the requested language is ``"en"``.  Uses the cached
    :class:`PredictionSchema` when available to skip a fresh prediction;
    if none exists in the DB a fresh engine run is triggered.

    Args:
        match_id: UUID-style match identifier.
        request: FastAPI request.
        engine: Per-request engine (injected).
        db: Async DB session (injected).
        language: BCP-47 language tag; defaults to ``"en"``.

    Returns:
        :class:`ExplainResponse` with ``explanation``, ``match_id``,
        ``confidence``, and ``risk_factor``.

    Raises:
        HTTPException 404: Match not found.
    """
    log = logger.bind(match_id=match_id, request_id=_request_id(request))
    log.info("explain_match.start", language=language)

    match = await get_match(db, match_id)
    if match is None:
        log.warning("explain_match.not_found")
        raise HTTPException(status_code=404, detail=f"Match '{match_id}' not found.")

    # Always run a fresh prediction so the Translator is invoked.
    inputs = _build_inputs(
        match_id=match.id,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        venue_city=match.venue_city,
        kickoff_utc=match.kickoff_utc,
        language=language,
    )
    prediction = await engine.predict_match(inputs)

    explanation = prediction.explanation_text or prediction.rationale
    log.info("explain_match.done", has_translation=bool(prediction.explanation_text))

    return ExplainResponse(
        explanation=explanation,
        match_id=match_id,
        confidence=prediction.confidence,
        risk_factor=prediction.risk_factor,
    )


# ---------------------------------------------------------------------------
# GET /api/predict/match/{match_id}/live
# ---------------------------------------------------------------------------


@router.get(
    "/match/{match_id}/live",
    response_model=LiveProbsResponse,
    summary="Polling fallback for live match probabilities",
)
async def live_match(
    match_id: str,
    request: Request,
    db: DbSession,
) -> LiveProbsResponse:
    """Return cached pre-match probabilities as a live-polling fallback.

    In P5.5 (``ws_live``) this endpoint becomes the WebSocket live channel.
    For now it returns the most-recently cached :class:`PredictionSchema`
    row with ``minute=0`` and ``is_live=False`` as a polling-safe fallback.

    Args:
        match_id: UUID-style match identifier.
        request: FastAPI request.
        db: Async DB session (injected).

    Returns:
        :class:`LiveProbsResponse` with the cached final probs and
        ``is_live=False``.

    Raises:
        HTTPException 404: No cached prediction found for this match.
    """
    log = logger.bind(match_id=match_id, request_id=_request_id(request))
    log.info("live_match.start")

    cached = await get_latest_prediction(db, match_id)
    if cached is None:
        log.warning("live_match.not_found")
        raise HTTPException(
            status_code=404,
            detail=f"No cached prediction found for match '{match_id}'.",
        )

    # Build a best-effort final_probs dict from blended columns.
    final_probs: dict[str, float] = {}
    if cached.blended_home_win_prob is not None:
        final_probs["home_win"] = float(cached.blended_home_win_prob)
    if cached.blended_draw_prob is not None:
        final_probs["draw"] = float(cached.blended_draw_prob)
    if cached.blended_away_win_prob is not None:
        final_probs["away_win"] = float(cached.blended_away_win_prob)

    snapshot_time = (
        cached.created_at.isoformat()
        if cached.created_at
        else datetime.datetime.now(datetime.UTC).isoformat()
    )

    log.info("live_match.done", final_probs=final_probs)
    return LiveProbsResponse(
        final_probs=final_probs,
        minute=0,
        home_score=0,
        away_score=0,
        snapshot_time=snapshot_time,
        is_live=False,
    )
