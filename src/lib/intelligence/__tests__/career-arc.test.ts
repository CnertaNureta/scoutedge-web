import { describe, expect, it } from 'vitest'
import { computeCareerArc, classifyPhase } from '../career-arc'
import type { Player } from '@/lib/types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'test-team',
    position: 'MID',
    number: 8,
    age: 27,
    club: 'Test FC',
    caps: 60,
    goals: 12,
    assists: 20,
    rating: 85,
    fitnessStatus: 'green',
    fitnessNote: 'Sharp.',
    sentimentScore: 70,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

describe('classifyPhase', () => {
  it("returns 'ascending' when age is well below peak.low", () => {
    expect(classifyPhase(20, 'MID')).toBe('ascending') // band 24-30, buffer 2 → <22 ascending
  })

  it("returns 'peaking' when age is comfortably inside the band", () => {
    expect(classifyPhase(27, 'MID')).toBe('peaking') // band 24-30
  })

  it("returns 'declining' when age is well above peak.high", () => {
    expect(classifyPhase(34, 'MID')).toBe('declining') // band 24-30, >32 declining
  })

  it("returns 'transitioning' within 2 years of a band boundary", () => {
    // MID band 24-30, low edge transition window: [22..25] and [29..32]
    expect(classifyPhase(23, 'MID')).toBe('transitioning') // just above low-buffer
    expect(classifyPhase(31, 'MID')).toBe('transitioning') // just above high
  })
})

describe('computeCareerArc trajectory', () => {
  it('trajectory ages run 16..(player.age + 4) and are strictly increasing', () => {
    const player = makePlayer({ age: 27 })
    const { trajectory } = computeCareerArc(player)

    expect(trajectory[0].age).toBe(16)
    expect(trajectory[trajectory.length - 1].age).toBe(31)
    for (let i = 1; i < trajectory.length; i += 1) {
      expect(trajectory[i].age).toBeGreaterThan(trajectory[i - 1].age)
    }
  })

  it('ratings are always clamped to [50, 99]', () => {
    const player = makePlayer({ age: 30, rating: 99 })
    const { trajectory } = computeCareerArc(player)

    for (const point of trajectory) {
      expect(point.rating).toBeGreaterThanOrEqual(50)
      expect(point.rating).toBeLessThanOrEqual(99)
    }
  })

  it("trajectory's current-age value equals player.rating exactly", () => {
    const player = makePlayer({ age: 27, rating: 85 })
    const { trajectory } = computeCareerArc(player)
    const current = trajectory.find((p) => p.age === player.age)
    expect(current).toBeDefined()
    expect(current?.rating).toBe(85)
  })

  it('is deterministic — same player slug produces same trajectory', () => {
    const a = computeCareerArc(makePlayer({ slug: 'modric', age: 32, rating: 89 }))
    const b = computeCareerArc(makePlayer({ slug: 'modric', age: 32, rating: 89 }))
    expect(a.trajectory).toEqual(b.trajectory)
  })

  it('different player slugs produce different trajectories', () => {
    const a = computeCareerArc(makePlayer({ slug: 'player-a', age: 27, rating: 85 }))
    const b = computeCareerArc(makePlayer({ slug: 'player-b', age: 27, rating: 85 }))
    // At least one non-current-age point must differ (current-age is pinned).
    const differs = a.trajectory.some((point, idx) => {
      if (point.age === 27) return false
      return point.rating !== b.trajectory[idx]?.rating
    })
    expect(differs).toBe(true)
  })
})

describe('computeCareerArc comparables', () => {
  it('returns 2 or 3 comparables', () => {
    const breakdown = computeCareerArc(makePlayer())
    expect(breakdown.comparables.length).toBeGreaterThanOrEqual(2)
    expect(breakdown.comparables.length).toBeLessThanOrEqual(3)
  })

  it('filters comparables by position group when same-group archetypes exist', () => {
    const fwd = computeCareerArc(makePlayer({ position: 'FWD' }))
    // FWD archetypes: Diego Costa, Mbappé — both FWD.
    expect(fwd.comparables.length).toBeGreaterThanOrEqual(2)
    // None of the picked comparables should be a GK-only or pure DEF archetype
    // when FWD archetypes are available.
    for (const c of fwd.comparables) {
      expect(['Diego Costa', 'Mbappé']).toContain(c.name)
    }
  })

  it('comparable trajectories are non-empty and within rating bounds', () => {
    const { comparables } = computeCareerArc(makePlayer({ position: 'GK', age: 30 }))
    expect(comparables.length).toBeGreaterThan(0)
    for (const c of comparables) {
      expect(c.trajectory.length).toBeGreaterThan(0)
      for (const point of c.trajectory) {
        expect(point.rating).toBeGreaterThanOrEqual(50)
        expect(point.rating).toBeLessThanOrEqual(99)
      }
    }
  })
})

describe('computeCareerArc envelope', () => {
  it('signalCount equals trajectory length', () => {
    const breakdown = computeCareerArc(makePlayer({ age: 27 }))
    expect(breakdown.signalCount).toBe(breakdown.trajectory.length)
  })

  it('sourceCount equals comparable count', () => {
    const breakdown = computeCareerArc(makePlayer())
    expect(breakdown.sourceCount).toBe(breakdown.comparables.length)
  })
})
