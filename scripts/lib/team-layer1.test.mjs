import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  buildTeamAliasRows,
  normalizeTeamName,
  parseEloRatingsCsv,
  parseFbrefTeamStatsCsv,
  resolveTeam,
} from './team-layer1.mjs'

const fixturesDir = path.join(process.cwd(), 'scripts', 'fixtures')

describe('team layer1 utilities', () => {
  it('normalizes common country aliases', () => {
    expect(normalizeTeamName("Côte d'Ivoire")).toBe('cote d ivoire')
    expect(resolveTeam('United States')?.slug).toBe('usa')
    expect(resolveTeam('Korea Republic')?.slug).toBe('south-korea')
    expect(resolveTeam('Cape Verde')?.slug).toBe('cabo-verde')
    expect(resolveTeam('Curaçao')?.slug).toBe('curacao')
  })

  it('builds deduplicated alias rows', () => {
    const aliasRows = buildTeamAliasRows()
    const normalizedAliases = new Set(aliasRows.map((row) => row.normalized_alias))
    expect(aliasRows.length).toBe(normalizedAliases.size)
    expect(aliasRows.find((row) => row.alias === 'United States')?.team_slug).toBe('usa')
  })

  it('parses FBref team stats fixture into canonical rows', () => {
    const csv = readFileSync(path.join(fixturesDir, 'fbref-team-stats.csv'), 'utf8')
    const result = parseFbrefTeamStatsCsv(csv)

    expect(result.unresolvedTeams).toEqual([])
    expect(result.records).toHaveLength(9)
    expect(result.coverage.coveredTeamCount).toBe(9)
    expect(result.records.find((row) => row.team_slug === 'usa')).toMatchObject({
      source: 'fbref',
      possession_pct: 55.1,
      pass_completion_pct: 88.9,
      xg_for: 16.5,
      xg_against: 11.8,
    })
  })

  it('parses ELO ratings fixture into canonical rows', () => {
    const csv = readFileSync(path.join(fixturesDir, 'elo-ratings.csv'), 'utf8')
    const result = parseEloRatingsCsv(csv)

    expect(result.unresolvedTeams).toEqual([])
    expect(result.records).toHaveLength(9)
    expect(result.coverage.coveredTeamCount).toBe(9)
    expect(result.records.find((row) => row.team_slug === 'south-korea')).toMatchObject({
      source: 'world-football-elo',
      rating: 1868,
      rating_rank: 13,
      rating_scale: 'elo',
    })
  })
})
