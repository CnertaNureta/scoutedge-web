-- Affiliate click tracking table
-- Tracks every CTA click for revenue attribution, A/B analysis, and partner reporting.

create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  partner_id text not null,
  match_id text,
  placement text not null,
  user_id uuid references auth.users(id),
  session_id text,
  country text,
  us_state text,
  ab_variant text
);

-- Index for common analytics queries
create index idx_affiliate_clicks_partner_id on affiliate_clicks(partner_id);
create index idx_affiliate_clicks_placement on affiliate_clicks(placement);
create index idx_affiliate_clicks_created_at on affiliate_clicks(created_at);

-- RLS: users can insert their own clicks, admins can read all
alter table affiliate_clicks enable row level security;

create policy "Anyone can insert affiliate clicks"
  on affiliate_clicks for insert
  with check (true);

create policy "Authenticated users can read own clicks"
  on affiliate_clicks for select
  using (auth.uid() = user_id);
