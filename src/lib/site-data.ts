import 'server-only'

import { cache } from 'react'
import type { CoachProfile } from '@/data/coaches-data'
import type { FAQEntry, TeamFAQ } from '@/data/faq-schema'
import type { PlayerSocialProfile } from '@/data/player-social'
import type { PageSEOMeta } from '@/data/seo-meta'
import { mergePlayerWithIntel } from '@/lib/player-intel-service'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { MatchFixture, MarketIntelData, Player, Team, WorldCupHistory } from '@/lib/types'

export const CORE_PAGE_REVALIDATE_SECONDS = 300

export type CorePageSource = 'supabase' | 'pipeline' | 'static'

export interface CorePageSources {
  teams: CorePageSource
  players: CorePageSource
  fixtures: CorePageSource
  teamFaqs: CorePageSource
  teamSeoMeta: CorePageSource
  coaches: CorePageSource
  worldCupHistory: CorePageSource
  playerSocial: CorePageSource
  liveCache: CorePageSource
}

export interface LiveCacheMatch {
  id: string
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  venue: string
  round: string
  homeScore: number | null
  awayScore: number | null
  thumb?: string
}

export interface LiveCacheSnapshot {
  fetchedAt: string
  source: string
  wcFixtures2026: LiveCacheMatch[]
  wcFixtures2022: LiveCacheMatch[]
}

export interface DailyBriefingSignal {
  type: 'injury' | 'transfer' | 'form' | 'tactical' | 'sentiment'
  team: { name: string; flag: string; slug: string }
  headline: string
  detail: string
  impact: 'high' | 'medium' | 'low'
}

export interface HomePageData {
  teams: Team[]
  topTeams: Team[]
  sources: CorePageSources
}

export interface TeamsPageData {
  groups: string[]
  teamsByGroup: Record<string, Team[]>
  totalTeams: number
  sources: CorePageSources
}

export interface TeamPageData {
  team: Team
  players: Player[]
  groupTeams: Team[]
  worldCupHistory?: WorldCupHistory
  marketIntel?: MarketIntelData
  coach?: CoachProfile
  teamFaq?: TeamFAQ
  seoMeta?: PageSEOMeta
  sources: CorePageSources
}

export interface MatchesBoardData {
  groups: string[]
  fixtures: MatchFixture[]
  teamsBySlug: Record<string, Team>
  teamsByGroup: Record<string, Team[]>
  sources: CorePageSources
}

export interface DailyBriefingPageData {
  signals: DailyBriefingSignal[]
  signalTypes: DailyBriefingSignal['type'][]
  highCount: number
  mediumCount: number
  trendingPlayers: PlayerSocialProfile[]
  liveCache: LiveCacheSnapshot
  sources: CorePageSources
}

interface CoreSiteSnapshot {
  teams: Team[]
  players: Player[]
  fixtures: MatchFixture[]
  teamFaqs: Record<string, TeamFAQ>
  teamSeoMeta: Record<string, PageSEOMeta>
  coaches: CoachProfile[]
  worldCupHistory: Record<string, WorldCupHistory | undefined>
  playerSocial: PlayerSocialProfile[]
  liveCache: LiveCacheSnapshot
  sources: CorePageSources
}

type TeamOverride = Partial<Team> & Pick<Team, 'slug'>
type PlayerOverride = Partial<Player> & Pick<Player, 'slug'>
type FixtureOverride = Partial<MatchFixture> &
  Pick<MatchFixture, 'homeTeamSlug' | 'awayTeamSlug' | 'round' | 'group'>
type CoachOverride = Partial<CoachProfile> & Pick<CoachProfile, 'teamSlug'>
type PlayerSocialOverride = Partial<PlayerSocialProfile> & Pick<PlayerSocialProfile, 'playerSlug'>

const DEFAULT_SOURCES: CorePageSources = {
  teams: 'static',
  players: 'static',
  fixtures: 'static',
  teamFaqs: 'static',
  teamSeoMeta: 'static',
  coaches: 'static',
  worldCupHistory: 'static',
  playerSocial: 'static',
  liveCache: 'pipeline',
}

const SUPABASE_PAGE_SIZE = 1000
const NEXT_PHASE_PRODUCTION_BUILD = 'phase-production-build'
const UNSAFE_HTML_OVERRIDE_PATTERN =
  /<\s*(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link|base)\b|\son[a-z]+\s*=|javascript:/i

function isSupabaseConfigured(): boolean {
  // Static generation fans out across thousands of routes; use bundled data during build.
  if (process.env.NEXT_PHASE === NEXT_PHASE_PRODUCTION_BUILD) return false

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T
}

function readString(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key]
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed) return trimmed
  }

  return undefined
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return undefined
}

function readBoolean(row: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'boolean') return value
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return undefined
}

function readJsonValue<T>(row: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    const value = row[key]
    if (value === undefined || value === null) continue

    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T
      } catch {
        continue
      }
    }

    return value as T
  }

  return undefined
}

function sanitizeHtmlOverride(value: string | undefined): string | undefined {
  if (!value) return undefined
  return UNSAFE_HTML_OVERRIDE_PATTERN.test(value) ? undefined : value
}

function normalizeFaqEntries(value: unknown): FAQEntry[] | undefined {
  if (!Array.isArray(value)) return undefined

  const faqs = value
    .filter(isRecord)
    .map((entry) => {
      const question = readString(entry, 'question')
      const answer = readString(entry, 'answer')
      return question && answer ? { question, answer } : null
    })
    .filter((entry): entry is FAQEntry => entry !== null)

  return faqs.length > 0 ? faqs : undefined
}

function normalizePlayerSocialPlatforms(
  value: unknown
): PlayerSocialProfile['platforms'] | undefined {
  if (!isRecord(value)) return undefined

  return compact({
    instagram: isRecord(value.instagram)
      ? {
          handle: readString(value.instagram, 'handle') ?? '',
          followers: readString(value.instagram, 'followers') ?? '',
          recentEngagement:
            readString(value.instagram, 'recentEngagement', 'recent_engagement') ?? '',
        }
      : undefined,
    twitter: isRecord(value.twitter)
      ? {
          handle: readString(value.twitter, 'handle') ?? '',
          followers: readString(value.twitter, 'followers') ?? '',
          recentEngagement:
            readString(value.twitter, 'recentEngagement', 'recent_engagement') ?? '',
        }
      : undefined,
    tiktok: isRecord(value.tiktok)
      ? {
          handle: readString(value.tiktok, 'handle') ?? '',
          followers: readString(value.tiktok, 'followers') ?? '',
          recentEngagement:
            readString(value.tiktok, 'recentEngagement', 'recent_engagement') ?? '',
        }
      : undefined,
  })
}

function normalizePlayerSocialPosts(
  value: unknown
): PlayerSocialProfile['recentPosts'] | undefined {
  if (!Array.isArray(value)) return undefined

  const posts = value
    .filter(isRecord)
    .map((entry) => {
      const date = readString(entry, 'date')
      const platform = readString(entry, 'platform')
      const summary = readString(entry, 'summary')
      const sentiment = readString(entry, 'sentiment')
      const engagement = readString(entry, 'engagement')

      if (!date || !platform || !summary || !engagement) return null
      if (
        sentiment !== 'positive' &&
        sentiment !== 'neutral' &&
        sentiment !== 'negative'
      ) {
        return null
      }

      return { date, platform, summary, sentiment, engagement }
    })
    .filter(
      (entry): entry is PlayerSocialProfile['recentPosts'][number] => entry !== null
    )

  return posts.length > 0 ? posts : undefined
}

function normalizeTeamOverride(row: Record<string, unknown>): TeamOverride | null {
  const slug = readString(row, 'slug', 'team_slug')
  if (!slug) return null

  return compact({
    slug,
    name: readString(row, 'name', 'team_name'),
    flag: readString(row, 'flag', 'flag_emoji'),
    group: readString(row, 'group', 'group_name'),
    confederation: readString(row, 'confederation'),
    isPlayoff: readBoolean(row, 'isPlayoff', 'is_playoff'),
    fifaRanking: readNumber(row, 'fifaRanking', 'fifa_ranking'),
    coachName: readString(row, 'coachName', 'coach_name'),
    chemistry: readNumber(row, 'chemistry'),
    familiarity: readNumber(row, 'familiarity'),
    stability: readNumber(row, 'stability'),
    morale: readNumber(row, 'morale'),
    archetypeMatch: readString(row, 'archetypeMatch', 'archetype_match'),
    keyInsight: readString(row, 'keyInsight', 'key_insight'),
    seoArticle: sanitizeHtmlOverride(readString(row, 'seoArticle', 'seo_article')),
  })
}

function normalizePlayerOverride(row: Record<string, unknown>): PlayerOverride | null {
  const slug = readString(row, 'slug', 'player_slug')
  if (!slug) return null

  const position = readString(row, 'position')
  const normalizedPosition: Player['position'] | undefined =
    position === 'GK' || position === 'DEF' || position === 'MID' || position === 'FWD'
      ? position
      : undefined

  const fitnessStatus = readString(row, 'fitnessStatus', 'fitness_status')
  const normalizedFitnessStatus: Player['fitnessStatus'] | undefined =
    fitnessStatus === 'green' ||
    fitnessStatus === 'amber' ||
    fitnessStatus === 'red'
      ? fitnessStatus
      : undefined

  return compact({
    slug,
    name: readString(row, 'name'),
    teamSlug: readString(row, 'teamSlug', 'team_slug'),
    position: normalizedPosition,
    number: readNumber(row, 'number'),
    age: readNumber(row, 'age'),
    club: readString(row, 'club'),
    caps: readNumber(row, 'caps'),
    goals: readNumber(row, 'goals'),
    assists: readNumber(row, 'assists'),
    rating: readNumber(row, 'rating'),
    fitnessStatus: normalizedFitnessStatus,
    fitnessNote: readString(row, 'fitnessNote', 'fitness_note'),
    sentimentScore: readNumber(row, 'sentimentScore', 'sentiment_score'),
    sentimentLabel: readString(row, 'sentimentLabel', 'sentiment_label'),
    seoArticle: sanitizeHtmlOverride(readString(row, 'seoArticle', 'seo_article')),
    imageUrl: readString(row, 'imageUrl', 'image_url'),
    cutoutUrl: readString(row, 'cutoutUrl', 'cutout_url'),
  })
}

function normalizeFixtureOverride(row: Record<string, unknown>): FixtureOverride | null {
  const homeTeamSlug = readString(row, 'homeTeamSlug', 'home_team_slug')
  const awayTeamSlug = readString(row, 'awayTeamSlug', 'away_team_slug')
  const round = readString(row, 'round')
  const group = readString(row, 'group')

  if (!homeTeamSlug || !awayTeamSlug || !round || !group) return null

  return compact({
    homeTeamSlug,
    awayTeamSlug,
    round,
    group,
    venue: readString(row, 'venue'),
    city: readString(row, 'city'),
    kickoffUtc: readString(row, 'kickoffUtc', 'kickoff_utc'),
    homeWinProb: readNumber(row, 'homeWinProb', 'home_win_prob'),
    drawProb: readNumber(row, 'drawProb', 'draw_prob'),
    awayWinProb: readNumber(row, 'awayWinProb', 'away_win_prob'),
  })
}

function normalizeTeamFaqOverride(
  row: Record<string, unknown>
): { slug: string; data: TeamFAQ } | null {
  const slug = readString(row, 'slug', 'team_slug')
  if (!slug) return null

  const faqEntries = normalizeFaqEntries(
    readJsonValue<unknown>(row, 'faqs', 'faq_entries', 'faq_entries_json')
  )
  if (!faqEntries) return null

  return {
    slug,
    data: {
      slug,
      name: readString(row, 'name', 'team_name') ?? slug,
      group: readString(row, 'group', 'group_name') ?? '',
      faqs: faqEntries,
    },
  }
}

function normalizeTeamSeoOverride(
  row: Record<string, unknown>
): { slug: string; data: PageSEOMeta } | null {
  const slug = readString(row, 'slug', 'team_slug')
  const title = readString(row, 'title')
  const description = readString(row, 'description')
  if (!slug || !title || !description) return null

  return {
    slug,
    data: compact({
      title,
      description,
      ogTitle: readString(row, 'ogTitle', 'og_title'),
    }),
  }
}

function normalizeCoachOverride(row: Record<string, unknown>): CoachOverride | null {
  const teamSlug = readString(row, 'teamSlug', 'team_slug')
  if (!teamSlug) return null

  return compact({
    teamSlug,
    name: readString(row, 'name'),
    nationality: readString(row, 'nationality'),
    age: readNumber(row, 'age'),
    photo: readString(row, 'photo'),
    tacticalStyle: readString(row, 'tacticalStyle', 'tactical_style'),
    formation: readString(row, 'formation'),
    philosophy: readString(row, 'philosophy'),
    careerHighlights: readJsonValue<string[]>(
      row,
      'careerHighlights',
      'career_highlights'
    ),
    previousClubs: readJsonValue<string[]>(
      row,
      'previousClubs',
      'previous_clubs'
    ),
    appointedDate: readString(row, 'appointedDate', 'appointed_date'),
    contractUntil: readString(row, 'contractUntil', 'contract_until'),
    winRate: readNumber(row, 'winRate', 'win_rate'),
    bio: readString(row, 'bio'),
  })
}

function normalizePlayerSocialOverride(
  row: Record<string, unknown>
): PlayerSocialOverride | null {
  const playerSlug = readString(row, 'playerSlug', 'player_slug')
  if (!playerSlug) return null

  return compact({
    playerSlug,
    teamSlug: readString(row, 'teamSlug', 'team_slug'),
    platforms: normalizePlayerSocialPlatforms(readJsonValue<unknown>(row, 'platforms')),
    buzzScore: readNumber(row, 'buzzScore', 'buzz_score'),
    recentPosts: normalizePlayerSocialPosts(
      readJsonValue<unknown>(row, 'recentPosts', 'recent_posts')
    ),
    trending: readBoolean(row, 'trending'),
  })
}

async function readSupabaseTable(
  tableNames: string[]
): Promise<Record<string, unknown>[] | null> {
  if (!isSupabaseConfigured()) return null

  for (const tableName of tableNames) {
    try {
      const rows: Record<string, unknown>[] = []
      let offset = 0

      while (true) {
        const { data, error } = await getSupabaseAdmin()
          .from(tableName)
          .select('*')
          .range(offset, offset + SUPABASE_PAGE_SIZE - 1)

        if (error || !Array.isArray(data)) {
          rows.length = 0
          break
        }

        if (data.length === 0) break

        rows.push(...(data as Record<string, unknown>[]))

        if (data.length < SUPABASE_PAGE_SIZE) break
        offset += SUPABASE_PAGE_SIZE
      }

      if (rows.length > 0) return rows
    } catch {
      continue
    }
  }

  return null
}

function mergeBySlug<T extends { slug: string }>(
  base: T[],
  overrides: Array<Partial<T> & { slug: string }>
): T[] {
  const overrideMap = new Map(
    overrides.map((override) => [override.slug, override])
  )
  return base.map((item) => ({ ...item, ...(overrideMap.get(item.slug) ?? {}) }))
}

function mergeByKey<T>(base: T[], overrides: T[], keyFn: (value: T) => string): T[] {
  const overrideMap = new Map(overrides.map((override) => [keyFn(override), override]))
  return base.map((item) => ({ ...item, ...(overrideMap.get(keyFn(item)) ?? {}) }))
}

function mergeByTeamSlug<T extends { teamSlug: string }>(
  base: T[],
  overrides: Array<Partial<T> & { teamSlug: string }>
): T[] {
  const overrideMap = new Map(
    overrides.map((override) => [override.teamSlug, override])
  )
  return base.map((item) => ({
    ...item,
    ...(overrideMap.get(item.teamSlug) ?? {}),
  }))
}

function mergeByPlayerSlug<T extends { playerSlug: string }>(
  base: T[],
  overrides: Array<Partial<T> & { playerSlug: string }>
): T[] {
  const overrideMap = new Map(
    overrides.map((override) => [override.playerSlug, override])
  )
  return base.map((item) => ({
    ...item,
    ...(overrideMap.get(item.playerSlug) ?? {}),
  }))
}

function mergeFaqs(
  base: Record<string, TeamFAQ>,
  overrides: Array<{ slug: string; data: TeamFAQ }>
): Record<string, TeamFAQ> {
  const merged = { ...base }
  for (const override of overrides) {
    merged[override.slug] = override.data
  }

  return merged
}

function mergeSeoMeta(
  base: Record<string, PageSEOMeta>,
  overrides: Array<{ slug: string; data: PageSEOMeta }>
): Record<string, PageSEOMeta> {
  const merged = { ...base }
  for (const override of overrides) {
    merged[override.slug] = override.data
  }

  return merged
}

function fixtureKey(
  fixture: Pick<MatchFixture, 'group' | 'round' | 'homeTeamSlug' | 'awayTeamSlug'>
): string {
  return `${fixture.group}:${fixture.round}:${fixture.homeTeamSlug}:${fixture.awayTeamSlug}`
}

function getGroups(teams: Team[]): string[] {
  return [...new Set(teams.map((team) => team.group))].sort()
}

function getWorldCupHistoryMap(
  rawData: unknown
): Record<string, WorldCupHistory | undefined> {
  const teams = isRecord(rawData) && isRecord(rawData.teams) ? rawData.teams : {}

  return Object.fromEntries(
    Object.entries(teams)
      .filter(([, entry]) => isRecord(entry) && typeof entry.totalAppearances === 'number')
      .map(([slug, entry]) => [slug, entry as WorldCupHistory])
  )
}

function normalizeLiveCache(rawData: unknown): LiveCacheSnapshot {
  const raw = isRecord(rawData) ? rawData : {}

  return {
    fetchedAt: typeof raw.fetchedAt === 'string' ? raw.fetchedAt : '',
    source: typeof raw.source === 'string' ? raw.source : '',
    wcFixtures2026: Array.isArray(raw.wcFixtures2026)
      ? (raw.wcFixtures2026 as LiveCacheMatch[])
      : [],
    wcFixtures2022: Array.isArray(raw.wcFixtures2022)
      ? (raw.wcFixtures2022 as LiveCacheMatch[])
      : [],
  }
}

function buildMarketIntel(team: Team): MarketIntelData {
  const consensusSources = [
    'Consensus A',
    'Consensus B',
    'Consensus C',
    'Consensus D',
    'Consensus E',
  ]
  const rng = seededRandom(hashCode(team.slug))
  const rank = team.fifaRanking

  let baseOdds: number
  if (rank <= 3) baseOdds = 5 + rng() * 3
  else if (rank <= 8) baseOdds = 10 + rng() * 8
  else if (rank <= 15) baseOdds = 25 + rng() * 25
  else if (rank <= 30) baseOdds = 60 + rng() * 80
  else baseOdds = 150 + rng() * 350

  const tournamentPrices = consensusSources.map((source) => {
    const variance = 0.9 + rng() * 0.2
    const decimalOdds = Math.round(baseOdds * variance * 100) / 100
    const impliedProbability = Math.round((1 / decimalOdds) * 1000) / 10
    return { source, decimalOdds, impliedProbability }
  })

  const averageOdds =
    Math.round(
      (tournamentPrices.reduce((sum, odds) => sum + odds.decimalOdds, 0) /
        tournamentPrices.length) *
        100
    ) / 100
  const impliedProbability = Math.round((1 / averageOdds) * 1000) / 10

  const movementRoll = rng()
  const movement: MarketIntelData['movement'] =
    movementRoll < 0.3 ? 'shortening' : movementRoll < 0.6 ? 'drifting' : 'stable'

  let modelEdge: MarketIntelData['modelEdge'] = null
  const ourProb = Math.min(
    40,
    Math.max(0.5, (team.chemistry / 100) * (50 / Math.max(rank, 1)))
  )
  const edge = ourProb - impliedProbability

  if (Math.abs(edge) > 1.5) {
    const bestIdx = tournamentPrices.reduce(
      (best, odds, index) =>
        odds.decimalOdds > tournamentPrices[best].decimalOdds ? index : best,
      0
    )

    modelEdge = {
      ourProbability: ourProb / 100,
      marketProbability: impliedProbability / 100,
      edge: edge / 100,
      bestOdds: tournamentPrices[bestIdx].decimalOdds,
      bestSource: tournamentPrices[bestIdx].source,
      signalStrength:
        Math.abs(edge) > 5 ? 'strong' : Math.abs(edge) > 3 ? 'moderate' : 'weak',
    }
  }

  return { tournamentPrices, averageOdds, impliedProbability, movement, modelEdge }
}

function seededRandom(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 16807 + 0) % 2147483647
    return value / 2147483647
  }
}

function hashCode(value: string): number {
  let hash = 5381
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function generateDailySignals(teams: Team[], players: Player[]): DailyBriefingSignal[] {
  const signals: DailyBriefingSignal[] = []
  const playersByTeam = players.reduce<Record<string, Player[]>>((accumulator, player) => {
    if (!accumulator[player.teamSlug]) accumulator[player.teamSlug] = []
    accumulator[player.teamSlug].push(player)
    return accumulator
  }, {})

  const sortedByChemistry = [...teams].sort((a, b) => b.chemistry - a.chemistry)
  const topTeams = sortedByChemistry.slice(0, 3)
  const bottomTeams = sortedByChemistry.slice(-3)

  for (const team of topTeams) {
    signals.push({
      type: 'form',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} squad chemistry at ${team.chemistry}/100`,
      detail: `Strong cohesion detected across the squad. Familiarity index: ${team.familiarity}, Stability: ${team.stability}, Morale: ${team.morale}. Coach ${team.coachName}'s system appears well-drilled.`,
      impact: 'medium',
    })
  }

  for (const team of bottomTeams) {
    signals.push({
      type: 'sentiment',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} chemistry concerns - ${team.chemistry}/100`,
      detail: `Below-average squad cohesion detected. Morale: ${team.morale}, Stability: ${team.stability}. This could impact tournament preparation.`,
      impact: team.chemistry < 50 ? 'high' : 'medium',
    })
  }

  for (const team of teams.slice(0, 12)) {
    const teamPlayers = playersByTeam[team.slug] ?? []
    const injured = teamPlayers.filter((player) => player.fitnessStatus === 'red')
    const monitoring = teamPlayers.filter((player) => player.fitnessStatus === 'amber')

    if (injured.length === 0) continue

    signals.push({
      type: 'injury',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name}: ${injured.length} player${injured.length > 1 ? 's' : ''} flagged injured`,
      detail: `${injured
        .map((player) => `${player.name} (${player.position}) - ${player.fitnessNote}`)
        .join('. ')}. ${monitoring.length} additional player${
        monitoring.length !== 1 ? 's' : ''
      } under monitoring.`,
      impact: injured.length >= 2 ? 'high' : 'medium',
    })
  }

  const topRanked = [...teams].sort((a, b) => a.fifaRanking - b.fifaRanking).slice(0, 5)
  for (const team of topRanked) {
    signals.push({
      type: 'tactical',
      team: { name: team.name, flag: team.flag, slug: team.slug },
      headline: `${team.name} tactical profile: ${team.archetypeMatch}`,
      detail: team.keyInsight,
      impact: 'low',
    })
  }

  const impactOrder = { high: 0, medium: 1, low: 2 }
  return signals.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
}

const getCoreSiteSnapshot = cache(async (): Promise<CoreSiteSnapshot> => {
  const [
    teamsModule,
    playersModule,
    fixturesModule,
    faqModule,
    seoModule,
    coachesModule,
    historyModule,
    socialModule,
    liveCacheModule,
  ] = await Promise.all([
    import('@/data/teams-meta'),
    import('@/data/players-data'),
    import('@/data/match-fixtures'),
    import('@/data/faq-schema'),
    import('@/data/seo-meta'),
    import('@/data/coaches-data'),
    import('@/data/world-cup-history.json'),
    import('@/data/player-social'),
    import('@/data/live-cache.json'),
  ])

  let teams = teamsModule.TEAMS
  let players = playersModule.PLAYERS.map(mergePlayerWithIntel)
  let fixtures = fixturesModule.MATCH_FIXTURES
  let teamFaqs = faqModule.TEAM_FAQS
  let teamSeoMeta = seoModule.TEAM_SEO_META
  let coaches = coachesModule.COACHES
  const worldCupHistory = getWorldCupHistoryMap(historyModule.default)
  let playerSocial = socialModule.PLAYER_SOCIAL_DATA
  const liveCache = normalizeLiveCache(liveCacheModule.default)
  const sources: CorePageSources = { ...DEFAULT_SOURCES }

  const [
    supabaseTeams,
    supabasePlayers,
    supabaseFixtures,
    supabaseFaqs,
    supabaseSeoMeta,
    supabaseCoaches,
    supabasePlayerSocial,
  ] = await Promise.all([
    readSupabaseTable(['team_profiles_current', 'teams', 'team_profiles']),
    readSupabaseTable(['player_profiles_current', 'players', 'team_players']),
    readSupabaseTable(['match_fixtures_current', 'match_fixtures', 'fixtures']),
    readSupabaseTable(['team_faqs']),
    readSupabaseTable(['team_seo_meta', 'seo_meta']),
    readSupabaseTable(['coaches', 'coach_profiles']),
    readSupabaseTable(['player_social_profiles', 'player_social']),
  ])

  if (supabaseTeams) {
    teams = mergeBySlug(
      teams,
      supabaseTeams
        .map(normalizeTeamOverride)
        .filter((item): item is TeamOverride => item !== null)
    )
    sources.teams = 'supabase'
  }

  if (supabasePlayers) {
    players = mergeBySlug(
      players,
      supabasePlayers
        .map(normalizePlayerOverride)
        .filter((item): item is PlayerOverride => item !== null)
    )
    sources.players = 'supabase'
  }

  if (supabaseFixtures) {
    fixtures = mergeByKey(
      fixtures,
      supabaseFixtures
        .map(normalizeFixtureOverride)
        .filter((item): item is FixtureOverride => item !== null) as MatchFixture[],
      fixtureKey
    ).sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
    sources.fixtures = 'supabase'
  }

  if (supabaseFaqs) {
    teamFaqs = mergeFaqs(
      teamFaqs,
      supabaseFaqs
        .map(normalizeTeamFaqOverride)
        .filter((item): item is { slug: string; data: TeamFAQ } => item !== null)
    )
    sources.teamFaqs = 'supabase'
  }

  if (supabaseSeoMeta) {
    teamSeoMeta = mergeSeoMeta(
      teamSeoMeta,
      supabaseSeoMeta
        .map(normalizeTeamSeoOverride)
        .filter((item): item is { slug: string; data: PageSEOMeta } => item !== null)
    )
    sources.teamSeoMeta = 'supabase'
  }

  if (supabaseCoaches) {
    coaches = mergeByTeamSlug(
      coaches,
      supabaseCoaches
        .map(normalizeCoachOverride)
        .filter((item): item is CoachOverride => item !== null)
    )
    sources.coaches = 'supabase'
  }

  if (supabasePlayerSocial) {
    playerSocial = mergeByPlayerSlug(
      playerSocial,
      supabasePlayerSocial
        .map(normalizePlayerSocialOverride)
        .filter((item): item is PlayerSocialOverride => item !== null)
    )
    sources.playerSocial = 'supabase'
  }

  return {
    teams,
    players,
    fixtures,
    teamFaqs,
    teamSeoMeta,
    coaches,
    worldCupHistory,
    playerSocial,
    liveCache,
    sources,
  }
})

export async function getAllTeamsForRouting(): Promise<Team[]> {
  const snapshot = await getCoreSiteSnapshot()
  return snapshot.teams
}

export async function getHomePageData(): Promise<HomePageData> {
  const snapshot = await getCoreSiteSnapshot()
  const topTeams = snapshot.teams
    .filter((team) => team.fifaRanking <= 10)
    .slice(0, 6)

  return {
    teams: snapshot.teams,
    topTeams,
    sources: snapshot.sources,
  }
}

export async function getTeamsPageData(): Promise<TeamsPageData> {
  const snapshot = await getCoreSiteSnapshot()
  const groups = getGroups(snapshot.teams)

  return {
    groups,
    teamsByGroup: Object.fromEntries(
      groups.map((group) => [
        group,
        snapshot.teams.filter((team) => team.group === group),
      ])
    ),
    totalTeams: snapshot.teams.length,
    sources: snapshot.sources,
  }
}

export async function getTeamPageData(slug: string): Promise<TeamPageData | null> {
  const snapshot = await getCoreSiteSnapshot()
  const team = snapshot.teams.find((entry) => entry.slug === slug)
  if (!team) return null

  return {
    team,
    players: snapshot.players.filter((player) => player.teamSlug === slug),
    groupTeams: snapshot.teams.filter(
      (entry) => entry.group === team.group && entry.slug !== slug
    ),
    worldCupHistory: snapshot.worldCupHistory[slug],
    marketIntel: buildMarketIntel(team),
    coach: snapshot.coaches.find((entry) => entry.teamSlug === slug),
    teamFaq: snapshot.teamFaqs[slug],
    seoMeta: snapshot.teamSeoMeta[slug],
    sources: snapshot.sources,
  }
}

export async function getMatchesBoardData(): Promise<MatchesBoardData> {
  const snapshot = await getCoreSiteSnapshot()
  const groups = getGroups(snapshot.teams)

  return {
    groups,
    fixtures: snapshot.fixtures,
    teamsBySlug: Object.fromEntries(snapshot.teams.map((team) => [team.slug, team])),
    teamsByGroup: Object.fromEntries(
      groups.map((group) => [
        group,
        snapshot.teams.filter((team) => team.group === group),
      ])
    ),
    sources: snapshot.sources,
  }
}

export async function getDailyBriefingPageData(): Promise<DailyBriefingPageData> {
  const snapshot = await getCoreSiteSnapshot()
  const signals = generateDailySignals(snapshot.teams, snapshot.players)
  const signalTypes = [...new Set(signals.map((signal) => signal.type))]
  const highCount = signals.filter((signal) => signal.impact === 'high').length
  const mediumCount = signals.filter((signal) => signal.impact === 'medium').length
  const trendingPlayers = [...snapshot.playerSocial]
    .sort((a, b) => b.buzzScore - a.buzzScore)
    .slice(0, 6)

  return {
    signals,
    signalTypes,
    highCount,
    mediumCount,
    trendingPlayers,
    liveCache: snapshot.liveCache,
    sources: snapshot.sources,
  }
}

export async function getCorePageSources(): Promise<CorePageSources> {
  const snapshot = await getCoreSiteSnapshot()
  return snapshot.sources
}
