"""FastAPI routes for the divergence feedback domain (task P5.2).

Registers one endpoint under the ``/api/divergence`` prefix:

- ``POST /api/divergence/feedback`` — record a user interaction with a
  divergence diagnosis card.

The insert helper is defined inline here (not added to ``queries.py``) to
keep scope tight per the task brief.  It inserts into the
``divergence_diagnoses_displayed`` table and returns the new row's ``id``.

Note on ``id`` column:
    The ORM model uses ``String(36)`` (UUID) as the primary key.  The inline
    helper generates a ``uuid4`` string before inserting so the DB constraint
    is satisfied without relying on a DB-generated default.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Literal

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, model_validator
from sqlalchemy import insert as sa_insert
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import DbSession
from scoutedge_intelligence.db.models import DivergenceDiagnosisDisplayed

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/divergence", tags=["divergence"])

# ---------------------------------------------------------------------------
# Valid user actions
# ---------------------------------------------------------------------------

UserAction = Literal["agreed", "challenged", "shared", "dismissed"]

# ---------------------------------------------------------------------------
# Valid divergence types
# ---------------------------------------------------------------------------
# Mirrors the DB CHECK constraint ``divergence_diagnoses_type_valid`` defined
# in migration ``20260505100003_wc2026_ugc.sql``.  Keep this in sync with the
# SQL ``CHECK (divergence_type IN (...))`` clause; any drift will surface as a
# 500 from the route's INSERT.
ALLOWED_DIVERGENCE_TYPES: frozenset[str] = frozenset(
    {"ml_vs_poly", "ml_vs_sb", "sb_vs_poly", "three_way", "other"}
)
DEFAULT_DIVERGENCE_TYPE = "other"

DivergenceType = Literal["ml_vs_poly", "ml_vs_sb", "sb_vs_poly", "three_way", "other"]

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class FeedbackRequest(BaseModel):
    """Body for ``POST /api/divergence/feedback``.

    Validation rules:
    - ``user_action`` must be one of ``agreed | challenged | shared | dismissed``.
    - When ``user_action == "challenged"``, ``challenge_reason`` is required.
    """

    user_id: str
    match_id: str
    diagnosis_id: int | None = None
    expanded: bool
    user_action: UserAction
    challenge_reason: str | None = None
    challenge_alternative_probs: dict[str, float] | None = None
    # The divergence layer the diagnosis card surfaced (ml-vs-poly etc).  When
    # omitted, ``_insert_feedback`` defaults to ``DEFAULT_DIVERGENCE_TYPE`` so
    # the row still satisfies the DB ``divergence_diagnoses_type_valid`` CHECK.
    divergence_type: DivergenceType | None = None

    @model_validator(mode="after")
    def _require_challenge_reason(self) -> FeedbackRequest:
        """Enforce that ``challenge_reason`` is present when action is ``challenged``."""
        if self.user_action == "challenged" and not self.challenge_reason:
            raise ValueError("'challenge_reason' is required when user_action is 'challenged'.")
        return self


class FeedbackResponse(BaseModel):
    """Response body for ``POST /api/divergence/feedback``."""

    ok: bool
    id: int


# ---------------------------------------------------------------------------
# Inline DB helper
# ---------------------------------------------------------------------------


async def _insert_feedback(
    session: AsyncSession,
    *,
    user_id: str,
    match_id: str,
    user_action: str,
    expanded: bool,
    diagnosis_id: int | None,
    challenge_reason: str | None,
    challenge_alternative_probs: dict[str, float] | None,
    divergence_type: str | None = None,
) -> str:
    """Insert a row into ``divergence_diagnoses_displayed`` and return its id.

    Generates a UUID for the primary key so SQLite (used in tests) and
    PostgreSQL both work without relying on a DB-level ``gen_random_uuid()``.

    Args:
        session: Active :class:`AsyncSession`.
        user_id: Authenticated user identifier.
        match_id: Match the diagnosis was shown for.
        user_action: One of ``agreed | challenged | shared | dismissed``.
        expanded: Whether the card was expanded before the action.
        diagnosis_id: Optional FK to a related prediction row.
        challenge_reason: Free-text reason when ``user_action == "challenged"``.
        challenge_alternative_probs: User-supplied alternative probabilities.

    Returns:
        The string UUID assigned to the new row.
    """
    now = datetime.datetime.now(datetime.UTC)
    new_id = str(uuid.uuid4())

    # Pack extra fields into ``diagnosis_payload`` so they are not lost.
    diagnosis_payload: dict[str, Any] = {
        "user_action": user_action,
        "expanded": expanded,
        "challenge_reason": challenge_reason,
        "challenge_alternative_probs": challenge_alternative_probs,
        "diagnosis_id": diagnosis_id,
    }

    # ``divergence_type`` describes which layer divergence the diagnosis card
    # surfaced — not the user's interaction.  The interaction lives in
    # ``diagnosis_payload['user_action']`` and the boolean flags below.  When
    # the caller doesn't know the layer, default to ``'other'`` (allowed by
    # the DB CHECK ``divergence_diagnoses_type_valid``).
    resolved_divergence_type = (
        divergence_type
        if divergence_type in ALLOWED_DIVERGENCE_TYPES
        else DEFAULT_DIVERGENCE_TYPE
    )

    stmt = sa_insert(DivergenceDiagnosisDisplayed).values(
        id=new_id,
        user_id=user_id,
        match_id=match_id,
        was_dismissed=(user_action == "dismissed"),
        was_clicked=expanded,
        interaction_at=now,
        displayed_at=now,
        created_at=now,
        divergence_type=resolved_divergence_type,
        diagnosis_payload=diagnosis_payload,
    )
    await session.execute(stmt)
    await session.commit()
    return new_id


# ---------------------------------------------------------------------------
# POST /api/divergence/feedback
# ---------------------------------------------------------------------------


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Record a user interaction with a divergence diagnosis card",
    status_code=200,
)
async def post_feedback(
    body: FeedbackRequest,
    request: Request,
    db: DbSession,
) -> FeedbackResponse:
    """Persist a divergence feedback event from the frontend.

    The row is inserted into ``divergence_diagnoses_displayed`` with an inline
    helper (not exposed via ``queries.py``).  The response includes a synthetic
    integer ``id`` derived from the UUID for ergonomic consumption by the TS
    bridge (P8.1).

    Args:
        body: Validated :class:`FeedbackRequest` body.
        request: FastAPI request (provides ``request.state.request_id``).
        db: Async DB session (injected).

    Returns:
        :class:`FeedbackResponse` with ``ok=True`` and the new row's integer id.

    Raises:
        HTTPException 422: Pydantic validation failed (e.g. missing
            ``challenge_reason`` when action is ``"challenged"``).
        HTTPException 500: Unexpected DB error (FastAPI default).
    """
    request_id = getattr(request.state, "request_id", "")
    log = logger.bind(
        match_id=body.match_id,
        user_id=body.user_id,
        user_action=body.user_action,
        request_id=request_id,
    )
    log.info("divergence_feedback.start")

    try:
        new_uuid = await _insert_feedback(
            db,
            user_id=body.user_id,
            match_id=body.match_id,
            user_action=body.user_action,
            expanded=body.expanded,
            diagnosis_id=body.diagnosis_id,
            challenge_reason=body.challenge_reason,
            challenge_alternative_probs=body.challenge_alternative_probs,
            divergence_type=body.divergence_type,
        )
    except Exception as exc:
        log.exception("divergence_feedback.db_error", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to persist feedback.") from exc

    # Derive a stable integer from the UUID for ergonomic TS bridge consumption.
    synthetic_id = abs(hash(new_uuid)) % (10**9)
    log.info("divergence_feedback.done", synthetic_id=synthetic_id)

    return FeedbackResponse(ok=True, id=synthetic_id)
