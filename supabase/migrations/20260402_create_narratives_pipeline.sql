create extension if not exists pgcrypto;

create or replace function set_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists narratives (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  content_type text not null check (content_type in ('match_preview', 'daily_briefing', 'team_narrative', 'player_narrative')),
  title text not null,
  summary text not null default '',
  slug text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published')),
  source_date date not null,
  match_key text,
  home_team_slug text,
  away_team_slug text,
  team_slug text,
  player_slug text,
  facts_used jsonb not null default '[]'::jsonb,
  fact_hash text not null,
  body_markdown text not null,
  meta jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table narratives add column if not exists summary text not null default '';
alter table narratives add column if not exists slug text;
alter table narratives add column if not exists source_date date;
alter table narratives add column if not exists match_key text;
alter table narratives add column if not exists home_team_slug text;
alter table narratives add column if not exists away_team_slug text;
alter table narratives add column if not exists team_slug text;
alter table narratives add column if not exists player_slug text;
alter table narratives add column if not exists facts_used jsonb not null default '[]'::jsonb;
alter table narratives add column if not exists fact_hash text;
alter table narratives add column if not exists body_markdown text;
alter table narratives add column if not exists meta jsonb not null default '{}'::jsonb;
alter table narratives add column if not exists approved_at timestamptz;
alter table narratives add column if not exists published_at timestamptz;
alter table narratives add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table narratives add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists narratives_cache_key_idx on narratives (cache_key);
create index if not exists narratives_content_status_idx on narratives (content_type, status, source_date desc);
create index if not exists narratives_match_key_idx on narratives (match_key);
create index if not exists narratives_slug_idx on narratives (slug);

drop trigger if exists narratives_set_updated_at on narratives;
create trigger narratives_set_updated_at
before update on narratives
for each row
execute function set_content_updated_at();

create table if not exists ai_content (
  id uuid primary key default gen_random_uuid(),
  source_narrative_id uuid references narratives(id) on delete set null,
  content_type text not null check (content_type in ('match_preview', 'daily_briefing', 'team_narrative', 'player_narrative')),
  title text not null,
  summary text not null default '',
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published')),
  full_content text not null,
  facts_used jsonb not null default '[]'::jsonb,
  related_team_ids text[] not null default '{}',
  related_player_ids text[] not null default '{}',
  source_date date not null,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table ai_content add column if not exists source_narrative_id uuid references narratives(id) on delete set null;
alter table ai_content add column if not exists summary text not null default '';
alter table ai_content add column if not exists facts_used jsonb not null default '[]'::jsonb;
alter table ai_content add column if not exists related_team_ids text[] not null default '{}';
alter table ai_content add column if not exists related_player_ids text[] not null default '{}';
alter table ai_content add column if not exists source_date date;
alter table ai_content add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table ai_content add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table ai_content add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists ai_content_slug_idx on ai_content (slug);
create index if not exists ai_content_content_status_idx on ai_content (content_type, status, source_date desc);
create index if not exists ai_content_narrative_idx on ai_content (source_narrative_id);

drop trigger if exists ai_content_set_updated_at on ai_content;
create trigger ai_content_set_updated_at
before update on ai_content
for each row
execute function set_content_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'narratives_facts_used_is_array'
  ) then
    alter table narratives
      add constraint narratives_facts_used_is_array
      check (jsonb_typeof(facts_used) = 'array');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_content_facts_used_is_array'
  ) then
    alter table ai_content
      add constraint ai_content_facts_used_is_array
      check (jsonb_typeof(facts_used) = 'array');
  end if;
end;
$$;
