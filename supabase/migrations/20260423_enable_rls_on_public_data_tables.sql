-- Close Supabase Advisor `rls_disabled_in_public` findings for public data tables.
--
-- These tables are written by server-side ingestion/export jobs with the service
-- role key. Public clients only need read access to non-sensitive football data,
-- and only published editorial content should be readable.

do $$
declare
  target_table text;
  public_read_tables text[] := array[
    'football_teams',
    'football_players',
    'football_team_squads',
    'football_matches',
    'football_standings',
    'teams',
    'players',
    'team_name_aliases',
    'matches',
    'team_stats',
    'team_ratings',
    'standings',
    'head_to_head',
    'predictions',
    'team_chemistry',
    'signals',
    'player_intel',
    'prediction_markets',
    'prediction_leaderboard',
    'value_bets',
    'pk_community_stats',
    'pk_player_leaderboard'
  ];
  published_content_tables text[] := array[
    'narratives',
    'ai_content'
  ];
begin
  foreach target_table in array public_read_tables loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relkind in ('r', 'p')
    ) then
      execute format('alter table public.%I enable row level security', target_table);

      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = target_table
          and policyname = 'public_read'
      ) then
        execute format(
          'create policy public_read on public.%I for select using (true)',
          target_table
        );
      end if;
    end if;
  end loop;

  foreach target_table in array published_content_tables loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relkind in ('r', 'p')
    ) then
      execute format('alter table public.%I enable row level security', target_table);

      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = target_table
          and policyname = 'public_read_published'
      ) then
        execute format(
          'create policy public_read_published on public.%I for select using (status = ''published'')',
          target_table
        );
      end if;
    end if;
  end loop;
end $$;
