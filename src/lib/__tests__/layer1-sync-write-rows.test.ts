import { readFileSync } from 'fs'

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildCsvDataset,
  buildMetricWriteRows,
} from '../../../scripts/sync-layer1-team-data.ts'
import { buildLayer1CsvDataset } from '../layer1/csv-dataset'

function readFixture(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const ORIGINAL_ARGV = [...process.argv]

afterEach(() => {
  process.argv = [...ORIGINAL_ARGV]
})

describe('layer1 sync write rows', () => {
  it('preserves explicit snapshot dates and competition scope when building db rows', () => {
    const result = buildLayer1CsvDataset({
      fbrefCsvText: readFixture('../../../scripts/fixtures/fbref-team-stats.csv'),
      eloCsvText: readFixture('../../../scripts/fixtures/elo-ratings.csv'),
      competition: 'UEFA Euro 2024',
      season: '2024',
      sourceUpdatedAt: '2026-04-04T00:00:00Z',
      asOfDate: '2024-07-14',
    })

    const { teamStats, ratings } = buildMetricWriteRows(result)
    const usaStats = teamStats.find((row) => row.team_slug === 'usa')
    const usaRating = ratings.find((row) => row.team_slug === 'usa')

    expect(usaStats?.competition).toBe('UEFA Euro 2024')
    expect(usaStats?.season).toBe('2024')
    expect(usaStats?.as_of_date).toBe('2024-07-14')
    expect((usaStats?.raw_payload as Record<string, unknown>)?.competition).toBe('UEFA Euro 2024')
    expect((usaStats?.raw_payload as Record<string, unknown>)?.season).toBe('2024')

    expect(usaRating?.competition).toBe('UEFA Euro 2024')
    expect(usaRating?.season).toBe('2024')
    expect(usaRating?.as_of_date).toBe('2024-07-14')
    expect((usaRating?.raw_payload as Record<string, unknown>)?.competition).toBe('UEFA Euro 2024')
    expect((usaRating?.raw_payload as Record<string, unknown>)?.season).toBe('2024')
  })

  it('honors CLI competition and season overrides in csv mode', () => {
    process.argv = [
      ORIGINAL_ARGV[0] || 'node',
      ORIGINAL_ARGV[1] || 'scripts/sync-layer1-team-data.ts',
      '--fbref-csv',
      'scripts/fixtures/fbref-team-stats.csv',
      '--elo-csv',
      'scripts/fixtures/elo-ratings.csv',
      '--competition',
      'UEFA Euro 2024',
      '--season',
      '2024',
      '--source-updated-at',
      '2026-04-04T00:00:00Z',
      '--as-of-date',
      '2024-07-14',
    ]

    const result = buildCsvDataset()
    const { teamStats, ratings } = buildMetricWriteRows(result)
    const usaStats = teamStats.find((row) => row.team_slug === 'usa')
    const usaRating = ratings.find((row) => row.team_slug === 'usa')

    expect(usaStats?.competition).toBe('UEFA Euro 2024')
    expect(usaStats?.season).toBe('2024')
    expect(usaStats?.as_of_date).toBe('2024-07-14')

    expect(usaRating?.competition).toBe('UEFA Euro 2024')
    expect(usaRating?.season).toBe('2024')
    expect(usaRating?.as_of_date).toBe('2024-07-14')
  })
})
