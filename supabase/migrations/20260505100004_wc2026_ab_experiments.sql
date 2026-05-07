-- ScoutEdge WC2026 Triple-Layer migration 4: ab_audits

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 7.4  AB_AUDITS: audit log for A/B experiment assignments and
-- outcome measurements across the triple-layer prediction UI.
-- References auth.users(id) (optional — may be anonymous sessions).
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ab_audits (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- NULL for anonymous/session-based participants
  session_id          TEXT,
  -- anonymous session token when user_id is NULL

  -- Experiment definition
  experiment_id       TEXT        NOT NULL,
  experiment_version  TEXT        NOT NULL DEFAULT 'v1',
  variant             TEXT        NOT NULL,
  -- e.g. 'control' | 'treatment_a' | 'treatment_b'

  -- Assignment context
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignment_source   TEXT        NOT NULL DEFAULT 'random',
  -- random | sticky | forced | override

  -- Surface where the experiment ran
  surface             TEXT,
  -- e.g. 'prediction_card' | 'bracket_fork' | 'divergence_diagnosis'
  match_id            UUID        REFERENCES matches(id) ON DELETE SET NULL,
  prediction_id       UUID        REFERENCES predictions(id) ON DELETE SET NULL,

  -- Outcome tracking
  primary_metric      TEXT,
  -- e.g. 'ctr' | 'pick_submission' | 'bracket_completion'
  primary_metric_value NUMERIC(10,4),
  outcome_recorded_at TIMESTAMPTZ,

  -- Secondary / auxiliary metrics
  secondary_metrics   JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- Impression / exposure data
  was_exposed         BOOLEAN     NOT NULL DEFAULT TRUE,
  was_converted       BOOLEAN     NOT NULL DEFAULT FALSE,
  time_to_convert_ms  INTEGER,

  -- Raw event payload for replay
  event_payload       JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- Audit integrity
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ab_audits_assignment_source_valid CHECK (
    assignment_source IN ('random', 'sticky', 'forced', 'override')
  ),
  CONSTRAINT ab_audits_user_or_session_present CHECK (
    user_id IS NOT NULL OR session_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_ab_audits_experiment ON ab_audits(experiment_id, variant);
CREATE INDEX IF NOT EXISTS idx_ab_audits_user ON ab_audits(user_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_audits_session ON ab_audits(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_audits_match ON ab_audits(match_id);
CREATE INDEX IF NOT EXISTS idx_ab_audits_prediction ON ab_audits(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ab_audits_surface ON ab_audits(surface);
CREATE INDEX IF NOT EXISTS idx_ab_audits_assigned ON ab_audits(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_audits_converted ON ab_audits(was_converted, experiment_id);

COMMIT;
