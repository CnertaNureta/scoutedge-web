-- Prediction League + Leaderboard System
-- ZON-107: Core C-end gameplay for World Cup 2026
-- user_profiles is created in 20260413_001_create_user_profiles.sql

-- ============================================================
-- prediction_leagues (table only — RLS policies after league_members)
-- ============================================================
create table prediction_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  league_type text not null default 'public',
  invite_code text unique,
  tier text not null default 'free',
  max_members integer not null default 50,
  season text not null default '2026',
  logo_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leagues_type_valid check (league_type in ('public', 'private')),
  constraint leagues_tier_valid check (tier in ('free', 'premium', 'enterprise')),
  constraint leagues_name_not_blank check (btrim(name) <> ''),
  constraint leagues_max_members_positive check (max_members > 0 and max_members <= 10000)
);

create index idx_leagues_type on prediction_leagues(league_type) where is_active;
create index idx_leagues_created_by on prediction_leagues(created_by);
create index idx_leagues_invite_code on prediction_leagues(invite_code) where invite_code is not null;
create index idx_leagues_season on prediction_leagues(season);

drop trigger if exists prediction_leagues_updated_at on prediction_leagues;
create trigger prediction_leagues_updated_at
before update on prediction_leagues
for each row execute function update_updated_at();

alter table prediction_leagues enable row level security;

-- ============================================================
-- league_members (must exist before prediction_leagues RLS)
-- ============================================================
create table league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references prediction_leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  constraint league_members_unique unique (league_id, user_id),
  constraint league_members_role_valid check (role in ('owner', 'admin', 'member'))
);

create index idx_league_members_league on league_members(league_id);
create index idx_league_members_user on league_members(user_id);

alter table league_members enable row level security;

create policy "league_members_select" on league_members
  for select using (
    exists (
      select 1 from league_members lm
      where lm.league_id = league_members.league_id
      and lm.user_id = auth.uid()
    )
    or exists (
      select 1 from prediction_leagues pl
      where pl.id = league_members.league_id
      and pl.league_type = 'public'
    )
  );

create policy "league_members_insert" on league_members
  for insert with check (auth.uid() = user_id);

create policy "league_members_delete" on league_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from league_members lm
      where lm.league_id = league_members.league_id
      and lm.user_id = auth.uid()
      and lm.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- prediction_leagues RLS (now league_members exists)
-- ============================================================
create policy "leagues_select_public" on prediction_leagues
  for select using (league_type = 'public' or created_by = auth.uid());

create policy "leagues_select_member" on prediction_leagues
  for select using (
    exists (
      select 1 from league_members
      where league_members.league_id = prediction_leagues.id
      and league_members.user_id = auth.uid()
    )
  );

create policy "leagues_insert" on prediction_leagues
  for insert with check (auth.uid() = created_by);

create policy "leagues_update" on prediction_leagues
  for update using (auth.uid() = created_by);

-- ============================================================
-- user_match_predictions
-- ============================================================
create table user_match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  predicted_outcome text not null,
  predicted_home_score integer not null default 0,
  predicted_away_score integer not null default 0,
  confidence integer,
  submitted_at timestamptz not null default now(),
  locked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint user_predictions_unique unique (user_id, match_id),
  constraint user_predictions_outcome_valid check (predicted_outcome in ('home', 'draw', 'away')),
  constraint user_predictions_home_score_range check (predicted_home_score between 0 and 20),
  constraint user_predictions_away_score_range check (predicted_away_score between 0 and 20),
  constraint user_predictions_confidence_range check (confidence is null or confidence between 1 and 5),
  constraint user_predictions_outcome_consistent check (
    (predicted_outcome = 'home' and predicted_home_score > predicted_away_score)
    or (predicted_outcome = 'away' and predicted_away_score > predicted_home_score)
    or (predicted_outcome = 'draw' and predicted_home_score = predicted_away_score)
  )
);

create index idx_user_predictions_user on user_match_predictions(user_id);
create index idx_user_predictions_match on user_match_predictions(match_id);
create index idx_user_predictions_user_submitted on user_match_predictions(user_id, submitted_at desc);

drop trigger if exists user_match_predictions_updated_at on user_match_predictions;
create trigger user_match_predictions_updated_at
before update on user_match_predictions
for each row execute function update_updated_at();

alter table user_match_predictions enable row level security;

create policy "user_predictions_select_own" on user_match_predictions
  for select using (auth.uid() = user_id);

create policy "user_predictions_select_league" on user_match_predictions
  for select using (
    exists (
      select 1 from league_members lm1
      join league_members lm2 on lm1.league_id = lm2.league_id
      where lm1.user_id = auth.uid()
      and lm2.user_id = user_match_predictions.user_id
    )
    and exists (
      select 1 from matches m
      where m.id = user_match_predictions.match_id
      and m.match_status = 'finished'
    )
  );

create policy "user_predictions_insert" on user_match_predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id
      and m.match_status = 'scheduled'
      and m.kickoff_utc > now()
    )
  );

create policy "user_predictions_update" on user_match_predictions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from matches m
      where m.id = match_id
      and m.match_status = 'scheduled'
      and m.kickoff_utc > now()
    )
  );

-- ============================================================
-- prediction_scores
-- ============================================================
create table prediction_scores (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null unique references user_match_predictions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  points_awarded integer not null default 0,
  accuracy_type text not null,
  bonus_points integer not null default 0,
  actual_home_score integer not null,
  actual_away_score integer not null,
  scored_at timestamptz not null default now(),
  constraint scores_accuracy_valid check (accuracy_type in ('exact_score', 'correct_outcome_diff', 'correct_outcome', 'wrong')),
  constraint scores_points_non_negative check (points_awarded >= 0),
  constraint scores_bonus_non_negative check (bonus_points >= 0)
);

create index idx_prediction_scores_user on prediction_scores(user_id);
create index idx_prediction_scores_match on prediction_scores(match_id);
create index idx_prediction_scores_user_points on prediction_scores(user_id, points_awarded desc);

alter table prediction_scores enable row level security;

create policy "scores_select" on prediction_scores
  for select using (true);

-- ============================================================
-- league_standings (materialized view for fast leaderboard)
-- ============================================================
create materialized view if not exists league_standings as
select
  lm.league_id,
  lm.user_id,
  up.display_name,
  up.avatar_url,
  coalesce(sum(ps.points_awarded + ps.bonus_points), 0) as total_points,
  count(ps.id) filter (where ps.accuracy_type != 'wrong') as correct_predictions,
  count(ps.id) filter (where ps.accuracy_type = 'exact_score') as exact_scores,
  count(ps.id) as total_predictions,
  rank() over (
    partition by lm.league_id
    order by coalesce(sum(ps.points_awarded + ps.bonus_points), 0) desc
  ) as rank
from league_members lm
join user_profiles up on up.id = lm.user_id
left join prediction_scores ps on ps.user_id = lm.user_id
group by lm.league_id, lm.user_id, up.display_name, up.avatar_url;

create unique index idx_league_standings_lookup on league_standings(league_id, user_id);
create index idx_league_standings_rank on league_standings(league_id, rank);

-- ============================================================
-- global_leaderboard (materialized view)
-- ============================================================
create materialized view if not exists global_leaderboard as
select
  up.id as user_id,
  up.display_name,
  up.avatar_url,
  up.favorite_team_slug,
  coalesce(sum(ps.points_awarded + ps.bonus_points), 0) as total_points,
  count(ps.id) filter (where ps.accuracy_type != 'wrong') as correct_predictions,
  count(ps.id) filter (where ps.accuracy_type = 'exact_score') as exact_scores,
  count(ps.id) as total_predictions,
  case when count(ps.id) > 0
    then round(100.0 * count(ps.id) filter (where ps.accuracy_type != 'wrong') / count(ps.id), 1)
    else 0
  end as accuracy_pct,
  rank() over (
    order by coalesce(sum(ps.points_awarded + ps.bonus_points), 0) desc
  ) as rank
from user_profiles up
left join prediction_scores ps on ps.user_id = up.id
group by up.id, up.display_name, up.avatar_url, up.favorite_team_slug;

create unique index idx_global_leaderboard_user on global_leaderboard(user_id);
create index idx_global_leaderboard_rank on global_leaderboard(rank);

-- ============================================================
-- Helper: refresh leaderboard views
-- ============================================================
create or replace function refresh_leaderboards()
returns void as $$
begin
  refresh materialized view concurrently league_standings;
  refresh materialized view concurrently global_leaderboard;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Helper: score a single match's predictions
-- ============================================================
create or replace function score_match_predictions(p_match_id uuid)
returns integer as $$
declare
  v_home_score integer;
  v_away_score integer;
  v_actual_outcome text;
  v_scored_count integer := 0;
  v_pred record;
  v_accuracy text;
  v_points integer;
begin
  select home_score, away_score into v_home_score, v_away_score
  from matches where id = p_match_id and match_status = 'finished';

  if v_home_score is null then
    raise exception 'Match % is not finished or does not exist', p_match_id;
  end if;

  if v_home_score > v_away_score then v_actual_outcome := 'home';
  elsif v_away_score > v_home_score then v_actual_outcome := 'away';
  else v_actual_outcome := 'draw';
  end if;

  for v_pred in
    select ump.*
    from user_match_predictions ump
    where ump.match_id = p_match_id
    and not exists (
      select 1 from prediction_scores ps where ps.prediction_id = ump.id
    )
  loop
    if v_pred.predicted_home_score = v_home_score
       and v_pred.predicted_away_score = v_away_score then
      v_accuracy := 'exact_score';
      v_points := 10;
    elsif v_pred.predicted_outcome = v_actual_outcome
          and (v_pred.predicted_home_score - v_pred.predicted_away_score)
              = (v_home_score - v_away_score) then
      v_accuracy := 'correct_outcome_diff';
      v_points := 5;
    elsif v_pred.predicted_outcome = v_actual_outcome then
      v_accuracy := 'correct_outcome';
      v_points := 3;
    else
      v_accuracy := 'wrong';
      v_points := 0;
    end if;

    insert into prediction_scores (prediction_id, user_id, match_id, points_awarded, accuracy_type, bonus_points, actual_home_score, actual_away_score)
    values (v_pred.id, v_pred.user_id, p_match_id, v_points, v_accuracy, 0, v_home_score, v_away_score);

    v_scored_count := v_scored_count + 1;
  end loop;

  perform refresh_leaderboards();

  return v_scored_count;
end;
$$ language plpgsql security definer;
