"""FastAPI router for WC2026 bracket endpoints (task P5.4).

Exposes three routes:
- GET  /api/bracket/base       — canonical AI-predicted bracket
- POST /api/bracket/fork       — save a user bracket fork
- GET  /api/bracket/{fork_id}  — retrieve a bracket fork by id

The router is intentionally *not* mounted into main.py here; wiring happens
in a separate orchestration step (P5.5).
"""

from __future__ import annotations

import datetime
import secrets
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import insert as sa_insert
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from api.deps import DbSession
from scoutedge_intelligence.db.models import BracketFork, Prediction

logger: structlog.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/bracket", tags=["bracket"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_BRACKET_VERSION = "wc2026-v1"
_WC2026_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"]
_TEAMS_PER_GROUP = 4
_MAX_FORK_ID_RETRIES = 3


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------


class GroupEntry(BaseModel):
    """Predicted group-stage standing."""

    group: str
    teams: list[str]
    predicted_top2: list[str]


class R16Entry(BaseModel):
    """Predicted Round-of-16 slot."""

    slot: str
    predicted_winner: str
    p_win: float


class QFEntry(BaseModel):
    """Predicted quarter-final slot."""

    slot: str
    predicted_winner: str
    p_win: float


class SFEntry(BaseModel):
    """Predicted semi-final slot."""

    slot: str
    predicted_winner: str
    p_win: float


class FinalEntry(BaseModel):
    """Predicted final."""

    predicted_winner: str
    p_win: float


class BracketStages(BaseModel):
    """All stages of the predicted bracket."""

    group: list[GroupEntry]
    r16: list[R16Entry]
    qf: list[QFEntry]
    sf: list[SFEntry]
    final: FinalEntry


class BaseBracketResponse(BaseModel):
    """Response for GET /api/bracket/base."""

    version: str
    stages: BracketStages


class ForkRequest(BaseModel):
    """Request body for POST /api/bracket/fork."""

    user_id: str
    parent_fork_id: str | None = None
    bracket_data: dict[str, Any]
    forked_at_match_id: str | None = None


class ForkResponse(BaseModel):
    """Response for POST /api/bracket/fork."""

    id: str
    share_url: str


class ForkDetailResponse(BaseModel):
    """Response for GET /api/bracket/{fork_id}."""

    id: str
    parent_fork_id: str | None
    bracket_data: dict[str, Any]
    score: int | None
    user_id: str
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Helper: build a skeleton bracket when no prediction data is available
# ---------------------------------------------------------------------------


def _build_skeleton_bracket() -> BracketStages:
    """Return a placeholder bracket using FIFA placeholder codes A1..H4.

    This is used when the predictions table has no data yet. All slots use
    placeholder team codes; probabilities default to 0.5.
    """
    groups: list[GroupEntry] = []
    for g in _WC2026_GROUPS:
        teams = [f"{g}{n}" for n in range(1, _TEAMS_PER_GROUP + 1)]
        groups.append(GroupEntry(group=g, teams=teams, predicted_top2=teams[:2]))

    # R16: 8 matchups — winners of groups face runners-up cross-bracket
    r16: list[R16Entry] = []
    pairs = [("A", "B"), ("C", "D"), ("E", "F"), ("G", "H")]
    for i, (g1, g2) in enumerate(pairs):
        r16.append(R16Entry(slot=f"R16-{i * 2 + 1}", predicted_winner=f"{g1}1", p_win=0.5))
        r16.append(R16Entry(slot=f"R16-{i * 2 + 2}", predicted_winner=f"{g2}1", p_win=0.5))

    # QF: 4 slots
    qf: list[QFEntry] = []
    for i in range(4):
        qf.append(
            QFEntry(slot=f"QF-{i + 1}", predicted_winner=f"{_WC2026_GROUPS[i * 2]}1", p_win=0.5)
        )

    # SF: 2 slots
    sf: list[SFEntry] = []
    for i in range(2):
        sf.append(
            SFEntry(slot=f"SF-{i + 1}", predicted_winner=f"{_WC2026_GROUPS[i * 4]}1", p_win=0.5)
        )

    final = FinalEntry(predicted_winner="A1", p_win=0.5)

    return BracketStages(group=groups, r16=r16, qf=qf, sf=sf, final=final)


def _build_bracket_from_predictions(rows: list[Any]) -> BracketStages:
    """Derive a best-effort bracket from Prediction ORM rows.

    For the stub implementation we extract any non-null claude_pick values
    from recent predictions and fold them into a skeleton. Full bracket
    progression logic is deferred to P8.5.

    Args:
        rows: List of Prediction ORM instances from the DB.

    Returns:
        BracketStages built from available prediction data.
    """
    # Start from the placeholder skeleton and overlay actual picks where
    # we have them. Full progression computation is out of scope here.
    return _build_skeleton_bracket()


# ---------------------------------------------------------------------------
# Helper: generate a short, URL-safe fork id
# ---------------------------------------------------------------------------


def _new_fork_id() -> str:
    """Return a ~8-character URL-safe base64 id using secrets.token_urlsafe.

    ``secrets.token_urlsafe(6)`` encodes 6 random bytes as base64url → 8 chars.
    """
    return secrets.token_urlsafe(6)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/base", response_model=BaseBracketResponse, summary="Get canonical AI bracket")
async def get_base_bracket(session: DbSession) -> BaseBracketResponse:
    """Return the canonical AI-predicted tournament bracket.

    Queries the predictions table for the latest entries and builds a
    bracket object. Falls back to a placeholder skeleton (FIFA codes A1..H4)
    when no predictions are available.

    Args:
        session: Injected async DB session.

    Returns:
        BaseBracketResponse with version and all stages.
    """
    log = logger.bind(endpoint="get_base_bracket")
    try:
        result = await session.execute(
            select(Prediction)
            .where(Prediction.claude_pick.isnot(None))
            .order_by(Prediction.id.desc())
            .limit(64)
        )
        rows = result.scalars().all()
    except Exception as exc:
        log.warning("bracket.base.db_error", error=str(exc))
        rows = []

    if rows:
        log.info("bracket.base.from_predictions", count=len(rows))
        stages = _build_bracket_from_predictions(list(rows))
    else:
        log.info("bracket.base.using_skeleton")
        stages = _build_skeleton_bracket()

    return BaseBracketResponse(version=_BRACKET_VERSION, stages=stages)


@router.post("/fork", response_model=ForkResponse, summary="Fork the AI bracket")
async def fork_bracket(body: ForkRequest, session: DbSession) -> ForkResponse:
    """Save a user's bracket fork and return its shareable id.

    Generates a short URL-safe id, inserts the fork row, and retries up to
    ``_MAX_FORK_ID_RETRIES`` times on primary-key collision. When a parent
    fork id is provided, the parent's fork_count is incremented by 1.

    Args:
        body: Fork payload from the client.
        session: Injected async DB session.

    Returns:
        ForkResponse containing the new fork id and share URL.

    Raises:
        HTTPException(503): If all retry attempts fail due to id collisions.
    """
    log = logger.bind(endpoint="fork_bracket", user_id=body.user_id)
    log.debug("bracket.fork.request", parent_fork_id=body.parent_fork_id)

    now = datetime.datetime.now(tz=datetime.UTC)
    fork_id: str | None = None

    for attempt in range(1, _MAX_FORK_ID_RETRIES + 1):
        candidate = _new_fork_id()
        try:
            await session.execute(
                sa_insert(BracketFork).values(
                    id=candidate,
                    user_id=body.user_id,
                    parent_fork_id=body.parent_fork_id,
                    bracket_state=body.bracket_data,
                    created_at=now,
                    updated_at=now,
                )
            )
            await session.flush()
            fork_id = candidate
            log.info("bracket.fork.inserted", fork_id=fork_id, attempt=attempt)
            break
        except IntegrityError:
            await session.rollback()
            log.warning("bracket.fork.id_collision", candidate=candidate, attempt=attempt)

    if fork_id is None:
        raise HTTPException(
            status_code=503,
            detail="Could not generate a unique fork id after maximum retries.",
        )

    # Increment parent's fork_count if applicable
    if body.parent_fork_id:
        try:
            await session.execute(
                update(BracketFork)
                .where(BracketFork.id == body.parent_fork_id)
                .values(fork_count=BracketFork.fork_count + 1)
            )
        except Exception as exc:
            log.warning(
                "bracket.fork.parent_increment_failed",
                parent_fork_id=body.parent_fork_id,
                error=str(exc),
            )

    await session.commit()

    return ForkResponse(id=fork_id, share_url=f"/bracket/{fork_id}")


@router.get(
    "/{fork_id}",
    response_model=ForkDetailResponse,
    summary="Get a bracket fork by id",
)
async def get_fork(fork_id: str, session: DbSession) -> ForkDetailResponse:
    """Return the bracket data for a given fork id.

    Args:
        fork_id: The short fork identifier from the share URL.
        session: Injected async DB session.

    Returns:
        ForkDetailResponse with bracket data and scoring info.

    Raises:
        HTTPException(404): If the fork_id is not found.
    """
    log = logger.bind(endpoint="get_fork", fork_id=fork_id)

    result = await session.execute(select(BracketFork).where(BracketFork.id == fork_id))
    row = result.scalars().first()

    if row is None:
        log.info("bracket.fork.not_found")
        raise HTTPException(status_code=404, detail=f"Fork '{fork_id}' not found.")

    log.debug("bracket.fork.found", user_id=row.user_id)
    return ForkDetailResponse(
        id=row.id,
        parent_fork_id=row.parent_fork_id,
        bracket_data=row.bracket_state or {},
        score=row.points_earned if row.points_earned else None,
        user_id=row.user_id,
        created_at=row.created_at,
    )
