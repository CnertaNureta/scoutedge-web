-- ZON-8 validation queries
-- Replace the synthetic `matches` CTE with your real `matches` table when available.

-- 1. FBref team_stats sample
select
  teams.slug,
  teams.name,
  latest_team_stats.competition,
  latest_team_stats.season,
  latest_team_stats.possession_pct,
  latest_team_stats.pass_completion_pct,
  latest_team_stats.xg_for,
  latest_team_stats.xg_against,
  latest_team_stats.as_of_date
from latest_team_stats
join teams on teams.slug = latest_team_stats.team_slug
where latest_team_stats.source = 'fbref'
  and latest_team_stats.competition = 'World Cup 2026'
  and latest_team_stats.season = '2026'
order by latest_team_stats.as_of_date desc, teams.name
limit 5;

-- 2. ELO ratings sample
select
  teams.slug,
  teams.name,
  latest_team_ratings.competition,
  latest_team_ratings.season,
  latest_team_ratings.rating,
  latest_team_ratings.rating_rank,
  latest_team_ratings.as_of_date
from latest_team_ratings
join teams on teams.slug = latest_team_ratings.team_slug
where latest_team_ratings.source = 'world-football-elo'
  and latest_team_ratings.competition = 'World Cup 2026'
  and latest_team_ratings.season = '2026'
order by latest_team_ratings.rating_rank asc nulls last
limit 5;

-- 3. Match association using persisted matches + latest team features
select
  match_key,
  home_team_name as home_team,
  away_team_name as away_team,
  home_xg_for,
  away_xg_for,
  home_elo_rating as home_elo,
  away_elo_rating as away_elo
from match_team_features
order by kickoff_utc, match_key
limit 5;
