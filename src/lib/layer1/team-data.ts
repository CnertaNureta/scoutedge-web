import { JSDOM } from 'jsdom'

import { MATCH_FIXTURES } from '../../data/match-fixtures.ts'
import { TEAMS } from '../../data/teams-meta.ts'
import {
  buildTeamAliasRows,
  getCanonicalTeamName,
  normalizeTeamNameKey,
  resolveTeamSlug,
  type TeamAliasRow,
} from '../team-aliases.ts'
import { hashString } from '../utils.ts'

export interface Layer1SourceDocument {
  html: string
  sourceUrl: string
  fetchedAt: string
}

export interface Layer1SourceBundle {
  competition: string
  season: string
  fbref: {
    shooting: Layer1SourceDocument
    passing: Layer1SourceDocument
    possession: Layer1SourceDocument
  }
  elo: Layer1SourceDocument
}

export interface TeamDimensionRow {
  teamSlug: string
  teamName: string
  groupCode: string
  confederation: string
  fifaRanking: number
  source: string
  sourceUpdatedAt: string
}

export interface MatchDimensionRow {
  matchKey: string
  groupCode: string
  round: string
  kickoffUtc: string
  venue: string
  city: string
  homeTeamSlug: string
  awayTeamSlug: string
  source: string
  sourceUpdatedAt: string
}

export interface TeamStatRow {
  teamSlug: string
  teamName: string
  source: string
  sourceUrl: string
  sourceUpdatedAt: string
  season: string
  competition: string
  matchesPlayed: number | null
  xg: number | null
  npxg: number | null
  possessionPct: number | null
  passesCompleted: number | null
  passesAttempted: number | null
  passCompletionPct: number | null
  progressivePasses: number | null
  raw: Record<string, string | number | null>
}

export interface TeamRatingRow {
  teamSlug: string
  teamName: string
  source: string
  sourceUrl: string
  sourceUpdatedAt: string
  ratingType: 'elo'
  ratingValue: number
  ranking: number | null
  delta: number | null
  raw: Record<string, string | number | null>
}

export interface FbrefTemplateRow {
  sourceTeamName: string
  source: string
  sourceUrl: string
  sourceUpdatedAt: string
  season: string
  competition: string
  matchesPlayed: number | null
  xg: number | null
  npxg: number | null
  possessionPct: number | null
  passesCompleted: number | null
  passesAttempted: number | null
  passCompletionPct: number | null
  progressivePasses: number | null
  raw: Record<string, string | number | null>
}

export interface Layer1Coverage {
  knownTeams: number
  eligibleTeams: number
  statsCovered: number
  ratingsCovered: number
  missingStats: string[]
  missingRatings: string[]
  excludedTeams: string[]
}

export interface Layer1BuildResult {
  aliasRows: TeamAliasRow[]
  teamRows: TeamDimensionRow[]
  matchRows: MatchDimensionRow[]
  teamStats: TeamStatRow[]
  ratings: TeamRatingRow[]
  coverage: Layer1Coverage
}

interface ParsedFbrefRow {
  teamSlug: string
  sourceTeamName: string
  stats: Record<string, string | number | null>
}

interface ExtractedFbrefRow {
  rowKey: string
  sourceTeamName: string
  stats: Record<string, string | number | null>
}

interface FbrefFieldSpec {
  outputKey:
    | 'matchesPlayed'
    | 'xg'
    | 'npxg'
    | 'passesCompleted'
    | 'passesAttempted'
    | 'passCompletionPct'
    | 'progressivePasses'
    | 'possessionPct'
  candidates: string[]
}

const FBREF_FIELD_SPECS: Record<'shooting' | 'passing' | 'possession', FbrefFieldSpec[]> = {
  shooting: [
    { outputKey: 'matchesPlayed', candidates: ['games', 'matches', 'minutes_90s'] },
    { outputKey: 'xg', candidates: ['xg'] },
    { outputKey: 'npxg', candidates: ['npxg'] },
  ],
  passing: [
    { outputKey: 'passesCompleted', candidates: ['passes_completed', 'passes_completed_total'] },
    { outputKey: 'passesAttempted', candidates: ['passes', 'passes_total'] },
    { outputKey: 'passCompletionPct', candidates: ['passes_pct', 'pass_cmp_pct'] },
    { outputKey: 'progressivePasses', candidates: ['progressive_passes', 'prog_passes'] },
  ],
  possession: [
    { outputKey: 'possessionPct', candidates: ['poss', 'possession'] },
  ],
}

const FBREF_TABLE_HINTS: Record<'shooting' | 'passing' | 'possession', string[]> = {
  shooting: ['stats_squads_shooting_for', 'squads_shooting', 'shooting'],
  passing: ['stats_squads_passing_for', 'squads_passing', 'passing'],
  possession: ['stats_squads_possession_for', 'squads_possession', 'possession'],
}

const DEFAULT_SOURCE_URLS = {
  fbref: {
    shooting: 'https://fbref.com/en/comps/1/2026/shooting/2026-World-Cup-Stats',
    passing: 'https://fbref.com/en/comps/1/2026/passing/2026-World-Cup-Stats',
    possession: 'https://fbref.com/en/comps/1/2026/possession/2026-World-Cup-Stats',
  },
  elo: 'https://eloratings.net/',
}

function isPlaceholderTeam(teamSlug: string): boolean {
  return teamSlug.startsWith('tbd-playoff-')
}

function createDom(html: string): JSDOM {
  return new JSDOM(html)
}

function collectTables(html: string): Element[] {
  const dom = createDom(html)
  const { document, NodeFilter } = dom.window
  const tables = Array.from(document.querySelectorAll('table'))
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT)

  while (walker.nextNode()) {
    const current = walker.currentNode
    const commentHtml = current.nodeValue
    if (!commentHtml?.includes('<table')) continue
    const commentDom = createDom(`<body>${commentHtml}</body>`)
    tables.push(...Array.from(commentDom.window.document.querySelectorAll('table')))
  }

  return tables
}

function findTableByHint(html: string, hints: string[]): Element | null {
  const tables = collectTables(html)

  return tables.find((table) => {
    const caption = table.querySelector('caption')?.textContent?.toLowerCase() || ''
    const id = (table.getAttribute('id') || '').toLowerCase()

    return hints.some((hint) => id.includes(hint) || caption.includes(hint))
  }) || tables[0] || null
}

function rowText(cell: Element | null): string {
  return cell?.textContent?.replace(/\s+/g, ' ').trim() || ''
}

function rowLinkText(cell: Element | null): string {
  const linkText = cell?.querySelector('a')?.textContent?.replace(/\s+/g, ' ').trim()
  return linkText || rowText(cell)
}

function maybeNumber(value: string): number | null {
  if (!value) return null

  const cleaned = value.replace(/,/g, '').replace(/%$/, '').trim()
  if (!cleaned) return null

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function csvValue(value: string | number | null | undefined): string {
  if (value == null) return ''
  const text = String(value)
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function extractedFbrefRows(html: string, kind: keyof typeof FBREF_FIELD_SPECS): ExtractedFbrefRow[] {
  const table = findTableByHint(html, FBREF_TABLE_HINTS[kind])
  if (!table) return []

  const rows: ExtractedFbrefRow[] = []

  for (const row of Array.from(table.querySelectorAll('tbody tr'))) {
    if (row.classList.contains('thead')) continue

    const teamName =
      rowLinkText(row.querySelector('th[data-stat="team"]')) ||
      rowText(row.querySelector('th')) ||
      rowLinkText(row.querySelector('td[data-stat="team"]'))

    if (!teamName) continue

    const stats: Record<string, string | number | null> = {}
    for (const cell of Array.from(row.querySelectorAll('th[data-stat], td[data-stat]'))) {
      const dataStat = cell.getAttribute('data-stat')
      if (!dataStat) continue
      const text = rowText(cell)
      stats[dataStat] = maybeNumber(text) ?? text
    }

    rows.push({
      rowKey: normalizeTeamNameKey(teamName),
      sourceTeamName: teamName,
      stats,
    })
  }

  return rows
}

function parsedFbrefRows(html: string, kind: keyof typeof FBREF_FIELD_SPECS): ParsedFbrefRow[] {
  return extractedFbrefRows(html, kind).flatMap((row) => {
    const teamSlug = resolveTeamSlug(row.sourceTeamName)
    if (!teamSlug) return []

    return [
      {
        teamSlug,
        sourceTeamName: row.sourceTeamName,
        stats: row.stats,
      },
    ]
  })
}

function statFromCandidates(
  row:
    | Pick<ParsedFbrefRow, 'stats'>
    | Pick<ExtractedFbrefRow, 'stats'>
    | undefined,
  candidates: string[]
): number | null {
  if (!row) return null

  for (const candidate of candidates) {
    const value = row.stats[candidate]
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = maybeNumber(value)
      if (parsed != null) return parsed
    }
  }

  return null
}

export function parseFbrefTeamStats(sourceBundle: Layer1SourceBundle): TeamStatRow[] {
  const shootingRows = new Map(
    parsedFbrefRows(sourceBundle.fbref.shooting.html, 'shooting').map((row) => [row.teamSlug, row])
  )
  const passingRows = new Map(
    parsedFbrefRows(sourceBundle.fbref.passing.html, 'passing').map((row) => [row.teamSlug, row])
  )
  const possessionRows = new Map(
    parsedFbrefRows(sourceBundle.fbref.possession.html, 'possession').map((row) => [row.teamSlug, row])
  )

  const teamSlugs = new Set([
    ...shootingRows.keys(),
    ...passingRows.keys(),
    ...possessionRows.keys(),
  ])

  return Array.from(teamSlugs)
    .sort((left, right) => left.localeCompare(right))
    .map((teamSlug) => {
      const shootingRow = shootingRows.get(teamSlug)
      const passingRow = passingRows.get(teamSlug)
      const possessionRow = possessionRows.get(teamSlug)

      const row: TeamStatRow = {
        teamSlug,
        teamName: getCanonicalTeamName(teamSlug),
        source: 'fbref',
        sourceUrl: sourceBundle.fbref.shooting.sourceUrl,
        sourceUpdatedAt: sourceBundle.fbref.shooting.fetchedAt,
        season: sourceBundle.season,
        competition: sourceBundle.competition,
        matchesPlayed: null,
        xg: null,
        npxg: null,
        possessionPct: null,
        passesCompleted: null,
        passesAttempted: null,
        passCompletionPct: null,
        progressivePasses: null,
        raw: {
          shooting_team_name: shootingRow?.sourceTeamName || null,
          passing_team_name: passingRow?.sourceTeamName || null,
          possession_team_name: possessionRow?.sourceTeamName || null,
        },
      }

      for (const spec of FBREF_FIELD_SPECS.shooting) {
        row[spec.outputKey] = statFromCandidates(shootingRow, spec.candidates)
      }

      for (const spec of FBREF_FIELD_SPECS.passing) {
        row[spec.outputKey] = statFromCandidates(passingRow, spec.candidates)
      }

      for (const spec of FBREF_FIELD_SPECS.possession) {
        row[spec.outputKey] = statFromCandidates(possessionRow, spec.candidates)
      }

      return row
    })
}

export function parseFbrefTemplateRows(sourceBundle: Layer1SourceBundle): FbrefTemplateRow[] {
  const shootingRows = new Map(
    extractedFbrefRows(sourceBundle.fbref.shooting.html, 'shooting').map((row) => [row.rowKey, row])
  )
  const passingRows = new Map(
    extractedFbrefRows(sourceBundle.fbref.passing.html, 'passing').map((row) => [row.rowKey, row])
  )
  const possessionRows = new Map(
    extractedFbrefRows(sourceBundle.fbref.possession.html, 'possession').map((row) => [row.rowKey, row])
  )

  const rowKeys = new Set([
    ...shootingRows.keys(),
    ...passingRows.keys(),
    ...possessionRows.keys(),
  ])

  return Array.from(rowKeys)
    .sort((left, right) => left.localeCompare(right))
    .map((rowKey) => {
      const shootingRow = shootingRows.get(rowKey)
      const passingRow = passingRows.get(rowKey)
      const possessionRow = possessionRows.get(rowKey)

      const row: FbrefTemplateRow = {
        sourceTeamName:
          shootingRow?.sourceTeamName ||
          passingRow?.sourceTeamName ||
          possessionRow?.sourceTeamName ||
          rowKey,
        source: 'fbref',
        sourceUrl: sourceBundle.fbref.shooting.sourceUrl,
        sourceUpdatedAt: sourceBundle.fbref.shooting.fetchedAt,
        season: sourceBundle.season,
        competition: sourceBundle.competition,
        matchesPlayed: null,
        xg: null,
        npxg: null,
        possessionPct: null,
        passesCompleted: null,
        passesAttempted: null,
        passCompletionPct: null,
        progressivePasses: null,
        raw: {
          shooting_team_name: shootingRow?.sourceTeamName || null,
          passing_team_name: passingRow?.sourceTeamName || null,
          possession_team_name: possessionRow?.sourceTeamName || null,
        },
      }

      for (const spec of FBREF_FIELD_SPECS.shooting) {
        row[spec.outputKey] = statFromCandidates(shootingRow, spec.candidates)
      }

      for (const spec of FBREF_FIELD_SPECS.passing) {
        row[spec.outputKey] = statFromCandidates(passingRow, spec.candidates)
      }

      for (const spec of FBREF_FIELD_SPECS.possession) {
        row[spec.outputKey] = statFromCandidates(possessionRow, spec.candidates)
      }

      return row
    })
}

function serializeFbrefCsvLines(
  rows: Array<
    Pick<
      TeamStatRow | FbrefTemplateRow,
      | 'matchesPlayed'
      | 'possessionPct'
      | 'passesCompleted'
      | 'passesAttempted'
      | 'passCompletionPct'
      | 'xg'
      | 'sourceUpdatedAt'
      | 'sourceUrl'
      | 'raw'
    > & {
      teamName?: string
      sourceTeamName?: string
    }
  >
): string {
  const header = ['Squad', '90s', 'Poss', 'Cmp', 'Att', 'Cmp%', 'xG', 'xGA', 'UpdatedAt', 'Source URL']
  const lines = rows.map((row) => {
    const sourceTeamName =
      typeof row.raw.shooting_team_name === 'string'
        ? row.raw.shooting_team_name
        : typeof row.raw.passing_team_name === 'string'
          ? row.raw.passing_team_name
          : typeof row.raw.possession_team_name === 'string'
            ? row.raw.possession_team_name
            : row.sourceTeamName || row.teamName || ''

    return [
      sourceTeamName,
      row.matchesPlayed,
      row.possessionPct,
      row.passesCompleted,
      row.passesAttempted,
      row.passCompletionPct,
      row.xg,
      null,
      row.sourceUpdatedAt,
      row.sourceUrl,
    ]
      .map((value) => csvValue(value))
      .join(',')
  })

  return [header.join(','), ...lines].join('\n') + '\n'
}

export function serializeFbrefTeamStatsCsv(rows: TeamStatRow[]): string {
  return serializeFbrefCsvLines(rows)
}

export function serializeFbrefTemplateRowsCsv(rows: FbrefTemplateRow[]): string {
  return serializeFbrefCsvLines(rows)
}

function headerKey(text: string): string {
  return normalizeTeamNameKey(text).replace(/-/g, '_')
}

function tableHeaders(table: Element): string[] {
  const explicitHeaders = Array.from(table.querySelectorAll('thead th')).map((cell) => rowText(cell))
  if (explicitHeaders.length > 0) return explicitHeaders

  const firstRow = table.querySelector('tr')
  if (!firstRow) return []

  return Array.from(firstRow.querySelectorAll('th, td')).map((cell) => rowText(cell))
}

export function parseEloRatings(sourceBundle: Layer1SourceBundle): TeamRatingRow[] {
  const tables = collectTables(sourceBundle.elo.html)
  const targetTable = tables.find((table) => {
    const headers = tableHeaders(table).map((value) => headerKey(value))
    return (
      headers.some((value) => ['team', 'country', 'nation'].includes(value)) &&
      headers.some((value) => value.includes('elo') || value.includes('rating'))
    )
  }) || tables[0]

  if (!targetTable) return []

  const headers = tableHeaders(targetTable)
  const headerMap = headers.map((value) => headerKey(value))
  const hasExplicitHeader = targetTable.querySelectorAll('thead th').length > 0
  const rows = Array.from(targetTable.querySelectorAll('tr')).filter((row, index) => {
    if (row.closest('thead')) return false
    if (!hasExplicitHeader && index === 0) return false
    return true
  })

  const ratings: TeamRatingRow[] = []

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('th, td')).map((cell) => rowText(cell))
    if (cells.length === 0) continue

    const record: Record<string, string> = {}
    headerMap.forEach((key, index) => {
      record[key] = cells[index] || ''
    })

    const teamName =
      record.team ||
      record.country ||
      record.nation ||
      record.team_name ||
      ''

    const teamSlug = resolveTeamSlug(teamName)
    const rating =
      maybeNumber(record.elo) ??
      maybeNumber(record.rating) ??
      maybeNumber(record.elo_rating)

    if (!teamSlug || rating == null) continue

    ratings.push({
      teamSlug,
      teamName: getCanonicalTeamName(teamSlug),
      source: 'world-football-elo',
      sourceUrl: sourceBundle.elo.sourceUrl,
      sourceUpdatedAt: sourceBundle.elo.fetchedAt,
      ratingType: 'elo',
      ratingValue: rating,
      ranking:
        maybeNumber(record.rank) ??
        maybeNumber(record.rk) ??
        maybeNumber(record.position),
      delta:
        maybeNumber(record.delta) ??
        maybeNumber(record.change) ??
        maybeNumber(record.movement),
      raw: {
        source_team_name: teamName,
        raw_rank: record.rank || record.rk || record.position || null,
      },
    })
  }

  return ratings.sort((left, right) => right.ratingValue - left.ratingValue)
}

export function buildTeamDimensionRows(sourceUpdatedAt: string): TeamDimensionRow[] {
  return TEAMS.map((team) => ({
    teamSlug: team.slug,
    teamName: team.name,
    groupCode: team.group,
    confederation: team.confederation,
    fifaRanking: team.fifaRanking,
    source: 'scoutedge-static',
    sourceUpdatedAt,
  }))
}

export function buildMatchDimensionRows(sourceUpdatedAt: string): MatchDimensionRow[] {
  return MATCH_FIXTURES.map((match) => ({
    matchKey: `${match.group}-${match.homeTeamSlug}-vs-${match.awayTeamSlug}-${match.kickoffUtc}`,
    groupCode: match.group,
    round: match.round,
    kickoffUtc: match.kickoffUtc,
    venue: match.venue,
    city: match.city,
    homeTeamSlug: match.homeTeamSlug,
    awayTeamSlug: match.awayTeamSlug,
    source: 'scoutedge-static',
    sourceUpdatedAt,
  }))
}

export function buildLayer1Dataset(sourceBundle: Layer1SourceBundle): Layer1BuildResult {
  const sourceUpdatedAt = sourceBundle.fbref.shooting.fetchedAt
  const teamStats = parseFbrefTeamStats(sourceBundle)
  const ratings = parseEloRatings(sourceBundle)
  const eligibleTeams = TEAMS.filter((team) => !isPlaceholderTeam(team.slug))
  const statsCovered = new Set(
    teamStats.map((row) => row.teamSlug).filter((teamSlug) => !isPlaceholderTeam(teamSlug))
  )
  const ratingsCovered = new Set(
    ratings.map((row) => row.teamSlug).filter((teamSlug) => !isPlaceholderTeam(teamSlug))
  )

  return {
    aliasRows: buildTeamAliasRows(),
    teamRows: buildTeamDimensionRows(sourceUpdatedAt),
    matchRows: buildMatchDimensionRows(sourceUpdatedAt),
    teamStats,
    ratings,
    coverage: {
      knownTeams: TEAMS.length,
      eligibleTeams: eligibleTeams.length,
      statsCovered: statsCovered.size,
      ratingsCovered: ratingsCovered.size,
      missingStats: eligibleTeams
        .filter((team) => !statsCovered.has(team.slug))
        .map((team) => team.slug),
      missingRatings: eligibleTeams
        .filter((team) => !ratingsCovered.has(team.slug))
        .map((team) => team.slug),
      excludedTeams: TEAMS.filter((team) => isPlaceholderTeam(team.slug)).map((team) => team.slug),
    },
  }
}

function fixtureTeamName(teamSlug: string): string {
  const aliases: Record<string, string> = {
    usa: 'United States',
    'south-korea': 'Korea Republic',
    'ivory-coast': 'Côte d\'Ivoire',
    curacao: 'Curaçao',
    'cabo-verde': 'Cape Verde Islands',
    iran: 'IR Iran',
    turkey: 'Türkiye',
  }

  return aliases[teamSlug] || getCanonicalTeamName(teamSlug)
}

function fixtureFbrefNumbers(teamSlug: string) {
  const seed = hashString(teamSlug)
  const xg = Number((3.4 + (seed % 35) / 10).toFixed(1))
  const npxg = Number((Math.max(2.8, xg - 0.5)).toFixed(1))
  const possessionPct = Number((41 + (seed % 24)).toFixed(1))
  const passesAttempted = 1050 + (seed % 520)
  const passesCompleted = Math.round(passesAttempted * (0.72 + (seed % 13) / 100))
  const passCompletionPct = Number(((passesCompleted / passesAttempted) * 100).toFixed(1))
  const progressivePasses = 52 + (seed % 46)

  return {
    matchesPlayed: 3,
    xg,
    npxg,
    possessionPct,
    passesAttempted,
    passesCompleted,
    passCompletionPct,
    progressivePasses,
  }
}

function fixtureEloNumbers(teamSlug: string, fifaRanking: number) {
  const seed = hashString(teamSlug)
  const ratingValue = Math.round(1750 - fifaRanking * 4 + (seed % 45))
  const delta = (seed % 9) - 4

  return {
    ratingValue,
    delta,
  }
}

function buildFbrefTableHtml(
  kind: keyof typeof FBREF_FIELD_SPECS,
  fetchedAt: string
): Layer1SourceDocument {
  const rows = TEAMS.filter((team) => !isPlaceholderTeam(team.slug)).map((team) => {
    const values = fixtureFbrefNumbers(team.slug)
    const teamName = fixtureTeamName(team.slug)

    if (kind === 'shooting') {
      return `
        <tr>
          <th data-stat="team">${teamName}</th>
          <td data-stat="games">${values.matchesPlayed}</td>
          <td data-stat="xg">${values.xg.toFixed(1)}</td>
          <td data-stat="npxg">${values.npxg.toFixed(1)}</td>
        </tr>
      `
    }

    if (kind === 'passing') {
      return `
        <tr>
          <th data-stat="team">${teamName}</th>
          <td data-stat="passes_completed">${values.passesCompleted}</td>
          <td data-stat="passes">${values.passesAttempted}</td>
          <td data-stat="passes_pct">${values.passCompletionPct.toFixed(1)}</td>
          <td data-stat="progressive_passes">${values.progressivePasses}</td>
        </tr>
      `
    }

    return `
      <tr>
        <th data-stat="team">${teamName}</th>
        <td data-stat="poss">${values.possessionPct.toFixed(1)}</td>
      </tr>
    `
  }).join('\n')

  const tableId = {
    shooting: 'stats_squads_shooting_for',
    passing: 'stats_squads_passing_for',
    possession: 'stats_squads_possession_for',
  }[kind]

  return {
    html: `
      <html>
        <body>
          <!--
            <table id="${tableId}">
              <caption>${kind} squad stats</caption>
              <tbody>
                ${rows}
              </tbody>
            </table>
          -->
        </body>
      </html>
    `,
    sourceUrl: DEFAULT_SOURCE_URLS.fbref[kind],
    fetchedAt,
  }
}

function buildEloHtml(fetchedAt: string): Layer1SourceDocument {
  const sortedTeams = [...TEAMS]
    .filter((team) => !isPlaceholderTeam(team.slug))
    .map((team) => ({
      teamSlug: team.slug,
      teamName: fixtureTeamName(team.slug),
      ...fixtureEloNumbers(team.slug, team.fifaRanking),
    }))
    .sort((left, right) => right.ratingValue - left.ratingValue)

  const rows = sortedTeams.map((team, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${team.teamName}</td>
      <td>${team.ratingValue}</td>
      <td>${team.delta}</td>
    </tr>
  `).join('\n')

  return {
    html: `
      <html>
        <body>
          <table id="elo_ratings">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Country</th>
                <th>Elo</th>
                <th>Delta</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `,
    sourceUrl: DEFAULT_SOURCE_URLS.elo,
    fetchedAt,
  }
}

export function createFixtureLayer1SourceBundle(
  fetchedAt = '2026-03-31T00:00:00Z'
): Layer1SourceBundle {
  return {
    competition: 'World Cup 2026',
    season: '2026',
    fbref: {
      shooting: buildFbrefTableHtml('shooting', fetchedAt),
      passing: buildFbrefTableHtml('passing', fetchedAt),
      possession: buildFbrefTableHtml('possession', fetchedAt),
    },
    elo: buildEloHtml(fetchedAt),
  }
}
