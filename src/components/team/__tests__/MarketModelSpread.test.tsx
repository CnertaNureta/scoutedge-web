import { describe, it, expect } from 'vitest'
import { computeMarketModelSpread } from '../MarketModelSpread'
import type { MarketIntelData, ModelEdge } from '@/lib/types'

function makeIntel(overrides: Partial<MarketIntelData> = {}): MarketIntelData {
  return {
    tournamentPrices: [
      { source: 'Consensus A', decimalOdds: 5, impliedProbability: 0.2 },
      { source: 'Consensus B', decimalOdds: 5.5, impliedProbability: 0.18 },
    ],
    averageOdds: 5.25,
    impliedProbability: 0.2,
    movement: 'stable',
    modelEdge: null,
    ...overrides,
  }
}

function makeEdge(edge: number): ModelEdge {
  return {
    ourProbability: 0.2 + edge,
    marketProbability: 0.2,
    edge,
    bestOdds: 6,
    bestSource: 'Consensus A',
    signalStrength: 'moderate',
  }
}

describe('computeMarketModelSpread', () => {
  it('verdictKey is "aligned" when modelEdge is null', () => {
    const result = computeMarketModelSpread(makeIntel({ modelEdge: null }))
    expect(result.verdictKey).toBe('aligned')
    expect(result.modelPct).toBeNull()
  })

  it('verdictKey is "aligned" when |edge| < 0.02', () => {
    const result = computeMarketModelSpread(
      makeIntel({ modelEdge: makeEdge(0.01) }),
    )
    expect(result.verdictKey).toBe('aligned')
  })

  it('verdictKey is "modelHigh" when edge >= 0.05', () => {
    const result = computeMarketModelSpread(
      makeIntel({ modelEdge: makeEdge(0.05) }),
    )
    expect(result.verdictKey).toBe('modelHigh')
  })

  it('verdictKey is "modelLow" when edge <= -0.05', () => {
    const result = computeMarketModelSpread(
      makeIntel({ modelEdge: makeEdge(-0.05) }),
    )
    expect(result.verdictKey).toBe('modelLow')
  })

  it('verdictKey is "modest" for in-between positive edges', () => {
    const result = computeMarketModelSpread(
      makeIntel({ modelEdge: makeEdge(0.03) }),
    )
    expect(result.verdictKey).toBe('modest')
  })

  it('verdictKey is "modest" for in-between negative edges', () => {
    const result = computeMarketModelSpread(
      makeIntel({ modelEdge: makeEdge(-0.03) }),
    )
    expect(result.verdictKey).toBe('modest')
  })

  it('marketPct equals impliedProbability * 100', () => {
    const result = computeMarketModelSpread(
      makeIntel({ impliedProbability: 0.25 }),
    )
    expect(result.marketPct).toBe(25)
  })

  it('edgeBps reports edge in basis points', () => {
    const result = computeMarketModelSpread(
      makeIntel({ modelEdge: makeEdge(0.05) }),
    )
    expect(result.edgeBps).toBe(500)
  })

  it('edgeBps is 0 when modelEdge is null', () => {
    const result = computeMarketModelSpread(makeIntel({ modelEdge: null }))
    expect(result.edgeBps).toBe(0)
  })

  it('clamps marketPct to 0-100', () => {
    const high = computeMarketModelSpread(
      makeIntel({ impliedProbability: 2 }),
    )
    expect(high.marketPct).toBe(100)
    const low = computeMarketModelSpread(
      makeIntel({ impliedProbability: -1 }),
    )
    expect(low.marketPct).toBe(0)
  })
})
