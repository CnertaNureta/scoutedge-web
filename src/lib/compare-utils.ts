import { getAllTeams, getTeamBySlug, getPlayersByTeam, getWorldCupHistory, getMarketIntel } from '@/lib/data-service'
import type { Team, Player, WorldCupHistory, MarketIntelData } from '@/lib/types'

export interface KeyPlayerMatchup {
  teamAPlayer: Player
  teamBPlayer: Player
  position: string
}

export interface HeadToHeadData {
  teamA: Team
  teamB: Team
  slug: string
  prediction: { teamAWin: number; draw: number; teamBWin: number }
  statDeltas: {
    ranking: number
    chemistry: number
    familiarity: number
    stability: number
    morale: number
  }
  squadA: { count: number; avgRating: number; totalCaps: number; totalGoals: number }
  squadB: { count: number; avgRating: number; totalCaps: number; totalGoals: number }
  keyPlayerMatchups: KeyPlayerMatchup[]
  historyA?: WorldCupHistory
  historyB?: WorldCupHistory
  marketA?: MarketIntelData
  marketB?: MarketIntelData
  verdict: string
}

/**
 * Generate all C(48,2) = 1128 matchup slugs in alphabetical order.
 */
export function getAllMatchupSlugs(): string[] {
  const teams = getAllTeams().sort((a, b) => a.slug.localeCompare(b.slug))
  const slugs: string[] = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      slugs.push(`${teams[i].slug}-vs-${teams[j].slug}`)
    }
  }
  return slugs
}

/**
 * Parse a matchup slug into two team slugs.
 */
export function parseMatchupSlug(slug: string): { teamASlug: string; teamBSlug: string } | null {
  const parts = slug.split('-vs-')
  if (parts.length !== 2) return null
  return { teamASlug: parts[0], teamBSlug: parts[1] }
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function hashPair(a: string, b: string): number {
  const str = a + b
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function computePowerScore(team: Team): number {
  const rankScore = Math.max(0, 100 - (team.fifaRanking - 1) * 1.5)
  return rankScore * 0.35 + team.chemistry * 0.30 + team.morale * 0.15 + team.stability * 0.10 + team.familiarity * 0.10
}

function getTopPlayers(teamSlug: string, position: string, count: number): Player[] {
  return getPlayersByTeam(teamSlug)
    .filter((p) => p.position === position)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
}

function squadStats(teamSlug: string) {
  const players = getPlayersByTeam(teamSlug)
  const count = players.length
  const avgRating = count > 0 ? Math.round((players.reduce((s, p) => s + p.rating, 0) / count) * 10) / 10 : 0
  const totalCaps = players.reduce((s, p) => s + p.caps, 0)
  const totalGoals = players.reduce((s, p) => s + p.goals, 0)
  return { count, avgRating, totalCaps, totalGoals }
}

function generateVerdict(teamA: Team, teamB: Team, prediction: { teamAWin: number; draw: number; teamBWin: number }): string {
  const winner = prediction.teamAWin > prediction.teamBWin ? teamA : teamB
  const loser = prediction.teamAWin > prediction.teamBWin ? teamB : teamA
  const margin = Math.abs(prediction.teamAWin - prediction.teamBWin)

  if (margin < 0.05) {
    return `This is an extremely tight matchup. Both ${teamA.name} and ${teamB.name} are evenly matched across key metrics, making this one of the most unpredictable potential encounters at the 2026 World Cup. Tactical execution and individual moments of brilliance will likely decide the outcome.`
  }
  if (margin < 0.15) {
    return `${winner.name} hold a slight edge over ${loser.name}, driven primarily by their ${winner.chemistry > loser.chemistry ? 'superior squad chemistry' : 'higher FIFA ranking'}. However, ${loser.name} possess the quality to cause an upset, particularly if their ${loser.morale > loser.chemistry ? 'high morale' : 'tactical stability'} translates into a disciplined performance on the day.`
  }
  return `${winner.name} are clear favorites against ${loser.name} based on current form, squad depth, and predictive metrics. ${winner.name}'s ${winner.fifaRanking < 10 ? 'elite ranking' : 'competitive strength'} and ${winner.chemistry >= 70 ? 'outstanding chemistry' : 'solid team cohesion'} give them a significant advantage. ${loser.name} will need a historic performance to overcome the odds.`
}

/**
 * Compute full head-to-head data for a matchup.
 */
export function getHeadToHead(matchupSlug: string): HeadToHeadData | null {
  const parsed = parseMatchupSlug(matchupSlug)
  if (!parsed) return null

  const teamA = getTeamBySlug(parsed.teamASlug)
  const teamB = getTeamBySlug(parsed.teamBSlug)
  if (!teamA || !teamB) return null

  const powerA = computePowerScore(teamA)
  const powerB = computePowerScore(teamB)
  const total = powerA + powerB
  const rng = seededRandom(hashPair(teamA.slug, teamB.slug))

  // Base probabilities from power scores, with randomness
  const rawA = (powerA / total) + (rng() - 0.5) * 0.08
  const rawB = (powerB / total) + (rng() - 0.5) * 0.08
  const drawBase = 0.22 + (rng() - 0.5) * 0.08
  const sum = rawA + rawB + drawBase
  const prediction = {
    teamAWin: Math.round((rawA / sum) * 100) / 100,
    draw: Math.round((drawBase / sum) * 100) / 100,
    teamBWin: Math.round((rawB / sum) * 100) / 100,
  }

  const statDeltas = {
    ranking: teamA.fifaRanking - teamB.fifaRanking,
    chemistry: teamA.chemistry - teamB.chemistry,
    familiarity: teamA.familiarity - teamB.familiarity,
    stability: teamA.stability - teamB.stability,
    morale: teamA.morale - teamB.morale,
  }

  // Key player matchups by position
  const positions = ['FWD', 'MID', 'DEF'] as const
  const keyPlayerMatchups: KeyPlayerMatchup[] = positions.map((pos) => {
    const aPlayers = getTopPlayers(teamA.slug, pos, 1)
    const bPlayers = getTopPlayers(teamB.slug, pos, 1)
    return {
      teamAPlayer: aPlayers[0],
      teamBPlayer: bPlayers[0],
      position: pos === 'FWD' ? 'Attack' : pos === 'MID' ? 'Midfield' : 'Defense',
    }
  }).filter((m) => m.teamAPlayer && m.teamBPlayer)

  return {
    teamA,
    teamB,
    slug: matchupSlug,
    prediction,
    statDeltas,
    squadA: squadStats(teamA.slug),
    squadB: squadStats(teamB.slug),
    keyPlayerMatchups,
    historyA: getWorldCupHistory(teamA.slug),
    historyB: getWorldCupHistory(teamB.slug),
    marketA: getMarketIntel(teamA.slug),
    marketB: getMarketIntel(teamB.slug),
    verdict: generateVerdict(teamA, teamB, prediction),
  }
}
