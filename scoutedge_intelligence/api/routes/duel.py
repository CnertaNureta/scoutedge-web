"""Duel route handlers for ScoutEdge WC2026 (task P5.3).

Endpoints:
  POST /api/duel/submit      — lock in a user duel pick before kickoff.
  GET  /api/duel/scorecard/{user_id} — per-user Brier duel results.
  GET  /api/duel/leaderboard          — cross-user ranking by beat-AI count.

The router is intentionally *not* mounted here; a separate orchestration
step (P5.4 / P5.5) wires it into api/main.py.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db_session
from scoutedge_intelligence.db.models import Match, UserPrediction
from scoutedge_intelligence.db.queries import get_latest_prediction, get_match

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/duel", tags=["duel"])

# ---------------------------------------------------------------------------
# Annotated dependency alias
# ---------------------------------------------------------------------------

DbSession = Annotated[AsyncSession, Depends(get_db_session)]

# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

_CONFIDENCE_LEVELS: frozenset[str] = frozenset({"low", "medium", "high"})


class DuelSubmitRequest(BaseModel):
    """Body for POST /api/duel/submit."""

    user_id: str = Field(..., description="Opaque user identifier (UUID or similar).")
    match_id: str = Field(..., description="Match UUID.")
    home_score: int = Field(..., ge=0, description="User's predicted home score.")
    away_score: int = Field(..., ge=0, description="User's predicted away score.")
    prob_home: float = Field(..., ge=0.0, le=1.0, description="User's home-win probability.")
    prob_draw: float = Field(..., ge=0.0, le=1.0, description="User's draw probability.")
    prob_away: float = Field(..., ge=0.0, le=1.0, description="User's away-win probability.")
    confidence_level: str = Field(..., description="One of: low, medium, high.")

    @field_validator("confidence_level")
    @classmethod
    def _validate_confidence(cls, v: str) -> str:
        if v not in _CONFIDENCE_LEVELS:
            raise ValueError(f"confidence_level must be one of {sorted(_CONFIDENCE_LEVELS)}")
        return v

    @field_validator("prob_away")
    @classmethod
    def _validate_probs_sum(cls, prob_away: float, info: Any) -> float:
        """Ensure home + draw + away probabilities sum to approximately 1.0."""
        data = info.data
        prob_home = data.get("prob_home", 0.0)
        prob_draw = data.get("prob_draw", 0.0)
        total = prob_home + prob_draw + prob_away
        if abs(total - 1.0) > 0.05:
            raise ValueError(
                f"prob_home + prob_draw + prob_away must sum to ~1.0 (got {total:.4f})"
            )
        return prob_away


class DuelSubmitResponse(BaseModel):
    """Response for POST /api/duel/submit."""

    ok: bool
    user_prediction_id: str
    ai_snapshot: dict[str, Any]


class ScorecardItem(BaseModel):
    """A single row in the duel scorecard."""

    match_id: str
    home_score: int
    away_score: int
    user_brier: float | None = None
    ai_brier: float | None = None
    beat_ai: bool | None = None
    badge: str | None = None


class ScorecardResponse(BaseModel):
    """Response for GET /api/duel/scorecard/{user_id}."""

    user_id: str
    items: list[ScorecardItem]
    total_beat_ai: int
    n_finished: int


class LeaderboardEntry(BaseModel):
    """A single row in the duel leaderboard."""

    user_id: str
    matches_played: int
    total_beat_ai: int
    win_rate: float


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_ai_snapshot(pred: Any) -> dict[str, Any]:
    """Extract a compact snapshot dict from the latest Prediction row."""
    return {
        "prediction_id": pred.id,
        "match_id": pred.match_id,
        "blended_home_win_prob": pred.blended_home_win_prob,
        "blended_draw_prob": pred.blended_draw_prob,
        "blended_away_win_prob": pred.blended_away_win_prob,
        "blend_weights": pred.blend_weights,
        "ml_home_win_prob": pred.ml_home_win_prob,
        "ml_draw_prob": pred.ml_draw_prob,
        "ml_away_win_prob": pred.ml_away_win_prob,
        "sb_home_win_prob": pred.sb_home_win_prob,
        "sb_draw_prob": pred.sb_draw_prob,
        "sb_away_win_prob": pred.sb_away_win_prob,
        "claude_pick": pred.claude_pick,
        "claude_confidence": pred.claude_confidence,
        "created_at": pred.created_at.isoformat() if pred.created_at else None,
    }


def _derive_outcome(home: int, away: int) -> str:
    """Map a score pair to home_win | draw | away_win."""
    if home > away:
        return "home_win"
    if home < away:
        return "away_win"
    return "draw"


def _brier_score(
    probs: dict[str, float],
    actual_outcome: str,
) -> float:
    """Compute multi-class Brier score for a 1X2 prediction.

    Lower is better. Range [0, 2].
    """
    keys = ["home_win", "draw", "away_win"]
    actuals = {k: 1.0 if k == actual_outcome else 0.0 for k in keys}
    return sum((probs.get(k, 0.0) - actuals[k]) ** 2 for k in keys)


def _badge_for(beat_ai: bool | None, user_brier: float | None) -> str | None:
    """Assign a simple badge based on duel outcome and score quality."""
    if beat_ai is None:
        return None
    if not beat_ai:
        return None
    if user_brier is not None and user_brier < 0.20:
        return "sharpshooter"
    return "beat_ai"


# ---------------------------------------------------------------------------
# POST /api/duel/submit
# ---------------------------------------------------------------------------


@router.post("/submit", response_model=DuelSubmitResponse, status_code=200)
async def submit_duel(body: DuelSubmitRequest, db: DbSession) -> DuelSubmitResponse:
    """Lock in a user duel prediction before the match kicks off.

    Validates kickoff time, snapshots the current AI prediction, and inserts
    a UserPrediction row with prediction_type=duel stored in metadata_.

    Raises:
        404: No match found for match_id.
        404: No AI prediction available yet for this match.
        403: Match has already kicked off (kickoff_utc <= now).
    """
    log = logger.bind(user_id=body.user_id, match_id=body.match_id)

    # ---- Resolve match -------------------------------------------------------
    match = await get_match(db, body.match_id)
    if match is None:
        log.warning("duel.submit.match_not_found")
        raise HTTPException(status_code=404, detail=f"Match {body.match_id!r} not found.")

    # ---- Kickoff guard -------------------------------------------------------
    now_utc = datetime.datetime.now(tz=datetime.UTC)
    if match.kickoff_utc is not None:
        # Ensure kickoff_utc is timezone-aware for comparison
        ko = match.kickoff_utc
        if ko.tzinfo is None:
            ko = ko.replace(tzinfo=datetime.UTC)
        if ko <= now_utc:
            log.warning("duel.submit.match_kicked_off", kickoff_utc=str(ko))
            raise HTTPException(
                status_code=403,
                detail="Match has already kicked off; submissions are closed.",
            )
        locked_until: datetime.datetime | None = ko
    else:
        locked_until = None

    # ---- AI prediction snapshot ----------------------------------------------
    ai_pred = await get_latest_prediction(db, body.match_id)
    if ai_pred is None:
        log.warning("duel.submit.no_ai_prediction")
        raise HTTPException(
            status_code=404,
            detail="No AI prediction available for this match yet.",
        )

    ai_snapshot = _build_ai_snapshot(ai_pred)

    # ---- Derive user pick outcome -------------------------------------------
    pick_outcome = _derive_outcome(body.home_score, body.away_score)

    # ---- Confidence int mapping ----------------------------------------------
    confidence_map: dict[str, int] = {"low": 1, "medium": 2, "high": 3}
    pick_confidence = confidence_map[body.confidence_level]

    # ---- Insert UserPrediction row ------------------------------------------
    now = datetime.datetime.now(tz=datetime.UTC)
    new_id = str(uuid.uuid4())

    user_pred = UserPrediction(
        id=new_id,
        user_id=body.user_id,
        match_id=body.match_id,
        pick_outcome=pick_outcome,
        pick_home_goals=body.home_score,
        pick_away_goals=body.away_score,
        pick_confidence=pick_confidence,
        # locked_at mirrors locked_until (kickoff_utc)
        locked_at=locked_until,
        submitted_at=now,
        source_platform="duel",
        metadata_={
            "prediction_type": "duel",
            "ai_snapshot": ai_snapshot,
            "user_probs": {
                "home_win": body.prob_home,
                "draw": body.prob_draw,
                "away_win": body.prob_away,
            },
            "confidence_level": body.confidence_level,
        },
        created_at=now,
        updated_at=now,
    )

    db.add(user_pred)
    await db.commit()

    log.info("duel.submit.ok", user_prediction_id=new_id)
    return DuelSubmitResponse(
        ok=True,
        user_prediction_id=new_id,
        ai_snapshot=ai_snapshot,
    )


# ---------------------------------------------------------------------------
# GET /api/duel/scorecard/{user_id}
# ---------------------------------------------------------------------------


@router.get("/scorecard/{user_id}", response_model=ScorecardResponse)
async def get_scorecard(
    user_id: str,
    db: DbSession,
    limit: int = 20,
    only_finished: bool = True,
) -> ScorecardResponse:
    """Return duel scorecard for a user.

    Fetches UserPrediction rows with prediction_type=duel and the
    corresponding Match rows to compute Brier scores and beat-AI flags.

    Args:
        user_id: The user whose scorecard is requested.
        limit: Maximum number of items to return (default 20).
        only_finished: When True, return only matches that have finished.

    Returns:
        ScorecardResponse with items list and aggregate totals.
    """
    log = logger.bind(user_id=user_id, limit=limit, only_finished=only_finished)

    # Inline query: fetch user_predictions + matches in one join
    # Filter for duel prediction_type via JSON path (metadata_->>'prediction_type' = 'duel')
    # Using SQLAlchemy text for cross-DB compat (JSON path varies between PG/SQLite)
    stmt = (
        select(UserPrediction, Match)
        .join(Match, Match.id == UserPrediction.match_id)
        .where(UserPrediction.user_id == user_id)
        .order_by(UserPrediction.submitted_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    items: list[ScorecardItem] = []
    total_beat_ai = 0
    n_finished = 0

    for user_pred_row, match_row in rows:
        meta: dict[str, Any] = user_pred_row.metadata_ or {}
        # Only include duel-typed predictions
        if meta.get("prediction_type") != "duel":
            continue
        # If only_finished, skip unfinished matches
        if only_finished and not match_row.finished:
            continue

        user_brier: float | None = None
        ai_brier: float | None = None
        beat_ai: bool | None = None

        if match_row.finished and match_row.actual_outcome:
            n_finished += 1
            actual = match_row.actual_outcome  # home_win | draw | away_win

            # User Brier
            user_probs: dict[str, float] = meta.get("user_probs", {})
            if user_probs:
                user_brier = _brier_score(user_probs, actual)

            # AI Brier (from snapshot)
            ai_snap: dict[str, Any] = meta.get("ai_snapshot", {})
            if ai_snap:
                ai_probs = {
                    "home_win": ai_snap.get("blended_home_win_prob") or 0.0,
                    "draw": ai_snap.get("blended_draw_prob") or 0.0,
                    "away_win": ai_snap.get("blended_away_win_prob") or 0.0,
                }
                ai_brier = _brier_score(ai_probs, actual)

            if user_brier is not None and ai_brier is not None:
                beat_ai = user_brier < ai_brier
                if beat_ai:
                    total_beat_ai += 1

        items.append(
            ScorecardItem(
                match_id=match_row.id,
                home_score=user_pred_row.pick_home_goals,
                away_score=user_pred_row.pick_away_goals,
                user_brier=user_brier,
                ai_brier=ai_brier,
                beat_ai=beat_ai,
                badge=_badge_for(beat_ai, user_brier),
            )
        )

    log.info("duel.scorecard.fetched", n_items=len(items), total_beat_ai=total_beat_ai)
    return ScorecardResponse(
        user_id=user_id,
        items=items,
        total_beat_ai=total_beat_ai,
        n_finished=n_finished,
    )


# ---------------------------------------------------------------------------
# GET /api/duel/leaderboard
# ---------------------------------------------------------------------------

# Sentinel returned from DB for beat_ai flag stored in metadata_ JSONB:
# We derive it from Brier at read-time, not stored. So leaderboard needs to
# re-aggregate. For efficiency at scale use a materialized view (P8.3 follow-up).
# Here we do an in-Python aggregation over the raw rows.


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    db: DbSession,
    top_n: int = 50,
) -> list[LeaderboardEntry]:
    """Return a cross-user leaderboard ranked by total_beat_ai descending.

    Fetches all duel UserPrediction rows joined to finished Matches and
    computes beat-AI in Python (same logic as scorecard). A future
    optimisation (P8.3) should materialise this into a summary table.

    Args:
        top_n: Number of top users to return (default 50).

    Returns:
        Sorted list of LeaderboardEntry records.
    """
    log = logger.bind(top_n=top_n)

    stmt = (
        select(UserPrediction, Match)
        .join(Match, Match.id == UserPrediction.match_id)
        .where(Match.finished.is_(True))
        .where(Match.actual_outcome.isnot(None))
        .order_by(UserPrediction.user_id)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Aggregate per user
    user_stats: dict[str, dict[str, Any]] = {}

    for user_pred_row, match_row in rows:
        meta: dict[str, Any] = user_pred_row.metadata_ or {}
        if meta.get("prediction_type") != "duel":
            continue

        uid = user_pred_row.user_id
        if uid not in user_stats:
            user_stats[uid] = {"matches_played": 0, "total_beat_ai": 0}

        user_stats[uid]["matches_played"] += 1
        actual = match_row.actual_outcome

        user_probs: dict[str, float] = meta.get("user_probs", {})
        ai_snap: dict[str, Any] = meta.get("ai_snapshot", {})

        if user_probs and ai_snap and actual:
            user_brier = _brier_score(user_probs, actual)
            ai_probs = {
                "home_win": ai_snap.get("blended_home_win_prob") or 0.0,
                "draw": ai_snap.get("blended_draw_prob") or 0.0,
                "away_win": ai_snap.get("blended_away_win_prob") or 0.0,
            }
            ai_brier = _brier_score(ai_probs, actual)
            if user_brier < ai_brier:
                user_stats[uid]["total_beat_ai"] += 1

    entries: list[LeaderboardEntry] = []
    for uid, stats in user_stats.items():
        played = stats["matches_played"]
        beat = stats["total_beat_ai"]
        win_rate = beat / played if played > 0 else 0.0
        entries.append(
            LeaderboardEntry(
                user_id=uid,
                matches_played=played,
                total_beat_ai=beat,
                win_rate=round(win_rate, 4),
            )
        )

    # Sort by total_beat_ai desc, then win_rate desc as tiebreaker
    entries.sort(key=lambda e: (e.total_beat_ai, e.win_rate), reverse=True)
    result_slice = entries[:top_n]

    log.info("duel.leaderboard.fetched", total_users=len(entries), returned=len(result_slice))
    return result_slice
