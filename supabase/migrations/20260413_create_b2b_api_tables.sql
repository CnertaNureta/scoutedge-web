-- B2B Data API tables: api_keys, api_usage, api_usage_daily
-- Part of ZON-119 / ZON-111 (B2B API productization)

--------------------------------------------------------------------------------
-- api_keys: stores hashed API keys with tier-based rate limits
--------------------------------------------------------------------------------
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text,
  key_hash text not null,
  key_prefix text not null,
  name text not null default 'Default',
  tier text not null default 'basic'
    check (tier in ('basic', 'advanced', 'event', 'whitelabel')),
  rate_limit_per_minute int not null default 60,
  rate_limit_per_month int not null default 10000,
  is_active boolean not null default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_api_keys_key_hash on api_keys (key_hash);
create index if not exists idx_api_keys_user_id on api_keys (user_id);
create index if not exists idx_api_keys_active on api_keys (is_active) where is_active = true;

create trigger trg_api_keys_updated_at
  before update on api_keys
  for each row execute function update_updated_at();

--------------------------------------------------------------------------------
-- api_usage: per-request metering log
--------------------------------------------------------------------------------
create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references api_keys(id) on delete cascade,
  endpoint text not null,
  method text not null default 'GET',
  status_code int,
  response_time_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_usage_key_created
  on api_usage (api_key_id, created_at desc);

create index if not exists idx_api_usage_key_created_month
  on api_usage (api_key_id, created_at DESC);

--------------------------------------------------------------------------------
-- api_usage_daily: daily rollup for dashboard charts
--------------------------------------------------------------------------------
create table if not exists api_usage_daily (
  api_key_id uuid not null references api_keys(id) on delete cascade,
  date date not null,
  endpoint text not null,
  request_count int not null default 0,
  avg_response_time_ms int,
  error_count int not null default 0,
  primary key (api_key_id, date, endpoint)
);

create index if not exists idx_api_usage_daily_key_date
  on api_usage_daily (api_key_id, date desc);

--------------------------------------------------------------------------------
-- RLS: service_role only (no anon/authenticated direct access)
-- All access goes through the API middleware using the admin client
--------------------------------------------------------------------------------
alter table api_keys enable row level security;
alter table api_usage enable row level security;
alter table api_usage_daily enable row level security;

-- api_keys: service_role full access, authenticated users can read their own
create policy "service_role_api_keys"
  on api_keys for all
  to service_role
  using (true)
  with check (true);

create policy "users_read_own_api_keys"
  on api_keys for select
  to authenticated
  using (user_id = auth.uid());

-- api_usage: service_role can insert and read, users can read their own
create policy "service_role_api_usage"
  on api_usage for all
  to service_role
  using (true)
  with check (true);

create policy "users_read_own_api_usage"
  on api_usage for select
  to authenticated
  using (
    api_key_id in (
      select id from api_keys where user_id = auth.uid()
    )
  );

-- api_usage_daily: service_role full access, users can read their own
create policy "service_role_api_usage_daily"
  on api_usage_daily for all
  to service_role
  using (true)
  with check (true);

create policy "users_read_own_api_usage_daily"
  on api_usage_daily for select
  to authenticated
  using (
    api_key_id in (
      select id from api_keys where user_id = auth.uid()
    )
  );
