-- Run after applying the ZON-6 migrations to an empty or disposable database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/smoke-core-football-schema.sql
--
-- The script inserts one minimal cross-table fixture graph, checks the trickiest
-- match/signal constraints, reports row counts, and rolls everything back.

begin;

do $$
declare
  home_team_id uuid;
  away_team_id uuid;
  player_id uuid;
  resolved_match_id uuid;
  placeholder_match_id uuid;
begin
  insert into teams (
    slug,
    name,
    short_name,
    flag,
    group_code,
    confederation,
    fifa_ranking,
    elo_rating,
    elo_rank,
    coach_name,
    source,
    facts_used,
    metadata
  )
  values (
    'zon6-smoke-home',
    'ZON-6 Smoke Home',
    'Smoke Home',
    '/flags/smoke-home.svg',
    'A',
    'UEFA',
    5,
    1895.50,
    4,
    'Smoke Coach Home',
    'zon6-smoke',
    '["team seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  )
  returning id into home_team_id;

  insert into teams (
    slug,
    name,
    short_name,
    flag,
    group_code,
    confederation,
    fifa_ranking,
    elo_rating,
    elo_rank,
    coach_name,
    source,
    facts_used,
    metadata
  )
  values (
    'zon6-smoke-away',
    'ZON-6 Smoke Away',
    'Smoke Away',
    '/flags/smoke-away.svg',
    'A',
    'CONMEBOL',
    11,
    1810.10,
    9,
    'Smoke Coach Away',
    'zon6-smoke',
    '["team seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  )
  returning id into away_team_id;

  insert into players (
    team_id,
    slug,
    name,
    position,
    number,
    age,
    club,
    caps,
    goals,
    assists,
    rating,
    fitness_status,
    sentiment_score,
    sentiment_label,
    source,
    facts_used,
    metadata
  )
  values (
    home_team_id,
    'zon6-smoke-playmaker',
    'ZON-6 Smoke Playmaker',
    'MID',
    8,
    27,
    'Smoke FC',
    42,
    9,
    7,
    7.4,
    'green',
    78,
    'positive',
    'zon6-smoke',
    '["player seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  )
  returning id into player_id;

  insert into team_stats (
    team_id,
    competition_code,
    season_year,
    stat_scope,
    as_of_date,
    matches_played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    goal_difference,
    clean_sheets,
    expected_goals_for,
    expected_goals_against,
    possession_pct,
    pass_completion_pct,
    shots_per_match,
    points,
    power_score,
    source,
    model_version,
    facts_used,
    metadata
  )
  values
    (
      home_team_id,
      'world_cup_2026',
      2026,
      'overall',
      date '2026-06-14',
      3,
      2,
      1,
      0,
      7,
      2,
      5,
      2,
      5.8,
      2.2,
      57.3,
      88.4,
      13.1,
      7,
      84.5,
      'zon6-smoke',
      'zon6-smoke',
      '["team stats"]'::jsonb,
      '{"suite":"zon6-smoke"}'::jsonb
    ),
    (
      away_team_id,
      'world_cup_2026',
      2026,
      'overall',
      date '2026-06-14',
      3,
      1,
      1,
      1,
      4,
      3,
      1,
      1,
      3.9,
      3.1,
      49.2,
      83.1,
      9.8,
      4,
      72.0,
      'zon6-smoke',
      'zon6-smoke',
      '["team stats"]'::jsonb,
      '{"suite":"zon6-smoke"}'::jsonb
    );

  insert into matches (
    competition_code,
    season_year,
    stage,
    round,
    group_code,
    matchday,
    home_team_id,
    away_team_id,
    venue,
    city,
    kickoff_utc,
    match_status,
    home_score,
    away_score,
    source,
    source_match_id,
    model_version,
    facts_used,
    source_payload,
    metadata
  )
  values (
    'world_cup_2026',
    2026,
    'group_stage',
    'Group A',
    'A',
    2,
    home_team_id,
    away_team_id,
    'Smoke Arena',
    'Smoke City',
    timestamptz '2026-06-16 19:00:00+00',
    'completed',
    2,
    1,
    'zon6-smoke',
    'match-resolved-1',
    'zon6-smoke',
    '["match seed"]'::jsonb,
    '{"origin":"smoke"}'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  )
  returning id into resolved_match_id;

  insert into matches (
    competition_code,
    season_year,
    stage,
    round,
    home_placeholder_slug,
    away_placeholder_slug,
    venue,
    city,
    kickoff_utc,
    match_status,
    source,
    source_match_id,
    model_version,
    facts_used,
    source_payload,
    metadata
  )
  values (
    'world_cup_2026',
    2026,
    'round_of_32',
    'Round of 32',
    'tbd-1a',
    'tbd-2b',
    'Bracket Arena',
    'Bracket City',
    timestamptz '2026-06-30 17:00:00+00',
    'scheduled',
    'zon6-smoke',
    'match-placeholder-1',
    'zon6-smoke',
    '["placeholder match"]'::jsonb,
    '{"origin":"smoke"}'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  )
  returning id into placeholder_match_id;

  insert into standings (
    competition_code,
    season_year,
    stage,
    group_code,
    team_id,
    ranking,
    played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    goal_difference,
    points,
    qualification_status,
    snapshot_at,
    source,
    model_version,
    facts_used,
    metadata
  )
  values
    (
      'world_cup_2026',
      2026,
      'group_stage',
      'A',
      home_team_id,
      1,
      3,
      2,
      1,
      0,
      7,
      2,
      5,
      7,
      'qualified',
      timestamptz '2026-06-17 00:00:00+00',
      'zon6-smoke',
      'zon6-smoke',
      '["standings seed"]'::jsonb,
      '{"suite":"zon6-smoke"}'::jsonb
    ),
    (
      'world_cup_2026',
      2026,
      'group_stage',
      'A',
      away_team_id,
      2,
      3,
      1,
      1,
      1,
      4,
      3,
      1,
      4,
      'pending',
      timestamptz '2026-06-17 00:00:00+00',
      'zon6-smoke',
      'zon6-smoke',
      '["standings seed"]'::jsonb,
      '{"suite":"zon6-smoke"}'::jsonb
    );

  insert into head_to_head (
    team_a_id,
    team_b_id,
    total_matches,
    team_a_wins,
    draws,
    team_b_wins,
    team_a_goals,
    team_b_goals,
    last_met_at,
    last_result,
    world_cup_meetings,
    notable_meetings,
    source,
    model_version,
    facts_used,
    metadata
  )
  values (
    home_team_id,
    away_team_id,
    6,
    4,
    1,
    1,
    10,
    5,
    date '2026-06-16',
    'ZON-6 Smoke Home 2-1 ZON-6 Smoke Away',
    1,
    '[{"year":2026,"event":"Smoke Cup","result":"ZON-6 Smoke Home 2-1 ZON-6 Smoke Away"}]'::jsonb,
    'zon6-smoke',
    'zon6-smoke',
    '["head to head seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  );

  insert into predictions (
    match_id,
    prediction_type,
    home_win_prob,
    draw_prob,
    away_win_prob,
    predicted_home_goals,
    predicted_away_goals,
    confidence_score,
    recommended_pick,
    rationale_summary,
    source,
    model_version,
    facts_used,
    metadata,
    generated_at
  )
  values (
    resolved_match_id,
    'match_outcome',
    0.45,
    0.30,
    0.25,
    1.8,
    1.1,
    77.5,
    'home',
    'Smoke validation prediction.',
    'zon6-smoke',
    'zon6-smoke',
    '["prediction seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb,
    timestamptz '2026-06-15 09:00:00+00'
  );

  insert into team_chemistry (
    team_id,
    competition_code,
    season_year,
    snapshot_date,
    chemistry,
    familiarity,
    stability,
    morale,
    chemistry_rank,
    rationale,
    source,
    model_version,
    facts_used,
    metadata
  )
  values
    (
      home_team_id,
      'world_cup_2026',
      2026,
      date '2026-06-15',
      86.2,
      82.4,
      80.0,
      88.5,
      3,
      'Smoke validation chemistry snapshot.',
      'zon6-smoke',
      'zon6-smoke',
      '["chemistry seed"]'::jsonb,
      '{"suite":"zon6-smoke"}'::jsonb
    ),
    (
      away_team_id,
      'world_cup_2026',
      2026,
      date '2026-06-15',
      72.0,
      70.0,
      68.0,
      74.0,
      11,
      'Smoke validation chemistry snapshot.',
      'zon6-smoke',
      'zon6-smoke',
      '["chemistry seed"]'::jsonb,
      '{"suite":"zon6-smoke"}'::jsonb
    );

  insert into player_intel (
    player_id,
    captured_at,
    fitness_status,
    fitness_note,
    sentiment_score,
    sentiment_label,
    availability_status,
    workload_note,
    analyst_note,
    recent_signals,
    last_signal_at,
    source,
    model_version,
    facts_used,
    metadata
  )
  values (
    player_id,
    timestamptz '2026-06-15 12:00:00+00',
    'green',
    'Training normally.',
    81.0,
    'positive',
    'available',
    'Normal load.',
    'Smoke validation intel snapshot.',
    '[{"type":"training","text":"Completed the latest training block without restrictions."}]'::jsonb,
    timestamptz '2026-06-15 08:30:00+00',
    'zon6-smoke',
    'zon6-smoke',
    '["player intel seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  );

  insert into signals (
    signal_type,
    impact,
    headline,
    detail,
    signal_at,
    team_id,
    player_id,
    match_id,
    source,
    source_url,
    model_version,
    facts_used,
    metadata
  )
  values (
    'form',
    'medium',
    'Smoke validation signal',
    'Used to verify signal entity linkage and required subject enforcement.',
    timestamptz '2026-06-15 08:30:00+00',
    home_team_id,
    player_id,
    resolved_match_id,
    'zon6-smoke',
    'https://example.com/smoke-signal',
    'zon6-smoke',
    '["signal seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb
  );

  insert into narratives (
    competition_code,
    content_type,
    slug,
    title,
    summary,
    body_markdown,
    body_html,
    schema_type,
    schema_payload,
    team_id,
    match_id,
    source,
    model_version,
    facts_used,
    metadata,
    status,
    published_at
  )
  values (
    'world_cup_2026',
    'match_preview',
    'zon6-smoke-match-preview',
    'Smoke Match Preview',
    'Validation narrative for the core schema.',
    'Smoke narrative body.',
    '<p>Smoke narrative body.</p>',
    'Article',
    '{"@type":"Article"}'::jsonb,
    home_team_id,
    resolved_match_id,
    'zon6-smoke',
    'zon6-smoke',
    '["narrative seed"]'::jsonb,
    '{"suite":"zon6-smoke"}'::jsonb,
    'published',
    timestamptz '2026-06-15 10:00:00+00'
  );

  if not exists (
    select 1
    from matches
    where id = placeholder_match_id
      and home_placeholder_slug = 'tbd-1a'
      and away_placeholder_slug = 'tbd-2b'
  ) then
    raise exception 'Smoke match placeholder insert was not persisted as expected.';
  end if;

  if not exists (
    select 1
    from team_profiles_current
    where id = home_team_id
      and "group" = 'A'
      and "fifaRanking" = 5
      and "coachName" = 'Smoke Coach Home'
      and chemistry = 86.2
      and familiarity = 82.4
      and stability = 80.0
      and morale = 88.5
  ) then
    raise exception 'team_profiles_current did not expose the latest chemistry snapshot as expected.';
  end if;

  if not exists (
    select 1
    from player_profiles_current
    where id = player_id
      and "teamSlug" = 'zon6-smoke-home'
      and "fitnessStatus" = 'green'
      and "fitnessNote" = 'Training normally.'
      and jsonb_array_length("recentSignals") = 1
      and "recentSignals" -> 0 ->> 'type' = 'training'
      and "recentSignals" -> 0 ->> 'text' = 'Completed the latest training block without restrictions.'
  ) then
    raise exception 'player_profiles_current did not expose the latest player intel snapshot as expected.';
  end if;

  if not exists (
    select 1
    from match_fixtures_current
    where id = resolved_match_id
      and "homeTeamSlug" = 'zon6-smoke-home'
      and "awayTeamSlug" = 'zon6-smoke-away'
      and "homeTeamName" = 'ZON-6 Smoke Home'
      and "awayTeamName" = 'ZON-6 Smoke Away'
      and "kickoffUtc" = timestamptz '2026-06-16 19:00:00+00'
      and "homeWinProb" = 0.45
      and "drawProb" = 0.30
      and "awayWinProb" = 0.25
  ) then
    raise exception 'match_fixtures_current did not expose the latest prediction payload for a resolved fixture.';
  end if;

  if not exists (
    select 1
    from match_fixtures_current
    where id = placeholder_match_id
      and "homeTeamSlug" = 'tbd-1a'
      and "awayTeamSlug" = 'tbd-2b'
      and "homeTeamName" = 'tbd-1a'
      and "awayTeamName" = 'tbd-2b'
      and "group" = ''
      and "homeWinProb" = 0.33333
      and "drawProb" = 0.33334
      and "awayWinProb" = 0.33333
  ) then
    raise exception 'match_fixtures_current did not preserve placeholder participants for an unresolved fixture.';
  end if;

  if not exists (
    select 1
    from signal_feed_current
    where id in (
      select id
      from signals
      where source = 'zon6-smoke'
      limit 1
    )
      and "type" = 'form'
      and impact = 'medium'
      and "signalAt" = timestamptz '2026-06-15 08:30:00+00'
      and "teamSlug" = 'zon6-smoke-home'
      and "teamName" = 'ZON-6 Smoke Home'
      and team->>'slug' = 'zon6-smoke-home'
      and team->>'name' = 'ZON-6 Smoke Home'
      and team->>'flag' = '/flags/smoke-home.svg'
      and "playerSlug" = 'zon6-smoke-playmaker'
      and "sourceUrl" = 'https://example.com/smoke-signal'
  ) then
    raise exception 'signal_feed_current did not expose the expected daily-briefing signal shape.';
  end if;

  if not exists (
    select 1
    from power_rankings_current
    where id = home_team_id
      and "powerScore" = 88
      and rank = 1
      and tier = 'title_contender'
      and movement = 'up'
  ) then
    raise exception 'power_rankings_current did not expose the expected computed ranking payload.';
  end if;

  if not exists (
    select 1
    from group_standings_current
    where team_id = home_team_id
      and "group" = 'A'
      and "teamSlug" = 'zon6-smoke-home'
      and ranking = 1
      and points = 7
      and "qualificationStatus" = 'qualified'
      and chemistry = 86.2
  ) then
    raise exception 'group_standings_current did not expose the expected latest standings payload.';
  end if;

  if not exists (
    select 1
    from head_to_head_current
    where "matchupKey" = 'zon6-smoke-away--zon6-smoke-home'
      and "compareSlug" = 'zon6-smoke-away-vs-zon6-smoke-home'
      and team_a_id = away_team_id
      and team_b_id = home_team_id
      and "teamASlug" = 'zon6-smoke-away'
      and "teamBSlug" = 'zon6-smoke-home'
      and "teamAName" = 'ZON-6 Smoke Away'
      and "teamBName" = 'ZON-6 Smoke Home'
      and "teamAWins" = 1
      and "teamBWins" = 4
      and "teamAGoals" = 5
      and "teamBGoals" = 10
      and "lastMet" = date '2026-06-16'
      and "lastResult" = 'ZON-6 Smoke Home 2-1 ZON-6 Smoke Away'
      and "worldCupMeetings" = 1
      and ("notableMeetings" -> 0 ->> 'event') = 'Smoke Cup'
  ) then
    raise exception 'head_to_head_current did not expose the expected compare-friendly matchup payload.';
  end if;

  begin
    insert into matches (
      competition_code,
      season_year,
      stage,
      round,
      home_team_id,
      home_placeholder_slug,
      away_placeholder_slug,
      kickoff_utc
    )
    values (
      'world_cup_2026',
      2026,
      'round_of_32',
      'Constraint Check',
      home_team_id,
      'tbd-illegal-home',
      'tbd-opponent',
      timestamptz '2026-07-01 19:00:00+00'
    );

    raise exception 'Expected matches_home_participant_present to reject mixed team and placeholder home participants.';
  exception
    when check_violation then
      null;
  end;

  begin
    insert into matches (
      competition_code,
      season_year,
      stage,
      round,
      home_team_id,
      away_team_id,
      kickoff_utc
    )
    values (
      'world_cup_2026',
      2026,
      'group_stage',
      'Group A',
      home_team_id,
      away_team_id,
      timestamptz '2026-06-16 19:00:00+00'
    );

    raise exception 'Expected idx_matches_unique_fixture to reject duplicate fixtures.';
  exception
    when unique_violation then
      null;
  end;

  begin
    insert into matches (
      competition_code,
      season_year,
      stage,
      round,
      home_placeholder_slug,
      away_placeholder_slug,
      kickoff_utc
    )
    values (
      'world_cup_2026',
      2026,
      'round_of_16',
      'Constraint Check',
      'tbd-dup-slot',
      'tbd-dup-slot',
      timestamptz '2026-07-03 18:00:00+00'
    );

    raise exception 'Expected matches_distinct_participants to reject duplicate participant identities.';
  exception
    when check_violation then
      null;
  end;

  begin
    insert into signals (
      signal_type,
      impact,
      headline,
      detail,
      source,
      model_version
    )
    values (
      'injury',
      'high',
      'Invalid smoke signal',
      'This should fail because no subject link is set.',
      'zon6-smoke',
      'zon6-smoke'
    );

    raise exception 'Expected signals_subject_present to reject signals without a team, player, or match.';
  exception
    when check_violation then
      null;
  end;

  begin
    insert into signals (
      signal_type,
      impact,
      headline,
      detail,
      team_id,
      source,
      model_version
    )
    values (
      'training',
      'medium',
      'Invalid signal type',
      'This should fail because the signal type is outside the supported daily briefing categories.',
      home_team_id,
      'zon6-smoke',
      'zon6-smoke'
    );

    raise exception 'Expected signals_signal_type_valid to reject unsupported signal types.';
  exception
    when check_violation then
      null;
  end;

  begin
    insert into player_intel (
      player_id,
      captured_at,
      fitness_status,
      recent_signals,
      source,
      model_version
    )
    values (
      player_id,
      timestamptz '2026-06-15 12:30:00+00',
      'green',
      '[{"signal_type":"training","impact":"medium"}]'::jsonb,
      'zon6-smoke',
      'zon6-smoke-invalid'
    );

    raise exception 'Expected player_intel_recent_signals_valid to reject unsupported recent signal payloads.';
  exception
    when check_violation then
      null;
  end;
end;
$$;

select
  'smoke_team_count' as check_name,
  count(*)::text as actual
from teams
where source = 'zon6-smoke';

select
  'smoke_match_count' as check_name,
  count(*)::text as actual
from matches
where source = 'zon6-smoke';

select
  'smoke_prediction_count' as check_name,
  count(*)::text as actual
from predictions
where source = 'zon6-smoke';

select
  'smoke_signal_count' as check_name,
  count(*)::text as actual
from signals
where source = 'zon6-smoke';

rollback;
