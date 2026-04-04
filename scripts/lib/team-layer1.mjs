const TODAY = new Date().toISOString().slice(0, 10)

export const TEAM_CATALOG = [
  { slug: 'mexico', name: 'Mexico', confederation: 'CONCACAF' },
  { slug: 'south-africa', name: 'South Africa', confederation: 'CAF' },
  { slug: 'south-korea', name: 'South Korea', confederation: 'AFC' },
  { slug: 'denmark', name: 'Denmark', confederation: 'UEFA' },
  { slug: 'switzerland', name: 'Switzerland', confederation: 'UEFA' },
  { slug: 'canada', name: 'Canada', confederation: 'CONCACAF' },
  { slug: 'qatar', name: 'Qatar', confederation: 'AFC' },
  { slug: 'italy', name: 'Italy', confederation: 'UEFA' },
  { slug: 'morocco', name: 'Morocco', confederation: 'CAF' },
  { slug: 'brazil', name: 'Brazil', confederation: 'CONMEBOL' },
  { slug: 'scotland', name: 'Scotland', confederation: 'UEFA' },
  { slug: 'haiti', name: 'Haiti', confederation: 'CONCACAF' },
  { slug: 'usa', name: 'USA', confederation: 'CONCACAF' },
  { slug: 'paraguay', name: 'Paraguay', confederation: 'CONMEBOL' },
  { slug: 'australia', name: 'Australia', confederation: 'AFC' },
  { slug: 'turkey', name: 'Turkey', confederation: 'UEFA' },
  { slug: 'germany', name: 'Germany', confederation: 'UEFA' },
  { slug: 'ivory-coast', name: 'Ivory Coast', confederation: 'CAF' },
  { slug: 'ecuador', name: 'Ecuador', confederation: 'CONMEBOL' },
  { slug: 'curacao', name: 'Curacao', confederation: 'CONCACAF' },
  { slug: 'netherlands', name: 'Netherlands', confederation: 'UEFA' },
  { slug: 'japan', name: 'Japan', confederation: 'AFC' },
  { slug: 'tunisia', name: 'Tunisia', confederation: 'CAF' },
  { slug: 'ukraine', name: 'Ukraine', confederation: 'UEFA' },
  { slug: 'portugal', name: 'Portugal', confederation: 'UEFA' },
  { slug: 'iran', name: 'Iran', confederation: 'AFC' },
  { slug: 'belgium', name: 'Belgium', confederation: 'UEFA' },
  { slug: 'egypt', name: 'Egypt', confederation: 'CAF' },
  { slug: 'spain', name: 'Spain', confederation: 'UEFA' },
  { slug: 'cabo-verde', name: 'Cabo Verde', confederation: 'CAF' },
  { slug: 'saudi-arabia', name: 'Saudi Arabia', confederation: 'AFC' },
  { slug: 'serbia', name: 'Serbia', confederation: 'UEFA' },
  { slug: 'france', name: 'France', confederation: 'UEFA' },
  { slug: 'senegal', name: 'Senegal', confederation: 'CAF' },
  { slug: 'norway', name: 'Norway', confederation: 'UEFA' },
  { slug: 'tbd-playoff-i', name: 'TBD Playoff (I)', confederation: 'TBD' },
  { slug: 'argentina', name: 'Argentina', confederation: 'CONMEBOL' },
  { slug: 'algeria', name: 'Algeria', confederation: 'CAF' },
  { slug: 'austria', name: 'Austria', confederation: 'UEFA' },
  { slug: 'jordan', name: 'Jordan', confederation: 'AFC' },
  { slug: 'colombia', name: 'Colombia', confederation: 'CONMEBOL' },
  { slug: 'cameroon', name: 'Cameroon', confederation: 'CAF' },
  { slug: 'uzbekistan', name: 'Uzbekistan', confederation: 'AFC' },
  { slug: 'tbd-playoff-k', name: 'TBD Playoff (K)', confederation: 'TBD' },
  { slug: 'england', name: 'England', confederation: 'UEFA' },
  { slug: 'ghana', name: 'Ghana', confederation: 'CAF' },
  { slug: 'croatia', name: 'Croatia', confederation: 'UEFA' },
  { slug: 'panama', name: 'Panama', confederation: 'CONCACAF' },
]

export const TEAM_ALIAS_PAIRS = {
  usa: ['United States', 'United States of America', 'US', 'U.S.A.'],
  'south-korea': ['Korea Republic', 'Republic of Korea', 'Korea, South'],
  'ivory-coast': ['Cote d Ivoire', "Cote d'Ivoire", "Côte d'Ivoire"],
  'cabo-verde': ['Cape Verde'],
  curacao: ['Curaçao'],
  turkey: ['Turkiye', 'Türkiye'],
  iran: ['IR Iran', 'Iran IR'],
  netherlands: ['The Netherlands', 'Holland'],
  mexico: ['México'],
  'saudi-arabia': ['Saudi'],
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/%/g, ' pct ')
    .replace(/\//g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeTeamName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

const TEAM_BY_NORMALIZED_NAME = buildTeamIndex()

function buildTeamIndex() {
  const index = new Map()

  for (const team of TEAM_CATALOG) {
    const aliases = new Set([
      team.name,
      team.slug,
      team.slug.replace(/-/g, ' '),
      ...(TEAM_ALIAS_PAIRS[team.slug] ?? []),
    ])

    for (const alias of aliases) {
      const normalized = normalizeTeamName(alias)
      const existing = index.get(normalized)
      if (existing && existing.slug !== team.slug) {
        throw new Error(`Alias collision for "${alias}" between ${existing.slug} and ${team.slug}`)
      }
      index.set(normalized, {
        ...team,
        alias,
        isPlaceholder: team.slug.startsWith('tbd-'),
      })
    }
  }

  return index
}

function parseNumber(value) {
  if (value == null) return null
  const cleaned = String(value).replace(/,/g, '').replace(/%/g, '').trim()
  if (!cleaned) return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value) {
  const parsed = parseNumber(value)
  return parsed == null ? null : Math.trunc(parsed)
}

function getField(row, candidates) {
  const wanted = new Set(candidates.map(normalizeHeader))
  for (const [key, value] of Object.entries(row)) {
    if (wanted.has(normalizeHeader(key))) return value
  }
  return null
}

function collectRows(text) {
  const rows = []
  let currentRow = []
  let currentCell = ''
  let inQuotes = false
  const normalized = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]
    const next = normalized[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  return rows
}

export function parseCsv(text) {
  const rows = collectRows(text)
  if (rows.length === 0) return []

  const headers = rows[0].map((header) => String(header).trim())

  return rows
    .slice(1)
    .filter((row) => row.some((value) => String(value ?? '').trim() !== ''))
    .map((row) =>
      headers.reduce((accumulator, header, index) => {
        accumulator[header] = String(row[index] ?? '').trim()
        return accumulator
      }, {})
    )
}

export function resolveTeam(input) {
  return TEAM_BY_NORMALIZED_NAME.get(normalizeTeamName(input)) ?? null
}

export function buildCanonicalTeamRows() {
  return TEAM_CATALOG.map((team) => ({
    slug: team.slug,
    name: team.name,
    confederation: team.confederation,
    source: 'scoutedge-static',
    source_updated_at: null,
  }))
}

export function buildTeamAliasRows() {
  const aliasRows = []
  const seen = new Set()

  for (const team of TEAM_CATALOG) {
    const aliases = new Set([
      team.name,
      team.slug,
      team.slug.replace(/-/g, ' '),
      ...(TEAM_ALIAS_PAIRS[team.slug] ?? []),
    ])

    for (const alias of aliases) {
      const normalizedAlias = normalizeTeamName(alias)
      if (seen.has(normalizedAlias)) continue
      seen.add(normalizedAlias)
      aliasRows.push({
        alias,
        normalized_alias: normalizedAlias,
        team_slug: team.slug,
        source: 'scoutedge-layer1',
      })
    }
  }

  return aliasRows
}

export function summarizeCoverage(teamSlugs) {
  const eligibleTeams = TEAM_CATALOG.filter((team) => !team.slug.startsWith('tbd-'))
  const covered = new Set(teamSlugs.filter(Boolean))
  const uncoveredTeams = eligibleTeams.filter((team) => !covered.has(team.slug)).map((team) => team.name)

  return {
    coveredTeamCount: covered.size,
    totalEligibleTeams: eligibleTeams.length,
    uncoveredTeams,
    coveragePct: Number(((covered.size / eligibleTeams.length) * 100).toFixed(1)),
  }
}

function toDateOnly(value) {
  if (!value) return TODAY
  return String(value).slice(0, 10)
}

export function parseFbrefTeamStatsCsv(text, options = {}) {
  const rows = parseCsv(text)
  const records = []
  const unresolvedTeams = []

  for (const row of rows) {
    const sourceTeamName = getField(row, ['Squad', 'Team', 'Nation', 'Country'])
    const team = resolveTeam(sourceTeamName)
    if (!team) {
      unresolvedTeams.push(sourceTeamName)
      continue
    }

    records.push({
      team_slug: team.slug,
      source: 'fbref',
      source_team_name: sourceTeamName,
      source_url: options.sourceUrl ?? getField(row, ['Source URL', 'SourceUrl']) ?? null,
      as_of_date: toDateOnly(
        options.asOfDate
          ?? getField(row, ['As Of', 'AsOf', 'Date'])
          ?? getField(row, ['UpdatedAt', 'Updated At'])
      ),
      matches_played: parseNumber(getField(row, ['90s', 'Matches', 'MP'])),
      minutes_played: parseNumber(getField(row, ['Minutes', 'Min'])),
      possession_pct: parseNumber(getField(row, ['Poss', 'Possession'])),
      passes_completed: parseNumber(getField(row, ['Cmp', 'Passes Completed'])),
      passes_attempted: parseNumber(getField(row, ['Att', 'Passes Attempted'])),
      pass_completion_pct: parseNumber(getField(row, ['Cmp%', 'Cmp Pct', 'Pass Completion %'])),
      xg_for: parseNumber(getField(row, ['xG', 'Expected Goals'])),
      xg_against: parseNumber(getField(row, ['xGA', 'Expected Goals Against'])),
      source_updated_at: options.sourceUpdatedAt ?? getField(row, ['UpdatedAt', 'Updated At']) ?? null,
      raw_payload: row,
    })
  }

  return {
    records,
    unresolvedTeams,
    coverage: summarizeCoverage(records.map((record) => record.team_slug)),
  }
}

export function parseEloRatingsCsv(text, options = {}) {
  const rows = parseCsv(text)
  const records = []
  const unresolvedTeams = []

  for (const row of rows) {
    const sourceTeamName = getField(row, ['Team', 'Squad', 'Nation', 'Country'])
    const team = resolveTeam(sourceTeamName)
    if (!team) {
      unresolvedTeams.push(sourceTeamName)
      continue
    }

    records.push({
      team_slug: team.slug,
      source: 'world-football-elo',
      source_team_name: sourceTeamName,
      source_url: options.sourceUrl ?? getField(row, ['Source URL', 'SourceUrl']) ?? null,
      as_of_date: toDateOnly(
        options.asOfDate
          ?? getField(row, ['As Of', 'AsOf', 'Date'])
          ?? getField(row, ['UpdatedAt', 'Updated At'])
      ),
      rating: parseNumber(getField(row, ['Elo', 'Rating'])),
      rating_rank: parseInteger(getField(row, ['Rank', 'Ranking'])),
      rating_scale: options.ratingScale ?? 'elo',
      source_updated_at: options.sourceUpdatedAt ?? getField(row, ['UpdatedAt', 'Updated At']) ?? null,
      raw_payload: row,
    })
  }

  return {
    records,
    unresolvedTeams,
    coverage: summarizeCoverage(records.map((record) => record.team_slug)),
  }
}

export function parseCliArgs(argv) {
  const parsed = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const [flag, inlineValue] = token.split('=')
    const key = flag.slice(2)

    if (inlineValue != null) {
      parsed[key] = inlineValue
      continue
    }

    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      parsed[key] = true
      continue
    }

    parsed[key] = next
    index += 1
  }

  return parsed
}
