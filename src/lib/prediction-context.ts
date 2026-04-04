import { PLAYERS } from '@/data/players-data'
import { TEAMS } from '@/data/teams-meta'
import type { MatchFixture, Player, Team, TeamTimezone, Venue, WorldCupHistory } from '@/lib/types'
import { computeDerivedStats } from '@/lib/player-derived-stats'
import venuesData from '@/data/venues.json'
import timezoneData from '@/data/timezone-adjustments.json'
import worldCupHistoryData from '@/data/world-cup-history.json'

export const MATCH_CONTEXT_MODEL_VERSION = 'match_context_v1.0.0'

const MATCH_CONTEXT_SOURCE_INPUTS = [
  'matches',
  'teams',
  'player_ratings',
  'injury_flags',
  'world_cup_history',
  'venues',
  'timezone_adjustments',
] as const

type FactorCategory =
  | 'power'
  | 'chemistry'
  | 'squad_health'
  | 'attack'
  | 'midfield'
  | 'defense'
  | 'travel'
  | 'pedigree'

type FactorDirection = 'home' | 'away'

interface MatchContextMetric {
  home_value: number
  away_value: number
  delta: number
  unit: string
}

export interface MatchContextProbabilityBand {
  point: number
  lower: number
  upper: number
}

export interface MatchContextConfidenceInterval {
  level: number
  confidence_score: number
  confidence_label: 'low' | 'medium' | 'high'
  interval_width: number
  home_win: MatchContextProbabilityBand
  draw: MatchContextProbabilityBand
  away_win: MatchContextProbabilityBand
  rationale: string
}

export interface MatchContextKeyFactor {
  key: string
  category: FactorCategory
  direction: FactorDirection
  team_slug: string
  team_name: string
  title: string
  summary: string
  explanation: string
  impact_score: number
  metrics: MatchContextMetric
}

export interface MatchContextTeamSummary {
  slug: string
  name: string
  flag: string
  confederation: string
  fifa_ranking: number | null
  coach_name: string
  key_insight: string
  ratings: {
    chemistry: number
    familiarity: number
    stability: number
    morale: number
    power_score: number
  }
  team_stats: {
    squad_size: number
    average_rating: number
    top_xi_rating: number
    attack_rating: number
    midfield_rating: number
    defense_rating: number
    goalkeeper_rating: number
    total_caps: number
    total_goals: number
  }
  injuries: {
    availability_score: number
    red: number
    amber: number
    green: number
    unavailable_players: string[]
    monitoring_players: string[]
  }
  travel: {
    adjustment_hours: number
    jet_lag_tier: string
    note: string
  }
  tournament_history: {
    total_appearances: number
    titles_won: number
    best_finish: string | null
  }
  featured_players: string[]
}

export interface MatchContext {
  match_id: string
  model_version: string
  source_inputs: readonly string[]
  fixture: {
    home_team_slug: string
    away_team_slug: string
    group: string
    round: string
    venue: string
    city: string
    kickoff_utc: string
    altitude_meters: number | null
    roof_type: string | null
  }
  home_team: MatchContextTeamSummary
  away_team: MatchContextTeamSummary
  probabilities: {
    home_win: number
    draw: number
    away_win: number
    favorite: 'home' | 'draw' | 'away'
    favorite_team_slug: string | null
    favorite_edge: number
  }
  confidence_interval: MatchContextConfidenceInterval
  key_factors: MatchContextKeyFactor[]
}

export interface PredictionContextRecord {
  match_id: string
  home_team_slug: string
  away_team_slug: string
  model_version: string
  match_context: MatchContext
}

interface TeamProfile {
  team: Team
  summary: MatchContextTeamSummary
  dataCompleteness: number
  structureScore: number
  historyScore: number
}

interface RawFactor extends MatchContextKeyFactor {}

interface RawWorldCupHistoryEntry {
  totalAppearances: number | null
  bestFinish: string | null
  titlesWon: number | null
}

const POSITION_LIMITS = {
  FWD: 3,
  MID: 4,
  DEF: 4,
  GK: 1,
} as const

const venueEntries = (venuesData as { venues: Venue[] }).venues
const timezoneEntries = timezoneData as {
  teamHomeTimezones: Record<string, TeamTimezone & { notes?: string }>
  jetLagRiskTiers: Array<{ tier: string; teams: string[] }>
}
const worldCupHistoryEntries = (worldCupHistoryData as unknown as {
  teams: Record<string, RawWorldCupHistoryEntry & Partial<WorldCupHistory>>
}).teams

const teamsBySlug = new Map(TEAMS.map((team) => [team.slug, team]))
const playersByTeam = PLAYERS.reduce<Map<string, Player[]>>((acc, player) => {
  const existing = acc.get(player.teamSlug) ?? []
  existing.push(player)
  acc.set(player.teamSlug, existing)
  return acc
}, new Map())
const venuesByName = new Map(venueEntries.map((venue) => [venue.name, venue]))
const jetLagTierByTeam = timezoneEntries.jetLagRiskTiers.reduce<Map<string, string>>((acc, tier) => {
  tier.teams.forEach((teamSlug) => acc.set(teamSlug, tier.tier))
  return acc
}, new Map())

const teamProfiles = new Map(
  TEAMS.map((team) => [team.slug, buildTeamProfile(team.slug)])
)

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getPredictionFavorite(
  fixture: MatchFixture
): { favorite: 'home' | 'draw' | 'away'; favoriteTeamSlug: string | null; favoriteEdge: number } {
  const ranked = [
    { side: 'home' as const, probability: fixture.homeWinProb, teamSlug: fixture.homeTeamSlug },
    { side: 'draw' as const, probability: fixture.drawProb, teamSlug: null },
    { side: 'away' as const, probability: fixture.awayWinProb, teamSlug: fixture.awayTeamSlug },
  ].sort((a, b) => b.probability - a.probability)

  return {
    favorite: ranked[0].side,
    favoriteTeamSlug: ranked[0].teamSlug,
    favoriteEdge: round(ranked[0].probability - ranked[1].probability, 3),
  }
}

function getMatchId(fixture: MatchFixture): string {
  return `${fixture.kickoffUtc.slice(0, 10)}_${fixture.homeTeamSlug}_vs_${fixture.awayTeamSlug}`
}

function getHistoryScore(history: WorldCupHistory | undefined): number {
  if (!history) return 12

  const titlesScore = Math.min(history.titlesWon * 22, 50)
  const appearancesScore = Math.min(history.totalAppearances * 2.5, 30)
  const bestFinishScore = history.bestFinish === 'Champions'
    ? 20
    : history.bestFinish === 'Runners-up'
      ? 16
      : history.bestFinish === 'Third place'
        ? 12
        : history.bestFinish === 'Quarter-finals'
          ? 9
          : history.bestFinish === 'Round of 16'
            ? 6
            : 3

  return round(clamp(titlesScore + appearancesScore + bestFinishScore, 8, 100), 1)
}

function getTopPlayers(players: Player[], position: Player['position'], count: number): Player[] {
  return players
    .filter((player) => player.position === position)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, count)
}

function getFallbackPlayers(players: Player[], count: number): Player[] {
  return [...players].sort((a, b) => b.rating - a.rating).slice(0, count)
}

function scorePlayerUnit(player: Player, category: 'attack' | 'midfield' | 'defense' | 'goalkeeper'): number {
  const stats = computeDerivedStats(player)

  switch (category) {
    case 'attack':
      return stats.overall * 0.45 + stats.shooting * 0.35 + stats.pace * 0.2
    case 'midfield':
      return stats.overall * 0.4 + stats.passing * 0.35 + stats.physical * 0.15 + stats.defense * 0.1
    case 'defense':
      return stats.overall * 0.45 + stats.defense * 0.4 + stats.physical * 0.15
    case 'goalkeeper':
      return stats.overall * 0.45 + stats.defense * 0.4 + stats.passing * 0.15
  }
}

function buildAvailability(
  players: Player[],
  isPlayoff: boolean
): MatchContextTeamSummary['injuries'] {
  const redPlayers = [...players]
    .filter((player) => player.fitnessStatus === 'red')
    .sort((a, b) => b.rating - a.rating)
  const amberPlayers = [...players]
    .filter((player) => player.fitnessStatus === 'amber')
    .sort((a, b) => b.rating - a.rating)

  if (players.length === 0) {
    return {
      availability_score: isPlayoff ? 55 : 70,
      red: 0,
      amber: 0,
      green: 0,
      unavailable_players: [],
      monitoring_players: [],
    }
  }

  const redImpact = redPlayers.reduce((sum, player) => sum + Math.max(player.rating - 6.5, 0) * 4, 0)
  const amberImpact = amberPlayers.reduce((sum, player) => sum + Math.max(player.rating - 6.5, 0) * 2, 0)
  const availabilityScore = clamp(
    100 - redPlayers.length * 12 - amberPlayers.length * 5 - redImpact - amberImpact,
    35,
    100
  )

  return {
    availability_score: round(availabilityScore, 1),
    red: redPlayers.length,
    amber: amberPlayers.length,
    green: players.length - redPlayers.length - amberPlayers.length,
    unavailable_players: redPlayers.slice(0, 3).map((player) => player.name),
    monitoring_players: amberPlayers.slice(0, 3).map((player) => player.name),
  }
}

function buildTeamProfile(teamSlug: string): TeamProfile {
  const team = teamsBySlug.get(teamSlug)
  if (!team) {
    throw new Error(`Missing team data for ${teamSlug}`)
  }

  const players = playersByTeam.get(teamSlug) ?? []
  const rawHistory = worldCupHistoryEntries[teamSlug]
  const history =
    rawHistory && rawHistory.totalAppearances !== null && rawHistory.bestFinish !== null && rawHistory.titlesWon !== null
      ? rawHistory as WorldCupHistory
      : undefined
  const timezone = timezoneEntries.teamHomeTimezones[teamSlug]
  const sortedPlayers = getFallbackPlayers(players, players.length)
  const topXI = sortedPlayers.slice(0, 11)
  const topForwards = getTopPlayers(players, 'FWD', POSITION_LIMITS.FWD)
  const topMidfielders = getTopPlayers(players, 'MID', POSITION_LIMITS.MID)
  const topDefenders = getTopPlayers(players, 'DEF', POSITION_LIMITS.DEF)
  const topGoalkeepers = getTopPlayers(players, 'GK', POSITION_LIMITS.GK)
  const availability = buildAvailability(players, Boolean(team.isPlayoff))
  const averageRating = players.length > 0 ? average(players.map((player) => player.rating)) : team.isPlayoff ? 6 : 6.5
  const topXiRating = topXI.length > 0 ? average(topXI.map((player) => player.rating)) : averageRating
  const attackSample = topForwards.length > 0 ? topForwards : sortedPlayers.slice(0, 3)
  const midfieldSample = topMidfielders.length > 0 ? topMidfielders : sortedPlayers.slice(0, 4)
  const defenseSample = topDefenders.length > 0 ? topDefenders : sortedPlayers.slice(0, 4)
  const goalkeeperSample = topGoalkeepers.length > 0 ? topGoalkeepers : sortedPlayers.slice(0, 1)
  const attackRating = average(attackSample.map((player) => scorePlayerUnit(player, 'attack')))
  const midfieldRating = average(midfieldSample.map((player) => scorePlayerUnit(player, 'midfield')))
  const defenderRatings = defenseSample.map((player) => scorePlayerUnit(player, 'defense'))
  const goalkeeperRating = average(goalkeeperSample.map((player) => scorePlayerUnit(player, 'goalkeeper')))
  const defenseRating = average(
    goalkeeperRating > 0 ? [...defenderRatings, goalkeeperRating] : defenderRatings
  )
  const rankScore = team.fifaRanking > 0 ? Math.max(30, 100 - (team.fifaRanking - 1) * 1.1) : 45
  const powerScore = clamp(
    rankScore * 0.24 +
      team.chemistry * 0.22 +
      team.familiarity * 0.11 +
      team.stability * 0.1 +
      team.morale * 0.12 +
      topXiRating * 10 * 0.13 +
      attackRating * 0.04 +
      defenseRating * 0.04 +
      availability.availability_score * 0.1,
    20,
    100
  )
  const structureScore = team.chemistry * 0.5 + team.familiarity * 0.25 + team.stability * 0.25
  const historyScore = getHistoryScore(history)
  const dataCompleteness = team.isPlayoff ? 0.55 : players.length >= 18 ? 1 : players.length >= 11 ? 0.8 : 0.65

  return {
    team,
    dataCompleteness,
    structureScore: round(structureScore, 1),
    historyScore,
    summary: {
      slug: team.slug,
      name: team.name,
      flag: team.flag,
      confederation: team.confederation,
      fifa_ranking: team.fifaRanking > 0 ? team.fifaRanking : null,
      coach_name: team.coachName,
      key_insight: team.keyInsight,
      ratings: {
        chemistry: team.chemistry,
        familiarity: team.familiarity,
        stability: team.stability,
        morale: team.morale,
        power_score: round(powerScore, 1),
      },
      team_stats: {
        squad_size: players.length,
        average_rating: round(averageRating, 2),
        top_xi_rating: round(topXiRating, 2),
        attack_rating: round(attackRating || 50, 1),
        midfield_rating: round(midfieldRating || 50, 1),
        defense_rating: round(defenseRating || 50, 1),
        goalkeeper_rating: round(goalkeeperRating || 50, 1),
        total_caps: players.reduce((sum, player) => sum + player.caps, 0),
        total_goals: players.reduce((sum, player) => sum + player.goals, 0),
      },
      injuries: availability,
      travel: {
        adjustment_hours: round(Math.abs(timezone?.adjustmentHours ?? 0), 1),
        jet_lag_tier: jetLagTierByTeam.get(team.slug) ?? 'unknown',
        note: timezone?.notes ?? 'No travel note available.',
      },
      tournament_history: {
        total_appearances: history?.totalAppearances ?? 0,
        titles_won: history?.titlesWon ?? 0,
        best_finish: history?.bestFinish ?? null,
      },
      featured_players: sortedPlayers.slice(0, 3).map((player) => player.name),
    },
  }
}

function buildMetric(homeValue: number, awayValue: number, unit: string): MatchContextMetric {
  return {
    home_value: round(homeValue, 1),
    away_value: round(awayValue, 1),
    delta: round(Math.abs(homeValue - awayValue), 1),
    unit,
  }
}

function createFactor(
  category: FactorCategory,
  direction: FactorDirection,
  home: TeamProfile,
  away: TeamProfile,
  impactScore: number,
  title: string,
  summary: string,
  explanation: string,
  metric: MatchContextMetric
): RawFactor {
  const advantagedTeam = direction === 'home' ? home.summary : away.summary

  return {
    key: `${category}_${advantagedTeam.slug}`,
    category,
    direction,
    team_slug: advantagedTeam.slug,
    team_name: advantagedTeam.name,
    title,
    summary,
    explanation,
    impact_score: round(impactScore, 3),
    metrics: metric,
  }
}

function buildRawFactors(home: TeamProfile, away: TeamProfile): RawFactor[] {
  const powerDelta = home.summary.ratings.power_score - away.summary.ratings.power_score
  const structureDelta = home.structureScore - away.structureScore
  const availabilityDelta = home.summary.injuries.availability_score - away.summary.injuries.availability_score
  const attackDelta = home.summary.team_stats.attack_rating - away.summary.team_stats.attack_rating
  const midfieldDelta = home.summary.team_stats.midfield_rating - away.summary.team_stats.midfield_rating
  const defenseDelta = home.summary.team_stats.defense_rating - away.summary.team_stats.defense_rating
  const travelDelta = away.summary.travel.adjustment_hours - home.summary.travel.adjustment_hours
  const pedigreeDelta =
    (home.historyScore + home.summary.ratings.morale * 0.25) -
    (away.historyScore + away.summary.ratings.morale * 0.25)

  const factors = [
    createFactor(
      'power',
      powerDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.06 + Math.abs(powerDelta) / 85,
      `${powerDelta >= 0 ? home.summary.name : away.summary.name} set the stronger composite baseline`,
      `${powerDelta >= 0 ? home.summary.name : away.summary.name} rate ${round(Math.abs(powerDelta), 1)} points higher on the overall model base.`,
      `The composite baseline blends FIFA ranking, chemistry, familiarity, stability, morale, squad quality, and availability. That leaves ${powerDelta >= 0 ? home.summary.name : away.summary.name} at ${powerDelta >= 0 ? home.summary.ratings.power_score : away.summary.ratings.power_score} versus ${powerDelta >= 0 ? away.summary.ratings.power_score : home.summary.ratings.power_score}.`,
      buildMetric(home.summary.ratings.power_score, away.summary.ratings.power_score, 'index')
    ),
    createFactor(
      'chemistry',
      structureDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.05 + Math.abs(structureDelta) / 110,
      `${structureDelta >= 0 ? home.summary.name : away.summary.name} look like the more settled squad`,
      `${structureDelta >= 0 ? home.summary.name : away.summary.name} own a ${round(Math.abs(structureDelta), 1)}-point edge across chemistry, familiarity, and stability.`,
      `${structureDelta >= 0 ? home.summary.name : away.summary.name} arrive with chemistry/familiarity/stability readings of ${structureDelta >= 0 ? home.summary.ratings.chemistry : away.summary.ratings.chemistry}/${structureDelta >= 0 ? home.summary.ratings.familiarity : away.summary.ratings.familiarity}/${structureDelta >= 0 ? home.summary.ratings.stability : away.summary.ratings.stability}. That reduces structural noise and supports repeatable patterns on both sides of the ball.`,
      buildMetric(home.structureScore, away.structureScore, 'index')
    ),
    createFactor(
      'squad_health',
      availabilityDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.04 + Math.abs(availabilityDelta) / 95,
      `${availabilityDelta >= 0 ? home.summary.name : away.summary.name} arrive with the cleaner availability picture`,
      `${availabilityDelta >= 0 ? home.summary.name : away.summary.name} hold a ${round(Math.abs(availabilityDelta), 1)}-point edge in availability score.`,
      `${availabilityDelta >= 0 ? home.summary.name : away.summary.name} have ${availabilityDelta >= 0 ? home.summary.injuries.red : away.summary.injuries.red} red and ${availabilityDelta >= 0 ? home.summary.injuries.amber : away.summary.injuries.amber} amber flags, compared with ${availabilityDelta >= 0 ? away.summary.injuries.red : home.summary.injuries.red} red and ${availabilityDelta >= 0 ? away.summary.injuries.amber : home.summary.injuries.amber} amber on the other side. That changes how much of each team’s preferred XI can be trusted.`,
      buildMetric(home.summary.injuries.availability_score, away.summary.injuries.availability_score, 'score')
    ),
    createFactor(
      'attack',
      attackDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.04 + Math.abs(attackDelta) / 120,
      `${attackDelta >= 0 ? home.summary.name : away.summary.name} carry the sharper attacking ceiling`,
      `${attackDelta >= 0 ? home.summary.name : away.summary.name} post a ${round(Math.abs(attackDelta), 1)}-point edge in attack rating.`,
      `${attackDelta >= 0 ? home.summary.name : away.summary.name} get more top-end output from their forward line, with an attack rating of ${attackDelta >= 0 ? home.summary.team_stats.attack_rating : away.summary.team_stats.attack_rating} compared with ${attackDelta >= 0 ? away.summary.team_stats.attack_rating : home.summary.team_stats.attack_rating}. That matters most if the match breaks open after halftime.`,
      buildMetric(home.summary.team_stats.attack_rating, away.summary.team_stats.attack_rating, 'rating')
    ),
    createFactor(
      'midfield',
      midfieldDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.04 + Math.abs(midfieldDelta) / 120,
      `${midfieldDelta >= 0 ? home.summary.name : away.summary.name} project more control through midfield`,
      `${midfieldDelta >= 0 ? home.summary.name : away.summary.name} lead by ${round(Math.abs(midfieldDelta), 1)} points in midfield rating.`,
      `${midfieldDelta >= 0 ? home.summary.name : away.summary.name} should find it easier to manage tempo and second balls, thanks to a midfield rating of ${midfieldDelta >= 0 ? home.summary.team_stats.midfield_rating : away.summary.team_stats.midfield_rating} against ${midfieldDelta >= 0 ? away.summary.team_stats.midfield_rating : home.summary.team_stats.midfield_rating}.`,
      buildMetric(home.summary.team_stats.midfield_rating, away.summary.team_stats.midfield_rating, 'rating')
    ),
    createFactor(
      'defense',
      defenseDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.04 + Math.abs(defenseDelta) / 120,
      `${defenseDelta >= 0 ? home.summary.name : away.summary.name} hold the sturdier defensive floor`,
      `${defenseDelta >= 0 ? home.summary.name : away.summary.name} own a ${round(Math.abs(defenseDelta), 1)}-point edge in defensive rating.`,
      `${defenseDelta >= 0 ? home.summary.name : away.summary.name} combine center-back depth and goalkeeper quality more cleanly, landing at ${defenseDelta >= 0 ? home.summary.team_stats.defense_rating : away.summary.team_stats.defense_rating} versus ${defenseDelta >= 0 ? away.summary.team_stats.defense_rating : home.summary.team_stats.defense_rating}. That lowers collapse risk if the game turns physical.`,
      buildMetric(home.summary.team_stats.defense_rating, away.summary.team_stats.defense_rating, 'rating')
    ),
    createFactor(
      'travel',
      travelDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.025 + Math.abs(travelDelta) / 110,
      `${travelDelta >= 0 ? home.summary.name : away.summary.name} face the lighter travel adjustment`,
      `${travelDelta >= 0 ? home.summary.name : away.summary.name} avoid roughly ${round(Math.abs(travelDelta), 1)} hours of extra time-zone disruption.`,
      `${travelDelta >= 0 ? home.summary.name : away.summary.name} only need to absorb a ${travelDelta >= 0 ? home.summary.travel.adjustment_hours : away.summary.travel.adjustment_hours}-hour adjustment, while the opponent sits at ${travelDelta >= 0 ? away.summary.travel.adjustment_hours : home.summary.travel.adjustment_hours}. That does not decide the match on its own, but it can show up in sharpness and recovery.`,
      buildMetric(home.summary.travel.adjustment_hours, away.summary.travel.adjustment_hours, 'hours')
    ),
    createFactor(
      'pedigree',
      pedigreeDelta >= 0 ? 'home' : 'away',
      home,
      away,
      0.03 + Math.abs(pedigreeDelta) / 140,
      `${pedigreeDelta >= 0 ? home.summary.name : away.summary.name} bring the deeper tournament memory`,
      `${pedigreeDelta >= 0 ? home.summary.name : away.summary.name} carry a ${round(Math.abs(pedigreeDelta), 1)}-point edge in pedigree and morale.`,
      `${pedigreeDelta >= 0 ? home.summary.name : away.summary.name} combine historical World Cup depth with current morale more convincingly, which tends to matter when the match state gets tense. Titles, appearances, and belief all point slightly more in their direction.`,
      buildMetric(home.historyScore + home.summary.ratings.morale * 0.25, away.historyScore + away.summary.ratings.morale * 0.25, 'index')
    ),
  ]

  return factors.sort((a, b) => b.impact_score - a.impact_score)
}

function buildProbabilityBand(point: number, halfWidth: number): MatchContextProbabilityBand {
  return {
    point: round(point, 3),
    lower: round(clamp(point - halfWidth, 0.01, 0.97), 3),
    upper: round(clamp(point + halfWidth, 0.02, 0.98), 3),
  }
}

function buildConfidenceInterval(
  fixture: MatchFixture,
  home: TeamProfile,
  away: TeamProfile,
  keyFactors: MatchContextKeyFactor[]
): MatchContextConfidenceInterval {
  const favorite = getPredictionFavorite(fixture)
  const powerGap = Math.abs(home.summary.ratings.power_score - away.summary.ratings.power_score) / 100
  const healthGap = Math.abs(home.summary.injuries.availability_score - away.summary.injuries.availability_score) / 100
  const structureGap = Math.abs(home.structureScore - away.structureScore) / 100
  const dataPenalty = (2 - home.dataCompleteness - away.dataCompleteness) * 0.18
  const injuryPenalty = (home.summary.injuries.red + away.summary.injuries.red) * 0.03
  const tightMatchPenalty = favorite.favoriteEdge < 0.08 ? 0.08 : favorite.favoriteEdge < 0.14 ? 0.04 : 0
  const rawConfidenceScore = clamp(
    0.5 +
      favorite.favoriteEdge * 1.15 +
      powerGap * 0.32 +
      healthGap * 0.18 +
      structureGap * 0.12 -
      dataPenalty -
      injuryPenalty -
      tightMatchPenalty,
    0.36,
    0.87
  )
  const confidenceScore = clamp(
    Math.min(
      rawConfidenceScore,
      home.dataCompleteness < 0.7 || away.dataCompleteness < 0.7 ? 0.72 : 0.87
    ),
    0.36,
    0.87
  )
  const confidenceLabel = confidenceScore >= 0.74 ? 'high' : confidenceScore >= 0.58 ? 'medium' : 'low'
  const baseHalfWidth = 0.038 + (1 - confidenceScore) * 0.09
  const favoriteHalfWidth = baseHalfWidth * 0.85
  const drawHalfWidth = baseHalfWidth * (favorite.favoriteEdge < 0.1 ? 1.05 : 0.92)
  const homeHalfWidth = favorite.favorite === 'home' ? favoriteHalfWidth : baseHalfWidth
  const awayHalfWidth = favorite.favorite === 'away' ? favoriteHalfWidth : baseHalfWidth

  const uncertaintyNotes: string[] = []
  if (favorite.favoriteEdge < 0.1) uncertaintyNotes.push('the baseline probabilities are tightly clustered')
  if (home.dataCompleteness < 0.9 || away.dataCompleteness < 0.9) uncertaintyNotes.push('one side is still running with partial roster certainty')
  if (home.summary.injuries.red + away.summary.injuries.red > 0 || home.summary.injuries.amber + away.summary.injuries.amber >= 3) {
    uncertaintyNotes.push('availability flags still add lineup volatility')
  }

  const leadingFactor = keyFactors[0]
  const rationaleLead = leadingFactor
    ? `${leadingFactor.title}.`
    : 'Core inputs remain close enough that the model cannot tighten the range much further.'
  const rationaleTail = uncertaintyNotes.length > 0
    ? ` The interval stays ${confidenceLabel === 'high' ? 'slightly wider than a pure talent mismatch' : 'meaningfully wide'} because ${uncertaintyNotes.join(' and ')}.`
    : ` The interval stays ${confidenceLabel === 'high' ? 'tight' : 'controlled'} because the strongest inputs all point in the same direction.`

  return {
    level: 0.8,
    confidence_score: round(confidenceScore, 3),
    confidence_label: confidenceLabel,
    interval_width: round(baseHalfWidth * 2, 3),
    home_win: buildProbabilityBand(fixture.homeWinProb, homeHalfWidth),
    draw: buildProbabilityBand(fixture.drawProb, drawHalfWidth),
    away_win: buildProbabilityBand(fixture.awayWinProb, awayHalfWidth),
    rationale: `${rationaleLead}${rationaleTail}`,
  }
}

export function buildPredictionContextRecord(fixture: MatchFixture): PredictionContextRecord {
  const home = teamProfiles.get(fixture.homeTeamSlug)
  const away = teamProfiles.get(fixture.awayTeamSlug)

  if (!home || !away) {
    throw new Error(`Missing team profile for fixture ${fixture.homeTeamSlug} vs ${fixture.awayTeamSlug}`)
  }

  const venue = venuesByName.get(fixture.venue)
  const matchId = getMatchId(fixture)
  const favorite = getPredictionFavorite(fixture)
  const keyFactors = buildRawFactors(home, away).slice(0, 4)
  const matchContext: MatchContext = {
    match_id: matchId,
    model_version: MATCH_CONTEXT_MODEL_VERSION,
    source_inputs: MATCH_CONTEXT_SOURCE_INPUTS,
    fixture: {
      home_team_slug: fixture.homeTeamSlug,
      away_team_slug: fixture.awayTeamSlug,
      group: fixture.group,
      round: fixture.round,
      venue: fixture.venue,
      city: fixture.city,
      kickoff_utc: fixture.kickoffUtc,
      altitude_meters: venue?.altitudeMeters ?? null,
      roof_type: venue?.roofType ?? null,
    },
    home_team: home.summary,
    away_team: away.summary,
    probabilities: {
      home_win: round(fixture.homeWinProb, 3),
      draw: round(fixture.drawProb, 3),
      away_win: round(fixture.awayWinProb, 3),
      favorite: favorite.favorite,
      favorite_team_slug: favorite.favoriteTeamSlug,
      favorite_edge: round(favorite.favoriteEdge, 3),
    },
    confidence_interval: buildConfidenceInterval(fixture, home, away, keyFactors),
    key_factors: keyFactors,
  }

  return {
    match_id: matchId,
    home_team_slug: fixture.homeTeamSlug,
    away_team_slug: fixture.awayTeamSlug,
    model_version: MATCH_CONTEXT_MODEL_VERSION,
    match_context: matchContext,
  }
}

export function getPredictionMatchId(fixture: MatchFixture): string {
  return getMatchId(fixture)
}
