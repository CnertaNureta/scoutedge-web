-- Signals + player_intel pipeline tables for ScoutEdge player analysis.
-- `signals` stores normalized source observations.
-- `player_intel` stores the aggregated card consumed by narrative/player experiences.
-- When the broader ZON-6 core football schema already owns these tables,
-- this migration only applies the compatible RLS surface and skips legacy indexes.

create table if not exists signals (
  id text primary key,
  player_key text not null,
  player_slug text not null,
  player_name text not null,
  team_slug text not null,
  category text not null check (category in ('fitness', 'morale', 'tactical')),
  signal_type text not null check (signal_type in ('training', 'quote', 'data')),
  source_type text not null check (source_type in ('player_profile', 'social_post', 'derived_rule', 'seo_article')),
  source_key text not null,
  summary text not null,
  evidence text not null,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
  confidence numeric(4, 3) not null,
  weight numeric(5, 2) not null default 1,
  happened_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'signals'
      and column_name = 'player_key'
  ) then
    create unique index if not exists signals_player_source_key_idx
      on signals(player_key, source_key);

    create index if not exists signals_player_slug_idx
      on signals(player_key);

    create index if not exists signals_team_slug_idx
      on signals(team_slug);

    create index if not exists signals_category_idx
      on signals(category);

    create index if not exists signals_happened_at_idx
      on signals(happened_at desc);
  end if;
end
$$;

alter table signals enable row level security;

drop policy if exists "Public can read signals" on signals;
create policy "Public can read signals"
  on signals for select
  using (true);

create table if not exists player_intel (
  player_key text primary key,
  player_slug text not null,
  player_name text not null,
  team_slug text not null,
  fitness_status text not null check (fitness_status in ('green', 'amber', 'red')),
  fitness_note text not null,
  morale_score integer not null check (morale_score between 0 and 100),
  morale_label text not null check (morale_label in ('positive', 'neutral', 'negative')),
  tactical_risk text not null check (tactical_risk in ('low', 'medium', 'high')),
  tactical_note text not null,
  selection_risk text not null check (selection_risk in ('low', 'medium', 'high')),
  selection_note text not null,
  recent_signals jsonb not null default '[]'::jsonb,
  source_signal_ids jsonb not null default '[]'::jsonb,
  signal_count integer not null default 0,
  last_signal_at timestamptz,
  last_updated timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'player_intel'
      and column_name = 'team_slug'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'player_intel'
      and column_name = 'last_updated'
  ) then
    create index if not exists player_intel_team_slug_idx
      on player_intel(team_slug);

    create unique index if not exists player_intel_team_player_idx
      on player_intel(team_slug, player_slug);

    create index if not exists player_intel_last_updated_idx
      on player_intel(last_updated desc);
  end if;
end
$$;

alter table player_intel enable row level security;

drop policy if exists "Public can read player_intel" on player_intel;
create policy "Public can read player_intel"
  on player_intel for select
  using (true);

drop trigger if exists signals_updated_at on signals;
create trigger signals_updated_at
  before update on signals
  for each row execute function update_updated_at();
