import { readFileSync } from 'fs'

import { TEAMS } from '../../data/teams-meta.ts'
import {
  buildMatchDimensionRows,
  buildTeamDimensionRows,
  type Layer1BuildResult,
  type TeamRatingRow,
  type TeamStatRow,
} from './team-data.ts'
import { buildTeamAliasRows, getCanonicalTeamName } from '../team-aliases.ts'
import {
  parseEloRatingsCsv,
  parseFbrefTeamStatsCsv,
} from '../../../scripts/lib/team-layer1.mjs'

const DEFAULT_COMPETITION = 'World Cup 2026'
const DEFAULT_SEASON = '2026'

export interface Layer1CsvDatasetOptions {
  fbrefCsvText: string
  eloCsvText: string
  competition?: string
  season?: string
  fbrefSourceUrl?: string | null
  eloSourceUrl?: string | null
  sourceUpdatedAt?: string
  asOfDate?: string
}

export interface Layer1CsvFileOptions
  extends Omit<Layer1CsvDatasetOptions, 'fbrefCsvText' | 'eloCsvText'> {
  fbrefCsvPath: string
  eloCsvPath: string
}

function computeCoverage(
  stats: TeamStatRow[],
  ratings: TeamRatingRow[]
): Layer1BuildResult['coverage'] {
  const eligibleTeams = TEAMS.filter((team) => !team.slug.startsWith('tbd-playoff-'))
  const excludedTeams = TEAMS.filter((team) => team.slug.startsWith('tbd-playoff-')).map(
    (team) => team.slug
  )
  const statSlugs = new Set(stats.map((row) => row.teamSlug))
  const ratingSlugs = new Set(ratings.map((row) => row.teamSlug))

  return {
    knownTeams: TEAMS.length,
    eligibleTeams: eligibleTeams.length,
    statsCovered: statSlugs.size,
    ratingsCovered: ratingSlugs.size,
    missingStats: eligibleTeams
      .filter((team) => !statSlugs.has(team.slug))
      .map((team) => team.slug),
    missingRatings: eligibleTeams
      .filter((team) => !ratingSlugs.has(team.slug))
      .map((team) => team.slug),
    excludedTeams,
  }
}

export function buildLayer1CsvDataset(
  options: Layer1CsvDatasetOptions
): Layer1BuildResult {
  const sourceUpdatedAt = options.sourceUpdatedAt || new Date().toISOString()
  const asOfDate = options.asOfDate || sourceUpdatedAt.slice(0, 10)
  const competition = options.competition || DEFAULT_COMPETITION
  const season = options.season || DEFAULT_SEASON

  const fbrefResult = parseFbrefTeamStatsCsv(options.fbrefCsvText, {
    asOfDate,
    sourceUrl: options.fbrefSourceUrl ?? null,
    sourceUpdatedAt,
  })
  const eloResult = parseEloRatingsCsv(options.eloCsvText, {
    asOfDate,
    sourceUrl: options.eloSourceUrl ?? null,
    sourceUpdatedAt,
    ratingScale: 'elo',
  })

  if (fbrefResult.unresolvedTeams.length > 0) {
    throw new Error(`Unresolved FBref team aliases: ${fbrefResult.unresolvedTeams.join(', ')}`)
  }

  if (eloResult.unresolvedTeams.length > 0) {
    throw new Error(`Unresolved ELO team aliases: ${eloResult.unresolvedTeams.join(', ')}`)
  }

  const teamStats: TeamStatRow[] = fbrefResult.records.map((record) => ({
    teamSlug: record.team_slug,
    teamName: getCanonicalTeamName(record.team_slug),
    source: record.source,
    sourceUrl: record.source_url || options.fbrefSourceUrl || 'csv-import',
    sourceUpdatedAt: record.source_updated_at || sourceUpdatedAt,
    season,
    competition,
    matchesPlayed: record.matches_played,
    xg: record.xg_for,
    npxg: null,
    possessionPct: record.possession_pct,
    passesCompleted: record.passes_completed,
    passesAttempted: record.passes_attempted,
    passCompletionPct: record.pass_completion_pct,
    progressivePasses: null,
    raw: record.raw_payload,
  }))

  const ratings: TeamRatingRow[] = eloResult.records.flatMap((record) => {
    if (record.rating == null) return []

    return [
      {
        teamSlug: record.team_slug,
        teamName: getCanonicalTeamName(record.team_slug),
        source: record.source,
        sourceUrl: record.source_url || options.eloSourceUrl || 'csv-import',
        sourceUpdatedAt: record.source_updated_at || sourceUpdatedAt,
        ratingType: 'elo',
        ratingValue: record.rating,
        ranking: record.rating_rank,
        delta: null,
        raw: record.raw_payload,
      },
    ]
  })

  return {
    aliasRows: buildTeamAliasRows(),
    teamRows: buildTeamDimensionRows(sourceUpdatedAt),
    matchRows: buildMatchDimensionRows(sourceUpdatedAt),
    teamStats,
    ratings,
    coverage: computeCoverage(teamStats, ratings),
  }
}

export function buildLayer1CsvDatasetFromFiles(
  options: Layer1CsvFileOptions
): Layer1BuildResult {
  return buildLayer1CsvDataset({
    ...options,
    fbrefCsvText: readFileSync(options.fbrefCsvPath, 'utf8'),
    eloCsvText: readFileSync(options.eloCsvPath, 'utf8'),
  })
}
