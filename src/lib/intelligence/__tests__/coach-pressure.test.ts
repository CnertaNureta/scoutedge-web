import { describe, it, expect } from 'vitest'
import { computeCoachPressure } from '../coach-pressure'
import type { CoachProfile } from '@/data/coaches-data'

function makeCoach(overrides: Partial<CoachProfile> = {}): CoachProfile {
  return {
    teamSlug: 'testland',
    name: 'Test Coach',
    nationality: 'Testlandian',
    age: 50,
    tacticalStyle: '',
    formation: '4-3-3',
    philosophy: '',
    careerHighlights: [],
    previousClubs: [],
    appointedDate: '2024',
    contractUntil: '2026',
    winRate: 50,
    bio: '',
    ...overrides,
  }
}

describe('computeCoachPressure', () => {
  it('returns hasProfile false when coach has no pressure profile', () => {
    const coach = makeCoach()
    const result = computeCoachPressure(coach)
    expect(result.hasProfile).toBe(false)
    expect(result.inGameTells).toEqual([])
    expect(result.formationTweaks).toEqual([])
    expect(result.bigGameRecord).toBeUndefined()
    expect(result.setPieceBias).toBe('neutral')
    expect(result.signalCount).toBe(0)
    expect(result.sourceCount).toBe(0)
  })

  it('populates all fields when full profile is provided', () => {
    const coach = makeCoach({
      coachTells: ['Tell A', 'Tell B'],
      pressureProfile: {
        bigGameRecord: { played: 10, won: 5, drawn: 3, lost: 2 },
        inGameTells: ['Hooks attacking sub past 70 when trailing'],
        formationTweaks: ['Shifts to 5-4-1 chasing a draw'],
        setPieceBias: 'attacking',
      },
    })
    const result = computeCoachPressure(coach)
    expect(result.hasProfile).toBe(true)
    expect(result.bigGameRecord).toEqual({
      played: 10,
      won: 5,
      drawn: 3,
      lost: 2,
      winRate: 0.5,
    })
    expect(result.inGameTells).toHaveLength(1)
    expect(result.formationTweaks).toHaveLength(1)
    expect(result.setPieceBias).toBe('attacking')
    expect(result.signalCount).toBeGreaterThan(0)
    expect(result.sourceCount).toBeGreaterThan(0)
  })

  it('computes winRate as won / played rounded to 2 decimals', () => {
    const coach = makeCoach({
      pressureProfile: {
        bigGameRecord: { played: 7, won: 3, drawn: 2, lost: 2 },
        inGameTells: [],
        formationTweaks: [],
      },
    })
    const result = computeCoachPressure(coach)
    // 3 / 7 = 0.4285... → 0.43
    expect(result.bigGameRecord?.winRate).toBe(0.43)
  })

  it('protects against division by zero when no games played', () => {
    const coach = makeCoach({
      pressureProfile: {
        bigGameRecord: { played: 0, won: 0, drawn: 0, lost: 0 },
        inGameTells: [],
        formationTweaks: [],
      },
    })
    const result = computeCoachPressure(coach)
    expect(result.bigGameRecord?.winRate).toBe(0)
  })

  it('defaults setPieceBias to neutral when omitted', () => {
    const coach = makeCoach({
      pressureProfile: {
        inGameTells: ['Tell'],
        formationTweaks: [],
      },
    })
    const result = computeCoachPressure(coach)
    expect(result.setPieceBias).toBe('neutral')
  })

  it('signalCount counts tells, tweaks, coachTells, plus record when present', () => {
    const coach = makeCoach({
      coachTells: ['ct1', 'ct2'],
      pressureProfile: {
        bigGameRecord: { played: 4, won: 2, drawn: 1, lost: 1 },
        inGameTells: ['t1', 't2'],
        formationTweaks: ['ft1'],
        setPieceBias: 'defensive',
      },
    })
    const result = computeCoachPressure(coach)
    // 2 inGame + 1 tweak + 2 coachTells + 1 record = 6
    expect(result.signalCount).toBe(6)
  })

  it('returns hasProfile true when only setPieceBias is set', () => {
    const coach = makeCoach({
      pressureProfile: {
        inGameTells: [],
        formationTweaks: [],
        setPieceBias: 'neutral',
      },
    })
    const result = computeCoachPressure(coach)
    expect(result.hasProfile).toBe(true)
  })

  it('rounds winRate correctly for repeating decimals', () => {
    const coach = makeCoach({
      pressureProfile: {
        bigGameRecord: { played: 3, won: 1, drawn: 1, lost: 1 },
        inGameTells: [],
        formationTweaks: [],
      },
    })
    const result = computeCoachPressure(coach)
    // 1 / 3 = 0.3333... → 0.33
    expect(result.bigGameRecord?.winRate).toBe(0.33)
  })
})
