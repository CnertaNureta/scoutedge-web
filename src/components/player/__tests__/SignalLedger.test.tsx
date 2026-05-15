import { describe, expect, it } from 'vitest'
import { computeSignalSummary } from '../SignalLedger'
import type { PlayerSignal } from '@/lib/types'

const NOW = new Date('2026-05-15T12:00:00Z')

function makeSignal(overrides: Partial<PlayerSignal> = {}): PlayerSignal {
  return {
    id: 'sig-' + Math.random().toString(36).slice(2, 8),
    type: 'data',
    category: 'fitness',
    text: 'Test signal',
    sourceType: 'player_profile',
    sentiment: 'neutral',
    confidence: 0.8,
    happenedAt: '2026-05-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeSignalSummary', () => {
  it('returns empty-state verdict and zero counts for empty signals', () => {
    const empty = computeSignalSummary([], NOW)
    expect(empty.verdictKey).toBe('empty')
    expect(empty.signalCount).toBe(0)
    expect(empty.sourceCount).toBe(0)
    expect(empty.avgConfidence).toBe(0)
    expect(empty.netSentiment).toBe(0)
    expect(empty.sparklineSeries).toHaveLength(7)
    expect(empty.sparklineSeries.every((v) => v === 0)).toBe(true)

    const nullCase = computeSignalSummary(null, NOW)
    expect(nullCase.verdictKey).toBe('empty')

    const undefCase = computeSignalSummary(undefined, NOW)
    expect(undefCase.verdictKey).toBe('empty')
  })

  it('classifies high confidence + positive net sentiment as signalRich', () => {
    const signals: PlayerSignal[] = [
      makeSignal({ confidence: 0.9, sentiment: 'positive' }),
      makeSignal({ confidence: 0.85, sentiment: 'positive' }),
      makeSignal({ confidence: 0.8, sentiment: 'positive' }),
    ]
    const result = computeSignalSummary(signals, NOW)
    expect(result.verdictKey).toBe('signalRich')
    expect(result.avgConfidence).toBeGreaterThanOrEqual(0.7)
    expect(result.netSentiment).toBeGreaterThan(0)
  })

  it('classifies high confidence + negative net sentiment as warningSignal', () => {
    const signals: PlayerSignal[] = [
      makeSignal({ confidence: 0.85, sentiment: 'negative' }),
      makeSignal({ confidence: 0.9, sentiment: 'negative' }),
    ]
    const result = computeSignalSummary(signals, NOW)
    expect(result.verdictKey).toBe('warningSignal')
    expect(result.netSentiment).toBeLessThan(0)
  })

  it('classifies low average confidence as lowConfidence', () => {
    const signals: PlayerSignal[] = [
      makeSignal({ confidence: 0.3, sentiment: 'positive' }),
      makeSignal({ confidence: 0.35, sentiment: 'neutral' }),
    ]
    const result = computeSignalSummary(signals, NOW)
    expect(result.verdictKey).toBe('lowConfidence')
    expect(result.avgConfidence).toBeLessThan(0.5)
  })

  it('classifies high confidence + neutral net sentiment as mixedRead', () => {
    const signals: PlayerSignal[] = [
      makeSignal({ confidence: 0.85, sentiment: 'positive' }),
      makeSignal({ confidence: 0.85, sentiment: 'negative' }),
    ]
    const result = computeSignalSummary(signals, NOW)
    expect(result.verdictKey).toBe('mixedRead')
  })

  it('sparkline series always has 7 entries (one per day)', () => {
    const signals: PlayerSignal[] = [
      makeSignal({ happenedAt: '2026-05-15T10:00:00.000Z' }),
      makeSignal({ happenedAt: '2026-05-14T10:00:00.000Z' }),
      makeSignal({ happenedAt: '2026-05-14T11:00:00.000Z' }),
      makeSignal({ happenedAt: '2026-05-10T10:00:00.000Z' }),
      makeSignal({ happenedAt: '2026-01-01T00:00:00.000Z' }), // out of window
    ]
    const result = computeSignalSummary(signals, NOW)
    expect(result.sparklineSeries).toHaveLength(7)
    // Today (index 6) → 1 signal; one day ago (index 5) → 2 signals
    expect(result.sparklineSeries[6]).toBe(1)
    expect(result.sparklineSeries[5]).toBe(2)
    expect(result.sparklineSeries[1]).toBe(1) // 5 days ago
    // Old signal is dropped from the window
    expect(result.sparklineSeries.reduce((a, b) => a + b, 0)).toBe(4)
  })

  it('counts distinct sourceTypes', () => {
    const signals: PlayerSignal[] = [
      makeSignal({ sourceType: 'player_profile' }),
      makeSignal({ sourceType: 'player_profile' }),
      makeSignal({ sourceType: 'social_post' }),
      makeSignal({ sourceType: 'derived_rule' }),
    ]
    const result = computeSignalSummary(signals, NOW)
    expect(result.sourceCount).toBe(3)
  })

  it('clamps out-of-range confidence values', () => {
    const signals: PlayerSignal[] = [
      makeSignal({ confidence: 1.5, sentiment: 'positive' }),
      makeSignal({ confidence: -0.5, sentiment: 'positive' }),
    ]
    const result = computeSignalSummary(signals, NOW)
    // (1 + 0) / 2 = 0.5
    expect(result.avgConfidence).toBe(0.5)
  })
})
