"""
SQLAlchemy 2.x ORM models + Pydantic v2 schemas for ScoutEdge WC2026.

Column types note:
  - UUID columns: stored as String(36) for SQLite test-compat.
    On PostgreSQL the migration creates actual UUID columns.
  - JSONB columns: stored as JSON for SQLite test-compat.
    On PostgreSQL asyncpg maps JSONB natively.
  Comment on each such column references the true PG type.
"""

from __future__ import annotations

import datetime
from typing import Any

import structlog
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# SQLAlchemy declarative base
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    """Async-compatible declarative base (no AsyncAttrs mixin needed for 2.x)."""


# ---------------------------------------------------------------------------
# ORM models
# ---------------------------------------------------------------------------


class Team(Base):
    __tablename__ = "teams"

    # Primary key — PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    # WC2026 columns (migration 100001)
    fifa_code: Mapped[str | None] = mapped_column(String(3), nullable=True)
    base_altitude_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    squad_avg_age: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    avg_caps: Mapped[float | None] = mapped_column(Numeric(6, 1), nullable=True)
    wc_appearances: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    prev_wc_best: Mapped[str | None] = mapped_column(Text, nullable=True)
    home_continent: Mapped[str | None] = mapped_column(Text, nullable=True)
    # PG: TEXT[] — SQLite compat: JSON
    style_tags: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=list)
    press_intensity: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    defensive_block: Mapped[str | None] = mapped_column(Text, nullable=True)
    transition_speed: Mapped[str | None] = mapped_column(Text, nullable=True)


class Match(Base):
    __tablename__ = "matches"

    # Primary key — PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Pre-existing columns expected by query helpers
    home_team_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    away_team_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    kickoff_utc: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    stage: Mapped[str | None] = mapped_column(Text, nullable=True)
    group_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    # WC2026 columns (migration 100001)
    venue_city: Mapped[str | None] = mapped_column(Text, nullable=True)
    venue_altitude_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_temperature_c: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    expected_humidity_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    group_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    finished: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    finished_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    home_goals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_goals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)


class Player(Base):
    __tablename__ = "players"

    # Primary key — PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Pre-existing columns
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    # PG: UUID FK
    team_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # WC2026 scouting columns (migration 100001)
    market_value_eur: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    injury_risk_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    clutch_rating: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    altitude_adj_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    big_game_factor: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    form_last5: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    press_resist_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    is_key_player: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class EloRating(Base):
    __tablename__ = "elo_ratings"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → teams.id
    team_id: Mapped[str] = mapped_column(String(36), nullable=False)
    elo: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    attack_elo: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    defense_elo: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    set_piece_elo: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    altitude_bonus: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    form_bonus: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    motivation_bonus: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    computed_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    model_version: Mapped[str] = mapped_column(Text, nullable=False, default="v1")
    # PG: JSONB
    metadata_: Mapped[Any | None] = mapped_column("metadata", JSON, nullable=True, default=dict)


class EloHistory(Base):
    __tablename__ = "elo_history"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → teams.id
    team_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # PG: UUID FK → matches.id (nullable)
    match_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    elo_before: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    elo_after: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    # delta is a generated column in PG; omit from ORM writes
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    model_version: Mapped[str] = mapped_column(Text, nullable=False, default="v1")
    # PG: JSONB
    metadata_: Mapped[Any | None] = mapped_column("metadata", JSON, nullable=True, default=dict)


class Prediction(Base):
    __tablename__ = "predictions"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → matches.id
    match_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # Existing core prediction columns from 20260331000000_create_core_football_schema.sql
    prediction_type: Mapped[str] = mapped_column(Text, nullable=False, default="match_outcome")
    home_win_prob: Mapped[float] = mapped_column(
        Numeric(6, 5), nullable=False, default=1 / 3, server_default=text("0.33333")
    )
    draw_prob: Mapped[float] = mapped_column(
        Numeric(6, 5), nullable=False, default=0.33334, server_default=text("0.33334")
    )
    away_win_prob: Mapped[float] = mapped_column(
        Numeric(6, 5), nullable=False, default=1 / 3, server_default=text("0.33333")
    )
    predicted_home_goals: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    predicted_away_goals: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    recommended_pick: Mapped[str | None] = mapped_column(Text, nullable=True)
    rationale_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="scoutedge")
    model_version: Mapped[str] = mapped_column(Text, nullable=False, default="manual")
    # PG: JSONB
    facts_used: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)
    metadata_: Mapped[Any] = mapped_column("metadata", JSON, nullable=False, default=dict)
    generated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        onupdate=func.now(),
        server_default=func.now(),
    )

    # --- ML layer (migration 100002) ---
    ml_home_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    ml_draw_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    ml_away_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    ml_home_goals_exp: Mapped[float | None] = mapped_column(Numeric(6, 3), nullable=True)
    ml_away_goals_exp: Mapped[float | None] = mapped_column(Numeric(6, 3), nullable=True)
    ml_model_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    # PG: JSONB
    ml_features: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)

    # --- Sportsbook layer ---
    sb_home_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    sb_draw_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    sb_away_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    sb_home_odds_dec: Mapped[float | None] = mapped_column(Numeric(8, 3), nullable=True)
    sb_draw_odds_dec: Mapped[float | None] = mapped_column(Numeric(8, 3), nullable=True)
    sb_away_odds_dec: Mapped[float | None] = mapped_column(Numeric(8, 3), nullable=True)
    sb_source: Mapped[str | None] = mapped_column(Text, nullable=True)
    sb_fetched_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # --- Polymarket layer ---
    poly_home_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    poly_draw_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    poly_away_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    poly_liquidity_usd: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    poly_fetched_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # --- Blended / composite ---
    blended_home_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    blended_draw_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    blended_away_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    # PG: JSONB
    blend_weights: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)

    # --- Claude reasoning ---
    claude_narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
    # PG: JSONB
    claude_key_factors: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=list)
    claude_pick: Mapped[str | None] = mapped_column(Text, nullable=True)
    claude_confidence: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    claude_model_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    claude_generated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    claude_prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    claude_output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # --- Edge / value ---
    value_edge_pct: Mapped[float | None] = mapped_column(Numeric(6, 3), nullable=True)
    recommended_bet_size: Mapped[float | None] = mapped_column(Numeric(6, 3), nullable=True)
    layer_divergence_score: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)


class PredictionAudit(Base):
    __tablename__ = "prediction_audits"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → predictions.id
    prediction_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # PG: UUID FK → matches.id
    match_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # PG: JSONB snapshots
    ml_snapshot: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)
    sb_snapshot: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)
    poly_snapshot: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)
    blended_snapshot: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)
    claude_snapshot: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)
    trigger_event: Mapped[str] = mapped_column(Text, nullable=False, default="scheduled")
    model_version: Mapped[str] = mapped_column(Text, nullable=False, default="v1")
    pipeline_run_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # PG: JSONB
    error_details: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    audited_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PolymarketSnapshot(Base):
    __tablename__ = "polymarket_snapshots"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → matches.id
    match_id: Mapped[str] = mapped_column(String(36), nullable=False)
    market_slug: Mapped[str] = mapped_column(Text, nullable=False)
    market_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    home_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    draw_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    away_win_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)
    total_liquidity: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    open_interest: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    volume_24h: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    num_traders: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # PG: JSONB
    raw_payload: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)
    fetched_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserPrediction(Base):
    __tablename__ = "user_predictions"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → auth.users.id
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # PG: UUID FK → matches.id
    match_id: Mapped[str] = mapped_column(String(36), nullable=False)

    # Pre-match picks
    pick_outcome: Mapped[str] = mapped_column(Text, nullable=False)
    pick_home_goals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pick_away_goals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pick_confidence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pick_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Layer alignment
    aligned_layer: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Polymarket leg
    poly_market_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    poly_position: Mapped[str | None] = mapped_column(Text, nullable=True)
    poly_stake_usd: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    poly_entry_prob: Mapped[float | None] = mapped_column(Numeric(6, 5), nullable=True)

    # Sportsbook leg
    sb_bookmaker: Mapped[str | None] = mapped_column(Text, nullable=True)
    sb_pick_odds_dec: Mapped[float | None] = mapped_column(Numeric(8, 3), nullable=True)
    sb_stake_units: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)

    # Lifecycle
    submitted_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    locked_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Post-match scoring
    actual_outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    actual_home_goals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_away_goals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    points_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    scored_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Metadata
    source_platform: Mapped[str] = mapped_column(Text, nullable=False, default="web")
    ab_variant: Mapped[str | None] = mapped_column(Text, nullable=True)
    # PG: JSONB
    metadata_: Mapped[Any | None] = mapped_column("metadata", JSON, nullable=True, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class BracketFork(Base):
    __tablename__ = "bracket_forks"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → auth.users.id
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # PG: UUID FK → bracket_forks.id (self-ref, nullable)
    parent_fork_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    title: Mapped[str] = mapped_column(Text, nullable=False, default="My Bracket")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # PG: JSONB
    bracket_state: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)

    # Scoring
    points_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_possible: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rank_global: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rank_percentile: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    # Social
    fork_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Versioning
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    finalized_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class DivergenceDiagnosisDisplayed(Base):
    __tablename__ = "divergence_diagnoses_displayed"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → auth.users.id
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # PG: UUID FK → matches.id
    match_id: Mapped[str] = mapped_column(String(36), nullable=False)
    # PG: UUID FK → predictions.id (nullable)
    prediction_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    divergence_type: Mapped[str] = mapped_column(Text, nullable=False, default="ml_vs_poly")
    divergence_score: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    # PG: JSONB
    diagnosis_payload: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)

    was_dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    was_clicked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    interaction_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ab_variant: Mapped[str | None] = mapped_column(Text, nullable=True)
    displayed_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ABAudit(Base):
    __tablename__ = "ab_audits"

    # PG: UUID
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # PG: UUID FK → auth.users.id (nullable)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    session_id: Mapped[str | None] = mapped_column(Text, nullable=True)

    experiment_id: Mapped[str] = mapped_column(Text, nullable=False)
    experiment_version: Mapped[str] = mapped_column(Text, nullable=False, default="v1")
    variant: Mapped[str] = mapped_column(Text, nullable=False)

    assigned_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    assignment_source: Mapped[str] = mapped_column(Text, nullable=False, default="random")
    surface: Mapped[str | None] = mapped_column(Text, nullable=True)

    # PG: UUID FK → matches.id (nullable)
    match_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # PG: UUID FK → predictions.id (nullable)
    prediction_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    primary_metric: Mapped[str | None] = mapped_column(Text, nullable=True)
    primary_metric_value: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    outcome_recorded_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # PG: JSONB
    secondary_metrics: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)

    was_exposed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    was_converted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    time_to_convert_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # PG: JSONB
    event_payload: Mapped[Any | None] = mapped_column(JSON, nullable=True, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ---------------------------------------------------------------------------
# Pydantic v2 schemas
# ---------------------------------------------------------------------------

_model_cfg = ConfigDict(from_attributes=True, populate_by_name=True)


class TeamSchema(BaseModel):
    model_config = _model_cfg

    id: str
    name: str | None = None
    fifa_code: str | None = None
    base_altitude_m: int | None = None
    squad_avg_age: float | None = None
    avg_caps: float | None = None
    wc_appearances: int = 0
    prev_wc_best: str | None = None
    home_continent: str | None = None
    style_tags: list[str] | None = Field(default_factory=list)
    press_intensity: float | None = None
    defensive_block: str | None = None
    transition_speed: str | None = None


class MatchSchema(BaseModel):
    model_config = _model_cfg

    id: str
    home_team_id: str | None = None
    away_team_id: str | None = None
    kickoff_utc: datetime.datetime | None = None
    stage: str | None = None
    group_code: str | None = None
    venue_city: str | None = None
    venue_altitude_m: int | None = None
    expected_temperature_c: float | None = None
    expected_humidity_pct: float | None = None
    group_name: str | None = None
    finished: bool = False
    finished_at: datetime.datetime | None = None
    home_goals: int | None = None
    away_goals: int | None = None
    actual_outcome: str | None = None  # home_win | draw | away_win


class PlayerSchema(BaseModel):
    model_config = _model_cfg

    id: str
    name: str | None = None
    team_id: str | None = None
    market_value_eur: int | None = None
    injury_risk_score: float | None = None
    clutch_rating: float | None = None
    altitude_adj_score: float | None = None
    big_game_factor: float | None = None
    form_last5: float | None = None
    press_resist_score: float | None = None
    is_key_player: bool = False


class EloRatingSchema(BaseModel):
    model_config = _model_cfg

    id: str
    team_id: str
    elo: float
    attack_elo: float | None = None
    defense_elo: float | None = None
    set_piece_elo: float | None = None
    altitude_bonus: float = 0.0
    form_bonus: float = 0.0
    motivation_bonus: float = 0.0
    computed_at: datetime.datetime
    model_version: str = "v1"
    metadata_: dict[str, Any] | None = Field(None, alias="metadata_")


class PredictionSchema(BaseModel):
    model_config = _model_cfg

    id: str | None = None
    match_id: str | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    generated_at: datetime.datetime | None = None

    # Existing core prediction columns
    prediction_type: str = "match_outcome"
    home_win_prob: float | None = None
    draw_prob: float | None = None
    away_win_prob: float | None = None
    predicted_home_goals: float | None = None
    predicted_away_goals: float | None = None
    confidence_score: float | None = None
    recommended_pick: str | None = None
    rationale_summary: str | None = None
    source: str = "scoutedge"
    model_version: str = "manual"
    facts_used: list[Any] | None = Field(default_factory=list)
    metadata_: dict[str, Any] | None = Field(default_factory=dict)

    # ML
    ml_home_win_prob: float | None = None
    ml_draw_prob: float | None = None
    ml_away_win_prob: float | None = None
    ml_home_goals_exp: float | None = None
    ml_away_goals_exp: float | None = None
    ml_model_version: str | None = None
    ml_features: dict[str, Any] | None = Field(default_factory=dict)

    # Sportsbook
    sb_home_win_prob: float | None = None
    sb_draw_prob: float | None = None
    sb_away_win_prob: float | None = None
    sb_home_odds_dec: float | None = None
    sb_draw_odds_dec: float | None = None
    sb_away_odds_dec: float | None = None
    sb_source: str | None = None
    sb_fetched_at: datetime.datetime | None = None

    # Polymarket
    poly_home_win_prob: float | None = None
    poly_draw_prob: float | None = None
    poly_away_win_prob: float | None = None
    poly_liquidity_usd: float | None = None
    poly_fetched_at: datetime.datetime | None = None

    # Blended
    blended_home_win_prob: float | None = None
    blended_draw_prob: float | None = None
    blended_away_win_prob: float | None = None
    blend_weights: dict[str, Any] | None = Field(default_factory=dict)

    # Claude
    claude_narrative: str | None = None
    claude_key_factors: list[Any] | None = Field(default_factory=list)
    claude_pick: str | None = None
    claude_confidence: float | None = None
    claude_model_id: str | None = None
    claude_generated_at: datetime.datetime | None = None
    claude_prompt_tokens: int | None = None
    claude_output_tokens: int | None = None

    # Edge / value
    value_edge_pct: float | None = None
    recommended_bet_size: float | None = None
    layer_divergence_score: float | None = None


class PredictionAuditSchema(BaseModel):
    model_config = _model_cfg

    id: str
    prediction_id: str
    match_id: str
    ml_snapshot: dict[str, Any] | None = Field(default_factory=dict)
    sb_snapshot: dict[str, Any] | None = Field(default_factory=dict)
    poly_snapshot: dict[str, Any] | None = Field(default_factory=dict)
    blended_snapshot: dict[str, Any] | None = Field(default_factory=dict)
    claude_snapshot: dict[str, Any] | None = Field(default_factory=dict)
    trigger_event: str = "scheduled"
    model_version: str = "v1"
    pipeline_run_id: str | None = None
    latency_ms: int | None = None
    error_details: dict[str, Any] | None = None
    audited_at: datetime.datetime
    created_at: datetime.datetime


class PolymarketSnapshotSchema(BaseModel):
    model_config = _model_cfg

    id: str
    match_id: str
    market_slug: str
    market_id: str | None = None
    home_win_prob: float | None = None
    draw_prob: float | None = None
    away_win_prob: float | None = None
    total_liquidity: float | None = None
    open_interest: float | None = None
    volume_24h: float | None = None
    num_traders: int | None = None
    raw_payload: dict[str, Any] | None = Field(default_factory=dict)
    fetched_at: datetime.datetime
    created_at: datetime.datetime


class UserPredictionSchema(BaseModel):
    model_config = _model_cfg

    id: str
    user_id: str
    match_id: str
    pick_outcome: str
    pick_home_goals: int = 0
    pick_away_goals: int = 0
    pick_confidence: int | None = None
    pick_rationale: str | None = None
    aligned_layer: str | None = None
    poly_market_id: str | None = None
    poly_position: str | None = None
    poly_stake_usd: float | None = None
    poly_entry_prob: float | None = None
    sb_bookmaker: str | None = None
    sb_pick_odds_dec: float | None = None
    sb_stake_units: float | None = None
    submitted_at: datetime.datetime
    locked_at: datetime.datetime | None = None
    actual_outcome: str | None = None
    actual_home_goals: int | None = None
    actual_away_goals: int | None = None
    points_earned: int = 0
    scored_at: datetime.datetime | None = None
    source_platform: str = "web"
    ab_variant: str | None = None
    metadata_: dict[str, Any] | None = Field(None, alias="metadata_")
    created_at: datetime.datetime
    updated_at: datetime.datetime
    # Extra field not in DB but useful for API
    locked_until: datetime.datetime | None = None


class BracketForkSchema(BaseModel):
    model_config = _model_cfg

    id: str
    user_id: str
    parent_fork_id: str | None = None
    title: str = "My Bracket"
    description: str | None = None
    is_public: bool = False
    is_official: bool = False
    bracket_state: dict[str, Any] | None = Field(default_factory=dict)
    points_earned: int = 0
    max_possible: int | None = None
    rank_global: int | None = None
    rank_percentile: float | None = None
    fork_count: int = 0
    like_count: int = 0
    version: int = 1
    finalized_at: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class DivergenceDiagnosisDisplayedSchema(BaseModel):
    model_config = _model_cfg

    id: str
    user_id: str
    match_id: str
    prediction_id: str | None = None
    divergence_type: str = "ml_vs_poly"
    divergence_score: float | None = None
    diagnosis_payload: dict[str, Any] | None = Field(default_factory=dict)
    was_dismissed: bool = False
    was_clicked: bool = False
    interaction_at: datetime.datetime | None = None
    ab_variant: str | None = None
    displayed_at: datetime.datetime
    created_at: datetime.datetime


class ABAuditSchema(BaseModel):
    model_config = _model_cfg

    id: str
    user_id: str | None = None
    session_id: str | None = None
    experiment_id: str
    experiment_version: str = "v1"
    variant: str
    assigned_at: datetime.datetime
    assignment_source: str = "random"
    surface: str | None = None
    match_id: str | None = None
    prediction_id: str | None = None
    primary_metric: str | None = None
    primary_metric_value: float | None = None
    outcome_recorded_at: datetime.datetime | None = None
    secondary_metrics: dict[str, Any] | None = Field(default_factory=dict)
    was_exposed: bool = True
    was_converted: bool = False
    time_to_convert_ms: int | None = None
    event_payload: dict[str, Any] | None = Field(default_factory=dict)
    created_at: datetime.datetime
