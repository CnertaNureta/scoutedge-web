import { describe, expect, it } from 'vitest'
import {
  computeRoleHeatmap,
  PITCH_COLS,
  PITCH_ROWS,
  TOTAL_ZONES,
} from '../role-heatmap'
import type { Player, Team } from '@/lib/types'

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'brazil',
    name: 'Brazil',
    flag: '🇧🇷',
    group: 'A',
    confederation: 'CONMEBOL',
    fifaRanking: 5,
    coachName: 'Test Coach',
    chemistry: 80,
    familiarity: 75,
    stability: 70,
    morale: 80,
    archetypeMatch: 'Possession Control',
    keyInsight: 'Test insight',
    seoArticle: '',
    ...overrides,
  }
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'brazil',
    position: 'MID',
    number: 8,
    age: 26,
    club: 'Test FC',
    caps: 30,
    goals: 5,
    assists: 7,
    rating: 80,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 0.5,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

function parseZone(zone: string): { row: number; col: number } {
  const match = /^r(\d+)c(\d+)$/.exec(zone)
  if (!match) throw new Error(`Bad zone: ${zone}`)
  return { row: Number(match[1]), col: Number(match[2]) }
}

describe('computeRoleHeatmap', () => {
  it('returns all 54 zones in the Record', () => {
    const result = computeRoleHeatmap(makePlayer(), makeTeam())
    const keys = Object.keys(result.zoneIntensities)
    expect(keys).toHaveLength(TOTAL_ZONES)
    expect(TOTAL_ZONES).toBe(PITCH_ROWS * PITCH_COLS)

    for (let r = 0; r < PITCH_ROWS; r++) {
      for (let c = 0; c < PITCH_COLS; c++) {
        expect(result.zoneIntensities[`r${r}c${c}`]).toBeDefined()
      }
    }
  })

  it('clamps every zoneIntensity into [0, 1]', () => {
    const result = computeRoleHeatmap(makePlayer(), makeTeam())
    for (const value of Object.values(result.zoneIntensities)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('produces a non-trivial heatmap (sum of intensities > 0)', () => {
    const result = computeRoleHeatmap(makePlayer(), makeTeam())
    const sum = Object.values(result.zoneIntensities).reduce((a, b) => a + b, 0)
    expect(sum).toBeGreaterThan(0)
  })

  it('places a striker primary zone in the attacking third (high col)', () => {
    const striker = makePlayer({
      slug: 'big-9',
      position: 'FWD',
      selectionNote: 'Out-and-out striker, number 9',
    })
    const result = computeRoleHeatmap(striker, makeTeam())
    const { col } = parseZone(result.primaryZone)
    expect(col).toBeGreaterThanOrEqual(6)
  })

  it('places a goalkeeper primary zone at own goal (col 0)', () => {
    const keeper = makePlayer({ slug: 'gk-1', position: 'GK' })
    const result = computeRoleHeatmap(keeper, makeTeam())
    const { col } = parseZone(result.primaryZone)
    expect(col).toBe(0)
  })

  it('places a winger primary zone wide (row 0 or row 5)', () => {
    const leftWinger = makePlayer({
      slug: 'lw-1',
      position: 'FWD',
      selectionNote: 'Left wing inverted role',
    })
    const lwResult = computeRoleHeatmap(leftWinger, makeTeam())
    expect(parseZone(lwResult.primaryZone).row).toBe(0)

    const rightWinger = makePlayer({
      slug: 'rw-1',
      position: 'FWD',
      selectionNote: 'Right wing inverted role',
    })
    const rwResult = computeRoleHeatmap(rightWinger, makeTeam())
    expect(parseZone(rwResult.primaryZone).row).toBe(5)
  })

  it('is deterministic — same player twice produces the same heatmap', () => {
    const player = makePlayer({ slug: 'determinism-check', position: 'MID' })
    const team = makeTeam()
    const a = computeRoleHeatmap(player, team)
    const b = computeRoleHeatmap(player, team)
    expect(a.zoneIntensities).toEqual(b.zoneIntensities)
    expect(a.primaryZone).toBe(b.primaryZone)
    expect(a.roleTags).toEqual(b.roleTags)
  })

  it('returns at least one role tag', () => {
    const result = computeRoleHeatmap(makePlayer(), makeTeam())
    expect(result.roleTags.length).toBeGreaterThan(0)
    for (const tag of result.roleTags) {
      expect(typeof tag).toBe('string')
      expect(tag.length).toBeGreaterThan(0)
    }
  })

  it('reports a non-zero signalCount and sourceCount', () => {
    const result = computeRoleHeatmap(makePlayer(), makeTeam())
    expect(result.signalCount).toBeGreaterThan(0)
    expect(result.sourceCount).toBeGreaterThan(0)
  })

  it('different players with the same role still differ in fine detail', () => {
    const teamA = makeTeam()
    const p1 = makePlayer({ slug: 'striker-a', position: 'FWD', selectionNote: 'striker' })
    const p2 = makePlayer({ slug: 'striker-b', position: 'FWD', selectionNote: 'striker' })
    const a = computeRoleHeatmap(p1, teamA)
    const b = computeRoleHeatmap(p2, teamA)
    // Same coarse shape (likely same primary zone), but at least one cell differs.
    const someDifference = Object.keys(a.zoneIntensities).some(
      (key) => a.zoneIntensities[key] !== b.zoneIntensities[key],
    )
    expect(someDifference).toBe(true)
  })
})
