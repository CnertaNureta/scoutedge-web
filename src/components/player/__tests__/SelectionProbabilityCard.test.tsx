import { describe, expect, it } from 'vitest'
import { computeSelectionProbability } from '../SelectionProbabilityCard'
import type { Player, PlayerIntelRecord } from '@/lib/types'
import type { ResolvedPlayerStatus } from '@/lib/player-status'

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

function makeStatus(overrides: Partial<ResolvedPlayerStatus> = {}): ResolvedPlayerStatus {
  return {
    status: 'confirmed',
    reason: '',
    updated: '2026-05-12',
    source: 'derived',
    ...overrides,
  }
}

describe('computeSelectionProbability', () => {
  it('returns base values for low risk + green fitness', () => {
    const result = computeSelectionProbability(
      makePlayer({ fitnessStatus: 'green' }),
      makeIntel({ selection_risk: 'low', fitness_status: 'green' }),
      makeStatus({ status: 'confirmed' }),
    )
    expect(result.startPct).toBe(72)
    expect(result.squadPct).toBe(96)
  })

  it('applies amber fitness modifiers on top of medium selection risk', () => {
    const result = computeSelectionProbability(
      makePlayer({ fitnessStatus: 'amber' }),
      makeIntel({ selection_risk: 'medium', fitness_status: 'amber' }),
      makeStatus({ status: 'likely' }),
    )
    // base medium: squad 78, start 45. amber: -10 squad, -15 start.
    expect(result.squadPct).toBe(68)
    expect(result.startPct).toBe(30)
  })

  it('clamps values to the 0-99 range even with extreme high-risk + red fitness', () => {
    const result = computeSelectionProbability(
      makePlayer({ fitnessStatus: 'red' }),
      makeIntel({ selection_risk: 'high', fitness_status: 'red' }),
      makeStatus({ status: 'confirmed' }),
    )
    // high risk start = 18, red = -35 → -17 → clamp 0
    expect(result.startPct).toBeGreaterThanOrEqual(0)
    expect(result.startPct).toBeLessThanOrEqual(99)
    expect(result.squadPct).toBeGreaterThanOrEqual(0)
    expect(result.squadPct).toBeLessThanOrEqual(99)
    expect(result.startPct).toBe(0)
  })

  it('zeros both probabilities when status is ruled-out', () => {
    const result = computeSelectionProbability(
      makePlayer(),
      makeIntel({ selection_risk: 'low', fitness_status: 'green' }),
      makeStatus({ status: 'ruled-out' }),
    )
    expect(result.startPct).toBe(0)
    expect(result.squadPct).toBe(0)
  })

  it('zeros both probabilities when status is retired', () => {
    const result = computeSelectionProbability(
      makePlayer(),
      makeIntel({ selection_risk: 'low', fitness_status: 'green' }),
      makeStatus({ status: 'retired' }),
    )
    expect(result.startPct).toBe(0)
    expect(result.squadPct).toBe(0)
  })

  it('applies a heavy penalty when status is doubtful (suspended-like overlay)', () => {
    const result = computeSelectionProbability(
      makePlayer({ fitnessStatus: 'green' }),
      makeIntel({ selection_risk: 'low', fitness_status: 'green' }),
      makeStatus({ status: 'doubtful' }),
    )
    // low + green = 72 / 96, then -50 each → 22 / 46
    expect(result.startPct).toBe(22)
    expect(result.squadPct).toBe(46)
  })

  it('maps verdict thresholds correctly', () => {
    // lock: ≥ 80
    const lock = computeSelectionProbability(
      makePlayer({ fitnessStatus: 'green' }),
      makeIntel({ selection_risk: 'low', fitness_status: 'green' }),
      makeStatus({ status: 'confirmed' }),
    )
    // low/green → start 72 → likely. Push higher via no risk + default + override:
    // The pure verdict thresholds: ≥80 lock; 50-79 likely; 20-49 contested; <20 bench.
    expect(lock.verdictKey).toBe('likely')

    // Build a result at each band by mocking different inputs that result in
    // specific start values:
    // We'll test the thresholds purely on verdict logic by checking via doubtful penalty.

    const benchResult = computeSelectionProbability(
      makePlayer({ fitnessStatus: 'red' }),
      makeIntel({ selection_risk: 'high', fitness_status: 'red' }),
      makeStatus({ status: 'confirmed' }),
    )
    // start 18 - 35 = -17 → 0 → bench
    expect(benchResult.verdictKey).toBe('bench')

    const contestedResult = computeSelectionProbability(
      makePlayer({ fitnessStatus: 'green' }),
      makeIntel({ selection_risk: 'medium', fitness_status: 'green' }),
      makeStatus({ status: 'confirmed' }),
    )
    // start 45 → contested
    expect(contestedResult.verdictKey).toBe('contested')
  })

  it('falls back to defaults when selection_risk is missing entirely', () => {
    const player = makePlayer({ fitnessStatus: 'green' })
    const stripped = { ...player, selectionRisk: undefined } as unknown as Player
    const intelStripped = {
      ...makeIntel(),
      selection_risk: undefined,
    } as unknown as PlayerIntelRecord
    const result = computeSelectionProbability(
      stripped,
      intelStripped,
      makeStatus({ status: 'confirmed' }),
    )
    // default squad 88, default start 58
    expect(result.squadPct).toBe(88)
    expect(result.startPct).toBe(58)
  })
})
