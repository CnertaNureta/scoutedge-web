-- ScoutEdge WC2026 Triple-Layer migration 2: prediction + audit + polymarket_snapshots

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 7.2  PREDICTIONS: extend existing table with triple-layer columns
-- Existing predictions.id and predictions.match_id are UUID.
-- Spec layers: ML (statistical model), SB (sportsbook), Poly (Polymarket),
-- plus Claude reasoning outputs.
-- All additions use ADD COLUMN IF NOT EXISTS to be safe.
-- ──────────────────────────────────────────────────────────────

-- Harden pre-existing core columns so partial inserts stay valid while
-- asynchronous prediction layers are still being populated.
ALTER TABLE predictions ALTER COLUMN home_win_prob SET DEFAULT 0.33333;
ALTER TABLE predictions ALTER COLUMN draw_prob SET DEFAULT 0.33334;
ALTER TABLE predictions ALTER COLUMN away_win_prob SET DEFAULT 0.33333;
ALTER TABLE predictions ALTER COLUMN generated_at SET DEFAULT NOW();
ALTER TABLE predictions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE predictions ALTER COLUMN updated_at SET DEFAULT NOW();

-- ML layer --
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ml_home_win_prob    NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ml_draw_prob        NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ml_away_win_prob    NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ml_home_goals_exp   NUMERIC(6,3);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ml_away_goals_exp   NUMERIC(6,3);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ml_model_version    TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS ml_features         JSONB  NOT NULL DEFAULT '{}'::JSONB;

-- Sportsbook (SB) layer --
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_home_win_prob    NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_draw_prob        NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_away_win_prob    NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_home_odds_dec    NUMERIC(8,3);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_draw_odds_dec    NUMERIC(8,3);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_away_odds_dec    NUMERIC(8,3);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_source           TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS sb_fetched_at       TIMESTAMPTZ;

-- Polymarket (Poly) layer --
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS poly_home_win_prob  NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS poly_draw_prob      NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS poly_away_win_prob  NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS poly_liquidity_usd  NUMERIC(14,2);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS poly_fetched_at     TIMESTAMPTZ;

-- Blended / composite output --
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS blended_home_win_prob NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS blended_draw_prob     NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS blended_away_win_prob NUMERIC(6,5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS blend_weights         JSONB  NOT NULL DEFAULT '{}'::JSONB;

-- Claude reasoning outputs --
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_narrative      TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_key_factors    JSONB  NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_pick           TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_confidence     NUMERIC(5,2);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_model_id       TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_generated_at   TIMESTAMPTZ;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_prompt_tokens  INTEGER;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS claude_output_tokens  INTEGER;

-- Edge / value outputs --
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS value_edge_pct        NUMERIC(6,3);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS recommended_bet_size   NUMERIC(6,3);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS layer_divergence_score NUMERIC(6,4);

CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_claude_generated ON predictions(claude_generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_divergence ON predictions(layer_divergence_score DESC);

-- ──────────────────────────────────────────────────────────────
-- 7.2  PREDICTION_AUDITS: immutable audit log for prediction runs
-- References predictions.id (UUID) and matches.id (UUID).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prediction_audits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id       UUID        NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
  match_id            UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  -- snapshot of all three layers at audit time
  ml_snapshot         JSONB       NOT NULL DEFAULT '{}'::JSONB,
  sb_snapshot         JSONB       NOT NULL DEFAULT '{}'::JSONB,
  poly_snapshot       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  blended_snapshot    JSONB       NOT NULL DEFAULT '{}'::JSONB,
  claude_snapshot     JSONB       NOT NULL DEFAULT '{}'::JSONB,
  -- audit metadata
  trigger_event       TEXT        NOT NULL DEFAULT 'scheduled',
  model_version       TEXT        NOT NULL DEFAULT 'v1',
  pipeline_run_id     TEXT,
  latency_ms          INTEGER,
  error_details       JSONB,
  audited_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_audits_prediction ON prediction_audits(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_audits_match ON prediction_audits(match_id);
CREATE INDEX IF NOT EXISTS idx_prediction_audits_run ON prediction_audits(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_prediction_audits_audited ON prediction_audits(audited_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 7.2  POLYMARKET_SNAPSHOTS: raw Polymarket data snapshots per match
-- References matches.id (UUID).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS polymarket_snapshots (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  market_slug       TEXT        NOT NULL,
  market_id         TEXT,
  home_win_prob     NUMERIC(6,5),
  draw_prob         NUMERIC(6,5),
  away_win_prob     NUMERIC(6,5),
  total_liquidity   NUMERIC(14,2),
  open_interest     NUMERIC(14,2),
  volume_24h        NUMERIC(14,2),
  num_traders       INTEGER,
  raw_payload       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT polymarket_snapshots_home_prob_range CHECK (home_win_prob IS NULL OR home_win_prob BETWEEN 0 AND 1),
  CONSTRAINT polymarket_snapshots_draw_prob_range CHECK (draw_prob IS NULL OR draw_prob BETWEEN 0 AND 1),
  CONSTRAINT polymarket_snapshots_away_prob_range CHECK (away_win_prob IS NULL OR away_win_prob BETWEEN 0 AND 1)
);

CREATE INDEX IF NOT EXISTS idx_polymarket_snapshots_match ON polymarket_snapshots(match_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_polymarket_snapshots_fetched ON polymarket_snapshots(fetched_at DESC);

COMMIT;
