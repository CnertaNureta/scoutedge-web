import { describe, it, expect } from 'vitest'
import {
  ARCHETYPES,
  findArchetype,
  pickCeilingTier,
} from '@/lib/archetypes'

describe('archetypes data', () => {
  it('contains at least 12 entries', () => {
    expect(ARCHETYPES.length).toBeGreaterThanOrEqual(12)
  })

  it('every archetype has all required fields', () => {
    for (const a of ARCHETYPES) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(Array.isArray(a.matchAliases)).toBe(true)
      expect(a.matchAliases.length).toBeGreaterThan(0)
      expect(Array.isArray(a.historicalReferences)).toBe(true)
      expect(a.historicalReferences.length).toBeGreaterThan(0)
      for (const ref of a.historicalReferences) {
        expect(typeof ref.team).toBe('string')
        expect(typeof ref.year).toBe('number')
        expect(typeof ref.finish).toBe('string')
      }
      expect(typeof a.baselineFinish).toBe('string')
      expect(typeof a.successRate).toBe('number')
      expect(a.successRate).toBeGreaterThanOrEqual(0)
      expect(a.successRate).toBeLessThanOrEqual(1)
      expect(Array.isArray(a.strengths)).toBe(true)
      expect(a.strengths.length).toBeGreaterThan(0)
      expect(Array.isArray(a.cautions)).toBe(true)
      expect(a.cautions.length).toBeGreaterThan(0)
      expect(typeof a.summary).toBe('string')
      expect(a.summary.length).toBeGreaterThan(20)
    }
  })

  it('all archetype ids are unique', () => {
    const ids = ARCHETYPES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('findArchetype', () => {
  it('returns the tiki-taka entry for a tiki-taka match string', () => {
    const result = findArchetype('Tiki-taka passing machine')
    expect(result?.id).toBe('tiki-taka-passing-machine')
  })

  it('is case-insensitive against aliases', () => {
    const result = findArchetype('COUNTER-ATTACK SPECIALISTS')
    expect(result?.id).toBe('counter-attacking-specialist')
  })

  it('unknown string falls back to "Rebuilding Generation"', () => {
    const result = findArchetype('some completely unrelated archetype')
    expect(result?.id).toBe('rebuilding-generation')
  })

  it('null input falls back to "Rebuilding Generation"', () => {
    const result = findArchetype(null)
    expect(result?.id).toBe('rebuilding-generation')
  })

  it('undefined input falls back to "Rebuilding Generation"', () => {
    const result = findArchetype(undefined)
    expect(result?.id).toBe('rebuilding-generation')
  })

  it('matches partial substrings', () => {
    const result = findArchetype('A side defined by total football principles')
    expect(result?.id).toBe('total-football')
  })

  it('matches the high-press alias', () => {
    const result = findArchetype('Gegenpress aggressors')
    expect(result?.id).toBe('high-press-aggressor')
  })
})

describe('pickCeilingTier', () => {
  it('Champions → "title"', () => {
    expect(pickCeilingTier('Champions')).toBe('title')
  })

  it('Final → "title"', () => {
    expect(pickCeilingTier('Final')).toBe('title')
  })

  it('Semifinals → "deepRun"', () => {
    expect(pickCeilingTier('Semifinals')).toBe('deepRun')
  })

  it('Quarterfinals → "deepRun"', () => {
    expect(pickCeilingTier('Quarterfinals')).toBe('deepRun')
  })

  it('Round of 16 → "knockouts"', () => {
    expect(pickCeilingTier('Round of 16')).toBe('knockouts')
  })

  it('Group Stage → "group"', () => {
    expect(pickCeilingTier('Group Stage')).toBe('group')
  })
})
