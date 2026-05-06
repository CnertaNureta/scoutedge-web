"""Direct unit tests for scoutedge_intelligence.db.queries.

Sessions are mocked end-to-end — no real DB connection required.
"""

from __future__ import annotations

import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from scoutedge_intelligence.db import queries
from scoutedge_intelligence.db.models import (
    MatchSchema,
    PredictionAuditSchema,
    PredictionSchema,
)


def _now() -> datetime.datetime:
    return datetime.datetime(2026, 6, 11, 18, 0, tzinfo=datetime.UTC)


def _mock_session_with_first(row: object | None) -> MagicMock:
    """Build an AsyncSession mock whose execute().scalars().first() returns row."""
    scalars = MagicMock()
    scalars.first.return_value = row
    result = MagicMock()
    result.scalars.return_value = scalars
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()
    return session


def _mock_session_with_all(rows: list[object]) -> MagicMock:
    scalars = MagicMock()
    scalars.all.return_value = rows
    result = MagicMock()
    result.scalars.return_value = scalars
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_get_match_returns_schema_when_row_exists() -> None:
    row = MagicMock()
    row.id = "m-1"
    row.home_team_id = "t-home"
    row.away_team_id = "t-away"
    row.kickoff_utc = _now()
    row.stage = "group"
    row.group_code = "A"
    row.venue_city = "Mexico City"
    row.venue_altitude_m = 2240
    row.expected_temperature_c = 20.0
    row.expected_humidity_pct = 50.0
    row.group_name = "A"
    row.finished = False
    row.finished_at = None
    row.home_goals = None
    row.away_goals = None
    row.actual_outcome = None
    session = _mock_session_with_first(row)

    result = await queries.get_match(session, "m-1")

    assert isinstance(result, MatchSchema)
    assert result.id == "m-1"
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_match_returns_none_when_missing() -> None:
    session = _mock_session_with_first(None)
    assert await queries.get_match(session, "missing") is None


@pytest.mark.asyncio
async def test_get_latest_prediction_returns_schema() -> None:
    row = MagicMock(spec=[])
    # Provide attributes that PredictionSchema.model_validate expects;
    # all PredictionSchema fields are optional so an empty mock is fine.
    session = _mock_session_with_first(row)

    result = await queries.get_latest_prediction(session, "m-1")

    assert isinstance(result, PredictionSchema)
    session.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_latest_prediction_returns_none_when_missing() -> None:
    session = _mock_session_with_first(None)
    assert await queries.get_latest_prediction(session, "m-1") is None


@pytest.mark.asyncio
async def test_insert_prediction_returns_new_id() -> None:
    result = MagicMock()
    result.scalar.return_value = "prediction-uuid-001"
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)
    session.commit = AsyncMock()

    payload = PredictionSchema(match_id="m-1")
    new_id = await queries.insert_prediction(session, payload)

    assert new_id == "prediction-uuid-001"
    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_prediction_audit_commits() -> None:
    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    audit = PredictionAuditSchema(
        id="a-1",
        prediction_id="p-1",
        match_id="m-1",
        audited_at=_now(),
        created_at=_now(),
    )

    await queries.update_prediction_audit(session, audit)

    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_list_finished_matches_returns_schemas() -> None:
    row = MagicMock()
    row.id = "m-9"
    row.home_team_id = "t1"
    row.away_team_id = "t2"
    row.kickoff_utc = _now()
    row.stage = "group"
    row.group_code = "A"
    row.venue_city = "City"
    row.venue_altitude_m = 100
    row.expected_temperature_c = 22.0
    row.expected_humidity_pct = 60.0
    row.group_name = "A"
    row.finished = True
    row.finished_at = _now()
    row.home_goals = 1
    row.away_goals = 0
    row.actual_outcome = "home_win"
    session = _mock_session_with_all([row])

    out = await queries.list_finished_matches(session, _now())

    assert len(out) == 1
    assert out[0].id == "m-9"
    assert out[0].finished is True
