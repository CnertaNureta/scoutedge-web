import { TEAMS } from '@/data/teams-meta'
import { PLAYERS } from '@/data/players-data'
import { MATCH_FIXTURES } from '@/data/match-fixtures'
import { PREDICTION_CONTEXTS, PREDICTION_CONTEXT_MATCH_ID_ALIASES } from '@/data/prediction-contexts'
import type {
  Team,
  Player,
  MatchFixture,
  WorldCupHistory,
  Venue,
  TeamTimezone,
  MarketIntelData,
} from '@/lib/types'
import type { PredictionContextRecord } from '@/lib/prediction-context'
import worldCupHistoryData from '@/data/world-cup-history.json'
import venuesData from '@/data/venues.json'
import timezoneData from '@/data/timezone-adjustments.json'
import { mergePlayerWithIntel } from '@/lib/player-intel-service'

export function getAllTeams(): Team[] {
  return TEAMS
}

export function getTeamBySlug(slug: string): Team | undefined {
  return TEAMS.find((t) => t.slug === slug)
}

export function getTeamsByGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group)
}

export function getAllGroups(): string[] {
  return [...new Set(TEAMS.map((t) => t.group))].sort()
}

export function getFixturesByGroup(group: string): MatchFixture[] {
  return MATCH_FIXTURES.filter((f) => f.group === group).sort(
    (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
  )
}

export function getFixturesByTeam(teamSlug: string): MatchFixture[] {
  return MATCH_FIXTURES.filter(
    (f) => f.homeTeamSlug === teamSlug || f.awayTeamSlug === teamSlug
  ).sort(
    (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
  )
}

export function getPlayersByTeam(teamSlug: string): Player[] {
  return PLAYERS
    .filter((p) => p.teamSlug === teamSlug)
    .map(mergePlayerWithIntel)
}

export function getPlayerBySlug(teamSlug: string, playerSlug: string): Player | undefined {
  const player = PLAYERS.find((p) => p.teamSlug === teamSlug && p.slug === playerSlug)
  return player ? mergePlayerWithIntel(player) : undefined
}

export function getAllPlayers(): Player[] {
  return PLAYERS.map(mergePlayerWithIntel)
}

export function getPredictionContexts(): PredictionContextRecord[] {
  return PREDICTION_CONTEXTS
}

export function getPredictionContextByMatchId(matchId: string): PredictionContextRecord | undefined {
  const resolvedMatchId = PREDICTION_CONTEXT_MATCH_ID_ALIASES[matchId] ?? matchId
  return PREDICTION_CONTEXTS.find((record) => record.match_id === resolvedMatchId)
}

export function getPredictionContextByTeamPair(
  homeTeamSlug: string,
  awayTeamSlug: string
): PredictionContextRecord | undefined {
  return PREDICTION_CONTEXTS.find(
    (record) => record.home_team_slug === homeTeamSlug && record.away_team_slug === awayTeamSlug
  )
}

export function getWorldCupHistory(teamSlug: string): WorldCupHistory | undefined {
  const data = worldCupHistoryData as unknown as { teams: Record<string, WorldCupHistory & { totalAppearances: number | null }> }
  const entry = data.teams[teamSlug]
  if (!entry || entry.totalAppearances === null) return undefined
  return entry as WorldCupHistory
}

export function getAllVenues(): Venue[] {
  return (venuesData as { venues: Venue[] }).venues
}

export function getVenueById(id: string): Venue | undefined {
  return getAllVenues().find((v) => v.id === id)
}

export function getVenuesByCity(cityName: string): Venue[] {
  return getAllVenues().filter((v) => v.metro === cityName || v.city === cityName)
}

export function getTeamTimezone(teamSlug: string): TeamTimezone | undefined {
  const teamTimezones = (timezoneData as { teamHomeTimezones: Record<string, TeamTimezone> }).teamHomeTimezones
  return teamTimezones[teamSlug]
}

export function getJetLagTier(teamSlug: string): string | undefined {
  const tiers = (timezoneData as { jetLagRiskTiers: Array<{ tier: string; teams: string[] }> }).jetLagRiskTiers
  const tier = tiers.find(t => t.teams.includes(teamSlug))
  return tier?.tier
}

const CONSENSUS_SOURCES = [
  'Consensus A',
  'Consensus B',
  'Consensus C',
  'Consensus D',
  'Consensus E',
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

export function getMarketIntel(teamSlug: string): MarketIntelData | undefined {
  const team = getTeamBySlug(teamSlug)
  if (!team) return undefined

  const rng = seededRandom(hashCode(teamSlug))

  // Base odds derived from FIFA ranking — lower rank = shorter odds
  const rank = team.fifaRanking
  let baseOdds: number
  if (rank <= 3) baseOdds = 5 + rng() * 3
  else if (rank <= 8) baseOdds = 10 + rng() * 8
  else if (rank <= 15) baseOdds = 25 + rng() * 25
  else if (rank <= 30) baseOdds = 60 + rng() * 80
  else baseOdds = 150 + rng() * 350

  const tournamentPrices = CONSENSUS_SOURCES.map((source) => {
    const variance = 0.9 + rng() * 0.2
    const decimalOdds = Math.round(baseOdds * variance * 100) / 100
    const impliedProbability = Math.round((1 / decimalOdds) * 1000) / 10
    return { source, decimalOdds, impliedProbability }
  })

  const averageOdds = Math.round((tournamentPrices.reduce((s, o) => s + o.decimalOdds, 0) / tournamentPrices.length) * 100) / 100
  const impliedProbability = Math.round((1 / averageOdds) * 1000) / 10

  const movementRoll = rng()
  const movement: MarketIntelData['movement'] =
    movementRoll < 0.3 ? 'shortening' : movementRoll < 0.6 ? 'drifting' : 'stable'

  // Signal an edge when our chemistry model diverges meaningfully from market consensus.
  let modelEdge: MarketIntelData['modelEdge'] = null
  const ourProb = Math.min(40, Math.max(0.5, (team.chemistry / 100) * (50 / Math.max(rank, 1))))
  const marketProb = impliedProbability
  const edge = ourProb - marketProb
  if (Math.abs(edge) > 1.5) {
    const bestIdx = tournamentPrices.reduce((best, o, i) => o.decimalOdds > tournamentPrices[best].decimalOdds ? i : best, 0)
    modelEdge = {
      ourProbability: ourProb / 100,
      marketProbability: marketProb / 100,
      edge: edge / 100,
      bestOdds: tournamentPrices[bestIdx].decimalOdds,
      bestSource: tournamentPrices[bestIdx].source,
      signalStrength: Math.abs(edge) > 5 ? 'strong' : Math.abs(edge) > 3 ? 'moderate' : 'weak',
    }
  }

  return { tournamentPrices, averageOdds, impliedProbability, movement, modelEdge }
}

function hashCode(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
