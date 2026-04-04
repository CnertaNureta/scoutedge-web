-- Canonical team dimension for all downstream football facts.
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  flag text,
  group_code text,
  confederation text,
  is_playoff boolean not null default false,
  fifa_ranking integer,
  elo_rating numeric(8,2),
  elo_rank integer,
  coach_name text,
  archetype_match text,
  key_insight text,
  seo_article text,
  source text not null default 'manual',
  source_external_id text,
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_slug_not_blank check (btrim(slug) <> ''),
  constraint teams_name_not_blank check (btrim(name) <> ''),
  constraint teams_elo_rating_non_negative check (elo_rating is null or elo_rating >= 0),
  constraint teams_elo_rank_positive check (elo_rank is null or elo_rank > 0)
);

create index if not exists idx_teams_group_code on teams(group_code);
create index if not exists idx_teams_confederation on teams(confederation);
create index if not exists idx_teams_fifa_ranking on teams(fifa_ranking);
create index if not exists idx_teams_elo_rank on teams(elo_rank);
create unique index if not exists idx_teams_source_external_id
  on teams(source, source_external_id)
  where source_external_id is not null;

drop trigger if exists teams_updated_at on teams;
create trigger teams_updated_at
before update on teams
for each row execute function update_updated_at();

comment on table teams is
  'Canonical team dimension spanning tournament participants, qualifiers, and future enrichments such as ELO.';
comment on column teams.elo_rating is
  'Reserved slot for ingesting external ELO-style ratings without reshaping the core team dimension.';
comment on column teams.elo_rank is
  'Reserved rank companion for elo_rating when downstream reads prefer ordinal sorting.';

-- Canonical player dimension, scoped to one team roster.
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  slug text not null,
  name text not null,
  position text not null,
  number integer,
  age integer,
  club text,
  caps integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  rating numeric(4,2),
  fitness_status text not null default 'unknown',
  fitness_note text,
  sentiment_score numeric(5,2),
  sentiment_label text,
  seo_article text,
  image_url text,
  cutout_url text,
  source text not null default 'manual',
  source_external_id text,
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_slug_not_blank check (btrim(slug) <> ''),
  constraint players_name_not_blank check (btrim(name) <> ''),
  constraint players_position_valid check (position in ('GK', 'DEF', 'MID', 'FWD')),
  constraint players_fitness_status_valid check (fitness_status in ('green', 'amber', 'red', 'unknown')),
  constraint players_caps_non_negative check (caps >= 0),
  constraint players_goals_non_negative check (goals >= 0),
  constraint players_assists_non_negative check (assists >= 0),
  constraint players_age_non_negative check (age is null or age >= 0),
  constraint players_sentiment_range check (sentiment_score is null or sentiment_score between 0 and 100),
  constraint players_rating_range check (rating is null or rating between 0 and 10),
  constraint players_team_slug_unique unique (team_id, slug)
);

create index if not exists idx_players_team_id on players(team_id);
create index if not exists idx_players_team_position on players(team_id, position);
create index if not exists idx_players_slug on players(slug);
create unique index if not exists idx_players_source_external_id
  on players(source, source_external_id)
  where source_external_id is not null;

drop trigger if exists players_updated_at on players;
create trigger players_updated_at
before update on players
for each row execute function update_updated_at();

-- Historical team-performance snapshots used by predictions and rankings.
create table if not exists team_stats (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  competition_code text not null default 'world_cup_2026',
  season_year integer not null default 2026,
  stat_scope text not null default 'overall',
  as_of_date date not null,
  matches_played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  goal_difference integer not null default 0,
  clean_sheets integer not null default 0,
  expected_goals_for numeric(6,2),
  expected_goals_against numeric(6,2),
  possession_pct numeric(5,2),
  pass_completion_pct numeric(5,2),
  shots_per_match numeric(6,2),
  points numeric(6,2),
  power_score numeric(6,2),
  source text not null default 'manual',
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_stats_matches_non_negative check (matches_played >= 0),
  constraint team_stats_wins_non_negative check (wins >= 0),
  constraint team_stats_draws_non_negative check (draws >= 0),
  constraint team_stats_losses_non_negative check (losses >= 0),
  constraint team_stats_goals_for_non_negative check (goals_for >= 0),
  constraint team_stats_goals_against_non_negative check (goals_against >= 0),
  constraint team_stats_clean_sheets_non_negative check (clean_sheets >= 0),
  constraint team_stats_record_consistent check (wins + draws + losses <= matches_played),
  constraint team_stats_possession_range check (possession_pct is null or possession_pct between 0 and 100),
  constraint team_stats_pass_completion_range check (
    pass_completion_pct is null or pass_completion_pct between 0 and 100
  ),
  constraint team_stats_unique_snapshot unique (team_id, competition_code, season_year, stat_scope, as_of_date, model_version)
);

create index if not exists idx_team_stats_team_date on team_stats(team_id, as_of_date desc);
create index if not exists idx_team_stats_scope_date on team_stats(competition_code, season_year, stat_scope, as_of_date desc);

drop trigger if exists team_stats_updated_at on team_stats;
create trigger team_stats_updated_at
before update on team_stats
for each row execute function update_updated_at();

comment on table team_stats is
  'Historical team snapshots for prediction inputs, rankings, and downstream analytical reads.';
comment on column team_stats.pass_completion_pct is
  'Reserved passing-accuracy field for FBref-style ingestion and SQL-first model feature reads.';

-- Fixture/results table supporting both resolved teams and unresolved bracket slots.
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  competition_code text not null default 'world_cup_2026',
  season_year integer not null default 2026,
  stage text not null default 'group_stage',
  round text not null,
  group_code text,
  matchday integer,
  home_team_id uuid references teams(id) on delete restrict,
  away_team_id uuid references teams(id) on delete restrict,
  home_placeholder_slug text,
  away_placeholder_slug text,
  venue text,
  city text,
  kickoff_utc timestamptz not null,
  match_status text not null default 'scheduled',
  home_score integer,
  away_score integer,
  home_penalty_score integer,
  away_penalty_score integer,
  source text not null default 'manual',
  source_match_id text,
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_home_participant_present check (
    num_nonnulls(home_team_id, home_placeholder_slug) = 1
  ),
  constraint matches_away_participant_present check (
    num_nonnulls(away_team_id, away_placeholder_slug) = 1
  ),
  constraint matches_home_placeholder_not_blank check (
    home_placeholder_slug is null or btrim(home_placeholder_slug) <> ''
  ),
  constraint matches_away_placeholder_not_blank check (
    away_placeholder_slug is null or btrim(away_placeholder_slug) <> ''
  ),
  constraint matches_distinct_participants check (
    coalesce(home_team_id::text, home_placeholder_slug)
    <> coalesce(away_team_id::text, away_placeholder_slug)
  ),
  constraint matches_status_valid check (match_status in ('scheduled', 'live', 'completed', 'postponed', 'cancelled')),
  constraint matches_home_score_non_negative check (home_score is null or home_score >= 0),
  constraint matches_away_score_non_negative check (away_score is null or away_score >= 0),
  constraint matches_home_penalties_non_negative check (home_penalty_score is null or home_penalty_score >= 0),
  constraint matches_away_penalties_non_negative check (away_penalty_score is null or away_penalty_score >= 0)
);

create index if not exists idx_matches_kickoff_utc on matches(kickoff_utc);
create index if not exists idx_matches_group_kickoff on matches(group_code, kickoff_utc);
create index if not exists idx_matches_round_kickoff on matches(round, kickoff_utc);
create index if not exists idx_matches_home_team on matches(home_team_id, kickoff_utc);
create index if not exists idx_matches_away_team on matches(away_team_id, kickoff_utc);
create index if not exists idx_matches_home_placeholder on matches(home_placeholder_slug, kickoff_utc)
  where home_placeholder_slug is not null;
create index if not exists idx_matches_away_placeholder on matches(away_placeholder_slug, kickoff_utc)
  where away_placeholder_slug is not null;
create index if not exists idx_matches_status on matches(match_status, kickoff_utc);
create unique index if not exists idx_matches_unique_fixture
  on matches(
    competition_code,
    season_year,
    coalesce(home_team_id::text, home_placeholder_slug),
    coalesce(away_team_id::text, away_placeholder_slug),
    kickoff_utc
  );
create unique index if not exists idx_matches_source_match_id
  on matches(source, source_match_id)
  where source_match_id is not null;

drop trigger if exists matches_updated_at on matches;
create trigger matches_updated_at
before update on matches
for each row execute function update_updated_at();

comment on table matches is
  'Fixtures and results, including unresolved knockout bracket slots before participants are known.';
comment on column matches.home_placeholder_slug is
  'Bracket-slot placeholder such as tbd-1a or tbd-r32-w1 when no canonical team row is known yet.';
comment on column matches.away_placeholder_slug is
  'Bracket-slot placeholder such as tbd-3c or tbd-qf-2 when no canonical team row is known yet.';

-- Snapshot standings for group tables and best-third-place comparisons.
create table if not exists standings (
  id uuid primary key default gen_random_uuid(),
  competition_code text not null default 'world_cup_2026',
  season_year integer not null default 2026,
  stage text not null default 'group_stage',
  group_code text not null,
  team_id uuid not null references teams(id) on delete cascade,
  ranking integer not null,
  played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  goal_difference integer not null default 0,
  points integer not null default 0,
  qualification_status text not null default 'pending',
  tie_break_notes text,
  snapshot_at timestamptz not null default now(),
  source text not null default 'manual',
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint standings_ranking_positive check (ranking > 0),
  constraint standings_played_non_negative check (played >= 0),
  constraint standings_wins_non_negative check (wins >= 0),
  constraint standings_draws_non_negative check (draws >= 0),
  constraint standings_losses_non_negative check (losses >= 0),
  constraint standings_goals_for_non_negative check (goals_for >= 0),
  constraint standings_goals_against_non_negative check (goals_against >= 0),
  constraint standings_points_non_negative check (points >= 0),
  constraint standings_record_consistent check (wins + draws + losses <= played),
  constraint standings_status_valid check (qualification_status in ('pending', 'qualified', 'best_third_place', 'eliminated')),
  constraint standings_unique_snapshot unique (competition_code, season_year, stage, group_code, team_id, snapshot_at, model_version)
);

create index if not exists idx_standings_group_snapshot on standings(group_code, snapshot_at desc, ranking);
create index if not exists idx_standings_team_snapshot on standings(team_id, snapshot_at desc);

drop trigger if exists standings_updated_at on standings;
create trigger standings_updated_at
before update on standings
for each row execute function update_updated_at();

-- Aggregate pairing history for compare and editorial surfaces.
create table if not exists head_to_head (
  id uuid primary key default gen_random_uuid(),
  team_a_id uuid not null references teams(id) on delete cascade,
  team_b_id uuid not null references teams(id) on delete cascade,
  total_matches integer not null default 0,
  team_a_wins integer not null default 0,
  draws integer not null default 0,
  team_b_wins integer not null default 0,
  team_a_goals integer not null default 0,
  team_b_goals integer not null default 0,
  last_met_at date,
  last_result text,
  world_cup_meetings integer not null default 0,
  notable_meetings jsonb not null default '[]'::jsonb,
  source text not null default 'manual',
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint head_to_head_distinct_teams check (team_a_id <> team_b_id),
  constraint head_to_head_total_matches_non_negative check (total_matches >= 0),
  constraint head_to_head_team_a_wins_non_negative check (team_a_wins >= 0),
  constraint head_to_head_draws_non_negative check (draws >= 0),
  constraint head_to_head_team_b_wins_non_negative check (team_b_wins >= 0),
  constraint head_to_head_team_a_goals_non_negative check (team_a_goals >= 0),
  constraint head_to_head_team_b_goals_non_negative check (team_b_goals >= 0),
  constraint head_to_head_world_cup_meetings_non_negative check (world_cup_meetings >= 0),
  constraint head_to_head_results_consistent check (team_a_wins + draws + team_b_wins = total_matches)
);

create unique index if not exists idx_head_to_head_pair
  on head_to_head (
    least(team_a_id::text, team_b_id::text),
    greatest(team_a_id::text, team_b_id::text)
  );
create index if not exists idx_head_to_head_team_a on head_to_head(team_a_id);
create index if not exists idx_head_to_head_team_b on head_to_head(team_b_id);

drop trigger if exists head_to_head_updated_at on head_to_head;
create trigger head_to_head_updated_at
before update on head_to_head
for each row execute function update_updated_at();

-- Model outputs for match predictions with lineage metadata.
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  prediction_type text not null default 'match_outcome',
  home_win_prob numeric(6,5) not null,
  draw_prob numeric(6,5) not null,
  away_win_prob numeric(6,5) not null,
  predicted_home_goals numeric(6,2),
  predicted_away_goals numeric(6,2),
  confidence_score numeric(5,2),
  recommended_pick text,
  rationale_summary text,
  source text not null default 'scoutedge',
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_home_prob_range check (home_win_prob between 0 and 1),
  constraint predictions_draw_prob_range check (draw_prob between 0 and 1),
  constraint predictions_away_prob_range check (away_win_prob between 0 and 1),
  constraint predictions_confidence_range check (confidence_score is null or confidence_score between 0 and 100),
  constraint predictions_pick_valid check (recommended_pick is null or recommended_pick in ('home', 'draw', 'away')),
  constraint predictions_probabilities_sum check ((home_win_prob + draw_prob + away_win_prob) between 0.99 and 1.01),
  constraint predictions_unique_run unique (match_id, prediction_type, model_version, generated_at)
);

create index if not exists idx_predictions_match_generated on predictions(match_id, generated_at desc);
create index if not exists idx_predictions_model_generated on predictions(model_version, generated_at desc);

drop trigger if exists predictions_updated_at on predictions;
create trigger predictions_updated_at
before update on predictions
for each row execute function update_updated_at();

-- Dated chemistry factors that feed the power-score model.
create table if not exists team_chemistry (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  competition_code text not null default 'world_cup_2026',
  season_year integer not null default 2026,
  snapshot_date date not null,
  chemistry numeric(5,2) not null,
  familiarity numeric(5,2) not null,
  stability numeric(5,2) not null,
  morale numeric(5,2) not null,
  chemistry_rank integer,
  rationale text,
  source text not null default 'manual',
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_chemistry_range check (
    chemistry between 0 and 100
    and familiarity between 0 and 100
    and stability between 0 and 100
    and morale between 0 and 100
  ),
  constraint team_chemistry_rank_positive check (chemistry_rank is null or chemistry_rank > 0),
  constraint team_chemistry_unique_snapshot unique (team_id, competition_code, season_year, snapshot_date, model_version)
);

create index if not exists idx_team_chemistry_team_date on team_chemistry(team_id, snapshot_date desc);
create index if not exists idx_team_chemistry_rank on team_chemistry(snapshot_date desc, chemistry_rank);

drop trigger if exists team_chemistry_updated_at on team_chemistry;
create trigger team_chemistry_updated_at
before update on team_chemistry
for each row execute function update_updated_at();

create or replace function player_recent_signals_are_valid(payload jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(payload) = 'array'
    and coalesce(
      (
        select bool_and(
          jsonb_typeof(signal) = 'object'
          and signal ? 'type'
          and signal ? 'text'
          and jsonb_typeof(signal->'type') = 'string'
          and jsonb_typeof(signal->'text') = 'string'
          and signal->>'type' in ('training', 'quote', 'data')
          and btrim(signal->>'text') <> ''
        )
        from jsonb_array_elements(payload) as signals(signal)
      ),
      true
    );
$$;

-- Player-level intel snapshots derived from signals and analyst overlays.
create table if not exists player_intel (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  captured_at timestamptz not null default now(),
  fitness_status text not null default 'unknown',
  fitness_note text,
  sentiment_score numeric(5,2),
  sentiment_label text,
  availability_status text,
  workload_note text,
  analyst_note text,
  recent_signals jsonb not null default '[]'::jsonb,
  last_signal_at timestamptz,
  source text not null default 'manual',
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_intel_fitness_status_valid check (fitness_status in ('green', 'amber', 'red', 'unknown')),
  constraint player_intel_sentiment_range check (sentiment_score is null or sentiment_score between 0 and 100),
  constraint player_intel_recent_signals_valid check (player_recent_signals_are_valid(recent_signals)),
  constraint player_intel_unique_snapshot unique (player_id, captured_at, model_version)
);

create index if not exists idx_player_intel_player_captured on player_intel(player_id, captured_at desc);
create index if not exists idx_player_intel_fitness_status on player_intel(fitness_status, captured_at desc);
create index if not exists idx_player_intel_last_signal_at on player_intel(last_signal_at desc);

drop trigger if exists player_intel_updated_at on player_intel;
create trigger player_intel_updated_at
before update on player_intel
for each row execute function update_updated_at();

comment on table player_intel is
  'Player intelligence snapshots derived from signals, analyst notes, and availability tracking.';
comment on column player_intel.recent_signals is
  'Cached recent signal payloads used to explain the current intel state without replaying the full signal feed.';
comment on column player_intel.updated_at is
  'Stable last-updated timestamp for downstream consumers that need a single freshness field.';

-- Time-ordered signal feed for teams, players, and matches.
create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null,
  impact text not null,
  headline text not null,
  detail text not null,
  signal_at timestamptz not null default now(),
  team_id uuid references teams(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  source text not null default 'manual',
  source_url text,
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signals_subject_present check (team_id is not null or player_id is not null or match_id is not null),
  constraint signals_impact_valid check (impact in ('high', 'medium', 'low')),
  constraint signals_signal_type_valid check (
    signal_type in ('injury', 'transfer', 'form', 'tactical', 'sentiment')
  )
);

create index if not exists idx_signals_signal_at on signals(signal_at desc);
create index if not exists idx_signals_team_signal_at on signals(team_id, signal_at desc);
create index if not exists idx_signals_player_signal_at on signals(player_id, signal_at desc);
create index if not exists idx_signals_match_signal_at on signals(match_id, signal_at desc);
create index if not exists idx_signals_impact_signal_at on signals(impact, signal_at desc);

drop trigger if exists signals_updated_at on signals;
create trigger signals_updated_at
before update on signals
for each row execute function update_updated_at();

-- Structured AI/editorial content with optional entity linkage.
create table if not exists narratives (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique,
  competition_code text not null default 'world_cup_2026',
  content_type text not null,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  source_date date,
  match_key text,
  home_team_slug text,
  away_team_slug text,
  team_slug text,
  player_slug text,
  fact_hash text,
  body_markdown text not null default '',
  body_html text,
  schema_type text,
  schema_payload jsonb not null default '{}'::jsonb,
  team_id uuid references teams(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  match_id uuid references matches(id) on delete cascade,
  group_code text,
  source text not null default 'manual',
  model_version text not null default 'manual',
  facts_used jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint narratives_competition_code_not_blank check (btrim(competition_code) <> ''),
  constraint narratives_slug_not_blank check (btrim(slug) <> ''),
  constraint narratives_title_not_blank check (btrim(title) <> ''),
  constraint narratives_status_valid check (
    status in ('draft', 'approved', 'published', 'archived')
  )
);

alter table narratives add column if not exists cache_key text;
alter table narratives add column if not exists competition_code text not null default 'world_cup_2026';
alter table narratives add column if not exists summary text not null default '';
alter table narratives add column if not exists source_date date;
alter table narratives add column if not exists match_key text;
alter table narratives add column if not exists home_team_slug text;
alter table narratives add column if not exists away_team_slug text;
alter table narratives add column if not exists team_slug text;
alter table narratives add column if not exists player_slug text;
alter table narratives add column if not exists fact_hash text;
alter table narratives add column if not exists body_markdown text not null default '';
alter table narratives add column if not exists body_html text;
alter table narratives add column if not exists schema_type text;
alter table narratives add column if not exists schema_payload jsonb not null default '{}'::jsonb;
alter table narratives add column if not exists team_id uuid;
alter table narratives add column if not exists player_id uuid;
alter table narratives add column if not exists match_id uuid;
alter table narratives add column if not exists group_code text;
alter table narratives add column if not exists source text not null default 'manual';
alter table narratives add column if not exists model_version text not null default 'manual';
alter table narratives add column if not exists facts_used jsonb not null default '[]'::jsonb;
alter table narratives add column if not exists meta jsonb not null default '{}'::jsonb;
alter table narratives add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table narratives add column if not exists status text not null default 'draft';
alter table narratives add column if not exists approved_at timestamptz;
alter table narratives add column if not exists published_at timestamptz;
alter table narratives add column if not exists created_at timestamptz not null default now();
alter table narratives add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table narratives drop constraint if exists narratives_status_valid;
  alter table narratives drop constraint if exists narratives_status_check;
  alter table narratives
    add constraint narratives_status_valid
    check (status in ('draft', 'approved', 'published', 'archived'));
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'narratives'::regclass
      and conname = 'narratives_team_id_fkey'
  ) then
    alter table narratives
      add constraint narratives_team_id_fkey
      foreign key (team_id) references teams(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'narratives'::regclass
      and conname = 'narratives_player_id_fkey'
  ) then
    alter table narratives
      add constraint narratives_player_id_fkey
      foreign key (player_id) references players(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'narratives'::regclass
      and conname = 'narratives_match_id_fkey'
  ) then
    alter table narratives
      add constraint narratives_match_id_fkey
      foreign key (match_id) references matches(id) on delete cascade;
  end if;
end;
$$;

create index if not exists idx_narratives_competition_type_published
  on narratives(competition_code, content_type, published_at desc);
create index if not exists idx_narratives_team_id on narratives(team_id);
create index if not exists idx_narratives_player_id on narratives(player_id);
create index if not exists idx_narratives_match_id on narratives(match_id);
create index if not exists idx_narratives_group_code on narratives(group_code);
create index if not exists idx_narratives_status on narratives(status, published_at desc);
create unique index if not exists narratives_cache_key_idx on narratives(cache_key);

drop trigger if exists narratives_updated_at on narratives;
drop trigger if exists narratives_set_updated_at on narratives;
create trigger narratives_updated_at
before update on narratives
for each row execute function update_updated_at();

-- Read-optimized current snapshots for slug-first consumers and API compatibility.
create or replace view team_profiles_current as
select
  t.id,
  t.slug,
  t.name,
  coalesce(t.short_name, t.name) as short_name,
  coalesce(t.short_name, t.name) as "shortName",
  coalesce(t.flag, '') as flag,
  coalesce(t.group_code, 'TBD') as group_code,
  coalesce(t.group_code, 'TBD') as "group",
  coalesce(t.confederation, 'Unknown') as confederation,
  t.is_playoff,
  t.is_playoff as "isPlayoff",
  coalesce(t.fifa_ranking, 999) as fifa_ranking,
  coalesce(t.fifa_ranking, 999) as "fifaRanking",
  coalesce(tc.chemistry, 50.0::numeric) as chemistry,
  coalesce(tc.familiarity, 50.0::numeric) as familiarity,
  coalesce(tc.stability, 50.0::numeric) as stability,
  coalesce(tc.morale, 50.0::numeric) as morale,
  coalesce(tc.chemistry_rank, 999) as chemistry_rank,
  coalesce(tc.chemistry_rank, 999) as "chemistryRank",
  tc.snapshot_date as chemistry_snapshot_date,
  tc.snapshot_date as "chemistrySnapshotDate",
  tc.model_version as chemistry_model_version,
  tc.model_version as "chemistryModelVersion",
  t.elo_rating,
  t.elo_rating as "eloRating",
  t.elo_rank,
  t.elo_rank as "eloRank",
  coalesce(t.coach_name, 'TBD') as coach_name,
  coalesce(t.coach_name, 'TBD') as "coachName",
  coalesce(t.archetype_match, 'TBD') as archetype_match,
  coalesce(t.archetype_match, 'TBD') as "archetypeMatch",
  coalesce(t.key_insight, '') as key_insight,
  coalesce(t.key_insight, '') as "keyInsight",
  coalesce(t.seo_article, '') as seo_article,
  coalesce(t.seo_article, '') as "seoArticle",
  t.source,
  t.source_external_id,
  t.source_external_id as "sourceExternalId",
  t.facts_used,
  t.facts_used as "factsUsed",
  t.metadata,
  t.created_at,
  t.created_at as "createdAt",
  t.updated_at,
  t.updated_at as "updatedAt"
from teams t
left join lateral (
  select
    chemistry,
    familiarity,
    stability,
    morale,
    chemistry_rank,
    snapshot_date,
    model_version,
    updated_at,
    created_at
  from team_chemistry tc
  where tc.team_id = t.id
  order by tc.snapshot_date desc, tc.updated_at desc, tc.created_at desc
  limit 1
) tc on true;

create or replace view player_profiles_current as
select
  p.id,
  p.team_id,
  t.slug as team_slug,
  t.slug as "teamSlug",
  t.name as team_name,
  t.name as "teamName",
  coalesce(t.flag, '') as team_flag,
  coalesce(t.flag, '') as "teamFlag",
  p.slug,
  p.name,
  p.position,
  coalesce(p.number, 0) as number,
  coalesce(p.age, 0) as age,
  coalesce(p.club, 'Unknown club') as club,
  p.caps,
  p.goals,
  p.assists,
  coalesce(p.rating, 0::numeric) as rating,
  case
    when coalesce(pi.fitness_status, p.fitness_status) = 'unknown' then 'amber'
    else coalesce(pi.fitness_status, p.fitness_status)
  end as fitness_status,
  case
    when coalesce(pi.fitness_status, p.fitness_status) = 'unknown' then 'amber'
    else coalesce(pi.fitness_status, p.fitness_status)
  end as "fitnessStatus",
  coalesce(pi.fitness_note, p.fitness_note, 'No current fitness note.') as fitness_note,
  coalesce(pi.fitness_note, p.fitness_note, 'No current fitness note.') as "fitnessNote",
  coalesce(pi.sentiment_score, p.sentiment_score, 50.0::numeric) as sentiment_score,
  coalesce(pi.sentiment_score, p.sentiment_score, 50.0::numeric) as "sentimentScore",
  coalesce(pi.sentiment_label, p.sentiment_label, 'neutral') as sentiment_label,
  coalesce(pi.sentiment_label, p.sentiment_label, 'neutral') as "sentimentLabel",
  pi.availability_status,
  pi.availability_status as "availabilityStatus",
  pi.workload_note,
  pi.workload_note as "workloadNote",
  pi.analyst_note,
  pi.analyst_note as "analystNote",
  coalesce(pi.recent_signals, '[]'::jsonb) as recent_signals,
  coalesce(pi.recent_signals, '[]'::jsonb) as "recentSignals",
  pi.last_signal_at,
  pi.last_signal_at as "lastSignalAt",
  pi.captured_at as intel_captured_at,
  pi.captured_at as "intelCapturedAt",
  pi.model_version as intel_model_version,
  pi.model_version as "intelModelVersion",
  coalesce(p.seo_article, '') as seo_article,
  coalesce(p.seo_article, '') as "seoArticle",
  p.image_url,
  p.image_url as "imageUrl",
  p.cutout_url,
  p.cutout_url as "cutoutUrl",
  p.source,
  p.source_external_id,
  p.source_external_id as "sourceExternalId",
  p.facts_used,
  p.facts_used as "factsUsed",
  p.metadata,
  p.created_at,
  p.created_at as "createdAt",
  p.updated_at,
  p.updated_at as "updatedAt"
from players p
join teams t on t.id = p.team_id
left join lateral (
  select
    fitness_status,
    fitness_note,
    sentiment_score,
    sentiment_label,
    availability_status,
    workload_note,
    analyst_note,
    recent_signals,
    last_signal_at,
    captured_at,
    model_version,
    updated_at,
    created_at
  from player_intel pi
  where pi.player_id = p.id
  order by pi.captured_at desc, pi.updated_at desc, pi.created_at desc
  limit 1
) pi on true;

create or replace view match_fixtures_current as
select
  m.id,
  m.competition_code,
  m.competition_code as "competitionCode",
  m.season_year,
  m.season_year as "seasonYear",
  m.stage,
  m.round,
  coalesce(m.group_code, '') as group_code,
  coalesce(m.group_code, '') as "group",
  m.matchday,
  m.home_team_id,
  coalesce(home_team.slug, m.home_placeholder_slug) as home_team_slug,
  coalesce(home_team.slug, m.home_placeholder_slug) as "homeTeamSlug",
  coalesce(home_team.name, m.home_placeholder_slug) as home_team_name,
  coalesce(home_team.name, m.home_placeholder_slug) as "homeTeamName",
  coalesce(home_team.flag, '') as home_flag,
  coalesce(home_team.flag, '') as "homeFlag",
  m.away_team_id,
  coalesce(away_team.slug, m.away_placeholder_slug) as away_team_slug,
  coalesce(away_team.slug, m.away_placeholder_slug) as "awayTeamSlug",
  coalesce(away_team.name, m.away_placeholder_slug) as away_team_name,
  coalesce(away_team.name, m.away_placeholder_slug) as "awayTeamName",
  coalesce(away_team.flag, '') as away_flag,
  coalesce(away_team.flag, '') as "awayFlag",
  m.home_placeholder_slug,
  m.home_placeholder_slug as "homePlaceholderSlug",
  m.away_placeholder_slug,
  m.away_placeholder_slug as "awayPlaceholderSlug",
  coalesce(m.venue, 'TBD venue') as venue,
  coalesce(m.city, 'TBD city') as city,
  m.kickoff_utc,
  m.kickoff_utc as "kickoffUtc",
  m.match_status,
  m.match_status as "matchStatus",
  m.home_score,
  m.away_score,
  m.home_penalty_score,
  m.home_penalty_score as "homePenaltyScore",
  m.away_penalty_score,
  m.away_penalty_score as "awayPenaltyScore",
  coalesce(latest_prediction.home_win_prob, 0.33333::numeric) as home_win_prob,
  coalesce(latest_prediction.home_win_prob, 0.33333::numeric) as "homeWinProb",
  coalesce(latest_prediction.draw_prob, 0.33334::numeric) as draw_prob,
  coalesce(latest_prediction.draw_prob, 0.33334::numeric) as "drawProb",
  coalesce(latest_prediction.away_win_prob, 0.33333::numeric) as away_win_prob,
  coalesce(latest_prediction.away_win_prob, 0.33333::numeric) as "awayWinProb",
  latest_prediction.predicted_home_goals,
  latest_prediction.predicted_home_goals as "predictedHomeGoals",
  latest_prediction.predicted_away_goals,
  latest_prediction.predicted_away_goals as "predictedAwayGoals",
  latest_prediction.confidence_score,
  latest_prediction.confidence_score as "confidenceScore",
  latest_prediction.recommended_pick,
  latest_prediction.recommended_pick as "recommendedPick",
  latest_prediction.rationale_summary,
  latest_prediction.rationale_summary as "rationaleSummary",
  latest_prediction.generated_at as prediction_generated_at,
  latest_prediction.generated_at as "predictionGeneratedAt",
  latest_prediction.model_version as prediction_model_version,
  latest_prediction.model_version as "predictionModelVersion",
  m.source,
  m.source_match_id,
  m.source_match_id as "sourceMatchId",
  m.model_version,
  m.model_version as "modelVersion",
  m.facts_used,
  m.facts_used as "factsUsed",
  m.source_payload,
  m.source_payload as "sourcePayload",
  m.metadata,
  m.created_at,
  m.created_at as "createdAt",
  m.updated_at,
  m.updated_at as "updatedAt"
from matches m
left join teams home_team on home_team.id = m.home_team_id
left join teams away_team on away_team.id = m.away_team_id
left join lateral (
  select
    home_win_prob,
    draw_prob,
    away_win_prob,
    predicted_home_goals,
    predicted_away_goals,
    confidence_score,
    recommended_pick,
    rationale_summary,
    generated_at,
    model_version,
    updated_at,
    created_at
  from predictions p
  where p.match_id = m.id
    and p.prediction_type = 'match_outcome'
  order by p.generated_at desc, p.updated_at desc, p.created_at desc
  limit 1
) latest_prediction on true;

create or replace view signal_feed_current as
select
  s.id,
  s.signal_type,
  s.signal_type as "type",
  s.impact,
  s.headline,
  s.detail,
  s.signal_at,
  s.signal_at as "signalAt",
  s.team_id,
  s.player_id,
  s.match_id,
  coalesce(signal_team.slug, player_team.slug) as team_slug,
  coalesce(signal_team.slug, player_team.slug) as "teamSlug",
  coalesce(signal_team.name, player_team.name) as team_name,
  coalesce(signal_team.name, player_team.name) as "teamName",
  coalesce(signal_team.flag, player_team.flag, '') as team_flag,
  coalesce(signal_team.flag, player_team.flag, '') as "teamFlag",
  case
    when coalesce(signal_team.slug, player_team.slug) is null then null
    else jsonb_build_object(
      'slug', coalesce(signal_team.slug, player_team.slug),
      'name', coalesce(signal_team.name, player_team.name),
      'flag', coalesce(signal_team.flag, player_team.flag, '')
    )
  end as team,
  player.slug as player_slug,
  player.slug as "playerSlug",
  player.name as player_name,
  player.name as "playerName",
  s.source,
  s.source_url,
  s.source_url as "sourceUrl",
  s.model_version,
  s.model_version as "modelVersion",
  s.facts_used,
  s.facts_used as "factsUsed",
  s.metadata,
  s.created_at,
  s.created_at as "createdAt",
  s.updated_at,
  s.updated_at as "updatedAt"
from signals s
left join teams signal_team on signal_team.id = s.team_id
left join players player on player.id = s.player_id
left join teams player_team on player_team.id = player.team_id;

create or replace view power_rankings_current as
with scored as (
  select
    tp.*,
    round(
      greatest(0::numeric, 100 - ((coalesce(tp."fifaRanking", 101) - 1) * 1.5)) * 0.35
      + coalesce(tp.chemistry, 0) * 0.30
      + coalesce(tp.morale, 0) * 0.15
      + coalesce(tp.stability, 0) * 0.10
      + coalesce(tp.familiarity, 0) * 0.10
    )::integer as power_score
  from team_profiles_current tp
),
ranked as (
  select
    scored.*,
    scored.power_score as "powerScore",
    row_number() over (
      order by scored.power_score desc, scored."fifaRanking" asc nulls last, scored.slug asc
    ) as rank
  from scored
)
select
  ranked.*,
  case
    when rank <= 6 then 'title_contender'
    when rank <= 16 then 'dark_horse'
    when rank <= 32 then 'competitive'
    else 'underdog'
  end as tier,
  case
    when ranked."fifaRanking" - rank > 2 then 'up'
    when ranked."fifaRanking" - rank < -2 then 'down'
    else 'same'
  end as movement
from ranked;

create or replace view group_standings_current as
with latest as (
  select
    s.*,
    row_number() over (
      partition by s.competition_code, s.season_year, s.stage, s.group_code, s.team_id
      order by s.snapshot_at desc, s.updated_at desc, s.created_at desc
    ) as snapshot_rank
  from standings s
)
select
  latest.id,
  latest.competition_code,
  latest.competition_code as "competitionCode",
  latest.season_year,
  latest.season_year as "seasonYear",
  latest.stage,
  latest.group_code,
  latest.group_code as "group",
  latest.team_id,
  tp.slug as team_slug,
  tp.slug as "teamSlug",
  tp.name as team_name,
  tp.name as "teamName",
  tp.flag as team_flag,
  tp.flag as "teamFlag",
  tp.confederation,
  tp."fifaRanking",
  tp."coachName",
  tp.chemistry,
  tp.familiarity,
  tp.stability,
  tp.morale,
  latest.ranking,
  latest.played,
  latest.wins,
  latest.draws,
  latest.losses,
  latest.goals_for,
  latest.goals_for as "goalsFor",
  latest.goals_against,
  latest.goals_against as "goalsAgainst",
  latest.goal_difference,
  latest.goal_difference as "goalDifference",
  latest.points,
  latest.qualification_status,
  latest.qualification_status as "qualificationStatus",
  latest.tie_break_notes,
  latest.tie_break_notes as "tieBreakNotes",
  latest.snapshot_at,
  latest.snapshot_at as "snapshotAt",
  latest.source,
  latest.model_version,
  latest.model_version as "modelVersion",
  latest.facts_used,
  latest.facts_used as "factsUsed",
  latest.metadata,
  latest.created_at,
  latest.created_at as "createdAt",
  latest.updated_at,
  latest.updated_at as "updatedAt"
from latest
join team_profiles_current tp on tp.id = latest.team_id
where latest.snapshot_rank = 1;

create or replace view head_to_head_current as
with ordered as (
  select
    h.id,
    h.total_matches,
    h.draws,
    h.last_met_at,
    h.last_result,
    h.world_cup_meetings,
    h.notable_meetings,
    h.source,
    h.model_version,
    h.facts_used,
    h.metadata,
    h.created_at,
    h.updated_at,
    h.team_a_wins,
    h.team_b_wins,
    h.team_a_goals,
    h.team_b_goals,
    raw_team_a.id as raw_team_a_id,
    raw_team_a.slug as raw_team_a_slug,
    raw_team_a.name as raw_team_a_name,
    raw_team_a.flag as raw_team_a_flag,
    raw_team_b.id as raw_team_b_id,
    raw_team_b.slug as raw_team_b_slug,
    raw_team_b.name as raw_team_b_name,
    raw_team_b.flag as raw_team_b_flag,
    raw_team_a.slug <= raw_team_b.slug as team_a_is_canonical
  from head_to_head h
  join teams raw_team_a on raw_team_a.id = h.team_a_id
  join teams raw_team_b on raw_team_b.id = h.team_b_id
)
select
  ordered.id,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_id
    else ordered.raw_team_b_id
  end as team_a_id,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_id
    else ordered.raw_team_b_id
  end as "teamAId",
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_id
    else ordered.raw_team_a_id
  end as team_b_id,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_id
    else ordered.raw_team_a_id
  end as "teamBId",
  least(ordered.raw_team_a_slug, ordered.raw_team_b_slug) || '--' || greatest(ordered.raw_team_a_slug, ordered.raw_team_b_slug) as matchup_key,
  least(ordered.raw_team_a_slug, ordered.raw_team_b_slug) || '--' || greatest(ordered.raw_team_a_slug, ordered.raw_team_b_slug) as "matchupKey",
  least(ordered.raw_team_a_slug, ordered.raw_team_b_slug) || '-vs-' || greatest(ordered.raw_team_a_slug, ordered.raw_team_b_slug) as compare_slug,
  least(ordered.raw_team_a_slug, ordered.raw_team_b_slug) || '-vs-' || greatest(ordered.raw_team_a_slug, ordered.raw_team_b_slug) as "compareSlug",
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_slug
    else ordered.raw_team_b_slug
  end as team_a_slug,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_slug
    else ordered.raw_team_b_slug
  end as "teamASlug",
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_name
    else ordered.raw_team_b_name
  end as team_a_name,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_name
    else ordered.raw_team_b_name
  end as "teamAName",
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_flag
    else ordered.raw_team_b_flag
  end as team_a_flag,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_a_flag
    else ordered.raw_team_b_flag
  end as "teamAFlag",
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_slug
    else ordered.raw_team_a_slug
  end as team_b_slug,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_slug
    else ordered.raw_team_a_slug
  end as "teamBSlug",
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_name
    else ordered.raw_team_a_name
  end as team_b_name,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_name
    else ordered.raw_team_a_name
  end as "teamBName",
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_flag
    else ordered.raw_team_a_flag
  end as team_b_flag,
  case
    when ordered.team_a_is_canonical then ordered.raw_team_b_flag
    else ordered.raw_team_a_flag
  end as "teamBFlag",
  ordered.total_matches,
  ordered.total_matches as "totalMatches",
  case
    when ordered.team_a_is_canonical then ordered.team_a_wins
    else ordered.team_b_wins
  end as team_a_wins,
  case
    when ordered.team_a_is_canonical then ordered.team_a_wins
    else ordered.team_b_wins
  end as "teamAWins",
  ordered.draws,
  case
    when ordered.team_a_is_canonical then ordered.team_b_wins
    else ordered.team_a_wins
  end as team_b_wins,
  case
    when ordered.team_a_is_canonical then ordered.team_b_wins
    else ordered.team_a_wins
  end as "teamBWins",
  case
    when ordered.team_a_is_canonical then ordered.team_a_goals
    else ordered.team_b_goals
  end as team_a_goals,
  case
    when ordered.team_a_is_canonical then ordered.team_a_goals
    else ordered.team_b_goals
  end as "teamAGoals",
  case
    when ordered.team_a_is_canonical then ordered.team_b_goals
    else ordered.team_a_goals
  end as team_b_goals,
  case
    when ordered.team_a_is_canonical then ordered.team_b_goals
    else ordered.team_a_goals
  end as "teamBGoals",
  ordered.last_met_at,
  ordered.last_met_at as "lastMetAt",
  ordered.last_met_at as "lastMet",
  ordered.last_result,
  ordered.last_result as "lastResult",
  ordered.world_cup_meetings,
  ordered.world_cup_meetings as "worldCupMeetings",
  ordered.notable_meetings,
  ordered.notable_meetings as "notableMeetings",
  ordered.source,
  ordered.model_version,
  ordered.model_version as "modelVersion",
  ordered.facts_used,
  ordered.facts_used as "factsUsed",
  ordered.metadata,
  ordered.created_at,
  ordered.created_at as "createdAt",
  ordered.updated_at,
  ordered.updated_at as "updatedAt"
from ordered;

comment on view team_profiles_current is
  'Latest team-facing snapshot that combines the canonical team row with the most recent chemistry factors and frontend-friendly camelCase aliases.';
comment on view player_profiles_current is
  'Latest player-facing snapshot that combines the canonical roster row with the most recent intel payload and frontend-friendly camelCase aliases.';
comment on view match_fixtures_current is
  'Latest fixture-facing snapshot that combines canonical matches with resolved slugs/placeholders, the newest match-outcome prediction, and frontend-friendly camelCase aliases.';
comment on view signal_feed_current is
  'Latest signal-facing snapshot that resolves team/player context and exposes daily-briefing-friendly aliases including a team JSON object.';
comment on view power_rankings_current is
  'Latest power-ranking snapshot built from the current team profile and chemistry view, including powerScore, rank, tier, and movement.';
comment on view group_standings_current is
  'Latest group-standings snapshot per team, enriched with current team profile fields and frontend-friendly aliases.';
comment on view head_to_head_current is
  'Latest head-to-head snapshot per team pair, normalized to deterministic slug order so compare consumers get stable teamA/teamB aliases and matchup keys.';
