-- User entitlements for the v4 paywall pricing ladder
-- Tracks granular pass purchases (match, team, tournament, scout)
-- and serves as the authoritative access-control source.

-- Expand user_profiles.subscription_tier to support new tiers
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_tier_valid;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_tier_valid
  CHECK (subscription_tier IN ('free', 'match_pass', 'team_pass', 'tournament_pass', 'scout_pass', 'pro'));

-- Subscriptions table (referenced by webhook but never created)
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_price_id text NOT NULL,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(user_id, status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "subscriptions_select_own" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User entitlements table — one row per purchased pass
CREATE TABLE IF NOT EXISTS user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_type text NOT NULL,
  scope text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL DEFAULT '2026-07-25T23:59:59Z',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_type_valid CHECK (
    entitlement_type IN ('match_pass', 'team_pass', 'tournament_pass', 'scout_pass')
  )
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user ON user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_type ON user_entitlements(user_id, entitlement_type);
CREATE INDEX IF NOT EXISTS idx_entitlements_scope ON user_entitlements(user_id, entitlement_type, scope)
  WHERE scope IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_checkout ON user_entitlements(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "entitlements_select_own" ON user_entitlements
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE user_entitlements IS 'Tracks individual pass purchases per user for the v4 paywall ladder';
COMMENT ON COLUMN user_entitlements.entitlement_type IS 'match_pass | team_pass | tournament_pass | scout_pass';
COMMENT ON COLUMN user_entitlements.scope IS 'match_id for match_pass, team_slug for team_pass, null for tournament/scout';
COMMENT ON COLUMN user_entitlements.valid_until IS 'Default: end of 2026 World Cup (July 25)';

-- Helper function: compute highest active tier for a user
CREATE OR REPLACE FUNCTION compute_subscription_tier(p_user_id uuid)
RETURNS text AS $$
DECLARE
  tier text;
BEGIN
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM user_entitlements WHERE user_id = p_user_id AND entitlement_type = 'scout_pass' AND valid_until > now()) THEN 'scout_pass'
      WHEN EXISTS (SELECT 1 FROM user_entitlements WHERE user_id = p_user_id AND entitlement_type = 'tournament_pass' AND valid_until > now()) THEN 'tournament_pass'
      WHEN EXISTS (SELECT 1 FROM user_entitlements WHERE user_id = p_user_id AND entitlement_type = 'team_pass' AND valid_until > now()) THEN 'team_pass'
      WHEN EXISTS (SELECT 1 FROM user_entitlements WHERE user_id = p_user_id AND entitlement_type = 'match_pass' AND valid_until > now()) THEN 'match_pass'
      ELSE 'free'
    END INTO tier;
  RETURN tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger: update user_profiles.subscription_tier when entitlements change
CREATE OR REPLACE FUNCTION sync_subscription_tier()
RETURNS trigger AS $$
BEGIN
  UPDATE user_profiles
    SET subscription_tier = compute_subscription_tier(COALESCE(NEW.user_id, OLD.user_id))
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS entitlement_tier_sync ON user_entitlements;
CREATE TRIGGER entitlement_tier_sync
  AFTER INSERT OR UPDATE OR DELETE ON user_entitlements
  FOR EACH ROW EXECUTE FUNCTION sync_subscription_tier();
