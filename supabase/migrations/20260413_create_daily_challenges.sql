-- Daily Challenge System
-- ZON-108: Drive DAU through 3-5 daily prediction questions with streak tracking

-- ============================================================
-- daily_challenges — one row per day's challenge set
-- ============================================================
create table daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  title text not null,
  description text,
  total_questions integer not null default 5,
  time_limit_minutes integer not null default 1440,
  is_active boolean not null default true,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dc_questions_range check (total_questions between 1 and 10),
  constraint dc_time_limit_positive check (time_limit_minutes > 0)
);

create index idx_daily_challenges_date on daily_challenges(challenge_date desc);
create index idx_daily_challenges_active on daily_challenges(is_active) where is_active;

drop trigger if exists daily_challenges_updated_at on daily_challenges;
create trigger daily_challenges_updated_at
before update on daily_challenges
for each row execute function update_updated_at();

alter table daily_challenges enable row level security;

create policy "daily_challenges_select" on daily_challenges
  for select using (true);

-- ============================================================
-- challenge_questions — individual questions within a daily set
-- ============================================================
create table challenge_questions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references daily_challenges(id) on delete cascade,
  question_order integer not null,
  question_type text not null,
  question_text text not null,
  match_id uuid references matches(id) on delete set null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  points integer not null default 10,
  difficulty text not null default 'medium',
  metadata jsonb not null default '{}'::jsonb,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint cq_order_positive check (question_order > 0),
  constraint cq_type_valid check (question_type in (
    'match_winner', 'exact_score', 'first_goalscorer',
    'over_under_goals', 'corners', 'possession', 'both_teams_score'
  )),
  constraint cq_difficulty_valid check (difficulty in ('easy', 'medium', 'hard')),
  constraint cq_points_positive check (points > 0),
  constraint cq_unique_order unique (challenge_id, question_order)
);

create index idx_cq_challenge on challenge_questions(challenge_id);
create index idx_cq_match on challenge_questions(match_id) where match_id is not null;

alter table challenge_questions enable row level security;

create policy "challenge_questions_select" on challenge_questions
  for select using (true);

-- ============================================================
-- user_challenge_attempts — user answers per question
-- ============================================================
create table user_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references daily_challenges(id) on delete cascade,
  question_id uuid not null references challenge_questions(id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean,
  points_earned integer not null default 0,
  submitted_at timestamptz not null default now(),
  constraint uca_unique unique (user_id, question_id),
  constraint uca_points_non_negative check (points_earned >= 0)
);

create index idx_uca_user on user_challenge_attempts(user_id);
create index idx_uca_challenge on user_challenge_attempts(challenge_id);
create index idx_uca_user_challenge on user_challenge_attempts(user_id, challenge_id);

alter table user_challenge_attempts enable row level security;

create policy "uca_select_own" on user_challenge_attempts
  for select using (auth.uid() = user_id);

create policy "uca_insert_own" on user_challenge_attempts
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- user_challenge_streaks — track consecutive daily completions
-- ============================================================
create table user_challenge_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_challenge_date date,
  total_challenges_completed integer not null default 0,
  total_points_earned integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint ucs_streak_non_negative check (current_streak >= 0),
  constraint ucs_longest_non_negative check (longest_streak >= 0),
  constraint ucs_total_non_negative check (total_challenges_completed >= 0),
  constraint ucs_points_non_negative check (total_points_earned >= 0)
);

create index idx_ucs_streak on user_challenge_streaks(current_streak desc);
create index idx_ucs_points on user_challenge_streaks(total_points_earned desc);

drop trigger if exists user_challenge_streaks_updated_at on user_challenge_streaks;
create trigger user_challenge_streaks_updated_at
before update on user_challenge_streaks
for each row execute function update_updated_at();

alter table user_challenge_streaks enable row level security;

create policy "ucs_select_all" on user_challenge_streaks
  for select using (true);

create policy "ucs_insert_own" on user_challenge_streaks
  for insert with check (auth.uid() = user_id);

create policy "ucs_update_own" on user_challenge_streaks
  for update using (auth.uid() = user_id);

-- ============================================================
-- challenge_leaderboard — materialized view for daily rankings
-- ============================================================
create materialized view if not exists challenge_leaderboard as
select
  ucs.user_id,
  up.display_name,
  up.avatar_url,
  up.favorite_team_slug,
  ucs.current_streak,
  ucs.longest_streak,
  ucs.total_challenges_completed,
  ucs.total_points_earned,
  rank() over (order by ucs.total_points_earned desc) as rank
from user_challenge_streaks ucs
join user_profiles up on up.id = ucs.user_id
where ucs.total_challenges_completed > 0;

create unique index idx_challenge_leaderboard_user on challenge_leaderboard(user_id);
create index idx_challenge_leaderboard_rank on challenge_leaderboard(rank);

-- ============================================================
-- Helper: settle a day's challenges and update streaks
-- ============================================================
create or replace function settle_daily_challenge(p_challenge_id uuid)
returns integer as $$
declare
  v_challenge_date date;
  v_user record;
  v_settled_count integer := 0;
begin
  select challenge_date into v_challenge_date
  from daily_challenges where id = p_challenge_id and not settled;

  if v_challenge_date is null then
    raise exception 'Challenge % is already settled or does not exist', p_challenge_id;
  end if;

  for v_user in
    select
      uca.user_id,
      count(*) filter (where uca.is_correct) as correct_count,
      sum(uca.points_earned) as day_points,
      count(*) as attempted
    from user_challenge_attempts uca
    where uca.challenge_id = p_challenge_id
    group by uca.user_id
  loop
    insert into user_challenge_streaks (user_id, current_streak, longest_streak, last_challenge_date, total_challenges_completed, total_points_earned)
    values (
      v_user.user_id,
      1,
      1,
      v_challenge_date,
      1,
      coalesce(v_user.day_points, 0)
    )
    on conflict (user_id) do update set
      current_streak = case
        when user_challenge_streaks.last_challenge_date = v_challenge_date - 1
        then user_challenge_streaks.current_streak + 1
        else 1
      end,
      longest_streak = greatest(
        user_challenge_streaks.longest_streak,
        case
          when user_challenge_streaks.last_challenge_date = v_challenge_date - 1
          then user_challenge_streaks.current_streak + 1
          else 1
        end
      ),
      last_challenge_date = v_challenge_date,
      total_challenges_completed = user_challenge_streaks.total_challenges_completed + 1,
      total_points_earned = user_challenge_streaks.total_points_earned + coalesce(v_user.day_points, 0);

    v_settled_count := v_settled_count + 1;
  end loop;

  update daily_challenges set settled = true where id = p_challenge_id;

  refresh materialized view concurrently challenge_leaderboard;

  return v_settled_count;
end;
$$ language plpgsql security definer;
