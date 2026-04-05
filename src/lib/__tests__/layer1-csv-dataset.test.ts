import { readFileSync } from 'fs'

import { describe, expect, it } from 'vitest'

import { buildLayer1CsvDataset } from '../layer1/csv-dataset'

function readFixture(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('layer1 csv dataset', () => {
  it('builds a join-ready dataset from the checked-in CSV samples', () => {
    const result = buildLayer1CsvDataset({
      fbrefCsvText: readFixture('../../../scripts/fixtures/fbref-team-stats.csv'),
      eloCsvText: readFixture('../../../scripts/fixtures/elo-ratings.csv'),
      sourceUpdatedAt: '2026-03-31T00:00:00Z',
      asOfDate: '2026-03-31',
    })

    const usaRating = result.ratings.find((row) => row.teamSlug === 'usa')

    expect(result.teamRows.length).toBe(48)
    expect(result.matchRows.length).toBe(72)
    expect(result.teamStats.length).toBe(9)
    expect(result.ratings.length).toBe(9)
    expect(result.coverage.statsCovered).toBe(9)
    expect(result.coverage.ratingsCovered).toBe(9)
    expect(result.coverage.eligibleTeams).toBe(46)
    expect(result.coverage.missingStats.length).toBe(37)
    expect(result.coverage.missingRatings.length).toBe(37)
    expect(result.teamStats[0]?.competition).toBe('World Cup 2026')
    expect(result.teamStats[0]?.season).toBe('2026')
    expect(result.teamStats[0]?.asOfDate).toBe('2026-03-31')
    expect(result.ratings[0]?.competition).toBe('World Cup 2026')
    expect(result.ratings[0]?.season).toBe('2026')
    expect(result.ratings[0]?.asOfDate).toBe('2026-03-31')
    expect(usaRating?.teamName).toBe('USA')
    expect(usaRating?.source).toBe('world-football-elo')
  })
})
