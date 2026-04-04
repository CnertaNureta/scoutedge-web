#!/usr/bin/env node

import { DatabaseSync, type SQLInputValue } from 'node:sqlite'

import {
  buildLayer1Dataset,
  createFixtureLayer1SourceBundle,
} from '../src/lib/layer1/team-data.ts'

function insertMany(
  db: DatabaseSync,
  tableName: string,
  columns: string[],
  rows: Array<Record<string, SQLInputValue>>
) {
  const placeholders = columns.map(() => '?').join(', ')
  const statement = db.prepare(
    `insert into ${tableName} (${columns.join(', ')}) values (${placeholders})`
  )

  for (const row of rows) {
    statement.run(...columns.map((column) => row[column] ?? null))
  }
}

function main() {
  const dataset = buildLayer1Dataset(createFixtureLayer1SourceBundle())
  const db = new DatabaseSync(':memory:')

  db.exec(`
    create table teams (
      slug text primary key,
      name text not null,
      confederation text not null,
      source text not null,
      source_updated_at text
    );

    create table team_name_aliases (
      alias text not null,
      normalized_alias text primary key,
      team_slug text not null,
      source text not null
    );

    create table team_stats (
      team_slug text not null,
      source text not null,
      source_team_name text not null,
      source_url text,
      as_of_date text not null,
      matches_played integer,
      minutes_played integer,
      possession_pct real,
      passes_completed integer,
      passes_attempted integer,
      pass_completion_pct real,
      xg_for real,
      xg_against real,
      source_updated_at text,
      raw_payload text not null
    );

    create table team_ratings (
      team_slug text not null,
      source text not null,
      source_team_name text not null,
      source_url text,
      as_of_date text not null,
      rating real not null,
      rating_rank integer,
      rating_scale text not null,
      source_updated_at text,
      raw_payload text not null
    );

    create table matches (
      match_key text primary key,
      group_code text not null,
      round text not null,
      kickoff_utc text not null,
      venue text not null,
      city text not null,
      home_team_slug text not null,
      away_team_slug text not null,
      source text not null,
      source_updated_at text not null
    );
  `)

  insertMany(
    db,
    'teams',
    ['slug', 'name', 'confederation', 'source', 'source_updated_at'],
    dataset.teamRows.map((row) => ({
      slug: row.teamSlug,
      name: row.teamName,
      confederation: row.confederation,
      source: row.source,
      source_updated_at: row.sourceUpdatedAt,
    }))
  )

  insertMany(
    db,
    'team_name_aliases',
    ['alias', 'normalized_alias', 'team_slug', 'source'],
    dataset.aliasRows.map((row) => ({
      alias: row.aliasName,
      normalized_alias: row.aliasKey,
      team_slug: row.teamSlug,
      source: 'scoutedge-layer1',
    }))
  )

  insertMany(
    db,
    'matches',
    [
      'match_key',
      'group_code',
      'round',
      'kickoff_utc',
      'venue',
      'city',
      'home_team_slug',
      'away_team_slug',
      'source',
      'source_updated_at',
    ],
    dataset.matchRows.map((row) => ({
      match_key: row.matchKey,
      group_code: row.groupCode,
      round: row.round,
      kickoff_utc: row.kickoffUtc,
      venue: row.venue,
      city: row.city,
      home_team_slug: row.homeTeamSlug,
      away_team_slug: row.awayTeamSlug,
      source: row.source,
      source_updated_at: row.sourceUpdatedAt,
    }))
  )

  insertMany(
    db,
    'team_stats',
    [
      'team_slug',
      'source',
      'source_team_name',
      'source_url',
      'as_of_date',
      'matches_played',
      'minutes_played',
      'possession_pct',
      'passes_completed',
      'passes_attempted',
      'pass_completion_pct',
      'xg_for',
      'xg_against',
      'source_updated_at',
      'raw_payload',
    ],
    dataset.teamStats.map((row) => ({
      team_slug: row.teamSlug,
      source: row.source,
      source_team_name: (row.raw.shooting_team_name as string) || row.teamName,
      source_url: row.sourceUrl,
      as_of_date: row.sourceUpdatedAt.slice(0, 10),
      matches_played: row.matchesPlayed,
      minutes_played: null,
      possession_pct: row.possessionPct,
      passes_completed: row.passesCompleted,
      passes_attempted: row.passesAttempted,
      pass_completion_pct: row.passCompletionPct,
      xg_for: row.xg,
      xg_against: null,
      source_updated_at: row.sourceUpdatedAt,
      raw_payload: JSON.stringify({
        ...row.raw,
        npxg: row.npxg,
        progressive_passes: row.progressivePasses,
      }),
    }))
  )

  insertMany(
    db,
    'team_ratings',
    [
      'team_slug',
      'source',
      'source_team_name',
      'source_url',
      'as_of_date',
      'rating',
      'rating_rank',
      'rating_scale',
      'source_updated_at',
      'raw_payload',
    ],
    dataset.ratings.map((row) => ({
      team_slug: row.teamSlug,
      source: row.source,
      source_team_name: (row.raw.source_team_name as string) || row.teamName,
      source_url: row.sourceUrl,
      as_of_date: row.sourceUpdatedAt.slice(0, 10),
      rating: row.ratingValue,
      rating_rank: row.ranking,
      rating_scale: row.ratingType,
      source_updated_at: row.sourceUpdatedAt,
      raw_payload: JSON.stringify({
        ...row.raw,
        delta: row.delta,
      }),
    }))
  )

  const teamStatsExamples = db
    .prepare(`
      select
        teams.slug,
        teams.name,
        team_stats.xg_for,
        team_stats.possession_pct,
        team_stats.passes_completed,
        team_stats.pass_completion_pct
      from team_stats
      join teams on teams.slug = team_stats.team_slug
      order by teams.slug
      limit 5
    `)
    .all()

  const ratingExamples = db
    .prepare(`
      select
        team_ratings.rating_rank,
        teams.slug,
        teams.name,
        team_ratings.rating,
        json_extract(team_ratings.raw_payload, '$.delta') as delta
      from team_ratings
      join teams on teams.slug = team_ratings.team_slug
      order by team_ratings.rating_rank
      limit 5
    `)
    .all()

  const joinExamples = db
    .prepare(`
      select
        matches.match_key,
        home_team.name as home_team,
        away_team.name as away_team,
        home_stats.xg_for as home_xg_for,
        away_stats.xg_for as away_xg_for,
        home_rating.rating as home_elo,
        away_rating.rating as away_elo
      from matches
      join teams as home_team on home_team.slug = matches.home_team_slug
      join teams as away_team on away_team.slug = matches.away_team_slug
      left join team_stats as home_stats
        on home_stats.team_slug = matches.home_team_slug
        and home_stats.source = 'fbref'
      left join team_stats as away_stats
        on away_stats.team_slug = matches.away_team_slug
        and away_stats.source = 'fbref'
      left join team_ratings as home_rating
        on home_rating.team_slug = matches.home_team_slug
        and home_rating.source = 'world-football-elo'
      left join team_ratings as away_rating
        on away_rating.team_slug = matches.away_team_slug
        and away_rating.source = 'world-football-elo'
      where matches.home_team_slug not like 'tbd-playoff-%'
        and matches.away_team_slug not like 'tbd-playoff-%'
      order by matches.kickoff_utc
      limit 5
    `)
    .all()

  console.log(
    JSON.stringify(
      {
        coverage: dataset.coverage,
        teamStatsExamples,
        ratingExamples,
        joinExamples,
      },
      null,
      2
    )
  )
}

main()
