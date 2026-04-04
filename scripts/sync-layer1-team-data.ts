#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'

import { createClient } from '@supabase/supabase-js'

import {
  buildLayer1Dataset,
  createFixtureLayer1SourceBundle,
  type Layer1BuildResult,
  type Layer1SourceBundle,
} from '../src/lib/layer1/team-data.ts'
import { buildLayer1CsvDatasetFromFiles } from '../src/lib/layer1/csv-dataset.ts'

const DEFAULT_JSON_OUT = resolve(process.cwd(), 'tmp/layer1-sync-report.json')
const DEFAULT_SOURCE_MODE = 'live'

type Layer1SourceMode = 'live' | 'fixtures' | 'csv'

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function readFlag(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] || null : null
}

function readFlagOrEnv(flag: string, envName: string): string | null {
  return readFlag(flag) || process.env[envName] || null
}

function normalizeSourceMode(input: string | null): Layer1SourceMode {
  if (input === 'fixture') return 'fixtures'
  if (input === 'fixtures' || input === 'csv' || input === 'live') return input
  return DEFAULT_SOURCE_MODE
}

function shouldFallbackToCsv(): boolean {
  const value = hasFlag('--fallback-to-csv')
    ? 'true'
    : process.env.LAYER1_FALLBACK_TO_CSV || null
  if (!value) return false
  return !['0', 'false', 'False', 'FALSE'].includes(String(value))
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'ScoutEdgeLayer1Sync/1.0 (+https://scoutedge.ai)',
      'accept-language': 'en-US,en;q=0.9',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }

  return await response.text()
}

async function buildLiveSourceBundle(): Promise<Layer1SourceBundle> {
  const fetchedAt = new Date().toISOString()
  const competition = process.env.LAYER1_COMPETITION || 'World Cup 2026'
  const season = process.env.LAYER1_SEASON || '2026'

  const shootingUrl =
    process.env.FBREF_SHOOTING_URL ||
    'https://fbref.com/en/comps/1/2026/shooting/2026-World-Cup-Stats'
  const passingUrl =
    process.env.FBREF_PASSING_URL ||
    'https://fbref.com/en/comps/1/2026/passing/2026-World-Cup-Stats'
  const possessionUrl =
    process.env.FBREF_POSSESSION_URL ||
    'https://fbref.com/en/comps/1/2026/possession/2026-World-Cup-Stats'
  const eloUrl = process.env.ELO_RATINGS_URL || 'https://eloratings.net/'

  const [shootingHtml, passingHtml, possessionHtml, eloHtml] = await Promise.all([
    fetchHtml(shootingUrl),
    fetchHtml(passingUrl),
    fetchHtml(possessionUrl),
    fetchHtml(eloUrl),
  ])

  return {
    competition,
    season,
    fbref: {
      shooting: { html: shootingHtml, sourceUrl: shootingUrl, fetchedAt },
      passing: { html: passingHtml, sourceUrl: passingUrl, fetchedAt },
      possession: { html: possessionHtml, sourceUrl: possessionUrl, fetchedAt },
    },
    elo: {
      html: eloHtml,
      sourceUrl: eloUrl,
      fetchedAt,
    },
  }
}

function buildCsvDataset(): Layer1BuildResult {
  const fbrefCsvPath = readFlagOrEnv('--fbref-csv', 'FBREF_TEAM_STATS_CSV_FILE')
  const eloCsvPath = readFlagOrEnv('--elo-csv', 'ELO_RATINGS_CSV_FILE')

  if (!fbrefCsvPath || !eloCsvPath) {
    throw new Error(
      'CSV mode requires both --fbref-csv/FBREF_TEAM_STATS_CSV_FILE and --elo-csv/ELO_RATINGS_CSV_FILE.'
    )
  }

  const sourceUpdatedAt = readFlag('--source-updated-at') || new Date().toISOString()
  const asOfDate = readFlag('--as-of-date') || sourceUpdatedAt.slice(0, 10)

  return buildLayer1CsvDatasetFromFiles({
    fbrefCsvPath: resolve(process.cwd(), fbrefCsvPath),
    eloCsvPath: resolve(process.cwd(), eloCsvPath),
    competition: process.env.LAYER1_COMPETITION || 'World Cup 2026',
    season: process.env.LAYER1_SEASON || '2026',
    sourceUpdatedAt,
    asOfDate,
    fbrefSourceUrl:
      readFlag('--fbref-source-url') ||
      process.env.FBREF_SOURCE_URL ||
      process.env.FBREF_SHOOTING_URL ||
      null,
    eloSourceUrl:
      readFlag('--elo-source-url') ||
      process.env.ELO_SOURCE_URL ||
      process.env.ELO_RATINGS_URL ||
      null,
  })
}

async function syncToSupabase(result: Layer1BuildResult): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase sync.')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  async function getTableColumns(
    tableName: 'teams' | 'matches',
    fallbackColumns: string[]
  ): Promise<Set<string>> {
    const { data, error } = await supabase.from(tableName).select('*').limit(1)

    if (error) {
      throw new Error(error.message)
    }

    const firstRow = Array.isArray(data) ? data[0] : null
    if (firstRow && typeof firstRow === 'object') {
      return new Set(Object.keys(firstRow))
    }

    return new Set(fallbackColumns)
  }

  const teamsColumns = await getTableColumns('teams', [
    'slug',
    'name',
    'confederation',
    'source',
    'source_updated_at',
  ])
  const matchesColumns = await getTableColumns('matches', [
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
  ])

  const teamStatusForSlug = (teamSlug: string) =>
    teamSlug.startsWith('tbd-playoff-') ? 'playoff' : 'qualified'

  const ratingBySlug = new Map(
    result.ratings.map((row) => [row.teamSlug, row.ratingValue])
  )

  const teamRows = result.teamRows.map((row) => {
    const teamRow: Record<string, string | number | null> = {}

    if (teamsColumns.has('slug')) teamRow.slug = row.teamSlug
    if (teamsColumns.has('name')) teamRow.name = row.teamName
    if (teamsColumns.has('name_en')) teamRow.name_en = row.teamName
    if (teamsColumns.has('confederation')) teamRow.confederation = row.confederation
    if (teamsColumns.has('group_code')) teamRow.group_code = row.groupCode
    if (teamsColumns.has('fifa_rank')) teamRow.fifa_rank = row.fifaRanking
    if (teamsColumns.has('elo_rating')) teamRow.elo_rating = ratingBySlug.get(row.teamSlug) ?? null
    if (teamsColumns.has('status')) teamRow.status = teamStatusForSlug(row.teamSlug)
    if (teamsColumns.has('source')) teamRow.source = row.source
    if (teamsColumns.has('source_updated_at')) teamRow.source_updated_at = row.sourceUpdatedAt

    return teamRow
  })

  const aliasRows = result.aliasRows.map((row) => ({
    alias: row.aliasName,
    normalized_alias: row.aliasKey,
    team_slug: row.teamSlug,
    source: 'scoutedge-layer1',
  }))

  const teamStats = result.teamStats.map((row) => ({
    team_slug: row.teamSlug,
    source: row.source,
    source_team_name:
      typeof row.raw.shooting_team_name === 'string'
        ? row.raw.shooting_team_name
        : row.teamName,
    source_url: row.sourceUrl || null,
    source_updated_at: row.sourceUpdatedAt,
    as_of_date: row.sourceUpdatedAt.slice(0, 10),
    matches_played: row.matchesPlayed,
    minutes_played: null,
    possession_pct: row.possessionPct,
    passes_completed: row.passesCompleted,
    passes_attempted: row.passesAttempted,
    pass_completion_pct: row.passCompletionPct,
    xg_for: row.xg,
    xg_against: null,
    raw_payload: {
      ...row.raw,
      npxg: row.npxg,
      progressive_passes: row.progressivePasses,
      competition: row.competition,
      season: row.season,
    },
  }))

  const ratings = result.ratings.map((row) => ({
    team_slug: row.teamSlug,
    source: row.source,
    source_team_name:
      typeof row.raw.source_team_name === 'string'
        ? row.raw.source_team_name
        : row.teamName,
    source_url: row.sourceUrl || null,
    source_updated_at: row.sourceUpdatedAt,
    as_of_date: row.sourceUpdatedAt.slice(0, 10),
    rating: row.ratingValue,
    rating_rank: row.ranking,
    rating_scale: row.ratingType,
    raw_payload: {
      ...row.raw,
      delta: row.delta,
    },
  }))

  const { error: teamsError } = await supabase.from('teams').upsert(teamRows, {
    onConflict: 'slug',
  })

  if (teamsError) {
    throw new Error(teamsError.message)
  }

  const teamIdBySlug = new Map<string, string>()

  if (teamsColumns.has('id')) {
    const { data: persistedTeams, error: persistedTeamsError } = await supabase
      .from('teams')
      .select('id, slug')
      .in(
        'slug',
        result.teamRows.map((row) => row.teamSlug)
      )

    if (persistedTeamsError) {
      throw new Error(persistedTeamsError.message)
    }

    for (const row of persistedTeams || []) {
      if (typeof row?.id === 'string' && typeof row?.slug === 'string') {
        teamIdBySlug.set(row.slug, row.id)
      }
    }
  }

  const parseMatchday = (round: string): number | null => {
    const match = round.match(/(\d+)/)
    if (!match) return null

    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : null
  }

  const matches = result.matchRows.map((row) => {
    const matchRow: Record<string, string | number | null> = {}

    if (matchesColumns.has('slug')) {
      matchRow.slug = `${row.homeTeamSlug}-vs-${row.awayTeamSlug}`
    }
    if (matchesColumns.has('stage')) {
      matchRow.stage = row.groupCode ? 'group' : 'knockout'
    }
    if (matchesColumns.has('matchday')) {
      matchRow.matchday = parseMatchday(row.round)
    }
    if (matchesColumns.has('match_date_utc')) {
      matchRow.match_date_utc = row.kickoffUtc
    }
    if (matchesColumns.has('home_team_id')) {
      matchRow.home_team_id = teamIdBySlug.get(row.homeTeamSlug) || null
    }
    if (matchesColumns.has('away_team_id')) {
      matchRow.away_team_id = teamIdBySlug.get(row.awayTeamSlug) || null
    }
    if (matchesColumns.has('status')) {
      matchRow.status = 'scheduled'
    }
    if (matchesColumns.has('match_key')) {
      matchRow.match_key = row.matchKey
    }
    if (matchesColumns.has('group_code')) {
      matchRow.group_code = row.groupCode
    }
    if (matchesColumns.has('round')) {
      matchRow.round = row.round
    }
    if (matchesColumns.has('kickoff_utc')) {
      matchRow.kickoff_utc = row.kickoffUtc
    }
    if (matchesColumns.has('venue')) {
      matchRow.venue = row.venue
    }
    if (matchesColumns.has('city')) {
      matchRow.city = row.city
    }
    if (matchesColumns.has('home_team_slug')) {
      matchRow.home_team_slug = row.homeTeamSlug
    }
    if (matchesColumns.has('away_team_slug')) {
      matchRow.away_team_slug = row.awayTeamSlug
    }
    if (matchesColumns.has('source')) {
      matchRow.source = row.source
    }
    if (matchesColumns.has('source_updated_at')) {
      matchRow.source_updated_at = row.sourceUpdatedAt
    }

    return matchRow
  })

  const matchConflictColumn = matchesColumns.has('slug') ? 'slug' : 'match_key'

  const writes: Array<PromiseLike<{ error: { message: string } | null }>> = [
    supabase.from('matches').upsert(matches, { onConflict: matchConflictColumn }),
    supabase.from('team_name_aliases').upsert(aliasRows, { onConflict: 'normalized_alias' }),
    supabase
      .from('team_stats')
      .upsert(teamStats, { onConflict: 'team_slug,source,as_of_date' }),
    supabase
      .from('team_ratings')
      .upsert(ratings, { onConflict: 'team_slug,source,as_of_date' }),
  ]

  const responses = await Promise.all(writes)
  const errors = responses
    .map((response) => response.error)
    .filter((error): error is { message: string } => Boolean(error))

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '))
  }
}

function buildSummary(result: Layer1BuildResult) {
  return {
    coverage: result.coverage,
    examples: {
      teamStats: result.teamStats.slice(0, 5),
      ratings: result.ratings.slice(0, 5),
      matches: result.matchRows.slice(0, 5),
    },
  }
}

async function main() {
  const explicitMode = hasFlag('--fixture')
    ? 'fixtures'
    : readFlag('--source-mode') || process.env.LAYER1_SOURCE_MODE || null
  const sourceMode = normalizeSourceMode(explicitMode)
  const skipDb = hasFlag('--skip-db')
  const jsonOut = readFlag('--json-out') || DEFAULT_JSON_OUT
  let modeUsed: Layer1SourceMode | 'live->csv' = sourceMode
  let result: Layer1BuildResult

  if (sourceMode === 'fixtures') {
    result = buildLayer1Dataset(createFixtureLayer1SourceBundle())
  } else if (sourceMode === 'csv') {
    result = buildCsvDataset()
  } else {
    try {
      const sourceBundle = await buildLiveSourceBundle()
      result = buildLayer1Dataset(sourceBundle)
    } catch (error) {
      if (!shouldFallbackToCsv()) {
        throw error
      }

      console.warn(
        '[layer1-sync] Live source fetch failed; falling back to CSV mode:',
        error instanceof Error ? error.message : error
      )
      result = buildCsvDataset()
      modeUsed = 'live->csv'
    }
  }

  const summary = buildSummary(result)

  mkdirSync(dirname(jsonOut), { recursive: true })
  writeFileSync(jsonOut, JSON.stringify(summary, null, 2))

  if (!skipDb) {
    await syncToSupabase(result)
  }

  console.log(JSON.stringify({
    mode: modeUsed,
    wroteJson: jsonOut,
    syncedToSupabase: !skipDb,
    coverage: result.coverage,
  }, null, 2))
}

main().catch((error) => {
  console.error('[layer1-sync] Fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
})
