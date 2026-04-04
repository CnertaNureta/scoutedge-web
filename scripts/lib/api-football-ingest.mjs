import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../..')
const DEFAULT_ARTIFACT_ROOT = path.join(ROOT_DIR, 'logs', 'api-football')
const API_BASE = 'https://v3.football.api-sports.io'
const SUPABASE_SELECT_PAGE_SIZE = 1000

export const AVAILABLE_SOURCES = ['teams', 'matches', 'standings', 'squads']
export const AVAILABLE_PHASES = ['fetch', 'normalize', 'upsert']
export const SOURCE_ALIASES = {
  fixtures: 'matches',
  players: 'squads',
}

const DEFAULT_OPTIONS = {
  leagueId: 1,
  season: 2026,
  maxRequests: 95,
  rateDelayMs: 1250,
  artifactRoot: DEFAULT_ARTIFACT_ROOT,
  forceRefresh: false,
  dryRun: false,
  verbose: false,
  sources: [...AVAILABLE_SOURCES],
  phases: [...AVAILABLE_PHASES],
  teamIds: [],
}

const HELP_TEXT = `Usage:
  node scripts/fetch-api-football.mjs
  node scripts/fetch-api-football.mjs --source teams,squads --phase fetch,normalize
  node scripts/fetch-api-football.mjs --source squads --phase normalize,upsert --dry-run
  node scripts/fetch-api-football.mjs --source squads --team-id 33,34 --phase fetch --force-refresh

Options:
  --source <list>         teams,matches,standings,squads (aliases: fixtures,players)
  --phase <list>          fetch,normalize,upsert
  --league <id>           league identifier (default: 1)
  --season <year>         season year (default: 2026)
  --team-id <list>        optional team ids for partial squad fetch/normalize/upsert scope
  --max-requests <n>      stop before exceeding API budget (default: 95)
  --rate-delay-ms <n>     wait time between API calls (default: 1250)
  --artifact-root <path>  where raw/normalized artifacts and state are stored
  --force-refresh         ignore resumable squad artifacts and start clean
  --dry-run               use an in-memory sink for upsert and skip Supabase env requirements
  --verbose               print additional logs
  --help                  show this message

Environment:
  .env.local / .env are auto-loaded when present
  API_FOOTBALL_KEY
  NEXT_PUBLIC_SUPABASE_URL (not required with --dry-run)
  SUPABASE_SERVICE_ROLE_KEY (not required with --dry-run)
`

export class RateLimitBudgetError extends Error {
  constructor(message, meta = {}) {
    super(message)
    this.name = 'RateLimitBudgetError'
    this.meta = meta
  }
}

export function parseCliArgs(argv, config = {}) {
  const options = { ...DEFAULT_OPTIONS }
  const artifactRootCwd = config.artifactRootCwd || ROOT_DIR

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--force-refresh') {
      options.forceRefresh = true
      continue
    }

    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg === '--verbose') {
      options.verbose = true
      continue
    }

    const nextValue = argv[index + 1]
    if (nextValue == null) {
      throw new Error(`Missing value for ${arg}`)
    }

    switch (arg) {
      case '--source':
        options.sources = parseList(nextValue, AVAILABLE_SOURCES, SOURCE_ALIASES, 'source')
        index++
        break
      case '--phase':
        options.phases = parseList(nextValue, AVAILABLE_PHASES, {}, 'phase')
        index++
        break
      case '--league':
        options.leagueId = parsePositiveInt(nextValue, 'league')
        index++
        break
      case '--season':
        options.season = parsePositiveInt(nextValue, 'season')
        index++
        break
      case '--team-id':
        options.teamIds = dedupeNumbers(
          nextValue
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => parsePositiveInt(value, 'team-id'))
        )
        index++
        break
      case '--max-requests':
        options.maxRequests = parsePositiveInt(nextValue, 'max-requests')
        index++
        break
      case '--rate-delay-ms':
        options.rateDelayMs = parsePositiveInt(nextValue, 'rate-delay-ms')
        index++
        break
      case '--artifact-root':
        options.artifactRoot = resolveArtifactRootPath(nextValue, artifactRootCwd)
        index++
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return options
}

export function printHelp() {
  console.log(HELP_TEXT)
}

function stripWrappedQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim()
  const doubleQuotedMatch = trimmed.match(/^"([\s\S]*)"(?:\s+#.*)?$/)
  if (doubleQuotedMatch) {
    return doubleQuotedMatch[1]
  }

  const singleQuotedMatch = trimmed.match(/^'([\s\S]*)'(?:\s+#.*)?$/)
  if (singleQuotedMatch) {
    return singleQuotedMatch[1]
  }

  return stripWrappedQuotes(trimmed.replace(/\s+#.*$/, '').trim())
}

function normalizeEnvKey(rawKey) {
  const trimmed = rawKey.trim()
  if (trimmed.startsWith('export ')) {
    return trimmed.slice('export '.length).trim()
  }
  return trimmed
}

export function loadProjectEnv({ fsModule = fs, cwd = ROOT_DIR } = {}) {
  const loadedFiles = []

  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(cwd, filename)
    if (!fsModule.existsSync(filePath)) {
      continue
    }

    const contents = fsModule.readFileSync(filePath, 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex <= 0) {
        continue
      }

      const key = normalizeEnvKey(trimmed.slice(0, separatorIndex))
      const rawValue = trimmed.slice(separatorIndex + 1).trim()
      if (!key || process.env[key] != null) {
        continue
      }

      process.env[key] = parseEnvValue(rawValue)
    }

    loadedFiles.push(filePath)
  }

  return loadedFiles
}

export function createLogger(verbose = false) {
  function write(level, message, meta) {
    const timestamp = new Date().toISOString()
    const printer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    const suffix = meta ? ` ${JSON.stringify(meta)}` : ''
    printer(`[api-football][${timestamp}][${level}] ${message}${suffix}`)
  }

  return {
    info(message, meta) {
      write('info', message, meta)
    },
    warn(message, meta) {
      write('warn', message, meta)
    },
    error(message, meta) {
      write('error', message, meta)
    },
    debug(message, meta) {
      if (verbose) {
        write('debug', message, meta)
      }
    },
  }
}

function parseList(rawValue, allowed, aliases, label) {
  const normalized = rawValue.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
  if (normalized.length === 0 || normalized.includes('all')) {
    return [...allowed]
  }

  return normalized.reduce((acc, item) => {
    const resolved = aliases[item] || item
    if (!allowed.includes(resolved)) {
      throw new Error(`Unsupported ${label}: ${item}`)
    }
    if (!acc.includes(resolved)) {
      acc.push(resolved)
    }
    return acc
  }, [])
}

export function parsePositiveInt(value, label) {
  const normalized = String(value).trim()
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a positive integer`)
  }

  const parsed = Number(normalized)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`)
  }
  return parsed
}

function parseStrictPositiveIntOrNull(value) {
  const normalized = String(value ?? '').trim()
  if (!/^\d+$/.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function dedupeNumbers(values) {
  return [...new Set(values)]
}

export function resolveArtifactRootPath(rawPath, cwd = ROOT_DIR) {
  if (!rawPath) {
    return rawPath
  }

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath)
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowIso() {
  return new Date().toISOString()
}

function formatApiFootballLogicalError(endpoint, apiErrors, params = {}) {
  const baseMessage = `API-Football reported errors for ${endpoint}: ${apiErrors.join('; ')}`
  const joinedErrors = apiErrors.join(' ')
  const season = parseStrictPositiveIntOrNull(params?.season)

  if (/Free plans do not have access to this season/i.test(joinedErrors) && season === 2026) {
    return `${baseMessage} Free-tier fallback: rerun with --league 1 --season 2022, or use npm run ingest:api-football:free-tier.`
  }

  return baseMessage
}

function getApiFootballLogicalRateLimitWaitMs(apiErrors, rateDelayMs, attempt) {
  const joinedErrors = apiErrors.join(' ')
  if (!/too many requests/i.test(joinedErrors)) {
    return null
  }

  if (/requests per minute/i.test(joinedErrors)) {
    return Math.max(rateDelayMs * attempt, 60_000)
  }

  return Math.max(rateDelayMs * attempt, rateDelayMs)
}

function getArtifactPaths(options) {
  const runDir = path.join(options.artifactRoot, `${options.leagueId}-${options.season}`)
  return {
    runDir,
    stateFile: path.join(runDir, 'state.json'),
    summaryFile: path.join(runDir, 'last-run.json'),
    rawDir: path.join(runDir, 'raw'),
    normalizedDir: path.join(runDir, 'normalized'),
    rawFile(source) {
      return path.join(runDir, 'raw', `${source}.json`)
    },
    normalizedFile(source) {
      return path.join(runDir, 'normalized', `${source}.json`)
    },
  }
}

function ensureDir(fsModule, dirPath) {
  fsModule.mkdirSync(dirPath, { recursive: true })
}

function writeJson(fsModule, filePath, value) {
  ensureDir(fsModule, path.dirname(filePath))
  fsModule.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function readJson(fsModule, filePath, fallback = null) {
  if (!fsModule.existsSync(filePath)) return fallback
  try {
    return JSON.parse(fsModule.readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`Failed to parse JSON artifact at ${filePath}: ${error.message}`)
  }
}

function createInitialState(options) {
  return {
    version: 1,
    source: 'api-football',
    leagueId: options.leagueId,
    season: options.season,
    updatedAt: null,
    sources: {},
    lastRun: null,
  }
}

function updateState(state, source, phase, patch) {
  const nextState = state
  nextState.updatedAt = nowIso()
  nextState.sources[source] ||= {}
  const previousPhaseState = nextState.sources[source][phase] || {}
  const nextPhaseState = {
    ...previousPhaseState,
    ...patch,
    updatedAt: nextState.updatedAt,
  }

  if (patch.status === 'running' || patch.status === 'completed') {
    delete nextPhaseState.error
    delete nextPhaseState.failedAt
  }

  nextState.sources[source][phase] = nextPhaseState
  return nextState
}

function mergeRaw(a, b) {
  return { ...(a || {}), ...(b || {}) }
}

function isPresent(value) {
  return value !== undefined && value !== null && value !== ''
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0
}

function coalesce(...values) {
  return values.find((value) => isPresent(value)) ?? null
}

function countDefinedValues(row) {
  return Object.values(row).reduce((sum, value) => sum + (isPresent(value) ? 1 : 0), 0)
}

function parseTimestampMs(value) {
  if (!isPresent(value)) {
    return Number.NEGATIVE_INFINITY
  }

  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function buildCompositeKey(row, columns, valueTransform = (value) => value) {
  return columns.map((column) => JSON.stringify(valueTransform(row?.[column] ?? null))).join('::')
}

function stripNullishFields(row, requiredColumns = []) {
  return Object.entries(row || {}).reduce((acc, [key, value]) => {
    if (requiredColumns.includes(key) || value !== null && value !== undefined) {
      acc[key] = value
    }
    return acc
  }, {})
}

function dedupeRows(rows, keySelector, merger = mergeEntityRows) {
  const map = new Map()

  for (const row of rows) {
    const key = keySelector(row)
    if (!isPresent(key)) continue
    const existing = map.get(key)
    map.set(key, existing ? merger(existing, row) : row)
  }

  return [...map.values()]
}

function mergeEntityRows(existing, incoming) {
  const merged = { ...existing }

  for (const [key, value] of Object.entries(incoming)) {
    if (key === 'raw') continue
    if (!isPresent(merged[key]) || countDefinedValues({ [key]: value }) > countDefinedValues({ [key]: merged[key] })) {
      if (isPresent(value)) {
        merged[key] = value
      }
    }
  }

  merged.raw = mergeRaw(existing.raw, incoming.raw)
  merged.last_fetched_at = coalesce(incoming.last_fetched_at, existing.last_fetched_at)
  return merged
}

function buildTeamRowFromTeamResponse(entry, fetchedAt) {
  const team = entry?.team || {}
  const venue = entry?.venue || {}
  return {
    team_id: team.id,
    source: 'api-football',
    name: team.name || null,
    code: team.code || null,
    country: team.country || null,
    national: team.national ?? null,
    founded: team.founded ?? null,
    logo_url: team.logo || null,
    venue_name: venue.name || null,
    venue_address: venue.address || null,
    venue_city: venue.city || null,
    venue_capacity: venue.capacity ?? null,
    venue_surface: venue.surface || null,
    venue_image_url: venue.image || null,
    last_fetched_at: fetchedAt,
    raw: {
      team,
      venue,
    },
    updated_at: fetchedAt,
  }
}

function buildTeamStub(team, fetchedAt, rawContext = {}) {
  return stripNullishFields({
    team_id: team?.id ?? team?.teamId ?? null,
    source: 'api-football',
    name: team?.name || null,
    code: team?.code || null,
    country: team?.country || null,
    national: team?.national ?? null,
    founded: team?.founded ?? null,
    logo_url: team?.logo || null,
    venue_name: null,
    venue_address: null,
    venue_city: null,
    venue_capacity: null,
    venue_surface: null,
    venue_image_url: null,
    last_fetched_at: fetchedAt,
    raw: rawContext,
    updated_at: fetchedAt,
  }, ['team_id', 'source', 'last_fetched_at', 'raw', 'updated_at'])
}

function shouldMaterializeTeamRow(team) {
  return isPositiveInteger(team?.id ?? team?.teamId) && isPresent(team?.name)
}

function shouldMaterializePlayerRow(player) {
  return isPositiveInteger(player?.id) && isPresent(player?.name)
}

function shouldMaterializeSquadRow(row) {
  return (
    isPositiveInteger(row?.team_id) &&
    isPositiveInteger(row?.player_id) &&
    isPositiveInteger(row?.season)
  )
}

function shouldMaterializeMatchRow(row, options = {}) {
  return (
    isPositiveInteger(row?.fixture_id) &&
    isPositiveInteger(row?.league_id) &&
    isPositiveInteger(row?.season) &&
    options.hasHomeTeam !== false &&
    options.hasAwayTeam !== false
  )
}

function shouldMaterializeStandingRow(row, options = {}) {
  return (
    isPositiveInteger(row?.league_id) &&
    isPositiveInteger(row?.season) &&
    isPositiveInteger(row?.team_id) &&
    typeof row?.standing_group === 'string' &&
    options.hasTeam !== false
  )
}

function buildPlayerRowFromSquadPlayer(player, fetchedAt) {
  return {
    player_id: player?.id ?? null,
    source: 'api-football',
    name: player?.name || null,
    firstname: null,
    lastname: null,
    age: player?.age ?? null,
    birth_date: null,
    birth_place: null,
    birth_country: null,
    nationality: null,
    height: null,
    weight: null,
    injured: null,
    photo_url: player?.photo || null,
    last_fetched_at: fetchedAt,
    raw: player || {},
    updated_at: fetchedAt,
  }
}

function buildSquadRow(teamId, season, player, fetchedAt) {
  return {
    team_id: teamId,
    player_id: player?.id ?? null,
    season,
    jersey_number: player?.number ?? null,
    position: player?.position || null,
    age: player?.age ?? null,
    last_fetched_at: fetchedAt,
    raw: player || {},
    updated_at: fetchedAt,
  }
}

export function normalizeTeamsPayload(input = {}) {
  const {
    rawTeams = null,
    rawMatches = null,
    rawStandings = null,
    fetchedAt = nowIso(),
  } = input
  const rows = []
  let skippedTeamCount = 0

  for (const entry of rawTeams?.response || []) {
    const row = buildTeamRowFromTeamResponse(entry, fetchedAt)
    if (shouldMaterializeTeamRow({ id: row.team_id, name: row.name })) {
      rows.push(row)
    } else {
      skippedTeamCount += 1
    }
  }

  for (const fixture of rawMatches?.response || []) {
    const homeRow = buildTeamStub(fixture?.teams?.home, fetchedAt, { fixture })
    const awayRow = buildTeamStub(fixture?.teams?.away, fetchedAt, { fixture })
    if (shouldMaterializeTeamRow({ id: homeRow.team_id, name: homeRow.name })) {
      rows.push(homeRow)
    } else if (fixture?.teams?.home != null) {
      skippedTeamCount += 1
    }
    if (shouldMaterializeTeamRow({ id: awayRow.team_id, name: awayRow.name })) {
      rows.push(awayRow)
    } else if (fixture?.teams?.away != null) {
      skippedTeamCount += 1
    }
  }

  for (const standingBlock of rawStandings?.response || []) {
    for (const groupRows of standingBlock?.league?.standings || []) {
      for (const row of groupRows || []) {
        const teamRow = buildTeamStub(row?.team, fetchedAt, { standing: row })
        if (shouldMaterializeTeamRow({ id: teamRow.team_id, name: teamRow.name })) {
          rows.push(teamRow)
        } else if (row?.team != null) {
          skippedTeamCount += 1
        }
      }
    }
  }

  const deduped = dedupeRows(rows, (row) => row.team_id)
  return {
    source: 'teams',
    normalizedAt: fetchedAt,
    rows: deduped,
    stats: {
      teamCount: deduped.length,
      skippedTeamCount,
    },
  }
}

export function normalizeSquadsPayload(input = {}) {
  const { rawSquads = null, fetchedAt = nowIso(), season, requestedTeamIds = [] } = input
  const teamRows = []
  const playerRows = []
  const squadRows = []
  const scopeTeamIds = []
  let skippedPlayerCount = 0
  let skippedSquadCount = 0

  for (const [bundleKey, bundle] of Object.entries(rawSquads?.teams || {})) {
    const parsedBundleKey = parseStrictPositiveIntOrNull(bundleKey)
    const bundleTeamId =
      bundle?.team?.id ??
      bundle?.team?.teamId ??
      parsedBundleKey
    if (isPositiveInteger(bundleTeamId)) {
      scopeTeamIds.push(bundleTeamId)
    }

    if (bundle?.team && shouldMaterializeTeamRow(bundle.team)) {
      teamRows.push(buildTeamStub(bundle.team, fetchedAt, { squadTeam: bundle.team }))
    }

    const responseEntries = bundle?.response || []

    for (const entry of responseEntries) {
      if (isPositiveInteger(entry?.team?.id ?? entry?.team?.teamId)) {
        scopeTeamIds.push(entry.team.id ?? entry.team.teamId)
      }

      if (entry?.team && shouldMaterializeTeamRow(entry.team)) {
        teamRows.push(buildTeamStub(entry.team, fetchedAt, { squadTeam: entry.team }))
      }

      for (const player of entry?.players || []) {
        const hasTeamRow =
          shouldMaterializeTeamRow(entry?.team) || shouldMaterializeTeamRow(bundle?.team)
        const hasPlayerRow = shouldMaterializePlayerRow(player)
        const playerRow = buildPlayerRowFromSquadPlayer(player, fetchedAt)
        const squadRow = buildSquadRow(entry?.team?.id ?? bundle?.team?.id ?? null, season, player, fetchedAt)

        if (hasPlayerRow) {
          playerRows.push(playerRow)
        } else {
          skippedPlayerCount += 1
        }

        if (hasTeamRow && hasPlayerRow && shouldMaterializeSquadRow(squadRow)) {
          squadRows.push(squadRow)
        } else {
          skippedSquadCount += 1
        }
      }
    }
  }

  const dedupedTeamRows = dedupeRows(teamRows, (row) => row.team_id)
  const dedupedPlayerRows = dedupeRows(playerRows, (row) => row.player_id)
  const dedupedSquadRows = dedupeRows(squadRows, (row) => `${row.team_id}:${row.player_id}:${row.season}`)
  const dedupedScopeTeamIds = dedupeNumbers(scopeTeamIds.filter((teamId) => isPositiveInteger(teamId)))

  return {
    source: 'squads',
    normalizedAt: fetchedAt,
    requestedTeamIds: dedupeNumbers(requestedTeamIds.filter((teamId) => isPositiveInteger(teamId))),
    scopeTeamIds: dedupedScopeTeamIds,
    teamRows: dedupedTeamRows,
    playerRows: dedupedPlayerRows,
    squadRows: dedupedSquadRows,
    stats: {
      teamCount: dedupedTeamRows.length,
      playerCount: dedupedPlayerRows.length,
      squadCount: dedupedSquadRows.length,
      skippedPlayerCount,
      skippedSquadCount,
    },
  }
}

function collectRawSquadBundleTeamIds(bundleKey, bundle) {
  const candidateIds = [
    parseStrictPositiveIntOrNull(bundleKey),
    parseStrictPositiveIntOrNull(bundle?.team?.id),
    parseStrictPositiveIntOrNull(bundle?.team?.teamId),
  ]

  for (const entry of bundle?.response || []) {
    candidateIds.push(parseStrictPositiveIntOrNull(entry?.team?.id))
    candidateIds.push(parseStrictPositiveIntOrNull(entry?.team?.teamId))
  }

  return dedupeNumbers(candidateIds.filter((teamId) => Number.isInteger(teamId)))
}

function getRawSquadArtifactErrorTeamIds(rawSquads, scopedTeamIds = null) {
  const scopedTeamIdSet =
    scopedTeamIds == null ? null : new Set(scopedTeamIds.map((teamId) => String(teamId)))
  const completedTeamIds = new Set(
    Object.entries(rawSquads?.teams || {})
      .flatMap(([bundleKey, bundle]) => collectRawSquadBundleTeamIds(bundleKey, bundle))
      .map((teamId) => String(teamId))
  )

  return dedupeNumbers(
    Object.keys(rawSquads?.errors || {})
      .filter((teamId) => {
        if (completedTeamIds.has(String(teamId))) {
          return false
        }

        if (scopedTeamIdSet == null) {
          return true
        }

        return scopedTeamIdSet.has(String(teamId))
      })
      .map((teamId) => parseStrictPositiveIntOrNull(teamId))
      .filter((teamId) => Number.isInteger(teamId))
  )
}

function scopeRawSquadsArtifact(rawSquads, teamIds = []) {
  if (teamIds.length === 0) {
    return rawSquads
  }

  const requestedTeamIdSet = new Set(teamIds.map((teamId) => String(teamId)))
  const scopedTeams = Object.fromEntries(
    Object.entries(rawSquads?.teams || {}).filter(([bundleKey, bundle]) =>
      collectRawSquadBundleTeamIds(bundleKey, bundle).some((teamId) => requestedTeamIdSet.has(String(teamId)))
    )
  )
  const scopedErrors = Object.fromEntries(
    Object.entries(rawSquads?.errors || {}).filter(([teamId]) => requestedTeamIdSet.has(String(teamId)))
  )
  const completedScopedTeamIds = new Set(
    Object.entries(scopedTeams)
      .flatMap(([bundleKey, bundle]) => collectRawSquadBundleTeamIds(bundleKey, bundle))
      .map((teamId) => String(teamId))
  )
  const missingRequestedTeamIds = teamIds.filter((teamId) => !completedScopedTeamIds.has(String(teamId)))

  if (missingRequestedTeamIds.length > 0) {
    throw new Error(
      `Missing raw squad artifacts for requested team ids: ${missingRequestedTeamIds.join(', ')}. Run fetch for squads with --team-id first.`
    )
  }

  return {
    ...(rawSquads || {}),
    teams: scopedTeams,
    errors: scopedErrors,
  }
}

function scopeNormalizedSquadsArtifact(normalized, teamIds = []) {
  if (!normalized || teamIds.length === 0) {
    return normalized
  }

  const requestedTeamIdSet = new Set(teamIds)
  const scopedTeamRows = (normalized.teamRows || []).filter((row) => requestedTeamIdSet.has(row?.team_id))
  const scopedSquadRows = (normalized.squadRows || []).filter((row) => requestedTeamIdSet.has(row?.team_id))
  const requestedPlayerIds = new Set(
    scopedSquadRows.map((row) => row?.player_id).filter((playerId) => Number.isInteger(playerId))
  )
  const scopedPlayerRows = (normalized.playerRows || []).filter((row) => requestedPlayerIds.has(row?.player_id))

  return {
    ...normalized,
    scopeTeamIds: dedupeNumbers(
      scopedSquadRows.map((row) => row?.team_id).filter((teamId) => Number.isInteger(teamId))
    ),
    teamRows: scopedTeamRows,
    playerRows: scopedPlayerRows,
    squadRows: scopedSquadRows,
    stats: {
      ...(normalized.stats || {}),
      teamCount: scopedTeamRows.length,
      playerCount: scopedPlayerRows.length,
      squadCount: scopedSquadRows.length,
    },
  }
}

export function normalizeMatchesPayload(input = {}) {
  const { rawMatches = null, fetchedAt = nowIso() } = input
  const teamRows = []
  const matchRows = []
  let skippedTeamCount = 0
  let skippedMatchCount = 0

  for (const fixture of rawMatches?.response || []) {
    const homeRow = buildTeamStub(fixture?.teams?.home, fetchedAt, { fixture })
    const awayRow = buildTeamStub(fixture?.teams?.away, fetchedAt, { fixture })
    const hasHomeTeamRow = shouldMaterializeTeamRow({ id: homeRow.team_id, name: homeRow.name })
    const hasAwayTeamRow = shouldMaterializeTeamRow({ id: awayRow.team_id, name: awayRow.name })

    if (hasHomeTeamRow) {
      teamRows.push(homeRow)
    } else if (fixture?.teams?.home != null) {
      skippedTeamCount += 1
    }
    if (hasAwayTeamRow) {
      teamRows.push(awayRow)
    } else if (fixture?.teams?.away != null) {
      skippedTeamCount += 1
    }

    const matchRow = {
      fixture_id: fixture?.fixture?.id ?? null,
      source: 'api-football',
      league_id: fixture?.league?.id ?? null,
      league_name: fixture?.league?.name || null,
      season: fixture?.league?.season ?? null,
      round: fixture?.league?.round || null,
      timezone: fixture?.fixture?.timezone || null,
      kickoff_at: fixture?.fixture?.date || null,
      referee: fixture?.fixture?.referee || null,
      status_long: fixture?.fixture?.status?.long || null,
      status_short: fixture?.fixture?.status?.short || null,
      status_elapsed: fixture?.fixture?.status?.elapsed ?? null,
      venue_name: fixture?.fixture?.venue?.name || null,
      venue_city: fixture?.fixture?.venue?.city || null,
      home_team_id: fixture?.teams?.home?.id ?? null,
      away_team_id: fixture?.teams?.away?.id ?? null,
      home_goals: fixture?.goals?.home ?? null,
      away_goals: fixture?.goals?.away ?? null,
      home_winner: fixture?.teams?.home?.winner ?? null,
      away_winner: fixture?.teams?.away?.winner ?? null,
      last_fetched_at: fetchedAt,
      raw: fixture || {},
      updated_at: fetchedAt,
    }

    if (shouldMaterializeMatchRow(matchRow, { hasHomeTeam: hasHomeTeamRow, hasAwayTeam: hasAwayTeamRow })) {
      matchRows.push(matchRow)
    } else if (fixture?.fixture != null) {
      skippedMatchCount += 1
    }
  }

  const dedupedTeamRows = dedupeRows(teamRows, (row) => row.team_id)
  const dedupedMatchRows = dedupeRows(matchRows, (row) => row.fixture_id)

  return {
    source: 'matches',
    normalizedAt: fetchedAt,
    teamRows: dedupedTeamRows,
    matchRows: dedupedMatchRows,
    stats: {
      teamCount: dedupedTeamRows.length,
      matchCount: dedupedMatchRows.length,
      skippedTeamCount,
      skippedMatchCount,
    },
  }
}

export function normalizeStandingsPayload(input = {}) {
  const { rawStandings = null, fetchedAt = nowIso() } = input
  const teamRows = []
  const standingRows = []
  let skippedTeamCount = 0
  let skippedStandingCount = 0

  for (const standingBlock of rawStandings?.response || []) {
    const league = standingBlock?.league || {}

    for (const groupRows of league?.standings || []) {
      for (const row of groupRows || []) {
        const teamRow = buildTeamStub(row?.team, fetchedAt, { standing: row })
        const hasTeamRow = shouldMaterializeTeamRow({ id: teamRow.team_id, name: teamRow.name })
        if (hasTeamRow) {
          teamRows.push(teamRow)
        } else if (row?.team != null) {
          skippedTeamCount += 1
        }

        const standingRow = {
          league_id: league.id ?? null,
          season: league.season ?? null,
          team_id: row?.team?.id ?? null,
          standing_group: row?.group || '',
          rank: row?.rank ?? null,
          points: row?.points ?? null,
          goals_diff: row?.goalsDiff ?? null,
          played: row?.all?.played ?? null,
          win: row?.all?.win ?? null,
          draw: row?.all?.draw ?? null,
          lose: row?.all?.lose ?? null,
          goals_for: row?.all?.goals?.for ?? null,
          goals_against: row?.all?.goals?.against ?? null,
          description: row?.description || null,
          form: row?.form || null,
          last_fetched_at: fetchedAt,
          raw: row || {},
          updated_at: fetchedAt,
        }

        if (shouldMaterializeStandingRow(standingRow, { hasTeam: hasTeamRow })) {
          standingRows.push(standingRow)
        } else if (row != null) {
          skippedStandingCount += 1
        }
      }
    }
  }

  const dedupedTeamRows = dedupeRows(teamRows, (row) => row.team_id)
  const dedupedStandingRows = dedupeRows(
    standingRows,
    (row) => `${row.league_id}:${row.season}:${row.team_id}:${row.standing_group}`
  )

  return {
    source: 'standings',
    normalizedAt: fetchedAt,
    teamRows: dedupedTeamRows,
    standingRows: dedupedStandingRows,
    stats: {
      teamCount: dedupedTeamRows.length,
      standingCount: dedupedStandingRows.length,
      skippedTeamCount,
      skippedStandingCount,
    },
  }
}

export function createApiFootballClient({
  apiKey,
  baseUrl = API_BASE,
  fetchImpl = fetch,
  rateDelayMs,
  maxRequests,
  logger,
}) {
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY is required for fetch phase.')
  }

  const budget = {
    used: 0,
    maxRequests,
  }

  let nextRequestAt = 0

  async function request(endpoint, params = {}) {
    if (budget.used >= maxRequests) {
      throw new RateLimitBudgetError(`Daily request budget exhausted at ${budget.used}/${maxRequests}.`, {
        endpoint,
        params,
      })
    }

    const url = new URL(`${baseUrl}/${endpoint}`)
    for (const [key, value] of Object.entries(params)) {
      if (value != null) {
        url.searchParams.set(key, String(value))
      }
    }

    if (Date.now() < nextRequestAt) {
      await delay(nextRequestAt - Date.now())
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      budget.used += 1

      let response
      try {
        response = await fetchImpl(url.toString(), {
          headers: {
            'x-apisports-key': apiKey,
          },
        })
      } catch (error) {
        if (attempt === 3) {
          throw new Error(`API-Football request failed for ${endpoint}: ${error.message}`)
        }
        logger.warn('Network error from API-Football, retrying.', {
          endpoint,
          attempt,
          error: error.message,
        })
        nextRequestAt = Date.now() + rateDelayMs * attempt
        await delay(rateDelayMs * attempt)
        continue
      }

      nextRequestAt = Date.now() + rateDelayMs

      if (response.status === 429) {
        const retryAfterSeconds = Number.parseInt(response.headers.get('retry-after') || '0', 10)
        const waitMs = Math.max(retryAfterSeconds * 1000, rateDelayMs * attempt)
        logger.warn('API-Football returned 429, backing off.', {
          endpoint,
          attempt,
          waitMs,
        })

        if (attempt === 3) {
          throw new RateLimitBudgetError(`API-Football rate limited ${endpoint} after ${attempt} attempts.`, {
            endpoint,
            waitMs,
          })
        }

        await delay(waitMs)
        continue
      }

      if (!response.ok) {
        const bodyText = await response.text()
        if (response.status >= 500 && attempt < 3) {
          logger.warn('API-Football server error, retrying.', {
            endpoint,
            attempt,
            status: response.status,
          })
          await delay(rateDelayMs * attempt)
          continue
        }

        throw new Error(
          `API-Football ${response.status} for ${endpoint}: ${bodyText.slice(0, 200) || 'no response body'}`
        )
      }

      const payload = await response.json()
      const apiErrors = Array.isArray(payload.errors)
        ? payload.errors.filter(Boolean)
        : Object.values(payload.errors || {}).filter(Boolean)
      if (apiErrors.length > 0) {
        const logicalRateLimitWaitMs = getApiFootballLogicalRateLimitWaitMs(
          apiErrors,
          rateDelayMs,
          attempt
        )

        if (logicalRateLimitWaitMs != null) {
          logger.warn('API-Football reported a logical rate limit, backing off.', {
            endpoint,
            attempt,
            waitMs: logicalRateLimitWaitMs,
          })

          if (attempt === 3) {
            throw new RateLimitBudgetError(
              `API-Football rate limited ${endpoint} after ${attempt} logical-error attempts.`,
              {
                endpoint,
                waitMs: logicalRateLimitWaitMs,
              }
            )
          }

          nextRequestAt = Date.now() + logicalRateLimitWaitMs
          await delay(logicalRateLimitWaitMs)
          continue
        }

        throw new Error(formatApiFootballLogicalError(endpoint, apiErrors, params))
      }

      const remaining = response.headers.get('x-ratelimit-requests-remaining')
      if (remaining != null) {
        logger.debug('Quota update received.', {
          endpoint,
          remaining,
          used: budget.used,
        })
      }

      return {
        response: payload.response || [],
        results: payload.results ?? null,
        paging: payload.paging ?? null,
        errors: payload.errors || [],
      }
    }

    throw new Error(`API-Football request exhausted retries for ${endpoint}.`)
  }

  async function requestAllPages(endpoint, params = {}) {
    const firstPage = await request(endpoint, params)
    const totalPages = Number.parseInt(String(firstPage.paging?.total || '1'), 10)
    if (!Number.isInteger(totalPages) || totalPages <= 1) {
      return firstPage
    }

    const responseRows = [...firstPage.response]
    for (let page = 2; page <= totalPages; page++) {
      const nextPage = await request(endpoint, { ...params, page })
      responseRows.push(...nextPage.response)
    }

    return {
      ...firstPage,
      response: responseRows,
      paging: {
        current: totalPages,
        total: totalPages,
      },
    }
  }

  return { request, requestAllPages, budget }
}

function getRequestsUsedSince(client, budgetBefore = 0) {
  return Math.max(client.budget.used - budgetBefore, 0)
}

function buildFetchContext(options, overrides = {}) {
  return {
    ...options,
    apiKey: overrides.apiKey ?? options.apiKey ?? process.env.API_FOOTBALL_KEY,
    supabaseUrl: overrides.supabaseUrl ?? options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceRoleKey:
      overrides.supabaseServiceRoleKey ??
      options.supabaseServiceRoleKey ??
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

function getSquadTeamSeeds(fsModule, paths, explicitTeamIds, logger) {
  const rawTeams = readJson(fsModule, paths.rawFile('teams'), null)
  const rawMatches = readJson(fsModule, paths.rawFile('matches'), null)
  const rawStandings = readJson(fsModule, paths.rawFile('standings'), null)
  const teamRows = normalizeTeamsPayload({
    rawTeams,
    rawMatches,
    rawStandings,
    fetchedAt: nowIso(),
  }).rows

  const artifactSeeds = teamRows.map((row) => ({
    teamId: row.team_id,
    name: row.name,
  }))
  const explicitSeeds = (explicitTeamIds || []).map((teamId) => ({
    teamId,
    name: null,
  }))

  logger.debug('Resolved squad team seeds from artifacts.', {
    artifactTeamCount: artifactSeeds.length,
    explicitTeamCount: explicitSeeds.length,
  })

  return dedupeRows([...explicitSeeds, ...artifactSeeds], (seed) => seed.teamId, (existing, incoming) => {
    const existingScore = countDefinedValues(existing)
    const incomingScore = countDefinedValues(incoming)
    return incomingScore >= existingScore ? incoming : existing
  })
    .filter((seed) => isPresent(seed.teamId))
    .sort((a, b) => a.teamId - b.teamId)
}

async function fetchTeamsSource(context) {
  const { client, options, fsModule, paths, logger, state } = context
  const budgetBefore = client.budget.used
  const fetchedAt = nowIso()
  const payload = await client.requestAllPages('teams', {
    league: options.leagueId,
    season: options.season,
  })
  const requestsUsed = getRequestsUsedSince(client, budgetBefore)

  const artifact = {
    source: 'teams',
    fetchedAt,
    leagueId: options.leagueId,
    season: options.season,
    response: payload.response,
    meta: {
      results: payload.results,
      paging: payload.paging,
      requestsUsed,
      totalRequestsUsed: client.budget.used,
    },
  }

  writeJson(fsModule, paths.rawFile('teams'), artifact)
  updateState(state, 'teams', 'fetch', {
    status: 'completed',
    fetchedAt,
    itemCount: artifact.response.length,
    requestsUsed,
    totalRequestsUsed: client.budget.used,
  })
  logger.info('Fetched team catalog.', {
    teamCount: artifact.response.length,
    requestsUsed,
  })

  return {
    requestsUsed,
    totalRequestsUsed: client.budget.used,
  }
}

async function fetchMatchesSource(context) {
  const { client, options, fsModule, paths, logger, state } = context
  const budgetBefore = client.budget.used
  const fetchedAt = nowIso()
  const payload = await client.requestAllPages('fixtures', {
    league: options.leagueId,
    season: options.season,
  })
  const requestsUsed = getRequestsUsedSince(client, budgetBefore)

  const artifact = {
    source: 'matches',
    fetchedAt,
    leagueId: options.leagueId,
    season: options.season,
    response: payload.response,
    meta: {
      results: payload.results,
      paging: payload.paging,
      requestsUsed,
      totalRequestsUsed: client.budget.used,
    },
  }

  writeJson(fsModule, paths.rawFile('matches'), artifact)
  updateState(state, 'matches', 'fetch', {
    status: 'completed',
    fetchedAt,
    itemCount: artifact.response.length,
    requestsUsed,
    totalRequestsUsed: client.budget.used,
  })
  logger.info('Fetched fixtures.', {
    fixtureCount: artifact.response.length,
    requestsUsed,
  })

  return {
    requestsUsed,
    totalRequestsUsed: client.budget.used,
  }
}

async function fetchStandingsSource(context) {
  const { client, options, fsModule, paths, logger, state } = context
  const budgetBefore = client.budget.used
  const fetchedAt = nowIso()
  const payload = await client.requestAllPages('standings', {
    league: options.leagueId,
    season: options.season,
  })
  const requestsUsed = getRequestsUsedSince(client, budgetBefore)

  const artifact = {
    source: 'standings',
    fetchedAt,
    leagueId: options.leagueId,
    season: options.season,
    response: payload.response,
    meta: {
      results: payload.results,
      paging: payload.paging,
      requestsUsed,
      totalRequestsUsed: client.budget.used,
    },
  }

  writeJson(fsModule, paths.rawFile('standings'), artifact)
  updateState(state, 'standings', 'fetch', {
    status: 'completed',
    fetchedAt,
    itemCount: artifact.response.length,
    requestsUsed,
    totalRequestsUsed: client.budget.used,
  })
  logger.info('Fetched standings.', {
    standingBlocks: artifact.response.length,
    requestsUsed,
  })

  return {
    requestsUsed,
    totalRequestsUsed: client.budget.used,
  }
}

async function fetchSquadsSource(context) {
  const { client, options, fsModule, paths, logger, state } = context
  const budgetBefore = client.budget.used
  const teamSeeds = getSquadTeamSeeds(fsModule, paths, options.teamIds, logger)

  let filteredSeeds = teamSeeds
  if (options.teamIds.length > 0) {
    filteredSeeds = teamSeeds.filter((seed) => options.teamIds.includes(seed.teamId))
  }

  if (filteredSeeds.length === 0) {
    throw new Error(
      'No team ids available for squads fetch. Run teams/matches/standings fetch first or pass --team-id.'
    )
  }

  const rawFile = paths.rawFile('squads')
  const previousArtifact = options.forceRefresh ? null : readJson(fsModule, rawFile, null)
  const artifact = previousArtifact
    ? {
        ...previousArtifact,
        source: 'squads',
        leagueId: options.leagueId,
        season: options.season,
        teams: { ...(previousArtifact.teams || {}) },
        errors: { ...(previousArtifact.errors || {}) },
        status: 'running',
      }
    : {
        source: 'squads',
        fetchedAt: nowIso(),
        leagueId: options.leagueId,
        season: options.season,
        status: 'running',
        teams: {},
        errors: {},
      }

  function countUnresolvedErrors(scopedTeamIds = null) {
    const scopedTeamIdSet =
      scopedTeamIds == null ? null : new Set([...scopedTeamIds].map((teamId) => String(teamId)))

    return Object.keys(artifact.errors || {}).filter((teamId) => {
      if (artifact.teams?.[teamId] != null) {
        return false
      }

      if (scopedTeamIdSet == null) {
        return true
      }

      return scopedTeamIdSet.has(String(teamId))
    }).length
  }

  const scopedTeamIds = new Set(filteredSeeds.map((seed) => String(seed.teamId)))

  for (const seed of filteredSeeds) {
    if (artifact.teams[seed.teamId]) {
      delete artifact.errors[seed.teamId]
      logger.debug('Reused existing squad artifact.', {
        teamId: seed.teamId,
        teamName: seed.name,
      })
      continue
    }

    try {
      const payload = await client.request('players/squads', {
        team: seed.teamId,
      })

      artifact.teams[seed.teamId] = {
        team: seed,
        response: payload.response,
        fetchedAt: nowIso(),
      }
      delete artifact.errors[seed.teamId]
      writeJson(fsModule, rawFile, artifact)
      logger.info('Fetched squad.', {
        teamId: seed.teamId,
        teamName: seed.name,
        responseEntries: payload.response.length,
      })
    } catch (error) {
      artifact.errors[seed.teamId] = {
        teamName: seed.name,
        message: error.message,
        failedAt: nowIso(),
      }
      writeJson(fsModule, rawFile, artifact)
      if (error instanceof RateLimitBudgetError) {
        const failedTeams =
          options.teamIds.length > 0 ? countUnresolvedErrors(scopedTeamIds) : countUnresolvedErrors()
        const unresolvedFailedTeams = countUnresolvedErrors()
        updateState(state, 'squads', 'fetch', {
          status: 'partial',
          fetchedAt: artifact.fetchedAt,
          completedTeams: Object.keys(artifact.teams).length,
          failedTeams,
          unresolvedFailedTeams,
          requestsUsed: getRequestsUsedSince(client, budgetBefore),
          totalRequestsUsed: client.budget.used,
        })
        throw error
      }
      logger.error('Squad fetch failed for team.', {
        teamId: seed.teamId,
        teamName: seed.name,
        error: error.message,
      })
    }
  }

  const unresolvedErrorCount = countUnresolvedErrors()
  const scopedUnresolvedErrorCount =
    options.teamIds.length > 0 ? countUnresolvedErrors(scopedTeamIds) : unresolvedErrorCount
  const requestsUsed = getRequestsUsedSince(client, budgetBefore)
  artifact.status = unresolvedErrorCount > 0 ? 'partial' : 'complete'
  artifact.completedAt = nowIso()
  writeJson(fsModule, rawFile, artifact)

  updateState(state, 'squads', 'fetch', {
    status: artifact.status,
    fetchedAt: artifact.fetchedAt,
    completedAt: artifact.completedAt,
    completedTeams: Object.keys(artifact.teams).length,
    failedTeams: scopedUnresolvedErrorCount,
    unresolvedFailedTeams: unresolvedErrorCount,
    requestsUsed,
    totalRequestsUsed: client.budget.used,
  })

  if (options.teamIds.length > 0 && unresolvedErrorCount > scopedUnresolvedErrorCount) {
    logger.warn('Squad artifact still has unresolved errors outside the current team scope.', {
      requestedTeamIds: options.teamIds,
      scopedFailedTeams: scopedUnresolvedErrorCount,
      unresolvedFailedTeams: unresolvedErrorCount,
    })
  }

  if (scopedUnresolvedErrorCount > 0) {
    throw new Error(
      `Squad fetch incomplete. ${scopedUnresolvedErrorCount} requested team(s) failed and can resume from saved raw artifacts.`
    )
  }

  logger.info('Fetched squad roster source.', {
    teamCount: Object.keys(artifact.teams).length,
    requestsUsed,
  })

  return {
    requestsUsed,
    totalRequestsUsed: client.budget.used,
    failedTeams: scopedUnresolvedErrorCount,
    unresolvedFailedTeams: unresolvedErrorCount,
  }
}

function normalizeSource(context, source) {
  const { options, fsModule, paths, logger, state } = context
  const fetchedAt = nowIso()
  let normalized

  if (source === 'teams') {
    const hasAnyTeamSeedArtifact =
      fsModule.existsSync(paths.rawFile('teams')) ||
      fsModule.existsSync(paths.rawFile('matches')) ||
      fsModule.existsSync(paths.rawFile('standings'))
    if (!hasAnyTeamSeedArtifact) {
      throw new Error('Missing raw artifacts for teams normalization. Run fetch for teams, matches, or standings first.')
    }
    normalized = normalizeTeamsPayload({
      rawTeams: readJson(fsModule, paths.rawFile('teams'), null),
      rawMatches: readJson(fsModule, paths.rawFile('matches'), null),
      rawStandings: readJson(fsModule, paths.rawFile('standings'), null),
      fetchedAt,
    })
  } else if (source === 'matches') {
    if (!fsModule.existsSync(paths.rawFile('matches'))) {
      throw new Error('Missing raw artifact for matches normalization. Run fetch for matches first.')
    }
    normalized = normalizeMatchesPayload({
      rawMatches: readJson(fsModule, paths.rawFile('matches'), null),
      fetchedAt,
    })
  } else if (source === 'standings') {
    if (!fsModule.existsSync(paths.rawFile('standings'))) {
      throw new Error('Missing raw artifact for standings normalization. Run fetch for standings first.')
    }
    normalized = normalizeStandingsPayload({
      rawStandings: readJson(fsModule, paths.rawFile('standings'), null),
      fetchedAt,
    })
  } else if (source === 'squads') {
    if (!fsModule.existsSync(paths.rawFile('squads'))) {
      throw new Error('Missing raw artifact for squads normalization. Run fetch for squads first.')
    }

    const rawSquads = readJson(fsModule, paths.rawFile('squads'), null)
    const unresolvedErrorTeamIds = getRawSquadArtifactErrorTeamIds(
      rawSquads,
      options.teamIds.length > 0 ? options.teamIds : null
    )
    if (unresolvedErrorTeamIds.length > 0) {
      if (options.teamIds.length > 0) {
        throw new Error(
          `Squad raw artifact is incomplete for requested team ids: ${unresolvedErrorTeamIds.join(', ')}. Run fetch for squads again before normalize/upsert.`
        )
      }

      throw new Error(
        `Squad raw artifact is incomplete. ${unresolvedErrorTeamIds.length} team(s) still have unresolved fetch errors. Run fetch for squads again or use --team-id to limit normalize/upsert scope.`
      )
    }

    normalized = normalizeSquadsPayload({
      rawSquads: scopeRawSquadsArtifact(rawSquads, options.teamIds),
      fetchedAt,
      season: options.season,
      requestedTeamIds: options.teamIds,
    })
  } else {
    throw new Error(`Unsupported normalize source: ${source}`)
  }

  const normalizedRowCount =
    (Array.isArray(normalized.rows) ? normalized.rows.length : 0) +
    (Array.isArray(normalized.teamRows) ? normalized.teamRows.length : 0) +
    (Array.isArray(normalized.playerRows) ? normalized.playerRows.length : 0) +
    (Array.isArray(normalized.matchRows) ? normalized.matchRows.length : 0) +
    (Array.isArray(normalized.standingRows) ? normalized.standingRows.length : 0) +
    (Array.isArray(normalized.squadRows) ? normalized.squadRows.length : 0)

  if (normalizedRowCount === 0) {
    logger.warn('Normalization produced an empty snapshot.', {
      source,
    })
  }

  const skippedStats = Object.fromEntries(
    Object.entries(normalized.stats || {}).filter(
      ([key, value]) => key.startsWith('skipped') && Number.isInteger(value) && value > 0
    )
  )

  if (Object.keys(skippedStats).length > 0) {
    logger.warn('Normalization dropped malformed rows.', {
      source,
      ...skippedStats,
    })
  }

  writeJson(fsModule, paths.normalizedFile(source), normalized)
  updateState(state, source, 'normalize', {
    status: 'completed',
    normalizedAt: fetchedAt,
    stats: normalized.stats,
  })
  logger.info('Normalized artifact.', {
    source,
    stats: normalized.stats,
  })
  return normalized
}

export function createSupabaseSink({ supabase }) {
  function applyFilters(query, filters = []) {
    let nextQuery = query

    for (const filter of filters) {
      if (filter.operator === 'eq' || filter.operator == null) {
        nextQuery = nextQuery.eq(filter.column, filter.value)
        continue
      }

      if (filter.operator === 'in') {
        nextQuery = nextQuery.in(filter.column, filter.values)
        continue
      }

      throw new Error(`Unsupported filter operator: ${filter.operator}`)
    }

    return nextQuery
  }

  function applyOrder(query, columns) {
    const orderColumns = (Array.isArray(columns) ? columns : String(columns).split(','))
      .map((column) => column.trim())
      .filter((column) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column))

    return orderColumns.reduce(
      (nextQuery, column) => nextQuery.order(column, { ascending: true }),
      query
    )
  }

  return {
    async upsert(table, rows, onConflict) {
      if (rows.length === 0) return 0
      const { error } = await supabase.from(table).upsert(rows, {
        onConflict,
        ignoreDuplicates: false,
      })

      if (error) {
        throw new Error(`Supabase upsert failed for ${table}: ${error.message}`)
      }

      return rows.length
    },
    async count(table, filters = []) {
      const query = applyFilters(
        supabase.from(table).select('*', { count: 'exact', head: true }),
        filters
      )
      const { count, error } = await query
      if (error) {
        throw new Error(`Supabase count failed for ${table}: ${error.message}`)
      }
      return count ?? 0
    },
    async selectRows(table, columns, filters = []) {
      const columnList = Array.isArray(columns) ? columns.join(',') : columns
      const rows = []

      for (let from = 0; ; from += SUPABASE_SELECT_PAGE_SIZE) {
        const to = from + SUPABASE_SELECT_PAGE_SIZE - 1
        const query = applyOrder(
          applyFilters(
            supabase.from(table).select(columnList),
            filters
          ),
          columns
        ).range(from, to)
        const { data, error } = await query
        if (error) {
          throw new Error(`Supabase select failed for ${table}: ${error.message}`)
        }

        const pageRows = data || []
        rows.push(...pageRows)
        if (pageRows.length < SUPABASE_SELECT_PAGE_SIZE) {
          break
        }
      }

      return rows
    },
    async deleteMany(table, rows, keyColumns) {
      let deleted = 0
      for (const row of rows) {
        let query = supabase.from(table).delete()
        for (const keyColumn of keyColumns) {
          query = query.eq(keyColumn, row[keyColumn])
        }
        const { error } = await query
        if (error) {
          throw new Error(`Supabase delete failed for ${table}: ${error.message}`)
        }
        deleted += 1
      }
      return deleted
    },
  }
}

export function createMemorySink() {
  const tables = new Map()

  function matchesFilter(row, filters = []) {
    return filters.every((filter) => {
      if (filter.operator === 'in') {
        return (filter.values || []).includes(row[filter.column])
      }
      return row[filter.column] === filter.value
    })
  }

  return {
    async upsert(table, rows, onConflict) {
      if (rows.length === 0) return 0

      const keys = onConflict.split(',').map((value) => value.trim())
      const tableMap = tables.get(table) || new Map()

      for (const row of rows) {
        const identity = keys.map((key) => JSON.stringify(row[key])).join('::')
        tableMap.set(identity, {
          ...(tableMap.get(identity) || {}),
          ...row,
        })
      }

      tables.set(table, tableMap)
      return rows.length
    },
    async count(table, filters = []) {
      const tableMap = tables.get(table) || new Map()
      const rows = [...tableMap.values()]
      return rows.filter((row) => matchesFilter(row, filters)).length
    },
    async selectRows(table, columns, filters = []) {
      const tableMap = tables.get(table) || new Map()
      const selectedColumns = Array.isArray(columns) ? columns : columns.split(',').map((value) => value.trim())
      return [...tableMap.values()]
        .filter((row) => matchesFilter(row, filters))
        .map((row) =>
          selectedColumns.reduce((acc, column) => {
            acc[column] = row[column]
            return acc
          }, {})
        )
    },
    async deleteMany(table, rows, keyColumns) {
      const tableMap = tables.get(table) || new Map()
      for (const row of rows) {
        const identity = keyColumns.map((key) => JSON.stringify(row[key])).join('::')
        tableMap.delete(identity)
      }
      tables.set(table, tableMap)
      return rows.length
    },
  }
}

function createDefaultSink(options) {
  if (options.dryRun) {
    return createMemorySink()
  }

  if (!options.supabaseUrl || !options.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase env vars not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  const supabase = createClient(options.supabaseUrl, options.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return createSupabaseSink({ supabase })
}

async function upsertRowsInChunks({ sink, table, rows, onConflict, chunkSize = 250 }) {
  let attempted = 0
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize)
    attempted += await sink.upsert(table, chunk, onConflict)
  }
  return attempted
}

function countFiltersForTable(table, options) {
  return buildScopedCountFilters(table, null, null, options)
}

function extractIntegerKeys(rows, column) {
  return dedupeNumbers(
    (rows || [])
      .map((row) => row?.[column])
      .filter((value) => Number.isInteger(value))
  )
}

function buildImpossiblePositiveIdFilter(column) {
  return [{ operator: 'eq', column, value: -1 }]
}

function extractSquadScopeTeamIds(normalized) {
  if (Array.isArray(normalized?.scopeTeamIds) && normalized.scopeTeamIds.length > 0) {
    return dedupeNumbers(normalized.scopeTeamIds.filter((teamId) => isPositiveInteger(teamId)))
  }

  return dedupeNumbers([
    ...extractIntegerKeys(normalized?.teamRows, 'team_id'),
    ...extractIntegerKeys(normalized?.squadRows, 'team_id'),
  ])
}

function extractRequestedSquadArtifactTeamIds(normalized) {
  return dedupeNumbers(
    (normalized?.requestedTeamIds || []).filter((teamId) => isPositiveInteger(teamId))
  )
}

function validateNormalizedSquadsArtifactScope(normalized, requestedTeamIds = []) {
  const artifactRequestedTeamIds = extractRequestedSquadArtifactTeamIds(normalized)
  if (artifactRequestedTeamIds.length === 0) {
    return
  }

  const currentRequestedTeamIds = dedupeNumbers(
    (requestedTeamIds || []).filter((teamId) => isPositiveInteger(teamId))
  )

  if (currentRequestedTeamIds.length === 0) {
    throw new Error(
      `Normalized squads artifact is scoped to team ids: ${artifactRequestedTeamIds.join(', ')}. Run normalize for squads again without --team-id before unscoped upsert/report, or rerun with a matching --team-id scope.`
    )
  }

  const missingTeamIds = currentRequestedTeamIds.filter(
    (teamId) => !artifactRequestedTeamIds.includes(teamId)
  )

  if (missingTeamIds.length > 0) {
    throw new Error(
      `Normalized squads artifact is scoped to team ids: ${artifactRequestedTeamIds.join(', ')}. It does not cover requested team ids: ${missingTeamIds.join(', ')}. Run normalize for squads again with a compatible --team-id scope first.`
    )
  }
}

function buildScopedCountFilters(table, source, normalized, options) {
  if (table === 'football_matches') {
    return [
      { operator: 'eq', column: 'season', value: options.season },
      { operator: 'eq', column: 'league_id', value: options.leagueId },
    ]
  }

  if (table === 'football_team_squads') {
    const teamIds = extractSquadScopeTeamIds(normalized)
    const filters = [{ operator: 'eq', column: 'season', value: options.season }]
    if (teamIds.length > 0) {
      filters.push({ operator: 'in', column: 'team_id', values: teamIds })
    } else {
      filters.push(...buildImpossiblePositiveIdFilter('team_id'))
    }
    return filters
  }

  if (table === 'football_standings') {
    return [
      { operator: 'eq', column: 'season', value: options.season },
      { operator: 'eq', column: 'league_id', value: options.leagueId },
    ]
  }

  if (table === 'football_teams') {
    const teamIds = extractIntegerKeys(
      source === 'teams' ? normalized?.rows : normalized?.teamRows,
      'team_id'
    )
    return teamIds.length > 0
      ? [{ operator: 'in', column: 'team_id', values: teamIds }]
      : buildImpossiblePositiveIdFilter('team_id')
  }

  if (table === 'football_players') {
    const playerIds = extractIntegerKeys(normalized?.playerRows, 'player_id')
    return playerIds.length > 0
      ? [{ operator: 'in', column: 'player_id', values: playerIds }]
      : buildImpossiblePositiveIdFilter('player_id')
  }

  return []
}

function buildSnapshotReconcilePlans(source, normalized, options) {
  if (source === 'matches') {
    return [
      {
        table: 'football_matches',
        keyColumns: ['fixture_id'],
        scopeFilters: [
          { operator: 'eq', column: 'league_id', value: options.leagueId },
          { operator: 'eq', column: 'season', value: options.season },
        ],
        expectedRows: normalized.matchRows || [],
      },
    ]
  }

  if (source === 'standings') {
    return [
      {
        table: 'football_standings',
        keyColumns: ['league_id', 'season', 'team_id', 'standing_group'],
        scopeFilters: [
          { operator: 'eq', column: 'league_id', value: options.leagueId },
          { operator: 'eq', column: 'season', value: options.season },
        ],
        expectedRows: normalized.standingRows || [],
      },
    ]
  }

  if (source === 'squads') {
    const teamIds = extractSquadScopeTeamIds(normalized)

    if (teamIds.length === 0) {
      return []
    }

    return [
      {
        table: 'football_team_squads',
        keyColumns: ['team_id', 'player_id', 'season'],
        scopeFilters: [
          { operator: 'eq', column: 'season', value: options.season },
          { operator: 'in', column: 'team_id', values: teamIds },
        ],
        expectedRows: normalized.squadRows || [],
      },
    ]
  }

  return []
}

async function reconcileSnapshotTables({ source, normalized, sink, options, logger }) {
  if (typeof sink.selectRows !== 'function' || typeof sink.deleteMany !== 'function') {
    return {}
  }

  const summary = {}

  for (const plan of buildSnapshotReconcilePlans(source, normalized, options)) {
    const existingRows = await sink.selectRows(plan.table, plan.keyColumns, plan.scopeFilters)
    const expectedKeys = new Set(plan.expectedRows.map((row) => buildCompositeKey(row, plan.keyColumns)))
    const staleRows = existingRows.filter((row) => !expectedKeys.has(buildCompositeKey(row, plan.keyColumns)))
    const deleted = staleRows.length > 0
      ? await sink.deleteMany(plan.table, staleRows, plan.keyColumns)
      : 0

    summary[plan.table] = {
      ...(summary[plan.table] || {}),
      deleted,
      staleCount: staleRows.length,
    }

    logger.info('Reconciled snapshot table scope.', {
      table: plan.table,
      deleted,
      staleCount: staleRows.length,
    })
  }

  return summary
}

export async function upsertNormalizedSource({ source, normalized, sink, options, logger }) {
  const summary = { source, tables: {} }
  const sparseTeamRows = (rows = []) => rows.map((row) => stripNullishFields(row, ['team_id']))

  async function record(table, rows, onConflict, chunkSize) {
    const attempted = await upsertRowsInChunks({ sink, table, rows, onConflict, chunkSize })
    const totalAfterUpsert =
      typeof sink.count === 'function'
        ? await sink.count(table, buildScopedCountFilters(table, source, normalized, options))
        : null
    summary.tables[table] = {
      attempted,
      totalAfterUpsert,
    }
    logger.info('Upserted rows.', {
      table,
      attempted,
      totalAfterUpsert,
    })
  }

  async function reconcile() {
    const reconciliation = await reconcileSnapshotTables({ source, normalized, sink, options, logger })
    for (const [table, tableSummary] of Object.entries(reconciliation)) {
      const totalAfterUpsert =
        typeof sink.count === 'function'
          ? await sink.count(table, buildScopedCountFilters(table, source, normalized, options))
          : summary.tables[table]?.totalAfterUpsert ?? null
      summary.tables[table] = {
        ...(summary.tables[table] || {}),
        ...tableSummary,
        totalAfterUpsert,
      }
    }
  }

  if (source === 'teams') {
    await record('football_teams', normalized.rows || [], 'team_id')
    return summary
  }

  if (source === 'matches') {
    await record('football_teams', sparseTeamRows(normalized.teamRows || []), 'team_id', 1)
    await record('football_matches', normalized.matchRows || [], 'fixture_id')
    await reconcile()
    return summary
  }

  if (source === 'standings') {
    await record('football_teams', sparseTeamRows(normalized.teamRows || []), 'team_id', 1)
    await record('football_standings', normalized.standingRows || [], 'league_id,season,team_id,standing_group')
    await reconcile()
    return summary
  }

  if (source === 'squads') {
    await record('football_teams', sparseTeamRows(normalized.teamRows || []), 'team_id', 1)
    await record('football_players', normalized.playerRows || [], 'player_id')
    await record('football_team_squads', normalized.squadRows || [], 'team_id,player_id,season')
    await reconcile()
    return summary
  }

  throw new Error(`Unsupported upsert source: ${source}`)
}

async function upsertSource(context, source) {
  const { options, fsModule, paths, logger, state } = context
  let normalized = readJson(fsModule, paths.normalizedFile(source), null)
  if (!normalized) {
    throw new Error(`Missing normalized artifact for ${source}. Run normalize phase first.`)
  }

  if (source === 'squads') {
    validateNormalizedSquadsArtifactScope(normalized, options.teamIds)

    if (options.teamIds.length > 0) {
      normalized = scopeNormalizedSquadsArtifact(normalized, options.teamIds)
    }
  }

  const sink = getOrCreateContextSink(context)
  const summary = await upsertNormalizedSource({
    source,
    normalized,
    sink,
    options,
    logger,
  })

  updateState(state, source, 'upsert', {
    status: 'completed',
    upsertedAt: nowIso(),
    tables: summary.tables,
  })
  return summary
}

function collectVerificationArtifacts(fsModule, options) {
  const paths = getArtifactPaths(options)
  const teams = readJson(fsModule, paths.normalizedFile('teams'), null)
  const matches = readJson(fsModule, paths.normalizedFile('matches'), null)
  const standings = readJson(fsModule, paths.normalizedFile('standings'), null)
  const squads = readJson(fsModule, paths.normalizedFile('squads'), null)

  function mergeVerificationTeamEntries(existingEntry, incomingEntry) {
    const mergedRow = mergeEntityRows(existingEntry.row, incomingEntry.row)

    if (incomingEntry.priority < existingEntry.priority) {
      for (const [key, value] of Object.entries(incomingEntry.row || {})) {
        if (key === 'raw') {
          continue
        }

        if (isPresent(value)) {
          mergedRow[key] = value
        }
      }
    }

    return {
      ...existingEntry,
      priority: Math.min(existingEntry.priority, incomingEntry.priority),
      artifactAt:
        parseTimestampMs(incomingEntry.artifactAt) >= parseTimestampMs(existingEntry.artifactAt)
          ? incomingEntry.artifactAt
          : existingEntry.artifactAt,
      row: mergedRow,
    }
  }

  const teamRowEntries = [
    { rows: teams?.rows || [], artifactAt: teams?.normalizedAt ?? teams?.fetchedAt ?? null, priority: 0 },
    { rows: matches?.teamRows || [], artifactAt: matches?.normalizedAt ?? matches?.fetchedAt ?? null, priority: 1 },
    { rows: standings?.teamRows || [], artifactAt: standings?.normalizedAt ?? standings?.fetchedAt ?? null, priority: 2 },
    { rows: squads?.teamRows || [], artifactAt: squads?.normalizedAt ?? squads?.fetchedAt ?? null, priority: 3 },
  ]
  const teamRows = dedupeRows(
    teamRowEntries
      .flatMap((entry) => entry.rows.map((row) => ({ ...entry, row })))
      .sort((a, b) => parseTimestampMs(a.artifactAt) - parseTimestampMs(b.artifactAt) || a.priority - b.priority),
    (entry) => entry.row?.team_id,
    mergeVerificationTeamEntries
  ).map((entry) => entry.row)

  return {
    paths,
    teams,
    matches,
    standings,
    squads,
    teamRows,
  }
}

function deriveVerificationCompareColumns(rows, keyColumns) {
  const compareColumns = dedupeNumbers(
    (rows || [])
      .flatMap((row) => Object.keys(row || {}))
      .filter((column) => column !== 'raw' && column !== 'updated_at')
  )

  return compareColumns.length > 0 ? compareColumns : keyColumns
}

function buildKeyedRowMap(rows, keyColumns) {
  return new Map((rows || []).map((row) => [buildCompositeKey(row, keyColumns), row]))
}

function deriveVerificationCompareColumnsForRow(row, keyColumns) {
  return dedupeNumbers([
    ...keyColumns,
    ...Object.keys(row || {}).filter((column) => column !== 'raw' && column !== 'updated_at'),
  ])
}

function normalizeVerificationValue(value) {
  if (typeof value !== 'string') {
    return value
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  if (!value.includes('T')) {
    return value
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value
}

function buildVerificationSpecs(artifacts, options) {
  const hasTeamScopedArtifact =
    artifacts.teams != null || artifacts.matches != null || artifacts.standings != null || artifacts.squads != null

  return [
    {
      table: 'football_teams',
      keyColumns: ['team_id'],
      rows: artifacts.teamRows,
      filters: buildScopedCountFilters('football_teams', 'teams', { rows: artifacts.teamRows }, options),
      includeWhenEmpty: hasTeamScopedArtifact,
    },
    {
      table: 'football_players',
      keyColumns: ['player_id'],
      rows: artifacts.squads?.playerRows || [],
      filters: buildScopedCountFilters('football_players', 'squads', artifacts.squads, options),
      includeWhenEmpty: artifacts.squads != null,
    },
    {
      table: 'football_team_squads',
      keyColumns: ['team_id', 'player_id', 'season'],
      rows: artifacts.squads?.squadRows || [],
      filters: buildScopedCountFilters('football_team_squads', 'squads', artifacts.squads, options),
      includeWhenEmpty: artifacts.squads != null,
    },
    {
      table: 'football_matches',
      keyColumns: ['fixture_id'],
      rows: artifacts.matches?.matchRows || [],
      filters: buildScopedCountFilters('football_matches', 'matches', artifacts.matches, options),
      includeWhenEmpty: artifacts.matches != null,
    },
    {
      table: 'football_standings',
      keyColumns: ['league_id', 'season', 'team_id', 'standing_group'],
      rows: artifacts.standings?.standingRows || [],
      filters: buildScopedCountFilters('football_standings', 'standings', artifacts.standings, options),
      includeWhenEmpty: artifacts.standings != null,
    },
  ]
    .map((spec) => ({
      ...spec,
      compareColumns: deriveVerificationCompareColumns(spec.rows, spec.keyColumns),
    }))
    .filter((spec) => spec.rows.length > 0 || spec.includeWhenEmpty)
}

export async function generateIngestVerificationReport({
  sink,
  fsModule = fs,
  artifactRoot = DEFAULT_ARTIFACT_ROOT,
  leagueId = 1,
  season = 2026,
}) {
  const options = { artifactRoot, leagueId, season }
  const artifacts = collectVerificationArtifacts(fsModule, options)
  validateNormalizedSquadsArtifactScope(artifacts.squads)
  const specs = buildVerificationSpecs(artifacts, options)

  if (specs.length === 0) {
    throw new Error(
      `No normalized artifacts found under ${artifacts.paths.runDir}. Run normalize or full ingest before reporting.`
    )
  }

  const report = {
    generatedAt: nowIso(),
    artifactRoot: artifacts.paths.runDir,
    leagueId,
    season,
    tables: {},
  }

  for (const spec of specs) {
    const expectedRowsByKey = buildKeyedRowMap(spec.rows, spec.keyColumns)

    if (typeof sink.selectRows === 'function') {
      const actualRows = await sink.selectRows(spec.table, spec.compareColumns, spec.filters)
      const actualRowsByKey = buildKeyedRowMap(actualRows, spec.keyColumns)
      let missingCount = 0
      let driftCount = 0

      for (const [key, expectedRow] of expectedRowsByKey.entries()) {
        const actualRow = actualRowsByKey.get(key)
        if (!actualRow) {
          missingCount += 1
          continue
        }

        const rowCompareColumns = deriveVerificationCompareColumnsForRow(expectedRow, spec.keyColumns)

        if (
          buildCompositeKey(expectedRow, rowCompareColumns, normalizeVerificationValue) !==
          buildCompositeKey(actualRow, rowCompareColumns, normalizeVerificationValue)
        ) {
          driftCount += 1
        }
      }

      const unexpectedCount = [...actualRowsByKey.keys()].filter((key) => !expectedRowsByKey.has(key)).length

      report.tables[spec.table] = {
        expectedCount: expectedRowsByKey.size,
        actualCount: actualRowsByKey.size,
        missingCount,
        unexpectedCount,
        driftCount,
        matches: missingCount === 0 && unexpectedCount === 0 && driftCount === 0,
      }
      continue
    }

    if (typeof sink.count === 'function') {
      const actualCount = await sink.count(spec.table, spec.filters)
      report.tables[spec.table] = {
        expectedCount: expectedRowsByKey.size,
        actualCount,
        missingCount: Math.max(expectedRowsByKey.size - actualCount, 0),
        unexpectedCount: Math.max(actualCount - expectedRowsByKey.size, 0),
        driftCount: null,
        matches: actualCount === expectedRowsByKey.size,
      }
      continue
    }

    throw new Error('Verification sink must implement selectRows or count.')
  }

  return report
}

function createContext(rawOptions = {}) {
  const fsModule = rawOptions.fsModule || fs
  const loadedEnvFiles = loadProjectEnv({
    fsModule,
    cwd: rawOptions.cwd || ROOT_DIR,
  })
  const parsedOptions = {
    ...DEFAULT_OPTIONS,
    ...rawOptions,
  }
  const options = buildFetchContext(parsedOptions, rawOptions)
  options.sources = [...parsedOptions.sources]
  options.phases = [...parsedOptions.phases]
  const logger = rawOptions.logger || createLogger(options.verbose)
  const paths = getArtifactPaths(options)
  ensureDir(fsModule, paths.runDir)
  ensureDir(fsModule, paths.rawDir)
  ensureDir(fsModule, paths.normalizedDir)
  const state = readJson(fsModule, paths.stateFile, createInitialState(options))
  if (loadedEnvFiles.length > 0) {
    logger.debug('Loaded project env files for ingest.', {
      files: loadedEnvFiles,
    })
  }
  return {
    options,
    logger,
    fsModule,
    paths,
    state,
    sink: rawOptions.sink || null,
    fetchImpl: rawOptions.fetchImpl,
  }
}

function getOrCreateContextSink(context) {
  if (context.sink == null) {
    context.sink = createDefaultSink(context.options)
  }

  return context.sink
}

function saveStateFile(context) {
  writeJson(context.fsModule, context.paths.stateFile, context.state)
}

export async function runApiFootballIngest(rawOptions = {}) {
  const context = createContext(rawOptions)
  const { options, logger, state, paths, fsModule } = context
  let activeStep = null
  const runSummary = {
    startedAt: nowIso(),
    finishedAt: null,
    status: 'running',
    options: {
      leagueId: options.leagueId,
      season: options.season,
      sources: options.sources,
      phases: options.phases,
      maxRequests: options.maxRequests,
      rateDelayMs: options.rateDelayMs,
      teamIds: options.teamIds,
      artifactRoot: options.artifactRoot,
      dryRun: options.dryRun,
    },
    phases: {},
  }

  logger.info('Starting API-Football ingest.', runSummary.options)
  if (options.dryRun && options.phases.includes('upsert')) {
    logger.info('Using in-memory sink for dry-run upsert.', {
      artifactRoot: options.artifactRoot,
    })
  }

  try {
    for (const phase of options.phases) {
      runSummary.phases[phase] = {}

      if (phase === 'fetch') {
        if (options.sources.length > 0) {
          activeStep = { phase, source: options.sources[0] }
        }

        const client = createApiFootballClient({
          apiKey: options.apiKey,
          baseUrl: API_BASE,
          fetchImpl: context.fetchImpl || fetch,
          rateDelayMs: options.rateDelayMs,
          maxRequests: options.maxRequests,
          logger,
        })
        activeStep = null

        for (const source of options.sources) {
          activeStep = { phase, source }
          updateState(state, source, phase, {
            status: 'running',
            startedAt: nowIso(),
          })
          saveStateFile(context)

          let fetchSummary
          if (source === 'teams') {
            fetchSummary = await fetchTeamsSource({ ...context, client })
          } else if (source === 'matches') {
            fetchSummary = await fetchMatchesSource({ ...context, client })
          } else if (source === 'standings') {
            fetchSummary = await fetchStandingsSource({ ...context, client })
          } else if (source === 'squads') {
            fetchSummary = await fetchSquadsSource({ ...context, client })
          } else {
            throw new Error(`Unsupported fetch source: ${source}`)
          }

          runSummary.phases[phase][source] = fetchSummary || {
            requestsUsed: client.budget.used,
            totalRequestsUsed: client.budget.used,
          }
          activeStep = null
          saveStateFile(context)
        }
        continue
      }

      if (phase === 'normalize') {
        for (const source of options.sources) {
          activeStep = { phase, source }
          updateState(state, source, phase, {
            status: 'running',
            startedAt: nowIso(),
          })
          saveStateFile(context)
          const normalized = normalizeSource(context, source)
          runSummary.phases[phase][source] = normalized.stats
          activeStep = null
          saveStateFile(context)
        }
        continue
      }

      if (phase === 'upsert') {
        for (const source of options.sources) {
          activeStep = { phase, source }
          updateState(state, source, phase, {
            status: 'running',
            startedAt: nowIso(),
          })
          saveStateFile(context)
          const summary = await upsertSource(context, source)
          runSummary.phases[phase][source] = summary.tables
          activeStep = null
          saveStateFile(context)
        }
        continue
      }

      throw new Error(`Unsupported phase: ${phase}`)
    }

    runSummary.status = 'completed'
    runSummary.finishedAt = nowIso()
    state.lastRun = runSummary
    writeJson(fsModule, paths.summaryFile, runSummary)
    saveStateFile(context)
    logger.info('API-Football ingest completed.', {
      summaryFile: paths.summaryFile,
    })
    return runSummary
  } catch (error) {
    runSummary.status = 'failed'
    runSummary.finishedAt = nowIso()
    runSummary.error = {
      message: error.message,
      name: error.name,
    }
    if (activeStep) {
      const currentStatus = state.sources?.[activeStep.source]?.[activeStep.phase]?.status
      updateState(state, activeStep.source, activeStep.phase, {
        status: currentStatus === 'partial' ? 'partial' : 'failed',
        failedAt: runSummary.finishedAt,
        error: runSummary.error,
      })
    }
    state.lastRun = runSummary
    writeJson(fsModule, paths.summaryFile, runSummary)
    saveStateFile(context)
    logger.error('API-Football ingest failed.', runSummary.error)
    throw error
  }
}
