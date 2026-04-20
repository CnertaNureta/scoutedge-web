-- Virtual Points System + Store
-- ZON-110: ScoutCoins — earn through predictions/challenges/check-ins, redeem in store

-- ============================================================
-- Custom ENUM types
-- ============================================================
create type point_transaction_type as enum (
  'prediction_correct',
  'prediction_exact',
  'challenge_correct',
  'checkin',
  'checkin_streak_bonus',
  'invite_reward',
  'booster_purchase',
  'store_redemption',
  'first_prediction_bonus',
  'first_challenge_bonus',
  'admin_adjustment'
);

create type store_item_category as enum (
  'premium_trial',
  'wallpaper',
  'ai_credits',
  'badge',
  'booster'
);

create type store_order_status as enum (
  'completed',
  'pending',
  'failed',
  'refunded'
);

create type inventory_status as enum (
  'active',
  'used',
  'expired'
);

-- ============================================================
-- point_balances — current balance per user (one row per user)
-- ============================================================
create table point_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  lifetime_earned integer not null default 0,
  lifetime_spent integer not null default 0,
  current_streak_days integer not null default 0,
  last_checkin_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pb_balance_non_negative check (balance >= 0),
  constraint pb_lifetime_earned_non_negative check (lifetime_earned >= 0),
  constraint pb_lifetime_spent_non_negative check (lifetime_spent >= 0),
  constraint pb_streak_non_negative check (current_streak_days >= 0)
);

drop trigger if exists point_balances_updated_at on point_balances;
create trigger point_balances_updated_at
before update on point_balances
for each row execute function update_updated_at();

alter table point_balances enable row level security;

create policy "point_balances_select_own" on point_balances
  for select using (auth.uid() = user_id);

create policy "point_balances_select_leaderboard" on point_balances
  for select using (true);

-- ============================================================
-- point_transactions — immutable ledger of all point changes
-- ============================================================
create table point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  balance_after integer not null,
  type point_transaction_type not null,
  reference_id uuid,
  description text not null default '',
  created_at timestamptz not null default now(),
  constraint pt_nonzero_amount check (amount <> 0)
);

create index idx_point_transactions_user on point_transactions(user_id, created_at desc);
create index idx_point_transactions_type on point_transactions(type);
create index idx_point_transactions_ref on point_transactions(reference_id) where reference_id is not null;

alter table point_transactions enable row level security;

create policy "point_transactions_select_own" on point_transactions
  for select using (auth.uid() = user_id);

-- ============================================================
-- store_items — catalog of purchasable items
-- ============================================================
create table store_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category store_item_category not null,
  point_cost integer not null default 0,
  stripe_price_id text,
  real_money_cents integer,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  stock integer,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint si_point_cost_non_negative check (point_cost >= 0),
  constraint si_real_money_non_negative check (real_money_cents is null or real_money_cents >= 0),
  constraint si_stock_non_negative check (stock is null or stock >= 0)
);

create index idx_store_items_category on store_items(category) where is_active;
create index idx_store_items_sort on store_items(sort_order, created_at);

drop trigger if exists store_items_updated_at on store_items;
create trigger store_items_updated_at
before update on store_items
for each row execute function update_updated_at();

alter table store_items enable row level security;

create policy "store_items_select_active" on store_items
  for select using (is_active = true);

-- ============================================================
-- store_orders — purchase history
-- ============================================================
create table store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references store_items(id) on delete restrict,
  point_cost integer not null default 0,
  stripe_payment_intent_id text,
  status store_order_status not null default 'pending',
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint so_point_cost_non_negative check (point_cost >= 0)
);

create index idx_store_orders_user on store_orders(user_id, created_at desc);
create index idx_store_orders_status on store_orders(status) where status = 'pending';
create index idx_store_orders_stripe on store_orders(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

alter table store_orders enable row level security;

create policy "store_orders_select_own" on store_orders
  for select using (auth.uid() = user_id);

-- ============================================================
-- user_inventory — owned items / active perks
-- ============================================================
create table user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references store_items(id) on delete restrict,
  order_id uuid not null references store_orders(id) on delete restrict,
  status inventory_status not null default 'active',
  expires_at timestamptz,
  activated_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_user_inventory_user on user_inventory(user_id, status);
create index idx_user_inventory_active on user_inventory(user_id, item_id) where status = 'active';
create index idx_user_inventory_expires on user_inventory(expires_at) where status = 'active' and expires_at is not null;

drop trigger if exists user_inventory_updated_at on user_inventory;
create trigger user_inventory_updated_at
before update on user_inventory
for each row execute function update_updated_at();

alter table user_inventory enable row level security;

create policy "user_inventory_select_own" on user_inventory
  for select using (auth.uid() = user_id);

-- ============================================================
-- invite_codes — referral system for invite rewards
-- ============================================================
create table invite_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  uses integer not null default 0,
  max_uses integer not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ic_uses_non_negative check (uses >= 0),
  constraint ic_max_uses_positive check (max_uses > 0)
);

create index idx_invite_codes_code on invite_codes(code) where is_active;
create index idx_invite_codes_user on invite_codes(user_id);

alter table invite_codes enable row level security;

create policy "invite_codes_select_own" on invite_codes
  for select using (auth.uid() = user_id);

-- ============================================================
-- invite_redemptions — tracks who used whose invite code
-- ============================================================
create table invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_code_id uuid not null references invite_codes(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid not null references auth.users(id) on delete cascade,
  points_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ir_unique_invitee unique (invitee_user_id)
);

create index idx_invite_redemptions_inviter on invite_redemptions(inviter_user_id);

alter table invite_redemptions enable row level security;

create policy "invite_redemptions_select_own" on invite_redemptions
  for select using (auth.uid() = inviter_user_id or auth.uid() = invitee_user_id);

-- ============================================================
-- RPC: earn_points — atomic balance update + transaction insert
-- ============================================================
create or replace function earn_points(
  p_user_id uuid,
  p_amount integer,
  p_type point_transaction_type,
  p_reference_id uuid default null,
  p_description text default ''
) returns integer
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
  v_multiplier integer := 1;
  v_final_amount integer;
begin
  if p_amount <= 0 then
    raise exception 'earn_points amount must be positive';
  end if;

  -- Check for active booster
  select coalesce(
    (select (si.metadata->>'multiplier')::integer
     from user_inventory ui
     join store_items si on si.id = ui.item_id
     where ui.user_id = p_user_id
       and ui.status = 'active'
       and si.category = 'booster'
       and (ui.expires_at is null or ui.expires_at > now())
     order by (si.metadata->>'multiplier')::integer desc
     limit 1),
    1
  ) into v_multiplier;

  v_final_amount := p_amount * v_multiplier;

  -- Upsert balance
  insert into point_balances (user_id, balance, lifetime_earned)
  values (p_user_id, v_final_amount, v_final_amount)
  on conflict (user_id)
  do update set
    balance = point_balances.balance + v_final_amount,
    lifetime_earned = point_balances.lifetime_earned + v_final_amount;

  select balance into v_new_balance
  from point_balances where user_id = p_user_id;

  -- Record transaction
  insert into point_transactions (user_id, amount, balance_after, type, reference_id, description)
  values (p_user_id, v_final_amount, v_new_balance, p_type, p_reference_id, p_description);

  return v_new_balance;
end;
$$;

-- ============================================================
-- RPC: spend_points — atomic deduction with balance check
-- ============================================================
create or replace function spend_points(
  p_user_id uuid,
  p_amount integer,
  p_type point_transaction_type,
  p_reference_id uuid default null,
  p_description text default ''
) returns integer
language plpgsql
security definer
as $$
declare
  v_current_balance integer;
  v_new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'spend_points amount must be positive';
  end if;

  select balance into v_current_balance
  from point_balances where user_id = p_user_id
  for update;

  if v_current_balance is null then
    raise exception 'User has no point balance';
  end if;

  if v_current_balance < p_amount then
    raise exception 'Insufficient balance: have %, need %', v_current_balance, p_amount;
  end if;

  v_new_balance := v_current_balance - p_amount;

  update point_balances
  set balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount
  where user_id = p_user_id;

  insert into point_transactions (user_id, amount, balance_after, type, reference_id, description)
  values (p_user_id, -p_amount, v_new_balance, p_type, p_reference_id, p_description);

  return v_new_balance;
end;
$$;

-- ============================================================
-- RPC: daily_checkin — idempotent daily check-in with streaks
-- ============================================================
create or replace function daily_checkin(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_today date := current_date;
  v_last_checkin date;
  v_streak integer;
  v_base_points integer := 10;
  v_bonus_points integer := 0;
  v_total_points integer;
  v_new_balance integer;
  v_bonus_description text := '';
begin
  -- Get or create balance row
  insert into point_balances (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select last_checkin_date, current_streak_days
  into v_last_checkin, v_streak
  from point_balances
  where user_id = p_user_id
  for update;

  -- Already checked in today
  if v_last_checkin = v_today then
    return jsonb_build_object(
      'success', false,
      'reason', 'already_checked_in',
      'streak', v_streak
    );
  end if;

  -- Calculate streak
  if v_last_checkin = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;

  -- Streak bonuses
  if v_streak > 0 and v_streak % 30 = 0 then
    v_bonus_points := 500;
    v_bonus_description := '30-day streak bonus!';
  elsif v_streak > 0 and v_streak % 14 = 0 then
    v_bonus_points := 150;
    v_bonus_description := '14-day streak bonus!';
  elsif v_streak > 0 and v_streak % 7 = 0 then
    v_bonus_points := 50;
    v_bonus_description := '7-day streak bonus!';
  end if;

  -- Update streak info
  update point_balances
  set last_checkin_date = v_today,
      current_streak_days = v_streak
  where user_id = p_user_id;

  -- Award base check-in points
  v_new_balance := earn_points(p_user_id, v_base_points, 'checkin', null, 'Daily check-in');

  -- Award streak bonus if applicable
  if v_bonus_points > 0 then
    v_new_balance := earn_points(p_user_id, v_bonus_points, 'checkin_streak_bonus', null, v_bonus_description);
  end if;

  v_total_points := v_base_points + v_bonus_points;

  return jsonb_build_object(
    'success', true,
    'points_earned', v_total_points,
    'base_points', v_base_points,
    'bonus_points', v_bonus_points,
    'bonus_description', v_bonus_description,
    'streak', v_streak,
    'new_balance', v_new_balance
  );
end;
$$;

-- ============================================================
-- RPC: purchase_store_item — atomic point spend + order + inventory
-- ============================================================
create or replace function purchase_store_item(
  p_user_id uuid,
  p_item_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_item store_items%rowtype;
  v_new_balance integer;
  v_order_id uuid;
  v_inventory_id uuid;
  v_expires_at timestamptz;
begin
  -- Lock and fetch item
  select * into v_item
  from store_items
  where id = p_item_id and is_active = true
  for update;

  if not found then
    raise exception 'Item not found or inactive';
  end if;

  -- Real-money items can't be purchased with points
  if v_item.real_money_cents is not null and v_item.real_money_cents > 0 then
    raise exception 'This item requires real money purchase via Stripe';
  end if;

  -- Check stock
  if v_item.stock is not null and v_item.stock <= 0 then
    raise exception 'Item out of stock';
  end if;

  -- Spend points
  v_new_balance := spend_points(p_user_id, v_item.point_cost, 'store_redemption', p_item_id, 'Purchased: ' || v_item.name);

  -- Decrement stock
  if v_item.stock is not null then
    update store_items set stock = stock - 1 where id = p_item_id;
  end if;

  -- Calculate expiry for time-limited items
  if v_item.category = 'premium_trial' then
    v_expires_at := now() + ((v_item.metadata->>'trial_days')::integer || ' days')::interval;
  elsif v_item.category = 'booster' then
    v_expires_at := now() + ((v_item.metadata->>'duration_hours')::integer || ' hours')::interval;
  end if;

  -- Create order
  insert into store_orders (user_id, item_id, point_cost, status, fulfilled_at)
  values (p_user_id, p_item_id, v_item.point_cost, 'completed', now())
  returning id into v_order_id;

  -- Create inventory entry
  insert into user_inventory (user_id, item_id, order_id, status, expires_at)
  values (p_user_id, p_item_id, v_order_id, 'active', v_expires_at)
  returning id into v_inventory_id;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'inventory_id', v_inventory_id,
    'item_name', v_item.name,
    'points_spent', v_item.point_cost,
    'new_balance', v_new_balance,
    'expires_at', v_expires_at
  );
end;
$$;

-- ============================================================
-- Points leaderboard materialized view
-- ============================================================
create materialized view if not exists points_leaderboard as
select
  pb.user_id,
  up.display_name,
  up.avatar_url,
  pb.balance,
  pb.lifetime_earned,
  pb.current_streak_days,
  rank() over (order by pb.lifetime_earned desc) as rank
from point_balances pb
left join user_profiles up on up.id = pb.user_id
where pb.lifetime_earned > 0
order by pb.lifetime_earned desc
limit 100;

create unique index idx_points_leaderboard_user on points_leaderboard(user_id);

-- ============================================================
-- Seed store items
-- ============================================================
insert into store_items (slug, name, description, category, point_cost, image_url, metadata, sort_order) values
  ('premium-trial-3d', '3-Day Premium Trial', 'Unlock all premium features for 3 days — match previews, AI insights, and exclusive analysis.', 'premium_trial', 500, '/images/store/premium-3d.png', '{"trial_days": 3}'::jsonb, 10),
  ('premium-trial-7d', '7-Day Premium Trial', 'A full week of premium access — dive deep into every match with AI-powered intelligence.', 'premium_trial', 1000, '/images/store/premium-7d.png', '{"trial_days": 7}'::jsonb, 20),
  ('ai-analysis-1', 'AI Deep Analysis', 'Get a Claude-powered deep analysis for any upcoming match — tactics, key players, and predictions.', 'ai_credits', 300, '/images/store/ai-analysis.png', '{"credit_amount": 1}'::jsonb, 30),
  ('ai-analysis-5', 'AI Analysis 5-Pack', 'Five AI deep analyses at a discount. Use them on the matches that matter most.', 'ai_credits', 1200, '/images/store/ai-analysis-5.png', '{"credit_amount": 5}'::jsonb, 40),
  ('wallpaper-team', 'Team Wallpaper Pack', 'High-resolution World Cup 2026 team wallpapers — phone and desktop sizes.', 'wallpaper', 200, '/images/store/wallpaper-pack.png', '{"pack_type": "team"}'::jsonb, 50),
  ('fan-card-theme', 'Premium Fan Card Theme', 'Unlock an exclusive premium theme for your ScoutEdge Fan Card.', 'badge', 400, '/images/store/fan-card-theme.png', '{"theme_id": "premium_gold"}'::jsonb, 60);

insert into store_items (slug, name, description, category, point_cost, real_money_cents, stripe_price_id, image_url, metadata, is_featured, sort_order) values
  ('booster-2x-24h', 'Point Booster 2x (24h)', 'Double all points earned for the next 24 hours. Stack predictions and challenges for maximum impact!', 'booster', 0, 499, null, '/images/store/booster-2x.png', '{"multiplier": 2, "duration_hours": 24}'::jsonb, true, 70),
  ('booster-3x-48h', 'Point Booster 3x (48h)', 'Triple your point earnings for 48 hours. Perfect for match-day weekends!', 'booster', 0, 999, null, '/images/store/booster-3x.png', '{"multiplier": 3, "duration_hours": 48}'::jsonb, true, 80),
  ('booster-5x-7d', 'Point Booster 5x (7 days)', 'The ultimate booster — 5x points for an entire week. Climb the leaderboard fast.', 'booster', 0, 1499, null, '/images/store/booster-5x.png', '{"multiplier": 5, "duration_hours": 168}'::jsonb, true, 90);

-- ============================================================
-- Function to expire inventory items (run via cron)
-- ============================================================
create or replace function expire_inventory_items()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update user_inventory
  set status = 'expired'
  where status = 'active'
    and expires_at is not null
    and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
