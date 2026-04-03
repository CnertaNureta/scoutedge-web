import type { MatchFixture } from '@/lib/types'

export interface TeamProfile {
  slug: string
  name?: string
  fifaRanking: number
  chemistry: number
  familiarity: number
  stability: number
  morale: number
}

export interface MatchOddsInput {
  homeTeam: string
  awayTeam: string
  drawTeam: string
  odds: {
    homeWin: number
    awayWin: number
    draw?: number
    // decimal | implied | probability
    units?: 'decimal' | 'implied' | 'probability'
    source?: string
  }
}

export interface MatchPredictionInput {
  matchId: string
  homeTeam: TeamProfile
  awayTeam: TeamProfile
  odds?: MatchOddsInput
}

export interface ScheduledMatchPredictionInput {
  match: MatchFixture
  homeTeam: TeamProfile
  awayTeam: TeamProfile
  odds?: MatchOddsInput
}

export interface LayerWeightConfig {
  elo: number
  xgAdjustment: number
  odds: number
}

export interface MatchProbability {
  home: number
  draw: number
  away: number
}

export interface MatchPrediction {
  matchId: string
  homeTeam: Pick<TeamProfile, 'slug' | 'name'>
  awayTeam: Pick<TeamProfile, 'slug' | 'name'>
  probabilities: MatchProbability
  components: {
    elo: MatchProbability
    xgAdjustment: MatchProbability
    odds?: MatchProbability
  }
  metadata: {
    usedWeights: LayerWeightConfig
    totalWeight: number
    usedOdds: boolean
  }
}

export interface MatchPredictionRequest extends Partial<LayerWeightConfig> {
  includeFixtureContext?: boolean
}

export const DEFAULT_LAYER_WEIGHTS: LayerWeightConfig = {
  elo: 0.4,
  xgAdjustment: 0.35,
  odds: 0.25,
}

export const NO_ODDS_LAYER_WEIGHTS: LayerWeightConfig = {
  elo: 0.55,
  xgAdjustment: 0.45,
  odds: 0,
}

const DEFAULT_WEIGHTS = DEFAULT_LAYER_WEIGHTS
const FALLBACK_WEIGHTS = NO_ODDS_LAYER_WEIGHTS

const TEAM_RANK_WEIGHT = 0.58
const TEAM_CHEMISTRY_WEIGHT = 0.2
const TEAM_FAMILIARITY_WEIGHT = 0.09
const TEAM_STABILITY_WEIGHT = 0.08
const TEAM_MORALE_WEIGHT = 0.05

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function sanitizeTeamRanking(ranking: number): number {
  const normalized = Number.isFinite(ranking) ? ranking : 48
  return Math.min(Math.max(Math.round(normalized), 1), 200)
}

function sanitizeTeamMetric(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.min(Math.max(value, 0), 100)
}

function normalizeProfile(value: TeamProfile): TeamProfile {
  return {
    slug: value.slug,
    name: value.name,
    fifaRanking: sanitizeTeamRanking(value.fifaRanking),
    chemistry: sanitizeTeamMetric(value.chemistry),
    familiarity: sanitizeTeamMetric(value.familiarity),
    stability: sanitizeTeamMetric(value.stability),
    morale: sanitizeTeamMetric(value.morale),
  }
}

function normalizeProbability(value: number): number {
  const v = Number.isFinite(value) ? value : 0
  return clamp01(v)
}

function normalizeProbabilities(values: MatchProbability): MatchProbability {
  const sum = values.home + values.draw + values.away
  if (!(sum > 0)) {
    return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 }
  }

  const normalized = {
    home: clamp01(values.home / sum),
    draw: clamp01(values.draw / sum),
    away: clamp01(values.away / sum),
  }

  const total = normalized.home + normalized.draw + normalized.away
  return {
    home: normalized.home / total,
    draw: normalized.draw / total,
    away: normalized.away / total,
  }
}

function teamQualityScore(team: TeamProfile): number {
  const rankingScore = 100 - (sanitizeTeamRanking(team.fifaRanking) - 1) * 1.55
  return (
    rankingScore * TEAM_RANK_WEIGHT +
    team.chemistry * TEAM_CHEMISTRY_WEIGHT +
    team.familiarity * TEAM_FAMILIARITY_WEIGHT +
    team.stability * TEAM_STABILITY_WEIGHT +
    team.morale * TEAM_MORALE_WEIGHT
  )
}

function computeEloComponent(home: TeamProfile, away: TeamProfile): MatchProbability {
  const homeQuality = teamQualityScore(home)
  const awayQuality = teamQualityScore(away)
  const qualityDiff = homeQuality - awayQuality + 2.5
  const homeNoDraw = 1 / (1 + Math.pow(10, -qualityDiff / 95))
  const drawBase = clamp01(0.30 - Math.min(Math.abs(qualityDiff), 52) * 0.0018)
  const remaining = 1 - drawBase
  return normalizeProbabilities({
    home: clamp01(homeNoDraw * remaining),
    away: clamp01((1 - homeNoDraw) * remaining),
    draw: drawBase,
  })
}

function computeXgAdjustmentComponent(home: TeamProfile, away: TeamProfile): MatchProbability {
  const homeScore =
    (home.chemistry * 0.4 +
      home.morale * 0.25 +
      home.stability * 0.2 +
      home.familiarity * 0.15 +
      100 / sanitizeTeamRanking(home.fifaRanking)) /
    3.8
  const awayScore =
    (away.chemistry * 0.4 +
      away.morale * 0.25 +
      away.stability * 0.2 +
      away.familiarity * 0.15 +
      100 / sanitizeTeamRanking(away.fifaRanking)) /
    3.8

  const homeMargin = (homeScore - awayScore) / 120
  const capped = Math.max(-0.42, Math.min(0.42, homeMargin))
  const homeNoDraw = clamp01(0.5 + capped)
  const drawBase = clamp01(0.29 - Math.abs(capped) * 0.21)
  const remaining = 1 - drawBase

  return normalizeProbabilities({
    home: clamp01(homeNoDraw * remaining),
    away: clamp01((1 - homeNoDraw) * remaining),
    draw: drawBase,
  })
}

function parseProbabilityFromOdds(value: number, units?: MatchOddsInput['odds']['units']): number | null {
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = units ?? 'decimal'
  if (unit === 'probability') return normalizeProbability(value)
  if (unit === 'implied') return normalizeProbability(value > 1 ? value / 100 : value)
  // decimal odds default
  return normalizeProbability(value > 1 ? 1 / value : value)
}

function normalizeTeamKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function computeOddsComponent(homeTeamSlug: string, awayTeamSlug: string, odds: MatchOddsInput): MatchProbability | null {
  const units = odds.odds.units
  const homeP = parseProbabilityFromOdds(odds.odds.homeWin, units)
  const awayP = parseProbabilityFromOdds(odds.odds.awayWin, units)
  const drawP = typeof odds.odds.draw === 'number' ? parseProbabilityFromOdds(odds.odds.draw, units) : null
  if (homeP == null || awayP == null) return null

  const expectedHome = normalizeTeamKey(homeTeamSlug)
  const expectedAway = normalizeTeamKey(awayTeamSlug)
  const providedHome = normalizeTeamKey(odds.homeTeam)
  const providedAway = normalizeTeamKey(odds.awayTeam)
  const homeMatches = providedHome.length > 0 && providedHome === expectedHome
  const awayMatches = providedAway.length > 0 && providedAway === expectedAway
  if (!homeMatches || !awayMatches) return null

  const normalized = normalizeProbabilities({
    home: homeP,
    draw: drawP != null && drawP >= 0.01 ? drawP : 0.2,
    away: awayP,
  })

  return {
    home: normalized.home,
    draw: normalized.draw,
    away: normalized.away,
  }
}

function resolveWeights(
  custom: Partial<LayerWeightConfig> = {},
  includeOdds: boolean
): LayerWeightConfig {
  const fallbackTemplate = includeOdds ? DEFAULT_WEIGHTS : FALLBACK_WEIGHTS
  const normalizedCustom = {
    elo: custom.elo !== undefined ? custom.elo : fallbackTemplate.elo,
    xgAdjustment: custom.xgAdjustment !== undefined ? custom.xgAdjustment : fallbackTemplate.xgAdjustment,
    odds: custom.odds !== undefined ? custom.odds : fallbackTemplate.odds,
  }

  if (!includeOdds) {
    const fallback = {
      elo: normalizedCustom.elo,
      xgAdjustment: normalizedCustom.xgAdjustment,
      odds: 0,
    }
    const sum = fallback.elo + fallback.xgAdjustment + fallback.odds
    if (sum <= 0) return DEFAULT_WEIGHTS
    return {
      elo: (fallback.elo / sum) * 1,
      xgAdjustment: (fallback.xgAdjustment / sum) * 1,
      odds: 0,
    }
  }

  const merged = { ...normalizedCustom }
  const sum = merged.elo + merged.xgAdjustment + merged.odds
  if (!(sum > 0)) return DEFAULT_WEIGHTS
  return {
    elo: merged.elo / sum,
    xgAdjustment: merged.xgAdjustment / sum,
    odds: merged.odds / sum,
  }
}

function weightedCombine(
  elo: MatchProbability,
  xg: MatchProbability,
  odds: MatchProbability | null,
  weights: LayerWeightConfig
): MatchProbability {
  const withOdds = odds
    ? {
        home: elo.home * weights.elo + xg.home * weights.xgAdjustment + odds.home * weights.odds,
        draw: elo.draw * weights.elo + xg.draw * weights.xgAdjustment + odds.draw * weights.odds,
        away: elo.away * weights.elo + xg.away * weights.xgAdjustment + odds.away * weights.odds,
      }
    : {
        home: elo.home * weights.elo + xg.home * weights.xgAdjustment,
        draw: elo.draw * weights.elo + xg.draw * weights.xgAdjustment,
        away: elo.away * weights.elo + xg.away * weights.xgAdjustment,
      }

  return normalizeProbabilities(withOdds)
}

export function predictMatch(input: MatchPredictionInput, request?: MatchPredictionRequest): MatchPrediction {
  const normalizedHome = normalizeProfile(input.homeTeam)
  const normalizedAway = normalizeProfile(input.awayTeam)
  const elo = computeEloComponent(normalizedHome, normalizedAway)
  const xg = computeXgAdjustmentComponent(normalizedHome, normalizedAway)
  const odds = input.odds ? computeOddsComponent(normalizedHome.slug, normalizedAway.slug, input.odds) : null
  const usedOdds = Boolean(odds && input.odds)

  const weights = resolveWeights(
    {
      elo: request?.elo,
      xgAdjustment: request?.xgAdjustment,
      odds: request?.odds,
    },
    usedOdds
  )

  const probabilities = weightedCombine(elo, xg, odds ?? null, weights)

  const normalized = normalizeProbabilities(probabilities)

  return {
    matchId: input.matchId,
    homeTeam: {
      slug: normalizedHome.slug,
      name: normalizedHome.name,
    },
    awayTeam: {
      slug: normalizedAway.slug,
      name: normalizedAway.name,
    },
    probabilities: normalized,
    components: {
      elo,
      xgAdjustment: xg,
      odds: odds ?? undefined,
    },
    metadata: {
      usedWeights: weights,
      totalWeight: weights.elo + weights.xgAdjustment + weights.odds,
      usedOdds,
    },
  }
}

export function predictMatches(
  matches: MatchPredictionInput[],
  request?: MatchPredictionRequest
): MatchPrediction[] {
  return matches.map((match) => predictMatch(match, request))
}

export function predictScheduledMatches(
  matches: ScheduledMatchPredictionInput[],
  request?: MatchPredictionRequest
): MatchPrediction[] {
  return matches.map((input) =>
    predictMatch(
      {
        matchId: `${input.match.homeTeamSlug}-vs-${input.match.awayTeamSlug}`,
        homeTeam: input.homeTeam,
        awayTeam: input.awayTeam,
        odds: input.odds,
      },
      request
    )
  )
}

export interface FixturePredictionInput {
  match: MatchFixture
  homeTeam: TeamProfile
  awayTeam: TeamProfile
  odds?: MatchOddsInput
}

export function predictFixture(input: FixturePredictionInput, request?: MatchPredictionRequest): MatchPrediction {
  return predictMatch(
    {
      matchId: `${input.match.homeTeamSlug}-vs-${input.match.awayTeamSlug}`,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      odds: input.odds,
    },
    request
  )
}
