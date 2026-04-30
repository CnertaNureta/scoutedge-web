-- Fix: user_profiles SELECT was public (USING true), exposing stripe_customer_id
-- Scope reads to own row only. Public display names use a separate view.

DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;

CREATE POLICY "user_profiles_select_own"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Public-safe view for leaderboards, fan cards, etc.
CREATE OR REPLACE VIEW public_profiles AS
  SELECT
    id,
    display_name,
    avatar_url,
    favorite_team_slug
  FROM user_profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;
