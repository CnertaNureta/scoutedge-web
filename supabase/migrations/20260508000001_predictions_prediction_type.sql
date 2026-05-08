-- Follow-up: add columns the SQLAlchemy ORM expects on `predictions`
-- but that prod schema is missing. Original 20260331000000_create_core_football_schema.sql
-- defined them, but prod schema diverged.
-- Smoke tests after WC2026 cutover surfaced 500s on:
--   GET  /api/predict/match/{id}/live
--   GET  /og/match/{id}
--   POST /api/predict/remix
-- caused by `column predictions.{prediction_type, predicted_home_goals, ...} does not exist`.
-- Each ALTER is idempotent.

BEGIN;

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS prediction_type      TEXT          NOT NULL DEFAULT 'match_outcome';
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS predicted_home_goals NUMERIC(6,2);
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS predicted_away_goals NUMERIC(6,2);
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS confidence_score     NUMERIC(5,2);
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS recommended_pick     TEXT;
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS rationale_summary    TEXT;
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS source               TEXT          NOT NULL DEFAULT 'scoutedge';
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS facts_used           JSONB         NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS metadata             JSONB         NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS generated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW();
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_predictions_type
  ON predictions(prediction_type);

COMMIT;
