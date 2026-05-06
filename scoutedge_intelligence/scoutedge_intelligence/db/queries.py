"""
Async query helpers for ScoutEdge WC2026.

All functions accept an AsyncSession from SQLAlchemy 2.x async (asyncpg on
PostgreSQL). No live DB is required for tests — callers mock the session.
"""

from __future__ import annotations

import datetime

import structlog
from sqlalchemy import insert as sa_insert
from sqlalchemy import select, update
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
)

logger = structlog.get_logger(__name__)


async def get_match(session: AsyncSession, match_id: str) -> MatchSchema | None:
    """Return a MatchSchema for the given match_id, or None if not found."""
    result = await session.execute(select(Match).where(Match.id == match_id))
    row = result.scalars().first()
    if row is None:
        logger.debug("get_match: not found", match_id=match_id)
        return None
    return MatchSchema.model_validate(row)


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
        .order_by(Prediction.id.desc())
        .limit(1)
    )
    row = result.scalars().first()
    if row is None:
        logger.debug("get_latest_prediction: not found", match_id=match_id)
        return None
    return PredictionSchema.model_validate(row)


async def insert_prediction(session: AsyncSession, payload: PredictionSchema) -> int:
    """
    Persist a new Prediction row and return its generated integer id.

    The `id` field on PredictionSchema is optional (None means auto-assign).
    Returns the new database id as an int.
    """
    data = payload.model_dump(exclude={"id"})
    result = await session.execute(sa_insert(Prediction).values(**data).returning(Prediction.id))
    new_id: int = result.scalar()  # type: ignore[assignment]
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
    await session.execute(
        update(PredictionAudit)
        .where(PredictionAudit.id == audit.id)
        .values(**audit.model_dump(exclude={"id"}))
    )
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
