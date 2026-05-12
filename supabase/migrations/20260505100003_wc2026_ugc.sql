-- ScoutEdge WC2026 Triple-Layer migration 3: user_predictions, bracket_forks, divergence_diagnoses_displayed

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 7.3  USER_PREDICTIONS: fan triple-layer picks (distinct from
-- existing user_match_predictions which is the simpler score-pick table).
-- References auth.users(id) and matches.id (UUID).
-- Note: a missing comma before the "Post-match scoring" block in the
-- original spec (line 2257) has been corrected below.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_predictions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id              UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,

  -- Pre-match picks
  pick_outcome          TEXT        NOT NULL,
  pick_home_goals       INTEGER     NOT NULL DEFAULT 0,
  pick_away_goals       INTEGER     NOT NULL DEFAULT 0,
  pick_confidence       INTEGER,
  pick_rationale        TEXT,

  -- Layer alignment: which model layer did they agree with most?
  aligned_layer         TEXT,
  -- ml | sb | poly | claude | own

  -- Polymarket leg (optional)
  poly_market_id        TEXT,
  poly_position         TEXT,
  poly_stake_usd        NUMERIC(10,2),
  poly_entry_prob       NUMERIC(6,5),

  -- Sportsbook leg (optional)
  sb_bookmaker          TEXT,
  sb_pick_odds_dec      NUMERIC(8,3),
  sb_stake_units        NUMERIC(8,2),

  -- Submission lifecycle
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at             TIMESTAMPTZ,
  -- lock time mirrors kickoff; populated by trigger or app logic

  -- Post-match scoring
  actual_outcome        TEXT,
  actual_home_goals     INTEGER,
  actual_away_goals     INTEGER,
  points_earned         INTEGER     NOT NULL DEFAULT 0,
  scored_at             TIMESTAMPTZ,

  -- Metadata
  source_platform       TEXT        NOT NULL DEFAULT 'web',
  ab_variant            TEXT,
  metadata              JSONB       NOT NULL DEFAULT '{}'::JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_predictions_outcome_valid CHECK (
    pick_outcome IN ('home', 'draw', 'away')
  ),
  CONSTRAINT user_predictions_confidence_range CHECK (
    pick_confidence IS NULL OR pick_confidence BETWEEN 1 AND 10
  ),
  CONSTRAINT user_predictions_aligned_layer_valid CHECK (
    aligned_layer IS NULL OR aligned_layer IN ('ml', 'sb', 'poly', 'claude', 'own')
  ),
  CONSTRAINT user_predictions_pick_goals_range CHECK (
    pick_home_goals BETWEEN 0 AND 20 AND pick_away_goals BETWEEN 0 AND 20
  ),
  CONSTRAINT user_predictions_user_match_unique UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_user_predictions_user ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_match ON user_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_user_submitted ON user_predictions(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_predictions_aligned_layer ON user_predictions(aligned_layer);
CREATE INDEX IF NOT EXISTS idx_user_predictions_ab_variant ON user_predictions(ab_variant);

-- ──────────────────────────────────────────────────────────────
-- 7.3  BRACKET_FORKS: fan-generated alternative bracket scenarios
-- References auth.users(id) and optionally matches.id (UUID).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bracket_forks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_fork_id    UUID        REFERENCES bracket_forks(id) ON DELETE SET NULL,
  -- self-referential: allows forking someone else's bracket

  title             TEXT        NOT NULL DEFAULT 'My Bracket',
  description       TEXT,
  is_public         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_official       BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Serialised bracket state (full round picks keyed by match_id)
  bracket_state     JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- Scoring / ranking
  points_earned     INTEGER     NOT NULL DEFAULT 0,
  max_possible      INTEGER,
  rank_global       INTEGER,
  rank_percentile   NUMERIC(5,2),

  -- Social
  fork_count        INTEGER     NOT NULL DEFAULT 0,
  like_count        INTEGER     NOT NULL DEFAULT 0,

  -- Versioning
  version           INTEGER     NOT NULL DEFAULT 1,
  finalized_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bracket_forks_user ON bracket_forks(user_id);
CREATE INDEX IF NOT EXISTS idx_bracket_forks_public ON bracket_forks(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bracket_forks_rank ON bracket_forks(rank_global NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_bracket_forks_parent ON bracket_forks(parent_fork_id);

-- ──────────────────────────────────────────────────────────────
-- 7.3  DIVERGENCE_DIAGNOSES_DISPLAYED: tracks which divergence
-- diagnosis cards were shown to which users (impression log).
-- References auth.users(id), matches.id (UUID), predictions.id (UUID).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS divergence_diagnoses_displayed (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id           UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  prediction_id      UUID        REFERENCES predictions(id) ON DELETE SET NULL,

  -- Which divergence case triggered the card
  divergence_type    TEXT        NOT NULL DEFAULT 'ml_vs_poly',
  -- e.g. ml_vs_poly | ml_vs_sb | sb_vs_poly | three_way
  divergence_score   NUMERIC(6,4),

  -- The snapshot of the diagnosis at display time
  diagnosis_payload  JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- User interaction
  was_dismissed      BOOLEAN     NOT NULL DEFAULT FALSE,
  was_clicked        BOOLEAN     NOT NULL DEFAULT FALSE,
  interaction_at     TIMESTAMPTZ,

  -- A/B context
  ab_variant         TEXT,

  displayed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT divergence_diagnoses_type_valid CHECK (
    divergence_type IN ('ml_vs_poly', 'ml_vs_sb', 'sb_vs_poly', 'three_way', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_divergence_user ON divergence_diagnoses_displayed(user_id, displayed_at DESC);
CREATE INDEX IF NOT EXISTS idx_divergence_match ON divergence_diagnoses_displayed(match_id);
CREATE INDEX IF NOT EXISTS idx_divergence_prediction ON divergence_diagnoses_displayed(prediction_id);
CREATE INDEX IF NOT EXISTS idx_divergence_type ON divergence_diagnoses_displayed(divergence_type);

COMMIT;
