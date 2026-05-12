"""
Async query helpers for ScoutEdge WC2026.

All functions accept an AsyncSession from SQLAlchemy 2.x async (asyncpg on
PostgreSQL). No live DB is required for tests — callers mock the session.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any

import structlog
from sqlalchemy import insert as sa_insert
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from scoutedge_intelligence.db.models import (
    Match,
    MatchSchema,
    PolymarketSnapshot,
    PolymarketSnapshotSchema,
    Prediction,
    PredictionAudit,
    PredictionAuditSchema,
    PredictionSchema,
    Team,
    TeamSchema,
)

logger = structlog.get_logger(__name__)


_CORE_OUTCOMES: tuple[str, str, str] = ("home", "draw", "away")


def _first_number(*values: float | None) -> float | None:
    """Return the first non-null value as float."""
    for value in values:
        if value is not None:
            return float(value)
    return None


def _normalise_prob_triple(
    home: float | None,
    draw: float | None,
    away: float | None,
) -> tuple[float, float, float]:
    """Return a valid 1X2 probability triple for the core predictions columns."""
    h = float(home or 0.0)
    d = float(draw or 0.0)
    a = float(away or 0.0)
    total = h + d + a
    if total <= 0.0:
        return (1 / 3, 1 / 3, 1 / 3)
    return (h / total, d / total, a / total)


def _recommended_pick(home: float, draw: float, away: float, payload: PredictionSchema) -> str:
    """Return a core-schema pick value: home | draw | away."""
    if payload.recommended_pick in _CORE_OUTCOMES:
        return payload.recommended_pick
    if payload.claude_pick in _CORE_OUTCOMES:
        return payload.claude_pick

    probs = {"home": home, "draw": draw, "away": away}
    return max(probs, key=probs.__getitem__)


def _prediction_insert_data(payload: PredictionSchema) -> dict[str, Any]:
    """Build an insert payload that satisfies the existing Supabase schema."""
    now = datetime.datetime.now(tz=datetime.UTC)
    data = payload.model_dump()

    home, draw, away = _normalise_prob_triple(
        _first_number(
            payload.home_win_prob,
            payload.blended_home_win_prob,
            payload.ml_home_win_prob,
            payload.sb_home_win_prob,
        ),
        _first_number(
            payload.draw_prob,
            payload.blended_draw_prob,
            payload.ml_draw_prob,
            payload.sb_draw_prob,
        ),
        _first_number(
            payload.away_win_prob,
            payload.blended_away_win_prob,
            payload.ml_away_win_prob,
            payload.sb_away_win_prob,
        ),
    )

    data["id"] = payload.id or str(uuid.uuid4())
    data["home_win_prob"] = home
    data["draw_prob"] = draw
    data["away_win_prob"] = away
    data["prediction_type"] = payload.prediction_type or "match_outcome"
    data["predicted_home_goals"] = _first_number(
        payload.predicted_home_goals,
        payload.ml_home_goals_exp,
    )
    data["predicted_away_goals"] = _first_number(
        payload.predicted_away_goals,
        payload.ml_away_goals_exp,
    )
    data["recommended_pick"] = _recommended_pick(home, draw, away, payload)
    data["rationale_summary"] = payload.rationale_summary or payload.claude_narrative
    data["source"] = payload.source or "scoutedge"
    data["model_version"] = payload.model_version or payload.ml_model_version or "manual"
    data["facts_used"] = payload.facts_used or []
    data["metadata_"] = payload.metadata_ or {}
    data["generated_at"] = payload.generated_at or payload.created_at or now
    data["created_at"] = payload.created_at or now
    data["updated_at"] = payload.updated_at or now
    return data


async def get_match(session: AsyncSession, match_id: str) -> MatchSchema | None:
    """Return a MatchSchema for the given match_id, or None if not found."""
    result = await session.execute(select(Match).where(Match.id == match_id))
    row = result.scalars().first()
    if row is None:
        logger.debug("get_match: not found", match_id=match_id)
        return None
    return MatchSchema.model_validate(row)


async def get_team(session: AsyncSession, team_id: str | None) -> TeamSchema | None:
    """Return a TeamSchema for the given team_id, or None if not found.

    Returns None when team_id is falsy so callers don't have to guard.
    """
    if not team_id:
        return None
    result = await session.execute(select(Team).where(Team.id == team_id))
    row = result.scalars().first()
    if row is None:
        logger.debug("get_team: not found", team_id=team_id)
        return None
    return TeamSchema.model_validate(row)


async def upsert_polymarket_snapshot(
    session: AsyncSession, snapshot: PolymarketSnapshotSchema
) -> None:
    """
    Insert a PolymarketSnapshot row; on conflict (id) do nothing (idempotent).

    On PostgreSQL this uses INSERT … ON CONFLICT DO NOTHING via the asyncpg
    dialect. On SQLite (tests) the pg_insert dialect is replaced by a plain
    INSERT — callers should mock the session entirely for unit tests.
    """
    stmt = (
        pg_insert(PolymarketSnapshot)
        .values(**snapshot.model_dump())
        .on_conflict_do_nothing(index_elements=["id"])
    )
    await session.execute(stmt)
    await session.commit()
    logger.debug(
        "upsert_polymarket_snapshot: done",
        match_id=snapshot.match_id,
        slug=snapshot.market_slug,
    )


async def get_latest_prediction(session: AsyncSession, match_id: str) -> PredictionSchema | None:
    """Return the most-recently created Prediction for the given match, or None."""
    result = await session.execute(
        select(Prediction)
        .where(Prediction.match_id == match_id)
        .order_by(Prediction.generated_at.desc(), Prediction.created_at.desc())
        .limit(1)
    )
    row = result.scalars().first()
    if row is None:
        logger.debug("get_latest_prediction: not found", match_id=match_id)
        return None
    return PredictionSchema.model_validate(row)


async def insert_prediction(session: AsyncSession, payload: PredictionSchema) -> str:
    """
    Persist a new Prediction row and return its UUID id.

    The `id` field on PredictionSchema is optional (None means generate one in
    the application so tests and logs see the same id as Postgres).
    """
    data = _prediction_insert_data(payload)
    result = await session.execute(sa_insert(Prediction).values(**data).returning(Prediction.id))
    new_id = str(result.scalar() or data["id"])
    await session.commit()
    logger.debug("insert_prediction: inserted", match_id=payload.match_id, new_id=new_id)
    return new_id


async def update_prediction_audit(session: AsyncSession, audit: PredictionAuditSchema) -> None:
    """
    Upsert a PredictionAudit row (insert or update by primary key id).

    Since prediction_audits is an immutable audit log, in practice new rows are
    always inserted. If the id already exists (e.g. retry), the row is updated
    in-place to reflect the latest latency / error_details.
    """
    data = audit.model_dump()
    update_data = {key: value for key, value in data.items() if key != "id"}
    stmt = (
        pg_insert(PredictionAudit)
        .values(**data)
        .on_conflict_do_update(index_elements=["id"], set_=update_data)
    )
    await session.execute(stmt)
    await session.commit()
    logger.debug(
        "update_prediction_audit: committed",
        audit_id=audit.id,
        prediction_id=audit.prediction_id,
    )


async def list_finished_matches(
    session: AsyncSession,
    since: datetime.datetime,
    limit: int = 100,
) -> list[MatchSchema]:
    """
    Return up to `limit` finished matches whose finished_at >= `since`,
    ordered most-recently finished first.
    """
    result = await session.execute(
        select(Match)
        .where(Match.finished.is_(True))
        .where(Match.finished_at >= since)
        .order_by(Match.finished_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    logger.debug("list_finished_matches: fetched", count=len(rows), since=since)
    return [MatchSchema.model_validate(r) for r in rows]
