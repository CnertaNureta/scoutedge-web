import { describe, expect, it } from 'vitest'
import { computeBigGameFootprint } from '../big-game-footprint'
import type { Player } from '@/lib/types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'test-team',
    position: 'MID',
    number: 8,
    age: 28,
    club: 'Test FC',
    caps: 80,
    goals: 12,
    assists: 20,
    rating: 82,
    fitnessStatus: 'green',
    fitnessNote: 'Sharp.',
    sentimentScore: 70,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

describe('computeBigGameFootprint — shape & bounds', () => {
  it('generates between 8 and 12 appearances', () => {
    const { appearances } = computeBigGameFootprint(makePlayer())
    expect(appearances.length).toBeGreaterThanOrEqual(8)
    expect(appearances.length).toBeLessThanOrEqual(12)
  })

  it('all performance ratings are in [0, 10]', () => {
    const { appearances } = computeBigGameFootprint(makePlayer())
    for (const appearance of appearances) {
      expect(appearance.performanceRating).toBeGreaterThanOrEqual(0)
      expect(appearance.performanceRating).toBeLessThanOrEqual(10)
    }
  })

  it('signalCount matches appearances length', () => {
    const breakdown = computeBigGameFootprint(makePlayer())
    expect(breakdown.signalCount).toBe(breakdown.appearances.length)
  })
})

describe('computeBigGameFootprint — determinism', () => {
  it('same player slug produces identical appearances', () => {
    const a = computeBigGameFootprint(makePlayer({ slug: 'modric' }))
    const b = computeBigGameFootprint(makePlayer({ slug: 'modric' }))
    expect(a.appearances).toEqual(b.appearances)
    expect(a.meanRating).toBe(b.meanRating)
  })

  it('different player slugs produce different distributions', () => {
    const a = computeBigGameFootprint(makePlayer({ slug: 'player-alpha' }))
    const b = computeBigGameFootprint(makePlayer({ slug: 'player-beta' }))
    // At least one rating differs.
    const differs = a.appearances.some(
      (ap, idx) => ap.performanceRating !== b.appearances[idx]?.performanceRating,
    )
    expect(differs).toBe(true)
  })
})

describe('computeBigGameFootprint — aggregates', () => {
  it('meanRating matches calculated mean within ±0.05', () => {
    const { appearances, meanRating } = computeBigGameFootprint(makePlayer())
    const expected =
      appearances.reduce((sum, a) => sum + a.performanceRating, 0) /
      appearances.length
    expect(Math.abs(meanRating - expected)).toBeLessThanOrEqual(0.05)
  })

  it('bestPerformance has the highest rating in the appearances', () => {
    const { appearances, bestPerformance } = computeBigGameFootprint(makePlayer())
    expect(bestPerformance).not.toBeNull()
    if (!bestPerformance) return
    const maxRating = Math.max(...appearances.map((a) => a.performanceRating))
    expect(bestPerformance.performanceRating).toBe(maxRating)
  })
})

describe('computeBigGameFootprint — verdict thresholds', () => {
  it('returns "rises" for an elite player whose mean climbs above 7.5', () => {
    // Search the elite-rated player slug-space until we get a "rises" verdict.
    // With rating 99 the baseline is ~8.5 + elite boost ~0.6 → very likely rises.
    const elite = computeBigGameFootprint(
      makePlayer({ slug: 'elite-rises', rating: 99 }),
    )
    expect(elite.meanRating).toBeGreaterThanOrEqual(7.5)
    expect(elite.bigGameVerdict).toBe('rises')
  })

  it('returns "fades" when the mean falls below 5.5', () => {
    // A low-rated player (rating 55) trends below threshold.
    const low = computeBigGameFootprint(
      makePlayer({ slug: 'fader-x', rating: 55 }),
    )
    expect(low.meanRating).toBeLessThan(5.5)
    expect(low.bigGameVerdict).toBe('fades')
  })

  it('verdict mapping: rises ≥ 7.5, fades < 5.5, otherwise steady', () => {
    // Probe enough slugs to land in the steady band.
    let steadyFound = false
    for (let i = 0; i < 20; i += 1) {
      const breakdown = computeBigGameFootprint(
        makePlayer({ slug: `steady-${i}`, rating: 75 }),
      )
      if (
        breakdown.meanRating >= 5.5 &&
        breakdown.meanRating < 7.5
      ) {
        expect(breakdown.bigGameVerdict).toBe('steady')
        steadyFound = true
        break
      }
    }
    expect(steadyFound).toBe(true)
  })
})

describe('computeBigGameFootprint — stage distribution', () => {
  it('includes at least 2 distinct stages', () => {
    const { appearances } = computeBigGameFootprint(makePlayer())
    const uniqueStages = new Set(appearances.map((a) => a.stage))
    expect(uniqueStages.size).toBeGreaterThanOrEqual(2)
  })
})

describe('computeBigGameFootprint — rating-driven bias', () => {
  it('rating 90 trends to a higher meanRating than rating 70 (sampled across slugs)', () => {
    let highTotal = 0
    let lowTotal = 0
    const samples = 8
    for (let i = 0; i < samples; i += 1) {
      const high = computeBigGameFootprint(
        makePlayer({ slug: `high-${i}`, rating: 90 }),
      )
      const low = computeBigGameFootprint(
        makePlayer({ slug: `low-${i}`, rating: 70 }),
      )
      highTotal += high.meanRating
      lowTotal += low.meanRating
    }
    expect(highTotal / samples).toBeGreaterThan(lowTotal / samples)
  })

  it('treats equivalent 0-10 and 0-100 player ratings the same', () => {
    const tenScale = computeBigGameFootprint(
      makePlayer({ slug: 'same-scale-player', rating: 8.8 }),
    )
    const hundredScale = computeBigGameFootprint(
      makePlayer({ slug: 'same-scale-player', rating: 88 }),
    )

    expect(tenScale.meanRating).toBe(hundredScale.meanRating)
    expect(tenScale.appearances).toEqual(hundredScale.appearances)
  })
})
