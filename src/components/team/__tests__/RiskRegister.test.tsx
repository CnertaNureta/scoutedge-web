import { describe, it, expect } from 'vitest'
import { computeSquadRisks } from '../RiskRegister'
import type { Player, PlayerIntelRecord } from '@/lib/types'

function makePlayer(slug: string, overrides: Partial<Player> = {}): Player {
  return {
    slug,
    name: `Player ${slug}`,
    teamSlug: 'testland',
    position: 'MID',
    number: 10,
    age: 25,
    club: 'FC X',
    caps: 30,
    goals: 0,
    assists: 0,
    rating: 80,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 0,
    sentimentLabel: 'neutral',
    seoArticle: '',
    ...overrides,
  }
}

function makeIntel(
  player_slug: string,
  overrides: Partial<PlayerIntelRecord> = {},
): PlayerIntelRecord {
  return {
    player_key: `testland::${player_slug}`,
    player_slug,
    player_name: `Player ${player_slug}`,
    team_slug: 'testland',
    fitness_status: 'green',
    fitness_note: '',
    morale_score: 0,
    morale_label: 'neutral',
    tactical_risk: 'low',
    tactical_note: '',
    selection_risk: 'low',
    selection_note: '',
    recent_signals: [],
    source_signal_ids: [],
    signal_count: 0,
    last_signal_at: '2026-05-14T00:00:00.000Z',
    last_updated: '2026-05-14T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeSquadRisks', () => {
  it('returns empty topRisks when no players have any risks', () => {
    const players = [makePlayer('a'), makePlayer('b')]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a'),
      b: makeIntel('b'),
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.topRisks).toHaveLength(0)
    expect(result.totalRiskCount).toBe(0)
    expect(result.highCount).toBe(0)
    expect(result.distinctTypeCount).toBe(0)
  })

  it('sorts risks by score desc — high (10) before medium (6)', () => {
    const players = [
      makePlayer('a', { fitnessStatus: 'amber' }),
      makePlayer('b', { fitnessStatus: 'red' }),
    ]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a', { fitness_status: 'amber', fitness_note: 'monitoring' }),
      b: makeIntel('b', { fitness_status: 'red', fitness_note: 'injured' }),
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.topRisks).toHaveLength(2)
    expect(result.topRisks[0].player.slug).toBe('b')
    expect(result.topRisks[0].severity).toBe('high')
    expect(result.topRisks[1].player.slug).toBe('a')
    expect(result.topRisks[1].severity).toBe('medium')
  })

  it('trims to top 5 risks even when more exist', () => {
    const players = Array.from({ length: 8 }, (_, i) => makePlayer(`p${i}`))
    const intelByKey: Record<string, PlayerIntelRecord> = {}
    for (let i = 0; i < 8; i++) {
      intelByKey[`p${i}`] = makeIntel(`p${i}`, {
        fitness_status: 'red',
        fitness_note: 'injured',
      })
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.topRisks).toHaveLength(5)
    expect(result.totalRiskCount).toBe(8)
  })

  it('counts distinct risk types', () => {
    const players = [makePlayer('a'), makePlayer('b'), makePlayer('c')]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a', { fitness_status: 'red', fitness_note: 'fit-risk' }),
      b: makeIntel('b', { selection_risk: 'high', selection_note: 'sel-risk' }),
      c: makeIntel('c', { tactical_risk: 'high', tactical_note: 'tac-risk' }),
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.distinctTypeCount).toBe(3)
  })

  it('counts only "high" severity entries for highCount', () => {
    const players = [makePlayer('a'), makePlayer('b'), makePlayer('c')]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a', { fitness_status: 'red', fitness_note: 'high' }),
      b: makeIntel('b', { fitness_status: 'amber', fitness_note: 'medium' }),
      c: makeIntel('c', { selection_risk: 'high', selection_note: 'high' }),
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.highCount).toBe(2)
    expect(result.totalRiskCount).toBe(3)
  })

  it('emits medium tactical risk with medium severity and score', () => {
    const players = [makePlayer('a')]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a', { tactical_risk: 'medium', tactical_note: 'monitored' }),
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.totalRiskCount).toBe(1)
    expect(result.topRisks[0]).toMatchObject({
      type: 'tactical',
      severity: 'medium',
      note: 'monitored',
      score: 6,
    })
  })

  it('skips players whose intel lookup returns undefined', () => {
    const players = [makePlayer('a'), makePlayer('b')]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a', { fitness_status: 'red', fitness_note: 'injured' }),
      // b has no intel record
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.totalRiskCount).toBe(1)
    expect(result.topRisks[0].player.slug).toBe('a')
  })

  it('captures the most recent intel last_updated timestamp', () => {
    const players = [makePlayer('a'), makePlayer('b'), makePlayer('c')]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a', { last_updated: '2026-04-01T00:00:00.000Z' }),
      b: makeIntel('b', { last_updated: '2026-05-10T00:00:00.000Z' }),
      c: makeIntel('c', { last_updated: '2026-05-14T00:00:00.000Z' }),
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.lastUpdatedAt).toBe('2026-05-14T00:00:00.000Z')
  })

  it('emits multiple risk rows for the same player when they hit several risk types', () => {
    const players = [makePlayer('a')]
    const intelByKey: Record<string, PlayerIntelRecord> = {
      a: makeIntel('a', {
        fitness_status: 'red',
        fitness_note: 'fit',
        selection_risk: 'high',
        selection_note: 'sel',
        tactical_risk: 'high',
        tactical_note: 'tac',
      }),
    }
    const result = computeSquadRisks(players, (p) => intelByKey[p.slug])
    expect(result.totalRiskCount).toBe(3)
    expect(new Set(result.topRisks.map((r) => r.type))).toEqual(
      new Set(['fitness', 'selection', 'tactical']),
    )
  })
})
