import { describe, expect, it } from 'vitest'
import {
  computeStatTwin,
  listCuratedSlugs,
} from '../stat-twin'

describe('computeStatTwin', () => {
  it('returns comparables for a curated player', () => {
    const result = computeStatTwin('kylian-mbappe')
    expect(result.hasComparables).toBe(true)
    expect(result.comparables.length).toBeGreaterThan(0)
    expect(result.comparables.length).toBeLessThanOrEqual(3)
  })

  it('returns hasComparables=false with empty list for uncurated slug', () => {
    const result = computeStatTwin('not-a-real-player-slug-12345')
    expect(result.hasComparables).toBe(false)
    expect(result.comparables).toEqual([])
    expect(result.signalCount).toBe(0)
    expect(result.sourceCount).toBe(0)
  })

  it('similarityPercent stays inside [0, 100] for every curated comparable', () => {
    for (const slug of listCuratedSlugs()) {
      const result = computeStatTwin(slug)
      for (const c of result.comparables) {
        expect(c.similarityPercent).toBeGreaterThanOrEqual(0)
        expect(c.similarityPercent).toBeLessThanOrEqual(100)
      }
    }
  })

  it('sorts comparables by similarityPercent descending', () => {
    const result = computeStatTwin('lionel-messi')
    expect(result.hasComparables).toBe(true)
    const sims = result.comparables.map((c) => c.similarityPercent)
    const sortedDesc = [...sims].sort((a, b) => b - a)
    expect(sims).toEqual(sortedDesc)
  })

  it('caps comparables at 3 even if JSON has more', () => {
    for (const slug of listCuratedSlugs()) {
      const result = computeStatTwin(slug)
      expect(result.comparables.length).toBeLessThanOrEqual(3)
    }
  })

  it('reports a sane signalCount and sourceCount for a curated player', () => {
    const result = computeStatTwin('lionel-messi')
    expect(result.signalCount).toBe(result.comparables.length)
    expect(result.sourceCount).toBeGreaterThan(0)
    expect(result.sourceCount).toBeLessThanOrEqual(result.comparables.length)
  })

  it('returns at least 20 curated players in the dataset', () => {
    expect(listCuratedSlugs().length).toBeGreaterThanOrEqual(20)
  })

  it('every curated comparable has a populated trait string', () => {
    for (const slug of listCuratedSlugs()) {
      const result = computeStatTwin(slug)
      for (const c of result.comparables) {
        expect(typeof c.trait).toBe('string')
        expect(c.trait.length).toBeGreaterThan(0)
      }
    }
  })
})
