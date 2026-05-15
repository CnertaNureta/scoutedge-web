import { describe, it, expect } from 'vitest'
import {
  computeAgePeak,
  mapPositionToGroup,
  PEAK_BANDS,
} from '../age-peak'
import type { Player } from '@/lib/types'

function makePlayer(slug: string, overrides: Partial<Player> = {}): Player {
  return {
    slug,
    name: `Player ${slug}`,
    teamSlug: 'testland',
    position: 'MID',
    number: 10,
    age: 27,
    club: 'FC X',
    caps: 30,
    goals: 0,
    assists: 0,
    rating: 75,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 0,
    sentimentLabel: 'neutral',
    seoArticle: '',
    ...overrides,
  }
}

describe('mapPositionToGroup', () => {
  it('maps broad project codes to representative groups', () => {
    expect(mapPositionToGroup('GK')).toBe('GK')
    expect(mapPositionToGroup('DEF')).toBe('CB')
    expect(mapPositionToGroup('MID')).toBe('CM')
    expect(mapPositionToGroup('FWD')).toBe('ST')
  })

  it('routes granular fullback codes to FB and central defender codes to CB', () => {
    expect(mapPositionToGroup('LB')).toBe('FB')
    expect(mapPositionToGroup('RB')).toBe('FB')
    expect(mapPositionToGroup('LWB')).toBe('FB')
    expect(mapPositionToGroup('CB')).toBe('CB')
  })

  it('routes granular midfield and wing codes', () => {
    expect(mapPositionToGroup('CDM')).toBe('DM')
    expect(mapPositionToGroup('CAM')).toBe('AM')
    expect(mapPositionToGroup('LW')).toBe('W')
    expect(mapPositionToGroup('RW')).toBe('W')
    expect(mapPositionToGroup('CM')).toBe('CM')
  })

  it('routes striker codes to ST', () => {
    expect(mapPositionToGroup('ST')).toBe('ST')
    expect(mapPositionToGroup('CF')).toBe('ST')
    expect(mapPositionToGroup('STRIKER')).toBe('ST')
  })

  it('falls back to CM for unknown values', () => {
    expect(mapPositionToGroup('???')).toBe('CM')
  })
})

describe('computeAgePeak', () => {
  it('returns empty rows and zero totals for an empty squad', () => {
    const result = computeAgePeak([])
    expect(result.rows).toEqual([])
    expect(result.verdict).toBe('mixed')
    expect(result.totalPlayers).toBe(0)
    expect(result.totalInPeak).toBe(0)
    expect(result.totalAscending).toBe(0)
    expect(result.totalDeclining).toBe(0)
    expect(result.signalCount).toBe(0)
    expect(result.sourceCount).toBe(0)
  })

  it('verdict = "peaking" when every player is inside their position band', () => {
    // CM band 24-30; GK band 27-34
    const players = [
      makePlayer('a', { position: 'MID', age: 27 }),
      makePlayer('b', { position: 'MID', age: 29 }),
      makePlayer('c', { position: 'GK', age: 30 }),
    ]
    const result = computeAgePeak(players)
    expect(result.verdict).toBe('peaking')
    expect(result.totalInPeak).toBe(3)
    expect(result.totalAscending).toBe(0)
    expect(result.totalDeclining).toBe(0)
  })

  it('verdict = "declining" when every player is above their band', () => {
    const players = [
      // CM high = 30
      makePlayer('a', { position: 'MID', age: 33 }),
      // ST high = 30
      makePlayer('b', { position: 'FWD', age: 34 }),
    ]
    const result = computeAgePeak(players)
    expect(result.verdict).toBe('declining')
    expect(result.totalDeclining).toBe(2)
    expect(result.totalInPeak).toBe(0)
  })

  it('verdict = "ascending" when every player is below their band', () => {
    const players = [
      // CM low = 24
      makePlayer('a', { position: 'MID', age: 20 }),
      // CB low = 26
      makePlayer('b', { position: 'DEF', age: 21 }),
    ]
    const result = computeAgePeak(players)
    expect(result.verdict).toBe('ascending')
    expect(result.totalAscending).toBe(2)
    expect(result.totalInPeak).toBe(0)
  })

  it('verdict = "mixed" when distribution spans multiple buckets', () => {
    const players = [
      makePlayer('a', { position: 'MID', age: 19 }), // ascending
      makePlayer('b', { position: 'MID', age: 27 }), // peaking
      makePlayer('c', { position: 'FWD', age: 35 }), // declining
    ]
    const result = computeAgePeak(players)
    expect(result.verdict).toBe('mixed')
    expect(result.totalAscending).toBe(1)
    expect(result.totalInPeak).toBe(1)
    expect(result.totalDeclining).toBe(1)
  })

  it('groups players by position into stable order — GK, CB, CM, ST', () => {
    const players = [
      makePlayer('s', { position: 'FWD', age: 27 }),
      makePlayer('m', { position: 'MID', age: 27 }),
      makePlayer('d', { position: 'DEF', age: 28 }),
      makePlayer('g', { position: 'GK', age: 29 }),
    ]
    const result = computeAgePeak(players)
    expect(result.rows.map((r) => r.group)).toEqual(['GK', 'CB', 'CM', 'ST'])
    expect(result.sourceCount).toBe(4)
    expect(result.signalCount).toBe(4)
  })

  it('routes granular fullback codes into FB group separately from CB', () => {
    // The dataset's Player.position is broad (`GK | DEF | MID | FWD`), but the
    // mapper accepts granular codes for forward-compat. Cast for the test only.
    const players = [
      makePlayer('cb1', { position: 'CB' as Player['position'], age: 28 }),
      makePlayer('fb1', { position: 'LB' as Player['position'], age: 26 }),
      makePlayer('fb2', { position: 'RB' as Player['position'], age: 27 }),
    ]
    const result = computeAgePeak(players)
    const groups = result.rows.map((r) => r.group)
    expect(groups).toContain('CB')
    expect(groups).toContain('FB')
    const cbRow = result.rows.find((r) => r.group === 'CB')!
    const fbRow = result.rows.find((r) => r.group === 'FB')!
    expect(cbRow.playerCount).toBe(1)
    expect(fbRow.playerCount).toBe(2)
  })

  it('avgAge is the mean of ages within each group', () => {
    const players = [
      makePlayer('a', { position: 'MID', age: 24 }),
      makePlayer('b', { position: 'MID', age: 26 }),
      makePlayer('c', { position: 'MID', age: 28 }),
      makePlayer('d', { position: 'GK', age: 30 }),
    ]
    const result = computeAgePeak(players)
    const cm = result.rows.find((r) => r.group === 'CM')!
    const gk = result.rows.find((r) => r.group === 'GK')!
    expect(cm.avgAge).toBeCloseTo(26, 5)
    expect(gk.avgAge).toBeCloseTo(30, 5)
  })

  it('avgDistanceFromCenter is signed offset from band center', () => {
    // CM band 24-30, center = 27. Ages 24 and 26 → mean 25 → distance -2.
    const players = [
      makePlayer('a', { position: 'MID', age: 24 }),
      makePlayer('b', { position: 'MID', age: 26 }),
    ]
    const result = computeAgePeak(players)
    const cm = result.rows.find((r) => r.group === 'CM')!
    expect(cm.avgDistanceFromCenter).toBeCloseTo(-2, 5)
  })

  it('counts ascending / inPeak / declining per row using strict inequalities', () => {
    // CM band 24-30. Boundary 24 and 30 are inside.
    const players = [
      makePlayer('low', { position: 'MID', age: 23 }), // ascending
      makePlayer('lowEdge', { position: 'MID', age: 24 }), // in peak
      makePlayer('mid', { position: 'MID', age: 27 }), // in peak
      makePlayer('highEdge', { position: 'MID', age: 30 }), // in peak
      makePlayer('high', { position: 'MID', age: 31 }), // declining
    ]
    const result = computeAgePeak(players)
    const cm = result.rows.find((r) => r.group === 'CM')!
    expect(cm.ascendingCount).toBe(1)
    expect(cm.inPeakCount).toBe(3)
    expect(cm.decliningCount).toBe(1)
    expect(cm.peakBand).toEqual(PEAK_BANDS.CM)
  })

  it('signalCount and sourceCount reflect player count and distinct groups', () => {
    const players = [
      makePlayer('a', { position: 'GK', age: 30 }),
      makePlayer('b', { position: 'GK', age: 31 }),
      makePlayer('c', { position: 'MID', age: 27 }),
    ]
    const result = computeAgePeak(players)
    expect(result.signalCount).toBe(3)
    expect(result.sourceCount).toBe(2)
  })
})
