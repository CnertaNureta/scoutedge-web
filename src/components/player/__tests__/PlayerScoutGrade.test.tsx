import { describe, expect, it } from 'vitest'
import { computePlayerScoutGrade, getTier } from '../PlayerScoutGrade'
import type { Player, PlayerIntelRecord, PlayerSignal } from '@/lib/types'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'test-team',
    position: 'FWD',
    number: 9,
    age: 25,
    club: 'Test FC',
    caps: 50,
    goals: 20,
    assists: 8,
    rating: 80,
    fitnessStatus: 'green',
    fitnessNote: 'Sharp.',
    sentimentScore: 70,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

function makeIntel(overrides: Partial<PlayerIntelRecord> = {}): PlayerIntelRecord {
  return {
    player_key: 'test-team::test-player',
    player_slug: 'test-player',
    player_name: 'Test Player',
    team_slug: 'test-team',
    fitness_status: 'green',
    fitness_note: 'Sharp.',
    morale_score: 78,
    morale_label: 'positive',
    tactical_risk: 'low',
    tactical_note: 'On script.',
    selection_risk: 'low',
    selection_note: 'Locked in.',
    recent_signals: [],
    source_signal_ids: [],
    signal_count: 10,
    last_signal_at: '2026-05-10T00:00:00.000Z',
    last_updated: '2026-05-12T00:00:00.000Z',
    ...overrides,
  }
}

describe('computePlayerScoutGrade', () => {
  it('returns all 5 breakdown dimensions in fixed order', () => {
    const grade = computePlayerScoutGrade(makePlayer(), makeIntel())
    expect(grade.breakdown).toHaveLength(5)
    expect(grade.breakdown.map((d) => d.label)).toEqual([
      'skill',
      'form',
      'fit',
      'durability',
      'bigGame',
    ])
  })

  it('clamps the total within 0-99', () => {
    const high = computePlayerScoutGrade(
      makePlayer({ rating: 99, caps: 200, goals: 200, age: 18 }),
      makeIntel({ morale_score: 100, fitness_status: 'green' }),
    )
    expect(high.total).toBeGreaterThanOrEqual(0)
    expect(high.total).toBeLessThanOrEqual(99)

    const low = computePlayerScoutGrade(
      makePlayer({ rating: 50, caps: 0, goals: 0, age: 40, sentimentScore: 0 }),
      undefined,
    )
    expect(low.total).toBeGreaterThanOrEqual(0)
    expect(low.total).toBeLessThanOrEqual(99)
  })

  it('falls back to fit=80 when fitness_status is undefined on both player and intel', () => {
    // The Player type requires fitnessStatus, but in practice merged data can
    // have unexpected shapes; we cast through unknown to simulate that.
    const player = makePlayer()
    const stripped = { ...player, fitnessStatus: undefined } as unknown as Player
    const grade = computePlayerScoutGrade(stripped, undefined)
    const fit = grade.breakdown.find((d) => d.label === 'fit')
    expect(fit?.value).toBe(80)
  })

  it('uses the green=92 / amber=68 / red=35 lookup for fit', () => {
    const green = computePlayerScoutGrade(
      makePlayer({ fitnessStatus: 'green' }),
      makeIntel({ fitness_status: 'green' }),
    )
    const amber = computePlayerScoutGrade(
      makePlayer({ fitnessStatus: 'amber' }),
      makeIntel({ fitness_status: 'amber' }),
    )
    const red = computePlayerScoutGrade(
      makePlayer({ fitnessStatus: 'red' }),
      makeIntel({ fitness_status: 'red' }),
    )
    expect(green.breakdown.find((d) => d.label === 'fit')?.value).toBe(92)
    expect(amber.breakdown.find((d) => d.label === 'fit')?.value).toBe(68)
    expect(red.breakdown.find((d) => d.label === 'fit')?.value).toBe(35)
  })

  it('caps Big-Game at 99 even when goals/caps ratio is extreme', () => {
    const grade = computePlayerScoutGrade(
      makePlayer({ goals: 500, caps: 10 }),
      undefined,
    )
    const bigGame = grade.breakdown.find((d) => d.label === 'bigGame')
    expect(bigGame?.value).toBe(99)
  })

  it('verdict tier matches the score band', () => {
    expect(getTier(95)).toBe('elite')
    expect(getTier(85)).toBe('elite')
    expect(getTier(84)).toBe('strong')
    expect(getTier(70)).toBe('strong')
    expect(getTier(69)).toBe('viable')
    expect(getTier(55)).toBe('viable')
    expect(getTier(54)).toBe('limited')
    expect(getTier(0)).toBe('limited')
  })

  it('sets verdict to a tier key from getTier', () => {
    const grade = computePlayerScoutGrade(
      makePlayer({ rating: 92, caps: 80, goals: 40, age: 23 }),
      makeIntel({ morale_score: 88, fitness_status: 'green' }),
    )
    expect(['elite', 'strong', 'viable', 'limited']).toContain(grade.verdict)
    expect(grade.verdict).toBe(getTier(grade.total))
  })

  it('derives sourceCount from distinct sourceType values in recent_signals', () => {
    const signals: PlayerSignal[] = [
      { type: 'training', text: 'a', sourceType: 'player_profile' },
      { type: 'quote', text: 'b', sourceType: 'social_post' },
      { type: 'quote', text: 'c', sourceType: 'social_post' },
      { type: 'data', text: 'd', sourceType: 'derived_rule' },
    ]
    const grade = computePlayerScoutGrade(
      makePlayer(),
      makeIntel({ recent_signals: signals }),
    )
    expect(grade.sourceCount).toBe(3)
  })

  it('prefers intel.morale_score over player.sentimentScore for form', () => {
    const grade = computePlayerScoutGrade(
      makePlayer({ sentimentScore: 30 }),
      makeIntel({ morale_score: 88 }),
    )
    const form = grade.breakdown.find((d) => d.label === 'form')
    expect(form?.value).toBe(88)
  })

  it('falls back to player.rating - 10 for form when morale data is missing entirely', () => {
    const player = makePlayer({ rating: 80 })
    const stripped = { ...player, sentimentScore: undefined } as unknown as Player
    const grade = computePlayerScoutGrade(stripped, undefined)
    const form = grade.breakdown.find((d) => d.label === 'form')
    expect(form?.value).toBe(70)
  })

  it('normalizes live 0-10 player ratings before scoring skill and form', () => {
    const hundredScale = { ...makePlayer({ rating: 82 }), sentimentScore: undefined } as unknown as Player
    const tenScale = { ...makePlayer({ rating: 8.2 }), sentimentScore: undefined } as unknown as Player

    const a = computePlayerScoutGrade(hundredScale, undefined)
    const b = computePlayerScoutGrade(tenScale, undefined)

    expect(b.breakdown.find((d) => d.label === 'skill')?.value).toBe(
      a.breakdown.find((d) => d.label === 'skill')?.value,
    )
    expect(b.breakdown.find((d) => d.label === 'form')?.value).toBe(
      a.breakdown.find((d) => d.label === 'form')?.value,
    )
  })
})
