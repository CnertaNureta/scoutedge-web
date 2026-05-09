"""FastAPI router for OG-image metadata endpoints (task P5.4).

Exposes three routes that return JSON descriptions of what the Next.js
Edge route (P8.6) should render as Open Graph images. No image rendering
happens here — this module is pure metadata composition.

Routes:
- GET /og/match/{match_id}      — OG metadata for a specific match
- GET /og/bracket/{fork_id}     — OG metadata for a bracket fork
- GET /og/slayer/{user_id}      — OG metadata for a user's "Model Slayer" badge

The router is intentionally *not* mounted into main.py here; wiring happens
in a separate orchestration step (P5.5).
"""

from __future__ import annotations

import datetime
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import nullslast, select

from api.deps import DbSession
from scoutedge_intelligence.db.models import BracketFork, Match, Prediction, UserPrediction
from scoutedge_intelligence.db.queries import get_team

logger: structlog.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(prefix="/og", tags=["og"])

# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------


class MatchOGResponse(BaseModel):
    """OG-image metadata for a match card."""

    match_id: str
    home_team: str
    away_team: str
    kickoff_utc: str
    stage: str
    venue_city: str | None
    predicted_winner: str | None
    predicted_p_win: float | None
    headline: str
    ts: str  # ISO 8601 generation timestamp


class BracketOGResponse(BaseModel):
    """OG-image metadata for a bracket fork."""

    fork_id: str
    user_id: str
    title: str
    share_url: str
    points_earned: int
    max_possible: int | None
    rank_percentile: float | None
    headline: str
    ts: str


class SlayerOGResponse(BaseModel):
    """OG-image metadata for a user's Model Slayer badge."""

    user_id: str
    total_picks: int
    correct_picks: int
    accuracy_pct: float
    headline: str
    badge_tier: str  # e.g. "bronze", "silver", "gold", "platinum"
    ts: str


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


def _now_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.datetime.now(tz=datetime.UTC).isoformat()


def _make_match_headline(
    home_team: str,
    away_team: str,
    winner: str | None,
    p_win: float | None,
) -> str:
    """Compose a short headline for the match OG card.

    Args:
        home_team: Home team FIFA code or display name.
        away_team: Away team FIFA code or display name.
        winner: Predicted winning team, or None.
        p_win: Predicted probability (0-1), or None.

    Returns:
        Human-readable headline string, e.g. "BRA 56% to beat ARG".
    """
    if winner and p_win is not None:
        pct = round(p_win * 100)
        loser = away_team if winner == home_team else home_team
        return f"{winner} {pct}% to beat {loser}"
    return f"{home_team} vs {away_team}"


def _badge_tier(accuracy_pct: float) -> str:
    """Map accuracy percentage to badge tier name.

    Args:
        accuracy_pct: Accuracy as a percentage (0-100).

    Returns:
        Badge tier string.
    """
    if accuracy_pct >= 75:
        return "platinum"
    if accuracy_pct >= 60:
        return "gold"
    if accuracy_pct >= 45:
        return "silver"
    return "bronze"


def _canonical_outcome(outcome: str) -> str:
    """Normalize home/away and home_win/away_win values before comparisons."""
    if outcome == "home_win":
        return "home"
    if outcome == "away_win":
        return "away"
    return outcome


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get(
    "/match/{match_id}",
    response_model=MatchOGResponse,
    summary="OG metadata for a match",
)
async def og_match(match_id: str, session: DbSession) -> MatchOGResponse:
    """Return OG-image metadata for the given match.

    Fetches the match row and the latest prediction. Does not render an image;
    the returned JSON is consumed by the Next.js Edge OG renderer (P8.6).

    Args:
        match_id: The UUID of the match.
        session: Injected async DB session.

    Returns:
        MatchOGResponse describing what the OG image should show.

    Raises:
        HTTPException(404): If the match is not found.
    """
    log = logger.bind(endpoint="og_match", match_id=match_id)

    result = await session.execute(select(Match).where(Match.id == match_id))
    match = result.scalars().first()

    if match is None:
        log.info("og.match.not_found")
        raise HTTPException(status_code=404, detail=f"Match '{match_id}' not found.")

    # Resolve FK team_id → display name. Falling back to the FK or the literal
    # "HOME"/"AWAY" only when the row is genuinely missing prevents shipping a
    # raw UUID into the OG card (the bug fixed here).
    home_team_row = await get_team(session, match.home_team_id)
    away_team_row = await get_team(session, match.away_team_id)
    home_team = (
        (home_team_row.name if home_team_row else None)
        or match.home_team_id
        or "HOME"
    )
    away_team = (
        (away_team_row.name if away_team_row else None)
        or match.away_team_id
        or "AWAY"
    )

    # Fetch the latest prediction for this match
    pred_result = await session.execute(
        select(Prediction)
        .where(Prediction.match_id == match_id)
        .order_by(
            nullslast(Prediction.generated_at.desc()),
            nullslast(Prediction.created_at.desc()),
        )
        .limit(1)
    )
    pred = pred_result.scalars().first()
    winner: str | None = None
    p_win: float | None = None

    if pred is not None:
        winner = pred.claude_pick
        if winner == "home":
            winner = home_team
            p_win = float(pred.blended_home_win_prob) if pred.blended_home_win_prob else None
        elif winner == "away":
            winner = away_team
            p_win = float(pred.blended_away_win_prob) if pred.blended_away_win_prob else None
        else:
            # claude_pick may already be a team code in future iterations
            p_win = float(pred.blended_home_win_prob) if pred.blended_home_win_prob else None

    headline = _make_match_headline(home_team, away_team, winner, p_win)

    kickoff_str = (
        match.kickoff_utc.isoformat()
        if match.kickoff_utc
        else datetime.datetime.now(tz=datetime.UTC).isoformat()
    )

    log.debug("og.match.composed", home=home_team, away=away_team, winner=winner)
    return MatchOGResponse(
        match_id=match_id,
        home_team=home_team,
        away_team=away_team,
        kickoff_utc=kickoff_str,
        stage=match.stage or "unknown",
        venue_city=match.venue_city,
        predicted_winner=winner,
        predicted_p_win=p_win,
        headline=headline,
        ts=_now_iso(),
    )


@router.get(
    "/bracket/{fork_id}",
    response_model=BracketOGResponse,
    summary="OG metadata for a bracket fork",
)
async def og_bracket(fork_id: str, session: DbSession) -> BracketOGResponse:
    """Return OG-image metadata for a bracket fork.

    Args:
        fork_id: The short fork identifier.
        session: Injected async DB session.

    Returns:
        BracketOGResponse with fork summary information for OG rendering.

    Raises:
        HTTPException(404): If the fork is not found.
    """
    log = logger.bind(endpoint="og_bracket", fork_id=fork_id)

    result = await session.execute(select(BracketFork).where(BracketFork.id == fork_id))
    fork = result.scalars().first()

    if fork is None:
        log.info("og.bracket.not_found")
        raise HTTPException(status_code=404, detail=f"Bracket fork '{fork_id}' not found.")

    max_possible = fork.max_possible
    points = fork.points_earned

    if max_possible:
        headline = f"{points}/{max_possible} pts — #{fork.rank_global or '?'} globally"
    else:
        headline = f"{fork.title} · ScoutEdge WC2026 Bracket"

    log.debug("og.bracket.composed", user_id=fork.user_id, points=points)
    return BracketOGResponse(
        fork_id=fork_id,
        user_id=fork.user_id,
        title=fork.title,
        share_url=f"/bracket/{fork_id}",
        points_earned=points,
        max_possible=max_possible,
        rank_percentile=float(fork.rank_percentile) if fork.rank_percentile else None,
        headline=headline,
        ts=_now_iso(),
    )


@router.get(
    "/slayer/{user_id}",
    response_model=SlayerOGResponse,
    summary="OG metadata for a Model Slayer badge",
)
async def og_slayer(user_id: str, session: DbSession) -> SlayerOGResponse:
    """Return OG-image metadata for a user's Model Slayer record.

    Counts the user's submitted picks vs actual outcomes to derive accuracy.
    A pick is "correct" when pick_outcome matches actual_outcome.

    Args:
        user_id: The user's UUID.
        session: Injected async DB session.

    Returns:
        SlayerOGResponse with accuracy stats and badge tier.
    """
    log = logger.bind(endpoint="og_slayer", user_id=user_id)

    result = await session.execute(
        select(UserPrediction)
        .where(UserPrediction.user_id == user_id)
        .where(UserPrediction.actual_outcome.isnot(None))
    )
    picks: list[Any] = list(result.scalars().all())

    total = len(picks)
    correct = sum(
        1
        for p in picks
        if p.pick_outcome and p.actual_outcome
        if _canonical_outcome(p.pick_outcome) == _canonical_outcome(p.actual_outcome)
    )
    accuracy = round((correct / total * 100), 1) if total > 0 else 0.0
    tier = _badge_tier(accuracy)

    if total == 0:
        headline = f"{user_id[:8]}… — no picks recorded yet"
    else:
        headline = f"{correct}/{total} correct vs the AI model ({accuracy}%)"

    log.debug("og.slayer.composed", total=total, correct=correct, accuracy=accuracy)
    return SlayerOGResponse(
        user_id=user_id,
        total_picks=total,
        correct_picks=correct,
        accuracy_pct=accuracy,
        headline=headline,
        badge_tier=tier,
        ts=_now_iso(),
    )
