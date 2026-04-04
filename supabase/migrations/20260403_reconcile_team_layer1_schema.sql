-- Reconcile Layer 1 team-data schema onto an existing project where
-- `teams` and `matches` may already exist with an older shape.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists teams (
  slug text primary key
);

alter table teams add column if not exists slug text;
alter table teams add column if not exists name text;
alter table teams add column if not exists confederation text;
alter table teams add column if not exists source text default 'scoutedge-static';
alter table teams add column if not exists source_updated_at timestamptz;
alter table teams add column if not exists created_at timestamptz default now();
alter table teams add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_teams_name_unique
  on teams(name)
  where name is not null;
create unique index if not exists idx_teams_slug_unique on teams(slug);

create table if not exists matches (
  match_key text primary key
);

alter table matches add column if not exists match_key text;
alter table matches add column if not exists group_code text;
alter table matches add column if not exists round text;
alter table matches add column if not exists kickoff_utc timestamptz;
alter table matches add column if not exists venue text;
alter table matches add column if not exists city text;
alter table matches add column if not exists home_team_slug text;
alter table matches add column if not exists away_team_slug text;
alter table matches add column if not exists source text default 'scoutedge-static';
alter table matches add column if not exists source_updated_at timestamptz;
alter table matches add column if not exists created_at timestamptz default now();
alter table matches add column if not exists updated_at timestamptz default now();

create table if not exists team_name_aliases (
  alias text not null,
  normalized_alias text primary key,
  team_slug text not null references teams(slug) on delete cascade,
  source text not null default 'scoutedge-layer1',
  created_at timestamptz not null default now()
);

create table if not exists team_stats (
  id uuid primary key default gen_random_uuid(),
  team_slug text not null references teams(slug) on delete cascade,
  source text not null,
  source_team_name text not null,
  source_url text,
  as_of_date date not null,
  matches_played numeric(6, 2),
  minutes_played numeric(8, 2),
  possession_pct numeric(5, 2),
  passes_completed numeric(10, 2),
  passes_attempted numeric(10, 2),
  pass_completion_pct numeric(5, 2),
  xg_for numeric(8, 3),
  xg_against numeric(8, 3),
  source_updated_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (team_slug, source, as_of_date)
);

create table if not exists team_ratings (
  id uuid primary key default gen_random_uuid(),
  team_slug text not null references teams(slug) on delete cascade,
  source text not null,
  source_team_name text not null,
  source_url text,
  as_of_date date not null,
  rating numeric(10, 2) not null,
  rating_rank integer,
  rating_scale text not null default 'elo',
  source_updated_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  unique (team_slug, source, as_of_date)
);

create index if not exists idx_team_name_aliases_team_slug on team_name_aliases(team_slug);
create unique index if not exists idx_matches_match_key_unique on matches(match_key);
create index if not exists idx_matches_group_code on matches(group_code);
create index if not exists idx_matches_kickoff_utc on matches(kickoff_utc);
create index if not exists idx_matches_home_team_slug on matches(home_team_slug);
create index if not exists idx_matches_away_team_slug on matches(away_team_slug);
create index if not exists idx_team_stats_team_slug on team_stats(team_slug);
create index if not exists idx_team_stats_source_as_of_date on team_stats(source, as_of_date desc);
create index if not exists idx_team_ratings_team_slug on team_ratings(team_slug);
create index if not exists idx_team_ratings_source_as_of_date on team_ratings(source, as_of_date desc);

drop trigger if exists teams_set_updated_at on teams;
create trigger teams_set_updated_at
before update on teams
for each row execute function set_updated_at();

drop trigger if exists matches_set_updated_at on matches;
create trigger matches_set_updated_at
before update on matches
for each row execute function set_updated_at();

create or replace view latest_team_stats as
select distinct on (team_slug, source)
  team_slug,
  source,
  source_team_name,
  source_url,
  as_of_date,
  matches_played,
  minutes_played,
  possession_pct,
  passes_completed,
  passes_attempted,
  pass_completion_pct,
  xg_for,
  xg_against,
  source_updated_at,
  raw_payload,
  ingested_at
from team_stats
order by team_slug, source, as_of_date desc, ingested_at desc;

create or replace view latest_team_ratings as
select distinct on (team_slug, source)
  team_slug,
  source,
  source_team_name,
  source_url,
  as_of_date,
  rating,
  rating_rank,
  rating_scale,
  source_updated_at,
  raw_payload,
  ingested_at
from team_ratings
order by team_slug, source, as_of_date desc, ingested_at desc;

create or replace view latest_team_features as
select
  teams.slug,
  teams.name,
  teams.confederation,
  stats.as_of_date as stats_as_of_date,
  stats.possession_pct,
  stats.passes_completed,
  stats.passes_attempted,
  stats.pass_completion_pct,
  stats.xg_for,
  stats.xg_against,
  ratings.as_of_date as rating_as_of_date,
  ratings.rating as elo_rating,
  ratings.rating_rank as elo_rank
from teams
left join latest_team_stats as stats
  on stats.team_slug = teams.slug
  and stats.source = 'fbref'
left join latest_team_ratings as ratings
  on ratings.team_slug = teams.slug
  and ratings.source = 'world-football-elo';

create or replace view match_team_features as
select
  matches.match_key,
  matches.group_code,
  matches.round,
  matches.kickoff_utc,
  matches.venue,
  matches.city,
  matches.home_team_slug,
  home_team.name as home_team_name,
  home_stats.xg_for as home_xg_for,
  home_stats.possession_pct as home_possession_pct,
  home_ratings.rating as home_elo_rating,
  home_ratings.rating_rank as home_elo_rank,
  matches.away_team_slug,
  away_team.name as away_team_name,
  away_stats.xg_for as away_xg_for,
  away_stats.possession_pct as away_possession_pct,
  away_ratings.rating as away_elo_rating,
  away_ratings.rating_rank as away_elo_rank
from matches
join teams as home_team
  on home_team.slug = matches.home_team_slug
join teams as away_team
  on away_team.slug = matches.away_team_slug
left join latest_team_stats as home_stats
  on home_stats.team_slug = matches.home_team_slug
  and home_stats.source = 'fbref'
left join latest_team_stats as away_stats
  on away_stats.team_slug = matches.away_team_slug
  and away_stats.source = 'fbref'
left join latest_team_ratings as home_ratings
  on home_ratings.team_slug = matches.home_team_slug
  and home_ratings.source = 'world-football-elo'
left join latest_team_ratings as away_ratings
  on away_ratings.team_slug = matches.away_team_slug
  and away_ratings.source = 'world-football-elo';
