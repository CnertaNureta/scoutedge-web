-- Fan identity cards and earned badges (ZON-109)

--------------------------------------------------------------------------------
-- user_fan_cards: persisted fan card data with shareable token
--------------------------------------------------------------------------------
create table if not exists user_fan_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  team_slug text not null,
  avatar text not null,
  theme text not null default 'classic'
    check (theme in ('classic', 'neon', 'gold', 'holographic', 'stadium')),
  badges text[] not null default '{}',
  predictions_count int not null default 0,
  accuracy numeric(5,2) not null default 0,
  fav_player text,
  share_token text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_fan_cards_user
  on user_fan_cards (user_id);

create unique index if not exists idx_fan_cards_share_token
  on user_fan_cards (share_token)
  where share_token is not null;

create trigger trg_fan_cards_updated_at
  before update on user_fan_cards
  for each row execute function update_updated_at();

--------------------------------------------------------------------------------
-- user_earned_badges: tracks how/when each badge was earned
--------------------------------------------------------------------------------
create table if not exists user_earned_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  source text not null default 'system'
    check (source in ('prediction', 'challenge', 'social', 'system', 'manual')),
  earned_at timestamptz not null default now()
);

create unique index if not exists idx_earned_badges_user_badge
  on user_earned_badges (user_id, badge_id);

create index if not exists idx_earned_badges_user
  on user_earned_badges (user_id);

--------------------------------------------------------------------------------
-- RLS
--------------------------------------------------------------------------------
alter table user_fan_cards enable row level security;
alter table user_earned_badges enable row level security;

-- Service role: full access
create policy "service_role_fan_cards"
  on user_fan_cards for all
  to service_role
  using (true)
  with check (true);

create policy "service_role_earned_badges"
  on user_earned_badges for all
  to service_role
  using (true)
  with check (true);

-- Users: CRUD their own card
create policy "users_manage_own_fan_card"
  on user_fan_cards for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Public: read shared cards
create policy "public_read_shared_fan_cards"
  on user_fan_cards for select
  to anon, authenticated
  using (is_public = true);

-- Users: read their own badges
create policy "users_read_own_badges"
  on user_earned_badges for select
  to authenticated
  using (user_id = auth.uid());

-- Service role inserts badges via triggers/functions
