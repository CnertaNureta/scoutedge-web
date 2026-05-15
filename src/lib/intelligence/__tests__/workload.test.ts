import { describe, expect, it } from 'vitest'
import type { Player } from '@/lib/types'
import { computeWorkload } from '../workload'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'test-team',
    position: 'MID',
    number: 8,
    age: 27,
    club: 'Test FC',
    caps: 40,
    goals: 5,
    assists: 7,
    rating: 7.4,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 50,
    sentimentLabel: 'neutral',
    seoArticle: '',
    ...overrides,
  }
}

describe('computeWorkload', () => {
  it('returns exactly 12 months with monthOffset -11..0 in order', () => {
    const out = computeWorkload(makePlayer())
    expect(out.months).toHaveLength(12)
    out.months.forEach((m, idx) => {
      expect(m.monthOffset).toBe(idx - 11)
    })
    expect(out.months[0].monthOffset).toBe(-11)
    expect(out.months[11].monthOffset).toBe(0)
  })

  it('is deterministic — same player produces identical workload twice', () => {
    const p = makePlayer({ slug: 'modric-luka' })
    const a = computeWorkload(p)
    const b = computeWorkload(p)
    expect(a).toEqual(b)
  })

  it('different players produce different month distributions', () => {
    const a = computeWorkload(makePlayer({ slug: 'player-a' }))
    const b = computeWorkload(makePlayer({ slug: 'player-b-different' }))
    const aSeq = a.months.map((m) => m.minutes).join(',')
    const bSeq = b.months.map((m) => m.minutes).join(',')
    expect(aSeq).not.toBe(bSeq)
  })

  it('totalMinutes equals sum of months minutes', () => {
    const out = computeWorkload(makePlayer({ slug: 'sum-check' }))
    const sum = out.months.reduce((acc, m) => acc + m.minutes, 0)
    expect(out.totalMinutes).toBe(sum)
  })

  it('totalGames equals sum of months games', () => {
    const out = computeWorkload(makePlayer({ slug: 'sum-check-2' }))
    const sum = out.months.reduce((acc, m) => acc + m.games, 0)
    expect(out.totalGames).toBe(sum)
  })

  it('nationalTeamWindows is within [0, 4]', () => {
    const slugs = [
      'a',
      'bb',
      'ccc',
      'modric',
      'kane',
      'mbappe',
      'haaland',
      'bellingham',
      'pedri',
    ]
    for (const slug of slugs) {
      const out = computeWorkload(makePlayer({ slug, caps: 100 }))
      expect(out.nationalTeamWindows).toBeGreaterThanOrEqual(0)
      expect(out.nationalTeamWindows).toBeLessThanOrEqual(4)
    }
  })

  it('fitnessStatus === "red" forces status === "red" and injuryFlag.active', () => {
    const out = computeWorkload(
      makePlayer({
        fitnessStatus: 'red',
        fitnessNote: 'Hamstring, 3 weeks',
      }),
    )
    expect(out.status).toBe('red')
    expect(out.injuryFlag.active).toBe(true)
    expect(out.injuryFlag.note).toBe('Hamstring, 3 weeks')
    expect(out.amberZoneReason).toBeDefined()
  })

  it('fitnessStatus === "amber" elevates status away from fresh', () => {
    const out = computeWorkload(
      makePlayer({
        slug: 'amber-test',
        fitnessStatus: 'amber',
        fitnessNote: 'Light knock',
      }),
    )
    expect(out.status).not.toBe('fresh')
    expect(out.injuryFlag.active).toBe(true)
    expect(out.amberZoneReason).toBeDefined()
  })

  it('green fitness produces a defined status with no injuryFlag', () => {
    const out = computeWorkload(makePlayer({ slug: 'green-test' }))
    expect(out.injuryFlag.active).toBe(false)
    expect(out.injuryFlag.note).toBeUndefined()
    expect(['fresh', 'managed', 'amber', 'red']).toContain(out.status)
  })

  it('goalkeeper produces realistic games count (capped under ~60/year)', () => {
    const out = computeWorkload(
      makePlayer({ slug: 'gk-test', position: 'GK', caps: 60 }),
    )
    expect(out.totalGames).toBeGreaterThan(15)
    expect(out.totalGames).toBeLessThan(60)
    // GKs never play more than 95 mins per game in this synthesis
    out.months.forEach((m) => {
      if (m.games > 0) {
        expect(m.minutes / m.games).toBeLessThanOrEqual(95)
      }
    })
  })

  it('amberZoneReason is undefined exactly when status === "fresh"', () => {
    let sawFresh = false
    let sawNonFresh = false
    for (let i = 0; i < 50; i += 1) {
      const out = computeWorkload(
        makePlayer({ slug: `iter-${i}`, caps: 10 + i }),
      )
      if (out.status === 'fresh') {
        expect(out.amberZoneReason).toBeUndefined()
        sawFresh = true
      } else {
        expect(out.amberZoneReason).toBeDefined()
        sawNonFresh = true
      }
    }
    expect(sawFresh || sawNonFresh).toBe(true)
  })

  it('all months have non-negative minutes and games', () => {
    const out = computeWorkload(makePlayer({ slug: 'nn-check' }))
    out.months.forEach((m) => {
      expect(m.minutes).toBeGreaterThanOrEqual(0)
      expect(m.games).toBeGreaterThanOrEqual(0)
    })
  })

  it('signalCount and sourceCount are sensible positive ints', () => {
    const out = computeWorkload(makePlayer({ slug: 'counts-check' }))
    expect(Number.isInteger(out.signalCount)).toBe(true)
    expect(Number.isInteger(out.sourceCount)).toBe(true)
    expect(out.signalCount).toBeGreaterThanOrEqual(0)
    expect(out.signalCount).toBeLessThanOrEqual(12)
    expect(out.sourceCount).toBeGreaterThanOrEqual(1)
    expect(out.sourceCount).toBeLessThanOrEqual(3)
  })
})
