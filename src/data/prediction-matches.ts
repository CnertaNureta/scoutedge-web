/**
 * Curated set of group-stage matches for the prediction game.
 * We pick 1 key match from each of the 12 groups = 12 predictions,
 * plus 4 knockout scenarios = 16 total predictions.
 */

import { MATCH_FIXTURES } from './match-fixtures'
import { TEAMS } from '@/data/teams-meta'
import {
  predictScheduledMatches,
  type ScheduledMatchPredictionInput,
  type TeamProfile,
} from '@/lib/prediction-engine'

export interface PredictionMatch {
  id: string
  homeTeamSlug: string
  awayTeamSlug: string
  round: string
  group: string
  venue: string
  city: string
  kickoffUtc: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
}

function clampProbability(value: number): number {
  const v = Number.isFinite(value) ? value : 0
  return Math.max(0, Math.min(1, v))
}

function fallbackProfile(slug: string): TeamProfile {
  return {
    slug,
    name: slug
      .split('-')
      .map((s) => (s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s))
      .join(' '),
    fifaRanking: 150,
    chemistry: 50,
    familiarity: 50,
    stability: 50,
    morale: 50,
  }
}

/** Pick the most interesting match from each group (highest combined rank teams) */
function pickGroupHighlights(): PredictionMatch[] {
  const teams = TEAMS
  const groups = [...new Set(MATCH_FIXTURES.map((f) => f.group))].sort()

  return groups.map((group) => {
    const groupFixtures = MATCH_FIXTURES.filter((f) => f.group === group)

    // Score each match by how close the probabilities are (more exciting)
    const scored = groupFixtures.map((f) => {
      const homeTeam = teams.find((t) => t.slug === f.homeTeamSlug)
      const awayTeam = teams.find((t) => t.slug === f.awayTeamSlug)
      const rankSum = (homeTeam?.fifaRanking ?? 50) + (awayTeam?.fifaRanking ?? 50)
      const closeness = 1 - Math.abs(f.homeWinProb - f.awayWinProb)
      return { fixture: f, score: closeness * 100 - rankSum * 0.5 }
    })

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0].fixture

    return {
      id: `group-${group}-${best.homeTeamSlug}-${best.awayTeamSlug}`,
      ...best,
    }
  })
}

/** Knockout prediction scenarios */
const KNOCKOUT_PREDICTIONS: PredictionMatch[] = [
  {
    id: 'ko-qf-dream-1',
    homeTeamSlug: 'brazil',
    awayTeamSlug: 'france',
    round: 'Quarterfinal',
    group: '',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
    kickoffUtc: '2026-07-10T20:00:00Z',
    homeWinProb: 0.42,
    drawProb: 0.23,
    awayWinProb: 0.35,
  },
  {
    id: 'ko-qf-dream-2',
    homeTeamSlug: 'argentina',
    awayTeamSlug: 'germany',
    round: 'Quarterfinal',
    group: '',
    venue: 'AT&T Stadium',
    city: 'Arlington',
    kickoffUtc: '2026-07-11T20:00:00Z',
    homeWinProb: 0.45,
    drawProb: 0.22,
    awayWinProb: 0.33,
  },
  {
    id: 'ko-sf-dream',
    homeTeamSlug: 'england',
    awayTeamSlug: 'spain',
    round: 'Semifinal',
    group: '',
    venue: 'AT&T Stadium',
    city: 'Arlington',
    kickoffUtc: '2026-07-14T20:00:00Z',
    homeWinProb: 0.38,
    drawProb: 0.25,
    awayWinProb: 0.37,
  },
  {
    id: 'ko-final-dream',
    homeTeamSlug: 'argentina',
    awayTeamSlug: 'brazil',
    round: 'Final',
    group: '',
    venue: 'MetLife Stadium',
    city: 'East Rutherford',
    kickoffUtc: '2026-07-19T20:00:00Z',
    homeWinProb: 0.44,
    drawProb: 0.22,
    awayWinProb: 0.34,
  },
]

export function getPredictionMatches(): PredictionMatch[] {
  const teams = TEAMS
  const groupHighlights = pickGroupHighlights()
  const candidates = [...groupHighlights, ...KNOCKOUT_PREDICTIONS]

  const engineInputs: ScheduledMatchPredictionInput[] = candidates.map((match) => {
    const homeTeam = teams.find((t) => t.slug === match.homeTeamSlug)
    const awayTeam = teams.find((t) => t.slug === match.awayTeamSlug)
    const resolvedHome = homeTeam
      ? {
          slug: homeTeam.slug,
          name: homeTeam.name,
          fifaRanking: homeTeam.fifaRanking,
          chemistry: homeTeam.chemistry,
          familiarity: homeTeam.familiarity,
          stability: homeTeam.stability,
          morale: homeTeam.morale,
        }
      : fallbackProfile(match.homeTeamSlug)
    const resolvedAway = awayTeam
      ? {
          slug: awayTeam.slug,
          name: awayTeam.name,
          fifaRanking: awayTeam.fifaRanking,
          chemistry: awayTeam.chemistry,
          familiarity: awayTeam.familiarity,
          stability: awayTeam.stability,
          morale: awayTeam.morale,
      }
      : fallbackProfile(match.awayTeamSlug)

    return {
      match,
      homeTeam: resolvedHome,
      awayTeam: resolvedAway,
    }
  })

  const predictionByMatch = new Map<string, ReturnType<typeof predictScheduledMatches>[number]>()
  const enginePredictions = predictScheduledMatches(engineInputs)

  for (let index = 0; index < enginePredictions.length; index += 1) {
    predictionByMatch.set(candidates[index].id, enginePredictions[index])
  }

  return candidates.map((match) => {
    const prediction = predictionByMatch.get(match.id)
    if (!prediction) return match
    return {
      ...match,
      homeWinProb: clampProbability(prediction.probabilities.home),
      drawProb: clampProbability(prediction.probabilities.draw),
      awayWinProb: clampProbability(prediction.probabilities.away),
    }
  })
}

/** World Cup winner predictions */
export const TOP_CONTENDERS = [
  'argentina', 'brazil', 'france', 'germany', 'england',
  'spain', 'portugal', 'netherlands', 'belgium', 'italy',
  'usa', 'mexico', 'uruguay', 'japan', 'south-korea', 'morocco',
]
