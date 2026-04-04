create table if not exists public.football_teams (
  team_id bigint primary key,
  source text not null default 'api-football',
  name text not null,
  code text,
  country text,
  national boolean,
  founded integer,
  logo_url text,
  venue_name text,
  venue_address text,
  venue_city text,
  venue_capacity integer,
  venue_surface text,
  venue_image_url text,
  last_fetched_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists football_teams_country_idx
  on public.football_teams (country);

create table if not exists public.football_players (
  player_id bigint primary key,
  source text not null default 'api-football',
  name text not null,
  firstname text,
  lastname text,
  age integer,
  birth_date date,
  birth_place text,
  birth_country text,
  nationality text,
  height text,
  weight text,
  injured boolean,
  photo_url text,
  last_fetched_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.football_team_squads (
  team_id bigint not null references public.football_teams(team_id) on delete cascade,
  player_id bigint not null references public.football_players(player_id) on delete cascade,
  season integer not null,
  jersey_number integer,
  position text,
  age integer,
  last_fetched_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, player_id, season)
);

create index if not exists football_team_squads_season_idx
  on public.football_team_squads (season, team_id);

create table if not exists public.football_matches (
  fixture_id bigint primary key,
  source text not null default 'api-football',
  league_id bigint not null,
  league_name text,
  season integer not null,
  round text,
  timezone text,
  kickoff_at timestamptz,
  referee text,
  status_long text,
  status_short text,
  status_elapsed integer,
  venue_name text,
  venue_city text,
  home_team_id bigint not null references public.football_teams(team_id),
  away_team_id bigint not null references public.football_teams(team_id),
  home_goals integer,
  away_goals integer,
  home_winner boolean,
  away_winner boolean,
  last_fetched_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists football_matches_season_idx
  on public.football_matches (season, kickoff_at);

create index if not exists football_matches_league_season_idx
  on public.football_matches (league_id, season);

create table if not exists public.football_standings (
  league_id bigint not null,
  season integer not null,
  team_id bigint not null references public.football_teams(team_id) on delete cascade,
  standing_group text not null default '',
  rank integer,
  points integer,
  goals_diff integer,
  played integer,
  win integer,
  draw integer,
  lose integer,
  goals_for integer,
  goals_against integer,
  description text,
  form text,
  last_fetched_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (league_id, season, team_id, standing_group)
);

create index if not exists football_standings_team_idx
  on public.football_standings (season, team_id);
