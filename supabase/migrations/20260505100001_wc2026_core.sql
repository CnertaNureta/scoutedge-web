-- ScoutEdge WC2026 Triple-Layer migration 1: core tables

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 7.1  TEAMS: add WC2026 environment columns
-- Existing teams.id is UUID; FK references below use UUID to match.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE teams ADD COLUMN IF NOT EXISTS fifa_code         CHAR(3);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS base_altitude_m   INTEGER;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS squad_avg_age     NUMERIC(4,1);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS avg_caps          NUMERIC(6,1);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS wc_appearances    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS prev_wc_best      TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS home_continent    TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS style_tags        TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS press_intensity   NUMERIC(4,2);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS defensive_block   TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS transition_speed  TEXT;

-- ──────────────────────────────────────────────────────────────
-- 7.1  MATCHES: add WC2026 venue / weather / stage columns
-- Existing matches.kickoff_utc is already TIMESTAMPTZ; skip.
-- Existing matches.stage and matches.group_code exist; skip those.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue_city              TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue_altitude_m        INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS expected_temperature_c  NUMERIC(4,1);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS expected_humidity_pct   NUMERIC(5,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS group_name              TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS finished                BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS finished_at             TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_goals              INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_goals              INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS actual_outcome          TEXT;

-- ──────────────────────────────────────────────────────────────
-- 7.1  PLAYERS: add WC2026 scouting columns
-- Existing players.id is UUID; table already exists — use ALTER only.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE players ADD COLUMN IF NOT EXISTS market_value_eur   BIGINT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS injury_risk_score  NUMERIC(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS clutch_rating      NUMERIC(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS altitude_adj_score NUMERIC(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS big_game_factor    NUMERIC(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS form_last5         NUMERIC(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS press_resist_score NUMERIC(4,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_key_player      BOOLEAN NOT NULL DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────
-- 7.1  ELO_RATINGS: current Elo snapshot per team
-- teams.id is UUID — elo_ratings.team_id uses UUID to match.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS elo_ratings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id          UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  -- current composite Elo score
  elo              NUMERIC(8,2) NOT NULL,
  -- sub-component scores
  attack_elo       NUMERIC(8,2),
  defense_elo      NUMERIC(8,2),
  set_piece_elo    NUMERIC(8,2),
  altitude_bonus   NUMERIC(6,2) NOT NULL DEFAULT 0,
  form_bonus       NUMERIC(6,2) NOT NULL DEFAULT 0,
  motivation_bonus NUMERIC(6,2) NOT NULL DEFAULT 0,
  computed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  model_version    TEXT         NOT NULL DEFAULT 'v1',
  metadata         JSONB        NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT elo_ratings_team_version_unique UNIQUE (team_id, model_version, computed_at)
);

CREATE INDEX IF NOT EXISTS idx_elo_ratings_team ON elo_ratings(team_id);
CREATE INDEX IF NOT EXISTS idx_elo_ratings_computed ON elo_ratings(computed_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 7.1  ELO_HISTORY: time-series Elo per team
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS elo_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_id      UUID        REFERENCES matches(id) ON DELETE SET NULL,
  elo_before    NUMERIC(8,2) NOT NULL,
  elo_after     NUMERIC(8,2) NOT NULL,
  delta         NUMERIC(8,2) GENERATED ALWAYS AS (elo_after - elo_before) STORED,
  reason        TEXT,
  recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  model_version TEXT         NOT NULL DEFAULT 'v1',
  metadata      JSONB        NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_elo_history_team ON elo_history(team_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_elo_history_match ON elo_history(match_id);

COMMIT;
