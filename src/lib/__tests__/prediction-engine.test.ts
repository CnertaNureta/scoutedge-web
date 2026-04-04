import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LAYER_WEIGHTS,
  NO_ODDS_LAYER_WEIGHTS,
  predictMatch,
  predictMatches,
  predictScheduledMatches,
  type MatchPredictionInput,
  type MatchOddsInput,
  type TeamProfile,
} from '../prediction-engine'

const ARGENTINA: TeamProfile = {
  slug: 'argentina',
  fifaRanking: 3,
  chemistry: 88,
  familiarity: 79,
  stability: 82,
  morale: 84,
}

const FRANCE: TeamProfile = {
  slug: 'france',
  fifaRanking: 5,
  chemistry: 86,
  familiarity: 73,
  stability: 74,
  morale: 80,
}

const BRAZIL: TeamProfile = {
  slug: 'brazil',
  fifaRanking: 2,
  chemistry: 90,
  familiarity: 77,
  stability: 80,
  morale: 85,
}

function sumProbabilities(values: { home: number; draw: number; away: number }): number {
  return values.home + values.draw + values.away
}

describe('prediction-engine', () => {
  it('returns normalized probabilities for a single fixture', () => {
    const odds: MatchOddsInput = {
      homeTeam: 'argentina',
      awayTeam: 'france',
      drawTeam: 'draw',
      odds: {
        homeWin: 1.72,
        awayWin: 4.75,
        draw: 3.9,
        units: 'decimal',
      },
    }

    const prediction = predictMatch(
      {
        matchId: 'arg-vs-fr',
        homeTeam: ARGENTINA,
        awayTeam: FRANCE,
        odds,
      },
      {
        elo: 0.42,
        xgAdjustment: 0.33,
        odds: 0.25,
      }
    )

    expect(sumProbabilities(prediction.probabilities)).toBeCloseTo(1, 6)
    expect(prediction.metadata.usedOdds).toBe(true)
  })

  it('falls back to no-odds layer weighting when odds are unavailable', () => {
    const prediction = predictMatch({
      matchId: 'ar-vs-fr',
      homeTeam: ARGENTINA,
      awayTeam: FRANCE,
    })

    expect(prediction.metadata.usedOdds).toBe(false)
    expect(prediction.metadata.usedWeights).toEqual({
      elo: NO_ODDS_LAYER_WEIGHTS.elo,
      xgAdjustment: NO_ODDS_LAYER_WEIGHTS.xgAdjustment,
      odds: 0,
    })
    expect(sumProbabilities(prediction.probabilities)).toBeCloseTo(1, 6)
  })

  it('keeps the no-odds fallback when custom weights sum to zero', () => {
    const prediction = predictMatch(
      {
        matchId: 'ar-vs-fr-zero-custom',
        homeTeam: ARGENTINA,
        awayTeam: FRANCE,
      },
      {
        elo: 0,
        xgAdjustment: 0,
      }
    )

    expect(prediction.metadata.usedOdds).toBe(false)
    expect(prediction.metadata.usedWeights).toEqual(NO_ODDS_LAYER_WEIGHTS)
    expect(sumProbabilities(prediction.probabilities)).toBeCloseTo(1, 6)
  })

  it('ignores odds inputs when they do not match the scheduled teams', () => {
    const prediction = predictMatch({
      matchId: 'ar-vs-fr-mismatch',
      homeTeam: ARGENTINA,
      awayTeam: FRANCE,
      odds: {
        homeTeam: 'brazil',
        awayTeam: 'germany',
        drawTeam: 'draw',
        odds: {
          homeWin: 1.9,
          awayWin: 3.8,
          draw: 3.6,
          units: 'decimal',
        },
      },
    })

    expect(prediction.metadata.usedOdds).toBe(false)
    expect(prediction.components.odds).toBeUndefined()
    expect(prediction.metadata.usedWeights).toEqual({
      elo: NO_ODDS_LAYER_WEIGHTS.elo,
      xgAdjustment: NO_ODDS_LAYER_WEIGHTS.xgAdjustment,
      odds: 0,
    })
    expect(sumProbabilities(prediction.probabilities)).toBeCloseTo(1, 6)
  })

  it('supports batch prediction inputs', () => {
    const payload: MatchPredictionInput[] = [
      {
        matchId: 'argentina-vs-france',
        homeTeam: ARGENTINA,
        awayTeam: FRANCE,
      },
      {
        matchId: 'argentina-vs-brazil',
        homeTeam: ARGENTINA,
        awayTeam: BRAZIL,
      },
    ]
    const predictions = predictMatches(payload)

    expect(predictions).toHaveLength(2)
    for (const prediction of predictions) {
      expect(sumProbabilities(prediction.probabilities)).toBeCloseTo(1, 6)
    }
  })

  it('supports scheduled-match style batch payloads and custom layer weighting', () => {
    const scheduledPayload = [
      {
        match: {
          homeTeamSlug: 'argentina',
          awayTeamSlug: 'france',
          round: 'Final',
          group: '',
          venue: 'MetLife Stadium',
          city: 'East Rutherford',
          kickoffUtc: '2026-07-19T20:00:00Z',
          homeWinProb: 0.5,
          drawProb: 0.2,
          awayWinProb: 0.3,
        },
        homeTeam: ARGENTINA,
        awayTeam: FRANCE,
      },
      {
        match: {
          homeTeamSlug: 'brazil',
          awayTeamSlug: 'argentina',
          round: 'Quarterfinal',
          group: '',
          venue: 'AT&T Stadium',
          city: 'Arlington',
          kickoffUtc: '2026-07-11T20:00:00Z',
          homeWinProb: 0.47,
          drawProb: 0.27,
          awayWinProb: 0.26,
        },
        homeTeam: BRAZIL,
        awayTeam: ARGENTINA,
      },
      {
        match: {
          homeTeamSlug: 'france',
          awayTeamSlug: 'brazil',
          round: 'Semifinal',
          group: '',
          venue: 'Mercedes-Benz Stadium',
          city: 'Atlanta',
          kickoffUtc: '2026-07-15T21:00:00Z',
          homeWinProb: 0.47,
          drawProb: 0.24,
          awayWinProb: 0.29,
        },
        homeTeam: FRANCE,
        awayTeam: BRAZIL,
      },
    ]

    const predictions = predictScheduledMatches(scheduledPayload, {
      elo: DEFAULT_LAYER_WEIGHTS.elo,
      xgAdjustment: DEFAULT_LAYER_WEIGHTS.xgAdjustment,
      odds: 0,
    })

    expect(predictions).toHaveLength(3)
    expect(predictions.map((prediction) => prediction.matchId)).toEqual([
      'argentina-vs-france',
      'brazil-vs-argentina',
      'france-vs-brazil',
    ])
    for (const prediction of predictions) {
      expect(sumProbabilities(prediction.probabilities)).toBeCloseTo(1, 6)
      expect(prediction.metadata.usedOdds).toBe(false)
    }
  })
})
