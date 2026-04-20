import { MATCH_FIXTURES } from '../data/match-fixtures.ts'
import { PLAYERS } from '../data/players-data.ts'
import { TEAMS } from '../data/teams-meta.ts'
import type { MatchFixture, Player, Team } from './types'

export const NARRATIVE_CONTENT_TYPES = [
  'match_preview',
  'daily_briefing',
  'team_narrative',
  'player_narrative',
] as const

export const NARRATIVE_STATUSES = ['draft', 'approved', 'published'] as const

export type NarrativeContentType = (typeof NARRATIVE_CONTENT_TYPES)[number]
export type NarrativeStatus = (typeof NARRATIVE_STATUSES)[number]
export type NarrativeFactSource = 'match-fixtures' | 'players-data' | 'teams-meta'

export interface NarrativeFact {
  key: string
  label: string
  value: string | number
  source: NarrativeFactSource
  detail?: string
}

export interface NarrativeRow {
  cache_key: string
  content_type: NarrativeContentType
  title: string
  summary: string
  slug: string
  status: NarrativeStatus
  source_date: string
  match_key: string | null
  home_team_slug: string | null
  away_team_slug: string | null
  team_slug: string | null
  player_slug: string | null
  facts_used: NarrativeFact[]
  fact_hash: string
  body_markdown: string
  meta: Record<string, unknown>
  approved_at: string | null
  published_at: string | null
}

export interface AiContentRow {
  source_narrative_id?: string | null
  content_type: NarrativeContentType
  title: string
  summary: string
  slug: string
  status: NarrativeStatus
  full_content: string
  facts_used: NarrativeFact[]
  related_team_ids: string[]
  related_player_ids: string[]
  source_date: string
  published_at: string | null
  metadata: Record<string, unknown>
}

export interface NarrativeBundle {
  narrative: NarrativeRow
  aiContent: AiContentRow
}

export interface BuildNarrativeOptions {
  status?: NarrativeStatus
  sourceDate?: string
}

const teamBySlug = new Map(TEAMS.map((team) => [team.slug, team]))
const playersByTeam = PLAYERS.reduce<Record<string, Player[]>>((acc, player) => {
  if (!acc[player.teamSlug]) acc[player.teamSlug] = []
  acc[player.teamSlug].push(player)
  return acc
}, {})

function isNarrativeStatus(value: string): value is NarrativeStatus {
  return (NARRATIVE_STATUSES as readonly string[]).includes(value)
}

export function parseNarrativeStatus(value: string | undefined, fallback: NarrativeStatus = 'draft'): NarrativeStatus {
  if (!value) return fallback
  return isNarrativeStatus(value) ? value : fallback
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function formatPercent(probability: number): string {
  return `${Math.round(probability * 100)}%`
}

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
}

function sortByRating(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    return b.caps - a.caps
  })
}

function getTeam(teamSlug: string): Team {
  const team = teamBySlug.get(teamSlug)
  if (!team) throw new Error(`Unknown team slug: ${teamSlug}`)
  return team
}

function getPlayers(teamSlug: string): Player[] {
  return playersByTeam[teamSlug] ?? []
}

function getTopPlayers(teamSlug: string, limit = 2): Player[] {
  return sortByRating(getPlayers(teamSlug)).slice(0, limit)
}

function getFitnessCounts(teamSlug: string): { red: number; amber: number } {
  return getPlayers(teamSlug).reduce(
    (acc, player) => {
      if (player.fitnessStatus === 'red') acc.red += 1
      if (player.fitnessStatus === 'amber') acc.amber += 1
      return acc
    },
    { red: 0, amber: 0 },
  )
}

function buildMatchKey(fixture: MatchFixture): string {
  return `${fixture.group}-${fixture.homeTeamSlug}-vs-${fixture.awayTeamSlug}-${fixture.kickoffUtc.slice(0, 10)}`
}

function buildFactHash(factsUsed: NarrativeFact[]): string {
  const input = JSON.stringify(factsUsed)
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a-${(hash >>> 0).toString(16)}`
}

function buildCacheKey(contentType: NarrativeContentType, sourceDate: string, scope: string, factsUsed: NarrativeFact[]): string {
  return `${contentType}:${scope}:${sourceDate}:${buildFactHash(factsUsed)}`
}

function buildApprovedAt(status: NarrativeStatus, publishedAt: string | null): string | null {
  if (status === 'approved' || status === 'published') {
    return publishedAt ?? new Date().toISOString()
  }
  return null
}

function stringifyFactsUsed(factsUsed: NarrativeFact[]): string[] {
  return factsUsed.map((fact) => {
    const detail = fact.detail ? ` (${fact.detail})` : ''
    return `- ${fact.label}: ${fact.value}${detail}`
  })
}

function createNarrativeBundle(input: {
  contentType: NarrativeContentType
  title: string
  summary: string
  slug: string
  status: NarrativeStatus
  sourceDate: string
  matchKey?: string
  homeTeamSlug?: string
  awayTeamSlug?: string
  teamSlug?: string
  playerSlug?: string
  factsUsed: NarrativeFact[]
  bodyMarkdown: string
  relatedTeamIds: string[]
  relatedPlayerIds?: string[]
  metadata?: Record<string, unknown>
}): NarrativeBundle {
  const factHash = buildFactHash(input.factsUsed)
  const cacheKey = buildCacheKey(
    input.contentType,
    input.sourceDate,
    input.matchKey ?? input.teamSlug ?? input.playerSlug ?? input.slug,
    input.factsUsed,
  )
  const publishedAt = input.status === 'published' ? new Date().toISOString() : null
  const metadata = {
    ...(input.metadata ?? {}),
    factHash,
    factCount: input.factsUsed.length,
  }

  return {
    narrative: {
      cache_key: cacheKey,
      content_type: input.contentType,
      title: input.title,
      summary: input.summary,
      slug: input.slug,
      status: input.status,
      source_date: input.sourceDate,
      match_key: input.matchKey ?? null,
      home_team_slug: input.homeTeamSlug ?? null,
      away_team_slug: input.awayTeamSlug ?? null,
      team_slug: input.teamSlug ?? null,
      player_slug: input.playerSlug ?? null,
      facts_used: input.factsUsed,
      fact_hash: factHash,
      body_markdown: input.bodyMarkdown,
      meta: metadata,
      approved_at: buildApprovedAt(input.status, publishedAt),
      published_at: publishedAt,
    },
    aiContent: {
      content_type: input.contentType,
      title: input.title,
      summary: input.summary,
      slug: input.slug,
      status: input.status,
      full_content: input.bodyMarkdown,
      facts_used: input.factsUsed,
      related_team_ids: input.relatedTeamIds,
      related_player_ids: input.relatedPlayerIds ?? [],
      source_date: input.sourceDate,
      published_at: publishedAt,
      metadata,
    },
  }
}

export function buildMatchPreviewBundle(
  fixture: MatchFixture,
  options: BuildNarrativeOptions = {},
): NarrativeBundle {
  const status = options.status ?? 'draft'
  const sourceDate = options.sourceDate ?? fixture.kickoffUtc.slice(0, 10)
  const homeTeam = getTeam(fixture.homeTeamSlug)
  const awayTeam = getTeam(fixture.awayTeamSlug)
  const homeFitness = getFitnessCounts(homeTeam.slug)
  const awayFitness = getFitnessCounts(awayTeam.slug)
  const homeTopPlayers = getTopPlayers(homeTeam.slug)
  const awayTopPlayers = getTopPlayers(awayTeam.slug)
  const matchKey = buildMatchKey(fixture)

  const factsUsed: NarrativeFact[] = [
    {
      key: 'kickoff',
      label: 'Kickoff (UTC)',
      value: formatDateTime(fixture.kickoffUtc),
      source: 'match-fixtures',
      detail: `${fixture.venue}, ${fixture.city}`,
    },
    {
      key: 'group',
      label: 'Group',
      value: `Group ${fixture.group}`,
      source: 'match-fixtures',
    },
    {
      key: 'probabilities',
      label: 'Model probabilities',
      value: `${homeTeam.name} ${formatPercent(fixture.homeWinProb)} · Draw ${formatPercent(fixture.drawProb)} · ${awayTeam.name} ${formatPercent(fixture.awayWinProb)}`,
      source: 'match-fixtures',
    },
    {
      key: 'rank-gap',
      label: 'FIFA ranking gap',
      value: `${homeTeam.name} #${homeTeam.fifaRanking} vs ${awayTeam.name} #${awayTeam.fifaRanking}`,
      source: 'teams-meta',
    },
    {
      key: 'chemistry',
      label: 'Chemistry index',
      value: `${homeTeam.name} ${homeTeam.chemistry}/100 vs ${awayTeam.name} ${awayTeam.chemistry}/100`,
      source: 'teams-meta',
    },
    {
      key: 'morale',
      label: 'Morale index',
      value: `${homeTeam.name} ${homeTeam.morale}/100 vs ${awayTeam.name} ${awayTeam.morale}/100`,
      source: 'teams-meta',
    },
    {
      key: 'fitness-home',
      label: `${homeTeam.name} fitness watch`,
      value: `${homeFitness.red} red, ${homeFitness.amber} amber`,
      source: 'players-data',
    },
    {
      key: 'fitness-away',
      label: `${awayTeam.name} fitness watch`,
      value: `${awayFitness.red} red, ${awayFitness.amber} amber`,
      source: 'players-data',
    },
  ]

  const title = `${homeTeam.name} vs ${awayTeam.name} Match Preview`
  const slug = slugify(`${homeTeam.slug}-vs-${awayTeam.slug}-match-preview-${sourceDate}`)
  const summary = `${homeTeam.name} open Group ${fixture.group} with a ${formatPercent(fixture.homeWinProb)} win edge over ${awayTeam.name}, but the gap stays narrow enough for team state and availability to matter.`
  const bodyMarkdown = [
    `# ${title}`,
    '',
    `KickOracle has this Group ${fixture.group} fixture at ${formatPercent(fixture.homeWinProb)} for ${homeTeam.name}, ${formatPercent(fixture.drawProb)} for the draw, and ${formatPercent(fixture.awayWinProb)} for ${awayTeam.name}. Every claim below is anchored to the fixture, team, and player facts listed at the end of this preview.`,
    '',
    '## Match Snapshot',
    '',
    `- Kickoff: ${formatDateTime(fixture.kickoffUtc)}`,
    `- Venue: ${fixture.venue}, ${fixture.city}`,
    `- Rankings: ${homeTeam.name} #${homeTeam.fifaRanking}, ${awayTeam.name} #${awayTeam.fifaRanking}`,
    `- Chemistry: ${homeTeam.name} ${homeTeam.chemistry}/100, ${awayTeam.name} ${awayTeam.chemistry}/100`,
    '',
    `## Why ${homeTeam.name} Start Ahead`,
    '',
    `${homeTeam.name} carry the stronger baseline profile in the model because they pair the better FIFA ranking with the better chemistry and morale scores. ${homeTeam.keyInsight}`,
    '',
    `Their most bankable performers remain ${homeTopPlayers.map((player) => `${player.name} (${player.rating}/10)`).join(' and ')}, which keeps the preview grounded in players already rated as the squad's best current options.`,
    '',
    `## Where ${awayTeam.name} Can Swing The Match`,
    '',
    `${awayTeam.keyInsight}`,
    '',
    `${awayTeam.name}'s case depends on whether their squad cohesion can outperform the ranking gap and whether ${awayTopPlayers.map((player) => `${player.name} (${player.rating}/10)`).join(' and ')} can lift the team's ceiling in the decisive moments.`,
    '',
    '## Availability Watch',
    '',
    `- ${homeTeam.name}: ${homeFitness.red} red flags and ${homeFitness.amber} amber flags across the current player fitness snapshot.`,
    `- ${awayTeam.name}: ${awayFitness.red} red flags and ${awayFitness.amber} amber flags across the current player fitness snapshot.`,
    '',
    '## Fact Anchors',
    '',
    ...stringifyFactsUsed(factsUsed),
    '',
    '## Fact Constraint Note',
    '',
    'This narrative does not speculate beyond the stored fixture, team, and player datasets. Any claim that is not represented in `facts_used` should be treated as out of scope for publication.',
    '',
  ].join('\n')

  return createNarrativeBundle({
    contentType: 'match_preview',
    title,
    summary,
    slug,
    status,
    sourceDate,
    matchKey,
    homeTeamSlug: homeTeam.slug,
    awayTeamSlug: awayTeam.slug,
    factsUsed,
    bodyMarkdown,
    relatedTeamIds: [homeTeam.slug, awayTeam.slug],
    relatedPlayerIds: [...homeTopPlayers, ...awayTopPlayers].map((player) => player.slug),
    metadata: {
      fixtureGroup: fixture.group,
      matchKey,
      venue: fixture.venue,
      city: fixture.city,
    },
  })
}

export function buildDailyBriefingBundle(options: BuildNarrativeOptions = {}): NarrativeBundle {
  const status = options.status ?? 'draft'
  const sourceDate = options.sourceDate ?? new Date().toISOString().slice(0, 10)
  const sourceDateStart = new Date(`${sourceDate}T00:00:00Z`).getTime()
  const chemistryLeaders = [...TEAMS]
    .sort((a, b) => {
      if (b.chemistry !== a.chemistry) return b.chemistry - a.chemistry
      return b.morale - a.morale
    })
    .slice(0, 3)

  const injuryWatch = [...TEAMS]
    .map((team) => ({ team, fitness: getFitnessCounts(team.slug) }))
    .filter(({ fitness }) => fitness.red > 0 || fitness.amber > 0)
    .sort((a, b) => {
      const aScore = a.fitness.red * 10 + a.fitness.amber
      const bScore = b.fitness.red * 10 + b.fitness.amber
      return bScore - aScore
    })
    .slice(0, 3)

  const upcomingFixtures = [...MATCH_FIXTURES]
    .filter((fixture) => new Date(fixture.kickoffUtc).getTime() >= sourceDateStart)
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime())
    .slice(0, 3)

  const factsUsed: NarrativeFact[] = [
    ...chemistryLeaders.map((team, index) => ({
      key: `chemistry-leader-${index + 1}`,
      label: `${team.name} chemistry leader`,
      value: `${team.chemistry}/100 chemistry · ${team.morale}/100 morale`,
      source: 'teams-meta' as const,
      detail: `FIFA #${team.fifaRanking}`,
    })),
    ...injuryWatch.map(({ team, fitness }, index) => ({
      key: `injury-watch-${index + 1}`,
      label: `${team.name} availability watch`,
      value: `${fitness.red} red, ${fitness.amber} amber`,
      source: 'players-data' as const,
    })),
    ...upcomingFixtures.map((fixture, index) => {
      const homeTeam = getTeam(fixture.homeTeamSlug)
      const awayTeam = getTeam(fixture.awayTeamSlug)
      return {
        key: `fixture-${index + 1}`,
        label: `${homeTeam.name} vs ${awayTeam.name}`,
        value: `${formatDateTime(fixture.kickoffUtc)} · ${homeTeam.name} ${formatPercent(fixture.homeWinProb)} / Draw ${formatPercent(fixture.drawProb)} / ${awayTeam.name} ${formatPercent(fixture.awayWinProb)}`,
        source: 'match-fixtures' as const,
        detail: `Group ${fixture.group}`,
      }
    }),
  ]

  const title = `World Cup 2026 Daily Briefing: ${formatDate(sourceDate)}`
  const slug = slugify(`world-cup-2026-daily-briefing-${sourceDate}`)
  const injuryWatchSummary = injuryWatch.length > 0
    ? injuryWatch.map(({ team }) => team.name).join(', ')
    : 'teams with clean current availability snapshots'
  const summary = `${chemistryLeaders[0].name}, ${chemistryLeaders[1].name}, and ${chemistryLeaders[2].name} lead today's chemistry board, while availability watch items cluster around ${injuryWatchSummary}.`
  const bodyMarkdown = [
    `# ${title}`,
    '',
    `This briefing is fact-anchored to KickOracle's stored team, player, and fixture datasets as of ${formatDate(sourceDate)}. It is designed to remain publishable even when no live LLM run is available, so every sentence below maps back to the tracked facts listed in the final section.`,
    '',
    '## Form Leaders',
    '',
    ...chemistryLeaders.map((team) => `- ${team.name}: chemistry ${team.chemistry}/100, morale ${team.morale}/100, familiarity ${team.familiarity}/100, FIFA ranking #${team.fifaRanking}.`),
    '',
    '## Availability Alerts',
    '',
    ...injuryWatch.map(({ team, fitness }) => `- ${team.name}: ${fitness.red} red fitness flags and ${fitness.amber} amber fitness flags in the current player snapshot.`),
    '',
    '## Next Notable Fixtures',
    '',
    ...upcomingFixtures.map((fixture) => {
      const homeTeam = getTeam(fixture.homeTeamSlug)
      const awayTeam = getTeam(fixture.awayTeamSlug)
      return `- ${homeTeam.name} vs ${awayTeam.name} on ${formatDateTime(fixture.kickoffUtc)} in ${fixture.city}. Model edge: ${homeTeam.name} ${formatPercent(fixture.homeWinProb)}, draw ${formatPercent(fixture.drawProb)}, ${awayTeam.name} ${formatPercent(fixture.awayWinProb)}.`
    }),
    '',
    '## What This Briefing Can Safely Say',
    '',
    'The pipeline is allowed to summarize tracked rankings, chemistry, morale, availability flags, and scheduled fixtures. It is not allowed to invent new injuries, quotes, transfers, or tactical changes unless those facts are first written into structured storage and referenced in `facts_used`.',
    '',
    '## Fact Anchors',
    '',
    ...stringifyFactsUsed(factsUsed),
    '',
  ].join('\n')

  return createNarrativeBundle({
    contentType: 'daily_briefing',
    title,
    summary,
    slug,
    status,
    sourceDate,
    factsUsed,
    bodyMarkdown,
    relatedTeamIds: [
      ...new Set([
        ...chemistryLeaders.map((team) => team.slug),
        ...injuryWatch.map(({ team }) => team.slug),
        ...upcomingFixtures.flatMap((fixture) => [fixture.homeTeamSlug, fixture.awayTeamSlug]),
      ]),
    ],
    metadata: {
      briefingDate: sourceDate,
      chemistryLeader: chemistryLeaders[0].slug,
      injuryWatchCount: injuryWatch.length,
    },
  })
}

export function buildSampleNarrativeBundles(options: BuildNarrativeOptions = {}): NarrativeBundle[] {
  const matchPreviewFixture = MATCH_FIXTURES[0]

  if (!matchPreviewFixture) {
    throw new Error('No match fixtures available to build narrative samples.')
  }

  return [
    buildMatchPreviewBundle(matchPreviewFixture, { status: options.status }),
    buildDailyBriefingBundle(options),
  ]
}
