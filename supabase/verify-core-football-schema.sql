-- Run after applying the ZON-6 migrations to an empty or disposable database:
--   psql "$DATABASE_URL" -f supabase/verify-core-football-schema.sql

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = current_schema()
      and p.proname = 'update_updated_at'
  ) then
    raise exception 'Missing helper function %.update_updated_at()', current_schema();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = current_schema()
      and p.proname = 'player_recent_signals_are_valid'
  ) then
    raise exception 'Missing helper function %.player_recent_signals_are_valid(jsonb)', current_schema();
  end if;
end;
$$;

do $$
declare
  missing_tables text[];
begin
  select array_agg(required.name order by required.name)
  into missing_tables
  from (
    values
      ('teams'),
      ('players'),
      ('team_stats'),
      ('matches'),
      ('standings'),
      ('head_to_head'),
      ('predictions'),
      ('team_chemistry'),
      ('player_intel'),
      ('signals'),
      ('narratives')
  ) as required(name)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = current_schema()
      and t.table_name = required.name
  );

  if missing_tables is not null then
    raise exception 'Missing required tables: %', array_to_string(missing_tables, ', ');
  end if;
end;
$$;

do $$
declare
  missing_indexes text[];
begin
  select array_agg(required.name order by required.name)
  into missing_indexes
  from (
    values
      ('idx_teams_source_external_id'),
      ('idx_teams_elo_rank'),
      ('idx_players_team_position'),
      ('idx_team_stats_scope_date'),
      ('idx_matches_round_kickoff'),
      ('idx_matches_unique_fixture'),
      ('idx_standings_group_snapshot'),
      ('idx_head_to_head_pair'),
      ('idx_predictions_match_generated'),
      ('idx_team_chemistry_team_date'),
      ('idx_player_intel_last_signal_at'),
      ('idx_signals_impact_signal_at'),
      ('idx_narratives_competition_type_published')
  ) as required(name)
  where not exists (
    select 1
    from pg_indexes i
    where i.schemaname = current_schema()
      and i.indexname = required.name
  );

  if missing_indexes is not null then
    raise exception 'Missing required indexes: %', array_to_string(missing_indexes, ', ');
  end if;
end;
$$;

do $$
declare
  missing_foreign_keys text[];
begin
  select array_agg(required.label order by required.label)
  into missing_foreign_keys
  from (
    values
      ('players.team_id -> teams.id', 'players', 'team_id', 'teams', 'id'),
      ('team_stats.team_id -> teams.id', 'team_stats', 'team_id', 'teams', 'id'),
      ('matches.home_team_id -> teams.id', 'matches', 'home_team_id', 'teams', 'id'),
      ('matches.away_team_id -> teams.id', 'matches', 'away_team_id', 'teams', 'id'),
      ('standings.team_id -> teams.id', 'standings', 'team_id', 'teams', 'id'),
      ('head_to_head.team_a_id -> teams.id', 'head_to_head', 'team_a_id', 'teams', 'id'),
      ('head_to_head.team_b_id -> teams.id', 'head_to_head', 'team_b_id', 'teams', 'id'),
      ('predictions.match_id -> matches.id', 'predictions', 'match_id', 'matches', 'id'),
      ('team_chemistry.team_id -> teams.id', 'team_chemistry', 'team_id', 'teams', 'id'),
      ('player_intel.player_id -> players.id', 'player_intel', 'player_id', 'players', 'id'),
      ('signals.team_id -> teams.id', 'signals', 'team_id', 'teams', 'id'),
      ('signals.player_id -> players.id', 'signals', 'player_id', 'players', 'id'),
      ('signals.match_id -> matches.id', 'signals', 'match_id', 'matches', 'id'),
      ('narratives.team_id -> teams.id', 'narratives', 'team_id', 'teams', 'id'),
      ('narratives.player_id -> players.id', 'narratives', 'player_id', 'players', 'id'),
      ('narratives.match_id -> matches.id', 'narratives', 'match_id', 'matches', 'id')
  ) as required(label, table_name, column_name, ref_table_name, ref_column_name)
  where not exists (
    select 1
    from pg_constraint c
    join pg_class src on src.oid = c.conrelid
    join pg_namespace src_n on src_n.oid = src.relnamespace
    join pg_class ref on ref.oid = c.confrelid
    join pg_namespace ref_n on ref_n.oid = ref.relnamespace
    join unnest(c.conkey) with ordinality as src_cols(attnum, ord) on true
    join pg_attribute src_att on src_att.attrelid = src.oid and src_att.attnum = src_cols.attnum
    join unnest(c.confkey) with ordinality as ref_cols(attnum, ord) on ref_cols.ord = src_cols.ord
    join pg_attribute ref_att on ref_att.attrelid = ref.oid and ref_att.attnum = ref_cols.attnum
    where c.contype = 'f'
      and src_n.nspname = current_schema()
      and ref_n.nspname = current_schema()
      and src.relname = required.table_name
      and src_att.attname = required.column_name
      and ref.relname = required.ref_table_name
      and ref_att.attname = required.ref_column_name
  );

  if missing_foreign_keys is not null then
    raise exception 'Missing required foreign keys: %', array_to_string(missing_foreign_keys, ', ');
  end if;
end;
$$;

do $$
declare
  missing_unique_keys text[];
begin
  select array_agg(required.label order by required.label)
  into missing_unique_keys
  from (
    values
      ('teams.slug', 'teams', array['slug']::text[]),
      ('players.team_id,slug', 'players', array['team_id', 'slug']::text[]),
      (
        'team_stats.team_id,competition_code,season_year,stat_scope,as_of_date,model_version',
        'team_stats',
        array['team_id', 'competition_code', 'season_year', 'stat_scope', 'as_of_date', 'model_version']::text[]
      ),
      (
        'standings.competition_code,season_year,stage,group_code,team_id,snapshot_at,model_version',
        'standings',
        array['competition_code', 'season_year', 'stage', 'group_code', 'team_id', 'snapshot_at', 'model_version']::text[]
      ),
      (
        'predictions.match_id,prediction_type,model_version,generated_at',
        'predictions',
        array['match_id', 'prediction_type', 'model_version', 'generated_at']::text[]
      ),
      (
        'team_chemistry.team_id,competition_code,season_year,snapshot_date,model_version',
        'team_chemistry',
        array['team_id', 'competition_code', 'season_year', 'snapshot_date', 'model_version']::text[]
      ),
      (
        'player_intel.player_id,captured_at,model_version',
        'player_intel',
        array['player_id', 'captured_at', 'model_version']::text[]
      ),
      ('narratives.slug', 'narratives', array['slug']::text[])
  ) as required(label, table_name, column_names)
  where not exists (
    select 1
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace n on n.oid = cls.relnamespace
    join lateral (
      select array_agg(att.attname::text order by cols.ord) as actual_columns
      from unnest(c.conkey) with ordinality as cols(attnum, ord)
      join pg_attribute att on att.attrelid = cls.oid and att.attnum = cols.attnum
    ) actual on true
    where c.contype = 'u'
      and n.nspname = current_schema()
      and cls.relname = required.table_name
      and actual.actual_columns = required.column_names
  );

  if missing_unique_keys is not null then
    raise exception 'Missing required unique keys: %', array_to_string(missing_unique_keys, ', ');
  end if;
end;
$$;

do $$
declare
  missing_check_constraints text[];
begin
  select array_agg(required.label order by required.label)
  into missing_check_constraints
  from (
    values
      ('player_intel.recent_signals shape', 'player_intel', 'player_intel_recent_signals_valid'),
      ('signals.signal_type enum', 'signals', 'signals_signal_type_valid')
  ) as required(label, table_name, constraint_name)
  where not exists (
    select 1
    from pg_constraint c
    join pg_class cls on cls.oid = c.conrelid
    join pg_namespace n on n.oid = cls.relnamespace
    where c.contype = 'c'
      and n.nspname = current_schema()
      and cls.relname = required.table_name
      and c.conname = required.constraint_name
  );

  if missing_check_constraints is not null then
    raise exception 'Missing required check constraints: %', array_to_string(missing_check_constraints, ', ');
  end if;
end;
$$;

do $$
declare
  missing_views text[];
begin
  select array_agg(required.name order by required.name)
  into missing_views
  from (
    values
      ('team_profiles_current'),
      ('player_profiles_current'),
      ('match_fixtures_current'),
      ('signal_feed_current'),
      ('power_rankings_current'),
      ('group_standings_current'),
      ('head_to_head_current')
  ) as required(name)
  where not exists (
    select 1
    from information_schema.views v
    where v.table_schema = current_schema()
      and v.table_name = required.name
  );

  if missing_views is not null then
    raise exception 'Missing required compatibility views: %', array_to_string(missing_views, ', ');
  end if;
end;
$$;

do $$
declare
  missing_triggers text[];
begin
  select array_agg(required.name order by required.name)
  into missing_triggers
  from (
    values
      ('teams_updated_at'),
      ('players_updated_at'),
      ('team_stats_updated_at'),
      ('matches_updated_at'),
      ('standings_updated_at'),
      ('head_to_head_updated_at'),
      ('predictions_updated_at'),
      ('team_chemistry_updated_at'),
      ('player_intel_updated_at'),
      ('signals_updated_at'),
      ('narratives_updated_at')
  ) as required(name)
  where not exists (
    select 1
    from pg_trigger trg
    join pg_class cls on cls.oid = trg.tgrelid
    join pg_namespace n on n.oid = cls.relnamespace
    where n.nspname = current_schema()
      and not trg.tgisinternal
      and trg.tgname = required.name
  );

  if missing_triggers is not null then
    raise exception 'Missing required triggers: %', array_to_string(missing_triggers, ', ');
  end if;
end;
$$;

select
  'required_helper_function_count' as check_name,
  count(*)::text as actual
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = current_schema()
  and p.proname in (
    'update_updated_at',
    'player_recent_signals_are_valid'
  );

select
  'required_table_count' as check_name,
  count(*)::text as actual
from information_schema.tables
where table_schema = current_schema()
  and table_name in (
    'teams',
    'players',
    'team_stats',
    'matches',
    'standings',
    'head_to_head',
    'predictions',
    'team_chemistry',
    'player_intel',
    'signals',
    'narratives'
  );

select
  'required_index_count' as check_name,
  count(*)::text as actual
from pg_indexes
where schemaname = current_schema()
  and indexname in (
    'idx_teams_source_external_id',
    'idx_teams_elo_rank',
    'idx_players_team_position',
    'idx_team_stats_scope_date',
    'idx_matches_round_kickoff',
    'idx_matches_unique_fixture',
    'idx_standings_group_snapshot',
    'idx_head_to_head_pair',
    'idx_predictions_match_generated',
    'idx_team_chemistry_team_date',
    'idx_player_intel_last_signal_at',
    'idx_signals_impact_signal_at',
    'idx_narratives_competition_type_published'
  );

select
  'required_foreign_key_count' as check_name,
  count(*)::text as actual
from (
  values
    ('players', 'team_id', 'teams', 'id'),
    ('team_stats', 'team_id', 'teams', 'id'),
    ('matches', 'home_team_id', 'teams', 'id'),
    ('matches', 'away_team_id', 'teams', 'id'),
    ('standings', 'team_id', 'teams', 'id'),
    ('head_to_head', 'team_a_id', 'teams', 'id'),
    ('head_to_head', 'team_b_id', 'teams', 'id'),
    ('predictions', 'match_id', 'matches', 'id'),
    ('team_chemistry', 'team_id', 'teams', 'id'),
    ('player_intel', 'player_id', 'players', 'id'),
    ('signals', 'team_id', 'teams', 'id'),
    ('signals', 'player_id', 'players', 'id'),
    ('signals', 'match_id', 'matches', 'id'),
    ('narratives', 'team_id', 'teams', 'id'),
    ('narratives', 'player_id', 'players', 'id'),
    ('narratives', 'match_id', 'matches', 'id')
) as required(table_name, column_name, ref_table_name, ref_column_name)
where exists (
  select 1
  from pg_constraint c
  join pg_class src on src.oid = c.conrelid
  join pg_namespace src_n on src_n.oid = src.relnamespace
  join pg_class ref on ref.oid = c.confrelid
  join pg_namespace ref_n on ref_n.oid = ref.relnamespace
  join unnest(c.conkey) with ordinality as src_cols(attnum, ord) on true
  join pg_attribute src_att on src_att.attrelid = src.oid and src_att.attnum = src_cols.attnum
  join unnest(c.confkey) with ordinality as ref_cols(attnum, ord) on ref_cols.ord = src_cols.ord
  join pg_attribute ref_att on ref_att.attrelid = ref.oid and ref_att.attnum = ref_cols.attnum
  where c.contype = 'f'
    and src_n.nspname = current_schema()
    and ref_n.nspname = current_schema()
    and src.relname = required.table_name
    and src_att.attname = required.column_name
    and ref.relname = required.ref_table_name
    and ref_att.attname = required.ref_column_name
);

select
  'required_unique_key_count' as check_name,
  count(*)::text as actual
from (
  values
    ('teams', array['slug']::text[]),
    ('players', array['team_id', 'slug']::text[]),
    ('team_stats', array['team_id', 'competition_code', 'season_year', 'stat_scope', 'as_of_date', 'model_version']::text[]),
    ('standings', array['competition_code', 'season_year', 'stage', 'group_code', 'team_id', 'snapshot_at', 'model_version']::text[]),
    ('predictions', array['match_id', 'prediction_type', 'model_version', 'generated_at']::text[]),
    ('team_chemistry', array['team_id', 'competition_code', 'season_year', 'snapshot_date', 'model_version']::text[]),
    ('player_intel', array['player_id', 'captured_at', 'model_version']::text[]),
    ('narratives', array['slug']::text[])
) as required(table_name, column_names)
where exists (
  select 1
  from pg_constraint c
  join pg_class cls on cls.oid = c.conrelid
  join pg_namespace n on n.oid = cls.relnamespace
  join lateral (
    select array_agg(att.attname::text order by cols.ord) as actual_columns
    from unnest(c.conkey) with ordinality as cols(attnum, ord)
    join pg_attribute att on att.attrelid = cls.oid and att.attnum = cols.attnum
  ) actual on true
  where c.contype = 'u'
    and n.nspname = current_schema()
    and cls.relname = required.table_name
    and actual.actual_columns = required.column_names
);

select
  'required_check_constraint_count' as check_name,
  count(*)::text as actual
from pg_constraint c
join pg_class cls on cls.oid = c.conrelid
join pg_namespace n on n.oid = cls.relnamespace
where c.contype = 'c'
  and n.nspname = current_schema()
  and (
    (cls.relname = 'player_intel' and c.conname = 'player_intel_recent_signals_valid')
    or (cls.relname = 'signals' and c.conname = 'signals_signal_type_valid')
  );

select
  'required_view_count' as check_name,
  count(*)::text as actual
from information_schema.views
where table_schema = current_schema()
  and table_name in (
    'team_profiles_current',
    'player_profiles_current',
    'match_fixtures_current',
    'signal_feed_current',
    'power_rankings_current',
    'group_standings_current',
    'head_to_head_current'
  );

select
  'updated_at_trigger_count' as check_name,
  count(*)::text as actual
from pg_trigger trg
join pg_class cls on cls.oid = trg.tgrelid
join pg_namespace n on n.oid = cls.relnamespace
where n.nspname = current_schema()
  and not trg.tgisinternal
  and trg.tgname in (
    'teams_updated_at',
    'players_updated_at',
    'team_stats_updated_at',
    'matches_updated_at',
    'standings_updated_at',
    'head_to_head_updated_at',
    'predictions_updated_at',
    'team_chemistry_updated_at',
    'player_intel_updated_at',
    'signals_updated_at',
    'narratives_updated_at'
  );
