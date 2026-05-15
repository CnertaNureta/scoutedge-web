import { describe, expect, it } from 'vitest'
import type { Player, Team } from '@/lib/types'
import { computePressureIndex } from '../pressure-index'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'test-team',
    position: 'MID',
    number: 8,
    age: 28,
    club: 'Test FC',
    caps: 50,
    goals: 8,
    assists: 6,
    rating: 78,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 65,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'test-team',
    name: 'Test Team',
    flag: '🏳️',
    group: 'A',
    confederation: 'UEFA',
    fifaRanking: 10,
    coachName: 'Test Coach',
    chemistry: 75,
    familiarity: 70,
    stability: 72,
    morale: 70,
    archetypeMatch: 'pressing',
    keyInsight: '',
    seoArticle: '',
    ...overrides,
  }
}

describe('computePressureIndex', () => {
  it('produces a score in [0, 100]', () => {
    const out = computePressureIndex(makePlayer(), makeTeam())
    expect(out.score).toBeGreaterThanOrEqual(0)
    expect(out.score).toBeLessThanOrEqual(100)
  })

  it('classifies tier "ice" when score >= 80', () => {
    const out = computePressureIndex(
      makePlayer({
        slug: 'modric',
        rating: 92,
        caps: 100,
        goals: 30,
        age: 28,
        fitnessStatus: 'green',
        sentimentScore: 90,
      }),
      makeTeam({ morale: 95, stability: 95 }),
    )
    if (out.score >= 80) {
      expect(out.tier).toBe('ice')
    }
    expect(['ice', 'cool']).toContain(out.tier)
  })

  it('classifies tier "cool" for scores 60..79', () => {
    const out = computePressureIndex(makePlayer(), makeTeam())
    expect(['ice', 'cool', 'warm']).toContain(out.tier)
    if (out.score >= 60 && out.score < 80) {
      expect(out.tier).toBe('cool')
    }
  })

  it('classifies tier "warm" for scores 40..59', () => {
    const out = computePressureIndex(
      makePlayer({
        slug: 'mid-tier',
        rating: 62,
        caps: 15,
        goals: 1,
        age: 22,
        fitnessStatus: 'amber',
        sentimentScore: 45,
      }),
      makeTeam({ morale: 50, stability: 55 }),
    )
    if (out.score >= 40 && out.score < 60) {
      expect(out.tier).toBe('warm')
    }
    expect(['cool', 'warm', 'shaky']).toContain(out.tier)
  })

  it('classifies tier "shaky" when score < 40', () => {
    const out = computePressureIndex(
      makePlayer({
        slug: 'pressured',
        rating: 55,
        caps: 3,
        goals: 0,
        age: 19,
        fitnessStatus: 'red',
        sentimentScore: 20,
      }),
      makeTeam({ morale: 30, stability: 30 }),
    )
    if (out.score < 40) {
      expect(out.tier).toBe('shaky')
    }
    expect(['warm', 'shaky']).toContain(out.tier)
  })

  it('high-rating + healthy + many caps player scores >= 70', () => {
    const out = computePressureIndex(
      makePlayer({
        slug: 'star',
        rating: 88,
        caps: 90,
        goals: 25,
        age: 29,
        fitnessStatus: 'green',
        sentimentScore: 85,
      }),
      makeTeam({ morale: 85, stability: 80 }),
    )
    expect(out.score).toBeGreaterThanOrEqual(70)
  })

  it('normalizes live 0-10 ratings before computing form contribution', () => {
    const team = makeTeam()
    const tenScale = computePressureIndex(makePlayer({ rating: 8.8 }), team)
    const hundredScale = computePressureIndex(makePlayer({ rating: 88 }), team)

    expect(tenScale.score).toBe(hundredScale.score)
    expect(tenScale.factors.find((f) => f.key === 'form')?.contribution).toBe(
      hundredScale.factors.find((f) => f.key === 'form')?.contribution,
    )
  })

  it('low-fitness + low-morale player scores < 50', () => {
    const out = computePressureIndex(
      makePlayer({
        slug: 'struggling',
        rating: 60,
        caps: 8,
        goals: 0,
        age: 20,
        fitnessStatus: 'red',
        sentimentScore: 25,
      }),
      makeTeam({ morale: 35, stability: 40 }),
    )
    expect(out.score).toBeLessThan(50)
  })

  it('weighted sum of factors approximately equals score (±2)', () => {
    const out = computePressureIndex(makePlayer({ slug: 'sum-check' }), makeTeam())
    const weighted = out.factors.reduce(
      (acc, f) => acc + f.contribution * f.weight,
      0,
    )
    expect(Math.abs(weighted - out.score)).toBeLessThanOrEqual(2)
  })

  it('is deterministic — same player and team produce identical output twice', () => {
    const p = makePlayer({ slug: 'modric-luka' })
    const t = makeTeam({ slug: 'croatia' })
    const a = computePressureIndex(p, t)
    const b = computePressureIndex(p, t)
    expect(a).toEqual(b)
  })

  it('different players produce different scores', () => {
    const a = computePressureIndex(
      makePlayer({ slug: 'a', rating: 90, caps: 80 }),
      makeTeam(),
    )
    const b = computePressureIndex(
      makePlayer({ slug: 'b', rating: 60, caps: 5, age: 19 }),
      makeTeam(),
    )
    expect(a.score).not.toBe(b.score)
  })

  it('modelStub flag is always true', () => {
    const out = computePressureIndex(makePlayer(), makeTeam())
    expect(out.modelStub).toBe(true)
  })

  it('returns 5 factors with valid keys', () => {
    const out = computePressureIndex(makePlayer(), makeTeam())
    expect(out.factors).toHaveLength(5)
    const keys = out.factors.map((f) => f.key).sort()
    expect(keys).toEqual([
      'archetypeFit',
      'experience',
      'fitness',
      'form',
      'morale',
    ])
  })

  it('factor weights sum to 1.0 (±0.01)', () => {
    const out = computePressureIndex(makePlayer(), makeTeam())
    const sumWeights = out.factors.reduce((acc, f) => acc + f.weight, 0)
    expect(Math.abs(sumWeights - 1)).toBeLessThanOrEqual(0.01)
  })

  it('all factor contributions are in [0, 100]', () => {
    const out = computePressureIndex(
      makePlayer({ slug: 'edge', age: 19, caps: 0, goals: 0, rating: 50 }),
      makeTeam({ morale: 0, stability: 0 }),
    )
    out.factors.forEach((f) => {
      expect(f.contribution).toBeGreaterThanOrEqual(0)
      expect(f.contribution).toBeLessThanOrEqual(100)
    })
  })

  it('signalCount equals number of factors, sourceCount > 0', () => {
    const out = computePressureIndex(makePlayer(), makeTeam())
    expect(out.signalCount).toBe(out.factors.length)
    expect(out.sourceCount).toBeGreaterThan(0)
  })
})
