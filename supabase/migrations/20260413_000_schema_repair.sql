-- Schema Repair Migration
-- Patches existing tables with missing columns from layer1 and core schemas,
-- creates missing core football tables (standings, head_to_head, team_chemistry),
-- and rebuilds views to include competition/season dimensions.

------------------------------------------------------------------------
-- 1. Patch team_stats: add competition + season columns
------------------------------------------------------------------------
ALTER TABLE team_stats ADD COLUMN IF NOT EXISTS competition text;
ALTER TABLE team_stats ADD COLUMN IF NOT EXISTS season text;

UPDATE team_stats
SET competition = coalesce(raw_payload->>'competition', 'World Cup 2026')
WHERE competition IS NULL;

UPDATE team_stats
SET season = coalesce(raw_payload->>'season', '2026')
WHERE season IS NULL;

ALTER TABLE team_stats ALTER COLUMN competition SET DEFAULT 'World Cup 2026';
ALTER TABLE team_stats ALTER COLUMN competition SET NOT NULL;
ALTER TABLE team_stats ALTER COLUMN season SET DEFAULT '2026';
ALTER TABLE team_stats ALTER COLUMN season SET NOT NULL;

------------------------------------------------------------------------
-- 2. Patch team_ratings: add competition + season columns
------------------------------------------------------------------------
ALTER TABLE team_ratings ADD COLUMN IF NOT EXISTS competition text;
ALTER TABLE team_ratings ADD COLUMN IF NOT EXISTS season text;

UPDATE team_ratings
SET competition = coalesce(raw_payload->>'competition', 'World Cup 2026')
WHERE competition IS NULL;

UPDATE team_ratings
SET season = coalesce(raw_payload->>'season', '2026')
WHERE season IS NULL;

ALTER TABLE team_ratings ALTER COLUMN competition SET DEFAULT 'World Cup 2026';
ALTER TABLE team_ratings ALTER COLUMN competition SET NOT NULL;
ALTER TABLE team_ratings ALTER COLUMN season SET DEFAULT '2026';
ALTER TABLE team_ratings ALTER COLUMN season SET NOT NULL;

------------------------------------------------------------------------
-- 3. Patch matches: add match_status + core schema columns
------------------------------------------------------------------------
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'scheduled';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition_code text DEFAULT 'world_cup_2026';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_year integer DEFAULT 2026;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_placeholder_slug text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_placeholder_slug text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_score integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_score integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_penalty_score integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_penalty_score integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS source_match_id text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS model_version text DEFAULT 'manual';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS facts_used jsonb DEFAULT '[]'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS source_payload jsonb DEFAULT '{}'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

UPDATE matches
SET match_status = CASE
  WHEN status IN ('FT', 'AET', 'PEN') THEN 'finished'
  WHEN status = 'NS' THEN 'scheduled'
  WHEN status IN ('1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT') THEN 'live'
  WHEN status IN ('PST', 'SUSP', 'INT') THEN 'postponed'
  WHEN status IN ('CANC', 'ABD', 'AWD', 'WO') THEN 'cancelled'
  ELSE coalesce(status, 'scheduled')
END
WHERE match_status = 'scheduled' AND status IS NOT NULL AND status <> 'scheduled';

UPDATE matches SET home_score = score_home WHERE home_score IS NULL AND score_home IS NOT NULL;
UPDATE matches SET away_score = score_away WHERE away_score IS NULL AND score_away IS NOT NULL;

------------------------------------------------------------------------
-- 4. Indexes for team_stats and team_ratings
------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_stats_snapshot_unique
  ON team_stats(team_slug, source, competition, season, as_of_date);
CREATE INDEX IF NOT EXISTS idx_team_stats_team_slug ON team_stats(team_slug);
CREATE INDEX IF NOT EXISTS idx_team_stats_source_scope_as_of_date
  ON team_stats(source, competition, season, as_of_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_ratings_snapshot_unique
  ON team_ratings(team_slug, source, competition, season, as_of_date);
CREATE INDEX IF NOT EXISTS idx_team_ratings_team_slug ON team_ratings(team_slug);
CREATE INDEX IF NOT EXISTS idx_team_ratings_source_scope_as_of_date
  ON team_ratings(source, competition, season, as_of_date DESC);

CREATE INDEX IF NOT EXISTS idx_team_name_aliases_team_slug ON team_name_aliases(team_slug);

------------------------------------------------------------------------
-- 5. Rebuild views to include competition/season
------------------------------------------------------------------------
DROP VIEW IF EXISTS match_team_features CASCADE;
DROP VIEW IF EXISTS latest_team_features CASCADE;
DROP VIEW IF EXISTS latest_team_stats CASCADE;
DROP VIEW IF EXISTS latest_team_ratings CASCADE;

CREATE VIEW latest_team_stats AS
SELECT DISTINCT ON (team_slug, source, competition, season)
  team_slug, source, competition, season, source_team_name, source_url,
  as_of_date, matches_played, minutes_played, possession_pct,
  passes_completed, passes_attempted, pass_completion_pct,
  xg_for, xg_against, source_updated_at, raw_payload, ingested_at
FROM team_stats
ORDER BY team_slug, source, competition, season, as_of_date DESC, ingested_at DESC;

CREATE VIEW latest_team_ratings AS
SELECT DISTINCT ON (team_slug, source, competition, season)
  team_slug, source, competition, season, source_team_name, source_url,
  as_of_date, rating, rating_rank, rating_scale,
  source_updated_at, raw_payload, ingested_at
FROM team_ratings
ORDER BY team_slug, source, competition, season, as_of_date DESC, ingested_at DESC;

CREATE VIEW latest_team_features AS
SELECT
  teams.slug, teams.name, teams.confederation,
  stats.competition AS stats_competition, stats.season AS stats_season,
  stats.as_of_date AS stats_as_of_date,
  stats.possession_pct, stats.passes_completed, stats.passes_attempted,
  stats.pass_completion_pct, stats.xg_for, stats.xg_against,
  ratings.competition AS rating_competition, ratings.season AS rating_season,
  ratings.as_of_date AS rating_as_of_date,
  ratings.rating AS elo_rating, ratings.rating_rank AS elo_rank
FROM teams
LEFT JOIN latest_team_stats AS stats
  ON stats.team_slug = teams.slug
  AND stats.source = 'fbref'
  AND stats.competition = 'World Cup 2026'
  AND stats.season = '2026'
LEFT JOIN latest_team_ratings AS ratings
  ON ratings.team_slug = teams.slug
  AND ratings.source = 'world-football-elo'
  AND ratings.competition = 'World Cup 2026'
  AND ratings.season = '2026';

CREATE VIEW match_team_features AS
SELECT
  matches.match_key, matches.group_code, matches.round,
  matches.kickoff_utc, matches.venue, matches.city,
  matches.home_team_slug,
  home_team.name AS home_team_name,
  home_stats.xg_for AS home_xg_for,
  home_stats.possession_pct AS home_possession_pct,
  home_ratings.rating AS home_elo_rating,
  home_ratings.rating_rank AS home_elo_rank,
  matches.away_team_slug,
  away_team.name AS away_team_name,
  away_stats.xg_for AS away_xg_for,
  away_stats.possession_pct AS away_possession_pct,
  away_ratings.rating AS away_elo_rating,
  away_ratings.rating_rank AS away_elo_rank
FROM matches
JOIN teams AS home_team ON home_team.slug = matches.home_team_slug
JOIN teams AS away_team ON away_team.slug = matches.away_team_slug
LEFT JOIN latest_team_stats AS home_stats
  ON home_stats.team_slug = matches.home_team_slug
  AND home_stats.source = 'fbref'
  AND home_stats.competition = 'World Cup 2026'
  AND home_stats.season = '2026'
LEFT JOIN latest_team_stats AS away_stats
  ON away_stats.team_slug = matches.away_team_slug
  AND away_stats.source = 'fbref'
  AND away_stats.competition = 'World Cup 2026'
  AND away_stats.season = '2026'
LEFT JOIN latest_team_ratings AS home_ratings
  ON home_ratings.team_slug = matches.home_team_slug
  AND home_ratings.source = 'world-football-elo'
  AND home_ratings.competition = 'World Cup 2026'
  AND home_ratings.season = '2026'
LEFT JOIN latest_team_ratings AS away_ratings
  ON away_ratings.team_slug = matches.away_team_slug
  AND away_ratings.source = 'world-football-elo'
  AND away_ratings.competition = 'World Cup 2026'
  AND away_ratings.season = '2026';

------------------------------------------------------------------------
-- 6. Create missing core tables: standings
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_code text NOT NULL DEFAULT 'world_cup_2026',
  season_year integer NOT NULL DEFAULT 2026,
  stage text NOT NULL DEFAULT 'group_stage',
  group_code text NOT NULL,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  ranking integer NOT NULL,
  played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  goal_difference integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  qualification_status text NOT NULL DEFAULT 'pending',
  tie_break_notes text,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  model_version text NOT NULL DEFAULT 'manual',
  facts_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT standings_ranking_positive CHECK (ranking > 0),
  CONSTRAINT standings_played_non_negative CHECK (played >= 0),
  CONSTRAINT standings_wins_non_negative CHECK (wins >= 0),
  CONSTRAINT standings_draws_non_negative CHECK (draws >= 0),
  CONSTRAINT standings_losses_non_negative CHECK (losses >= 0),
  CONSTRAINT standings_goals_for_non_negative CHECK (goals_for >= 0),
  CONSTRAINT standings_goals_against_non_negative CHECK (goals_against >= 0),
  CONSTRAINT standings_points_non_negative CHECK (points >= 0),
  CONSTRAINT standings_record_consistent CHECK (wins + draws + losses <= played),
  CONSTRAINT standings_status_valid CHECK (qualification_status IN ('pending', 'qualified', 'best_third_place', 'eliminated')),
  CONSTRAINT standings_unique_snapshot UNIQUE (competition_code, season_year, stage, group_code, team_id, snapshot_at, model_version)
);

CREATE INDEX IF NOT EXISTS idx_standings_group_snapshot ON standings(group_code, snapshot_at DESC, ranking);
CREATE INDEX IF NOT EXISTS idx_standings_team_snapshot ON standings(team_id, snapshot_at DESC);

DROP TRIGGER IF EXISTS standings_updated_at ON standings;
CREATE TRIGGER standings_updated_at
  BEFORE UPDATE ON standings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

------------------------------------------------------------------------
-- 7. Create missing core tables: head_to_head
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS head_to_head (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_b_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  total_matches integer NOT NULL DEFAULT 0,
  team_a_wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  team_b_wins integer NOT NULL DEFAULT 0,
  team_a_goals integer NOT NULL DEFAULT 0,
  team_b_goals integer NOT NULL DEFAULT 0,
  last_met_at date,
  last_result text,
  world_cup_meetings integer NOT NULL DEFAULT 0,
  notable_meetings jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  model_version text NOT NULL DEFAULT 'manual',
  facts_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT head_to_head_distinct_teams CHECK (team_a_id <> team_b_id),
  CONSTRAINT head_to_head_total_matches_non_negative CHECK (total_matches >= 0),
  CONSTRAINT head_to_head_team_a_wins_non_negative CHECK (team_a_wins >= 0),
  CONSTRAINT head_to_head_draws_non_negative CHECK (draws >= 0),
  CONSTRAINT head_to_head_team_b_wins_non_negative CHECK (team_b_wins >= 0),
  CONSTRAINT head_to_head_results_consistent CHECK (team_a_wins + draws + team_b_wins = total_matches)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_head_to_head_pair
  ON head_to_head (
    least(team_a_id::text, team_b_id::text),
    greatest(team_a_id::text, team_b_id::text)
  );
CREATE INDEX IF NOT EXISTS idx_head_to_head_team_a ON head_to_head(team_a_id);
CREATE INDEX IF NOT EXISTS idx_head_to_head_team_b ON head_to_head(team_b_id);

DROP TRIGGER IF EXISTS head_to_head_updated_at ON head_to_head;
CREATE TRIGGER head_to_head_updated_at
  BEFORE UPDATE ON head_to_head
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

------------------------------------------------------------------------
-- 8. Create missing core tables: team_chemistry
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_chemistry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competition_code text NOT NULL DEFAULT 'world_cup_2026',
  season_year integer NOT NULL DEFAULT 2026,
  snapshot_date date NOT NULL,
  chemistry numeric(5,2) NOT NULL,
  familiarity numeric(5,2) NOT NULL,
  stability numeric(5,2) NOT NULL,
  morale numeric(5,2) NOT NULL,
  chemistry_rank integer,
  rationale text,
  source text NOT NULL DEFAULT 'manual',
  model_version text NOT NULL DEFAULT 'manual',
  facts_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_chemistry_range CHECK (
    chemistry BETWEEN 0 AND 100
    AND familiarity BETWEEN 0 AND 100
    AND stability BETWEEN 0 AND 100
    AND morale BETWEEN 0 AND 100
  ),
  CONSTRAINT team_chemistry_rank_positive CHECK (chemistry_rank IS NULL OR chemistry_rank > 0),
  CONSTRAINT team_chemistry_unique_snapshot UNIQUE (team_id, competition_code, season_year, snapshot_date, model_version)
);

CREATE INDEX IF NOT EXISTS idx_team_chemistry_team_snapshot ON team_chemistry(team_id, snapshot_date DESC);

DROP TRIGGER IF EXISTS team_chemistry_updated_at ON team_chemistry;
CREATE TRIGGER team_chemistry_updated_at
  BEFORE UPDATE ON team_chemistry
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
