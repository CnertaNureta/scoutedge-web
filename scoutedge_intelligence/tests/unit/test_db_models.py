"""
Unit tests for scoutedge_intelligence.db.models and .queries.

No live database required. Session interactions are fully mocked via
unittest.mock.AsyncMock so the test suite runs without asyncpg / aiosqlite.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import Uuid

from scoutedge_intelligence.db.models import (
    ABAudit,
    ABAuditSchema,
    BracketFork,
    BracketForkSchema,
    DivergenceDiagnosisDisplayed,
    EloHistory,
    EloRating,
    Match,
    MatchSchema,
    Player,
    PlayerSchema,
    PolymarketSnapshot,
    PolymarketSnapshotSchema,
    Prediction,
    PredictionAudit,
    PredictionSchema,
    Team,
    TeamSchema,
    UserPrediction,
    UserPredictionSchema,
)
from scoutedge_intelligence.db.queries import (
    get_match,
    insert_prediction,
    list_finished_matches,
    upsert_polymarket_snapshot,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_TS = datetime.datetime(2026, 6, 15, 18, 0, 0, tzinfo=datetime.UTC)
_UUID = str(uuid.uuid4())


def _make_session(scalar_result: Any = None, scalars_result: Any = None) -> AsyncMock:
    """Return a mock AsyncSession whose execute / scalar / scalars are wired up."""
    session = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalars.return_value.first.return_value = scalar_result
    result_mock.scalars.return_value.all.return_value = scalars_result or []
    result_mock.scalar.return_value = scalar_result
    session.execute.return_value = result_mock
    session.commit = AsyncMock()
    return session


# ===========================================================================
# 1. ORM classes import without error
# ===========================================================================


def test_orm_classes_importable() -> None:
    """All ORM Table classes must be importable and carry __tablename__."""
    expected = {
        Team: "teams",
        Match: "matches",
        Player: "players",
        EloRating: "elo_ratings",
        EloHistory: "elo_history",
        Prediction: "predictions",
        PredictionAudit: "prediction_audits",
        PolymarketSnapshot: "polymarket_snapshots",
        UserPrediction: "user_predictions",
        BracketFork: "bracket_forks",
        DivergenceDiagnosisDisplayed: "divergence_diagnoses_displayed",
        ABAudit: "ab_audits",
    }
    for cls, name in expected.items():
        assert cls.__tablename__ == name, f"{cls.__name__} tablename mismatch"


def test_prediction_core_columns_have_safe_defaults() -> None:
    table = Prediction.__table__

    for column_name in ("home_win_prob", "draw_prob", "away_win_prob"):
        assert table.c[column_name].default is not None
        assert table.c[column_name].server_default is not None

    assert str(table.c.draw_prob.server_default.arg) == "0.33334"

    for column_name in ("generated_at", "created_at", "updated_at"):
        assert table.c[column_name].server_default is not None

    assert table.c.updated_at.onupdate is not None


def test_uuid_columns_use_backend_aware_uuid_type() -> None:
    """UUID FK comparisons must bind as UUID on PostgreSQL, not varchar."""
    for column in (
        Team.__table__.c.id,
        Match.__table__.c.id,
        Match.__table__.c.home_team_id,
        Prediction.__table__.c.id,
        Prediction.__table__.c.match_id,
        PredictionAudit.__table__.c.prediction_id,
        UserPrediction.__table__.c.user_id,
        BracketFork.__table__.c.parent_fork_id,
    ):
        assert isinstance(column.type, Uuid)
        assert column.type.as_uuid is False


# ===========================================================================
# 2. Pydantic schemas instantiable from dict literals
# ===========================================================================


def test_team_schema_from_dict() -> None:
    schema = TeamSchema(id=_UUID, name="Brazil", wc_appearances=22)
    assert schema.id == _UUID
    assert schema.wc_appearances == 22


def test_match_schema_from_dict() -> None:
    schema = MatchSchema(id=_UUID, finished=True, finished_at=_TS)
    assert schema.finished is True


def test_player_schema_from_dict() -> None:
    schema = PlayerSchema(id=_UUID, name="Vinicius Jr.", is_key_player=True)
    assert schema.is_key_player is True


def test_prediction_schema_from_dict() -> None:
    schema = PredictionSchema(
        match_id=_UUID,
        ml_home_win_prob=0.55,
        sb_draw_prob=0.25,
        poly_away_win_prob=0.20,
        claude_pick="home",
    )
    assert schema.ml_home_win_prob == pytest.approx(0.55)
    assert schema.claude_pick == "home"


def test_polymarket_snapshot_schema_from_dict() -> None:
    schema = PolymarketSnapshotSchema(
        id=_UUID,
        match_id=_UUID,
        market_slug="brazil-vs-argentina",
        fetched_at=_TS,
        created_at=_TS,
    )
    assert schema.market_slug == "brazil-vs-argentina"


def test_user_prediction_schema_from_dict() -> None:
    schema = UserPredictionSchema(
        id=_UUID,
        user_id=_UUID,
        match_id=_UUID,
        pick_outcome="home",
        submitted_at=_TS,
        created_at=_TS,
        updated_at=_TS,
    )
    assert schema.pick_outcome == "home"


def test_ab_audit_schema_from_dict() -> None:
    schema = ABAuditSchema(
        id=_UUID,
        session_id="sess-abc",
        experiment_id="exp-wc2026-pick-ui",
        variant="treatment_a",
        assigned_at=_TS,
        created_at=_TS,
    )
    assert schema.variant == "treatment_a"


# ===========================================================================
# 3. Schema → ORM → Schema round-trip
# ===========================================================================


def test_match_schema_orm_roundtrip() -> None:
    """Build an ORM Match manually, validate it with MatchSchema, compare fields."""
    orm_obj = Match()
    orm_obj.id = _UUID
    orm_obj.venue_city = "Mexico City"
    orm_obj.finished = True
    orm_obj.finished_at = _TS

    schema = MatchSchema.model_validate(orm_obj)
    assert schema.id == _UUID
    assert schema.venue_city == "Mexico City"
    assert schema.finished is True
    assert schema.finished_at == _TS


def test_prediction_schema_orm_roundtrip() -> None:
    orm_obj = Prediction()
    orm_obj.id = _UUID
    orm_obj.match_id = _UUID
    orm_obj.prediction_type = "match_outcome"
    orm_obj.home_win_prob = 0.33
    orm_obj.draw_prob = 0.34
    orm_obj.away_win_prob = 0.33
    orm_obj.source = "scoutedge"
    orm_obj.model_version = "manual"
    orm_obj.generated_at = _TS
    orm_obj.created_at = _TS
    orm_obj.updated_at = _TS
    orm_obj.claude_pick = "draw"
    orm_obj.layer_divergence_score = 0.312

    schema = PredictionSchema.model_validate(orm_obj)
    assert schema.id == _UUID
    assert schema.claude_pick == "draw"
    assert schema.layer_divergence_score == pytest.approx(0.312)


def test_bracket_fork_schema_orm_roundtrip() -> None:
    orm_obj = BracketFork()
    orm_obj.id = _UUID
    orm_obj.user_id = _UUID
    orm_obj.title = "My Cheeky Bracket"
    orm_obj.is_public = True
    orm_obj.is_official = False
    orm_obj.points_earned = 88
    orm_obj.fork_count = 3
    orm_obj.like_count = 14
    orm_obj.version = 2
    orm_obj.created_at = _TS
    orm_obj.updated_at = _TS

    schema = BracketForkSchema.model_validate(orm_obj)
    assert schema.title == "My Cheeky Bracket"
    assert schema.points_earned == 88


# ===========================================================================
# 4. upsert_polymarket_snapshot — mocked session
# ===========================================================================


@pytest.mark.asyncio
async def test_upsert_polymarket_snapshot_calls_execute_and_commit() -> None:
    """upsert_polymarket_snapshot must call session.execute and session.commit."""
    session = _make_session()
    snapshot = PolymarketSnapshotSchema(
        id=_UUID,
        match_id=_UUID,
        market_slug="ger-vs-esp",
        fetched_at=_TS,
        created_at=_TS,
        home_win_prob=0.38,
    )

    with patch(
        "scoutedge_intelligence.db.queries.pg_insert",
        return_value=MagicMock(
            return_value=MagicMock(on_conflict_do_nothing=MagicMock(return_value=MagicMock()))
        ),
    ):
        await upsert_polymarket_snapshot(session, snapshot)

    session.execute.assert_called_once()
    session.commit.assert_called_once()


# ===========================================================================
# 5. get_match with missing id → None
# ===========================================================================


@pytest.mark.asyncio
async def test_get_match_returns_none_when_not_found() -> None:
    session = _make_session(scalar_result=None)
    result = await get_match(session, "nonexistent-id")
    assert result is None
    session.execute.assert_called_once()


# ===========================================================================
# 6. insert_prediction returns id from mocked scalar
# ===========================================================================


@pytest.mark.asyncio
async def test_insert_prediction_returns_new_id() -> None:
    session = _make_session(scalar_result="prediction-uuid-099")
    payload = PredictionSchema(match_id=_UUID, claude_pick="away")

    new_id = await insert_prediction(session, payload)

    assert new_id == "prediction-uuid-099"
    session.execute.assert_called_once()
    session.commit.assert_called_once()


# ===========================================================================
# 7. list_finished_matches respects `limit` argument
# ===========================================================================


@pytest.mark.asyncio
async def test_list_finished_matches_passes_limit() -> None:
    """
    list_finished_matches should produce an execute call. We verify the
    helper runs without error and produces an empty list when the mocked
    session returns no rows, and that it does not ignore the limit param.
    """
    session = _make_session(scalars_result=[])

    since = datetime.datetime(2026, 6, 1, tzinfo=datetime.UTC)
    rows = await list_finished_matches(session, since=since, limit=5)

    # No rows returned by mock → empty list
    assert rows == []
    # execute was called (limit was embedded in the statement passed to it)
    session.execute.assert_called_once()

    # Confirm limit value is plumbed through by inspecting the compiled SQL
    call_args = session.execute.call_args
    stmt = call_args[0][0]  # first positional arg to execute()
    # SQLAlchemy Select objects track _limit_clause
    compiled = stmt.compile(compile_kwargs={"literal_binds": True})
    assert "5" in str(compiled), "Expected limit value 5 in compiled SQL"


# ===========================================================================
# 8. UserPredictionSchema with locked_until timestamp succeeds
# ===========================================================================


def test_user_prediction_schema_with_locked_until() -> None:
    """
    locked_until is an extra API-facing field (not in DB) on UserPredictionSchema.
    Updating/setting it must not raise a validation error.
    """
    schema = UserPredictionSchema(
        id=_UUID,
        user_id=_UUID,
        match_id=_UUID,
        pick_outcome="draw",
        submitted_at=_TS,
        created_at=_TS,
        updated_at=_TS,
        locked_until=_TS,
    )
    assert schema.locked_until == _TS

    # model_copy simulates an update
    updated = schema.model_copy(
        update={"locked_until": datetime.datetime(2026, 7, 1, tzinfo=datetime.UTC)}
    )
    assert updated.locked_until.year == 2026
    assert updated.locked_until.month == 7
