-- User Profiles table (extracted as shared dependency)
-- Required by: prediction_leagues, daily_challenges, virtual_points_store

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  favorite_team_slug text,
  subscription_tier text NOT NULL DEFAULT 'free',
  stripe_customer_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_tier_valid CHECK (subscription_tier IN ('free', 'pro'))
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_team
  ON user_profiles(favorite_team_slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe
  ON user_profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
