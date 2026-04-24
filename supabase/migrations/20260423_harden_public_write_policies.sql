-- Remove legacy public write policies that were named like service-role
-- policies but actually applied to the public role.
--
-- Supabase service-role requests bypass RLS, so server-side ingestion jobs do
-- not need permissive `for all using (true) with check (true)` policies. Keep
-- the public data surface read-only for browser clients.

do $$
declare
  target record;
  read_only_table text;
  read_only_tables text[] := array[
    'ai_content',
    'facts',
    'football_matches',
    'football_players',
    'football_standings',
    'football_team_squads',
    'football_teams',
    'head_to_head',
    'injury_status',
    'lineup_predictions',
    'matches',
    'narratives',
    'news_articles',
    'odds_snapshots',
    'player_daily_features',
    'player_intel',
    'players',
    'prediction_leaderboard',
    'prediction_markets',
    'prediction_scores',
    'predictions',
    'recent_form',
    'signals',
    'social_posts',
    'source_items',
    'squads',
    'standings',
    'team_chemistry',
    'team_daily_features',
    'team_name_aliases',
    'team_ratings',
    'team_stats',
    'teams',
    'value_bets'
  ];
begin
  for target in
    select *
    from (
      values
        ('facts', 'service_write_facts'),
        ('injury_status', 'service_write_injury_status'),
        ('lineup_predictions', 'service_write_lineup_predictions'),
        ('matches', 'service_write_matches'),
        ('news_articles', 'service_role_news'),
        ('odds_snapshots', 'srv_odds'),
        ('player_daily_features', 'service_write_player_daily_features'),
        ('players', 'service_write_players'),
        ('prediction_scores', 'srv_pred_scores'),
        ('predictions', 'service_write_predictions'),
        ('recent_form', 'srv_recent_form'),
        ('social_posts', 'service_role_social'),
        ('source_items', 'service_write_source_items'),
        ('squads', 'service_write_squads'),
        ('team_daily_features', 'service_write_team_daily_features'),
        ('teams', 'service_write_teams'),
        ('value_bets', 'srv_value_bets')
    ) as targets(table_name, policy_name)
  loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target.table_name
        and c.relkind in ('r', 'p')
    ) then
      execute format(
        'drop policy if exists %I on public.%I',
        target.policy_name,
        target.table_name
      );
    end if;
  end loop;

  foreach read_only_table in array read_only_tables loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = read_only_table
        and c.relkind in ('r', 'p')
    ) then
      execute format(
        'revoke insert, update, delete on table public.%I from anon, authenticated',
        read_only_table
      );
    end if;
  end loop;

  for target in
    select *
    from (
      values
        ('news_articles'),
        ('odds_snapshots'),
        ('recent_form'),
        ('social_posts')
    ) as targets(table_name)
  loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target.table_name
        and c.relkind in ('r', 'p')
    ) then
      execute format('alter table public.%I enable row level security', target.table_name);

      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = target.table_name
          and cmd = 'SELECT'
      ) then
        execute format(
          'create policy public_read on public.%I for select using (true)',
          target.table_name
        );
      end if;
    end if;
  end loop;
end $$;
