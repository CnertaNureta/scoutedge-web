import { describe, expect, it } from 'vitest'
import type { MarketIntelData, Team } from '@/lib/types'
import {
  TITLE_PATH_STAGE_ORDER,
  computeTitlePath,
  formatEdgePercent,
  formatProbabilityPercent,
} from '../title-path'

function team(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'brazil',
    name: 'Brazil',
    flag: '🇧🇷',
    group: 'A',
    confederation: 'CONMEBOL',
    fifaRanking: 5,
    coachName: 'Coach',
    chemistry: 80,
    familiarity: 70,
    stability: 75,
    morale: 80,
    archetypeMatch: 'Brazil 2002',
    keyInsight: '',
    seoArticle: '',
    ...overrides,
  }
}

function marketIntel(overrides: Partial<MarketIntelData> = {}): MarketIntelData {
  return {
    tournamentPrices: [],
    averageOdds: 7,
    impliedProbability: 14,
    movement: 'stable',
    modelEdge: {
      ourProbability: 0.2,
      marketProbability: 0.14,
      edge: 0.06,
      bestOdds: 7.5,
      bestSource: 'Consensus A',
      signalStrength: 'moderate',
    },
    ...overrides,
  }
}

describe('computeTitlePath', () => {
  it('emits all six stages in canonical order', () => {
    const breakdown = computeTitlePath(team(), marketIntel())
    expect(breakdown.stages.map((s) => s.stage)).toEqual([
      'group',
      'r16',
      'qf',
      'sf',
      'final',
      'win',
    ])
    expect(breakdown.stages).toHaveLength(TITLE_PATH_STAGE_ORDER.length)
  })

  it('selects the stage with the largest absolute edge as biggestEdgeStage', () => {
    const breakdown = computeTitlePath(team(), marketIntel())
    const biggest = breakdown.stages.find((s) => s.stage === breakdown.biggestEdgeStage)
    expect(biggest).toBeDefined()
    for (const stage of breakdown.stages) {
      expect(Math.abs(stage.edge)).toBeLessThanOrEqual(Math.abs(biggest!.edge) + 1e-9)
    }
  })

  it('produces monotonically non-increasing market probabilities (group >= r16 >= ... >= win)', () => {
    const breakdown = computeTitlePath(team(), marketIntel())
    const probs = breakdown.stages.map((s) => s.marketProbability)
    for (let i = 1; i < probs.length; i += 1) {
      expect(probs[i]).toBeLessThanOrEqual(probs[i - 1] + 1e-9)
    }
  })

  it('produces monotonically non-increasing model probabilities (group >= r16 >= ... >= win)', () => {
    const breakdown = computeTitlePath(team(), marketIntel())
    const probs = breakdown.stages.map((s) => s.modelProbability)
    for (let i = 1; i < probs.length; i += 1) {
      expect(probs[i]).toBeLessThanOrEqual(probs[i - 1] + 1e-9)
    }
  })

  it('keeps every probability inside [0, 1]', () => {
    const breakdown = computeTitlePath(team({ fifaRanking: 80 }), marketIntel({ modelEdge: null }))
    for (const stage of breakdown.stages) {
      expect(stage.modelProbability).toBeGreaterThanOrEqual(0)
      expect(stage.modelProbability).toBeLessThanOrEqual(1)
      expect(stage.marketProbability).toBeGreaterThanOrEqual(0)
      expect(stage.marketProbability).toBeLessThanOrEqual(1)
    }
  })

  it('falls back to market = model and edge = 0 when modelEdge is missing', () => {
    const breakdown = computeTitlePath(team(), marketIntel({ modelEdge: null }))
    expect(breakdown.hasModelSignal).toBe(false)
    for (const stage of breakdown.stages) {
      expect(stage.edge).toBe(0)
      expect(stage.modelProbability).toBeCloseTo(stage.marketProbability, 6)
    }
  })

  it('handles missing marketIntel entirely without crashing', () => {
    const breakdown = computeTitlePath(team({ fifaRanking: 90 }), null)
    expect(breakdown.stages).toHaveLength(6)
    expect(breakdown.hasModelSignal).toBe(false)
    for (const stage of breakdown.stages) {
      expect(stage.marketProbability).toBe(0)
      expect(stage.modelProbability).toBe(0)
      expect(stage.edge).toBe(0)
    }
  })

  it('reports positive edge when the model is more bullish than the market', () => {
    const breakdown = computeTitlePath(
      team({ fifaRanking: 3 }),
      marketIntel({
        impliedProbability: 12,
        modelEdge: {
          ourProbability: 0.22,
          marketProbability: 0.12,
          edge: 0.1,
          bestOdds: 8,
          bestSource: 'Consensus A',
          signalStrength: 'strong',
        },
      }),
    )
    const winStage = breakdown.stages.find((s) => s.stage === 'win')!
    expect(winStage.modelProbability).toBeGreaterThan(winStage.marketProbability)
    expect(winStage.edge).toBeGreaterThan(0)
  })

  it('reports negative edge when the model is more bearish than the market', () => {
    const breakdown = computeTitlePath(
      team(),
      marketIntel({
        impliedProbability: 18,
        modelEdge: {
          ourProbability: 0.08,
          marketProbability: 0.18,
          edge: -0.1,
          bestOdds: 6,
          bestSource: 'Consensus A',
          signalStrength: 'strong',
        },
      }),
    )
    const winStage = breakdown.stages.find((s) => s.stage === 'win')!
    expect(winStage.edge).toBeLessThan(0)
  })
})

describe('formatters', () => {
  it('formats positive edge with a leading +', () => {
    expect(formatEdgePercent(0.062)).toBe('+6.2%')
  })

  it('formats negative edge with the minus sign', () => {
    expect(formatEdgePercent(-0.034)).toBe('-3.4%')
  })

  it('formats probability as one-decimal percent', () => {
    expect(formatProbabilityPercent(0.1234)).toBe('12.3%')
  })
})
