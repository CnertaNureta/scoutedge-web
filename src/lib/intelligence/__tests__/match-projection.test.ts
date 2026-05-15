import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeMatchProjection } from '../match-projection'
import type { MatchFixture, Player, Team } from '@/lib/types'

const NOW = new Date('2026-06-01T00:00:00Z')

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'test-player',
    name: 'Test Player',
    teamSlug: 'home-team',
    position: 'FWD',
    number: 9,
    age: 25,
    club: 'Test FC',
    caps: 50,
    goals: 25,
    assists: 8,
    rating: 80,
    fitnessStatus: 'green',
    fitnessNote: 'Sharp.',
    sentimentScore: 70,
    sentimentLabel: 'positive',
    seoArticle: '',
    selectionRisk: 'low',
    ...overrides,
  }
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'home-team',
    name: 'Home Team',
    flag: '🏳️',
    group: 'A',
    confederation: 'UEFA',
    fifaRanking: 10,
    coachName: 'Coach',
    chemistry: 75,
    familiarity: 70,
    stability: 70,
    morale: 78,
    archetypeMatch: 'sample',
    keyInsight: '',
    seoArticle: '',
    ...overrides,
  }
}

function makeFixture(
  index: number,
  overrides: Partial<MatchFixture> = {},
): MatchFixture {
  return {
    homeTeamSlug: 'home-team',
    awayTeamSlug: `opp-${index}`,
    round: `Match Day ${index}`,
    group: 'A',
    venue: 'Test Stadium',
    city: 'Test City',
    kickoffUtc: `2026-06-${String(10 + index).padStart(2, '0')}T18:00:00Z`,
    homeWinProb: 0.5,
    drawProb: 0.25,
    awayWinProb: 0.25,
    ...overrides,
  }
}

describe('computeMatchProjection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('caps at the next 6 upcoming fixtures', () => {
    const player = makePlayer()
    const team = makeTeam()
    const fixtures: MatchFixture[] = Array.from({ length: 10 }, (_, i) =>
      makeFixture(i + 1),
    )
    const result = computeMatchProjection(player, team, fixtures)
    expect(result.rows).toHaveLength(6)
  })

  it('drops projected minutes when selection_risk is high', () => {
    const team = makeTeam()
    const fixtures = [makeFixture(1)]

    const high = computeMatchProjection(
      makePlayer({ selectionRisk: 'high' }),
      team,
      fixtures,
    )
    const low = computeMatchProjection(
      makePlayer({ selectionRisk: 'low' }),
      team,
      fixtures,
    )
    expect(high.rows[0].projectedMinutesPct).toBeLessThan(50)
    expect(high.rows[0].projectedMinutesPct).toBeLessThan(
      low.rows[0].projectedMinutesPct,
    )
  })

  it('returns translation keys for projected roles instead of display copy', () => {
    const result = computeMatchProjection(makePlayer({ position: 'FWD' }), makeTeam(), [
      makeFixture(1),
    ])

    expect(result.rows[0].projectedRole).toBe('boxCrasher')
  })

  it('scales threat tier monotonically with player rating', () => {
    const team = makeTeam()
    const opponent: Team = makeTeam({ slug: 'opp-1', fifaRanking: 25, name: 'Opp' })
    const fixtures = [makeFixture(1)]

    const lowRated = computeMatchProjection(
      makePlayer({ rating: 55 }),
      team,
      fixtures,
      [opponent],
    )
    const midRated = computeMatchProjection(
      makePlayer({ rating: 70 }),
      team,
      fixtures,
      [opponent],
    )
    const highRated = computeMatchProjection(
      makePlayer({ rating: 88 }),
      team,
      fixtures,
      [opponent],
    )

    const tierOrder: Record<string, number> = { C: 0, B: 1, A: 2, S: 3 }
    expect(tierOrder[lowRated.rows[0].threatTier]).toBeLessThanOrEqual(
      tierOrder[midRated.rows[0].threatTier],
    )
    expect(tierOrder[midRated.rows[0].threatTier]).toBeLessThanOrEqual(
      tierOrder[highRated.rows[0].threatTier],
    )
  })

  it('uses the same threat tier for equivalent 0-10 and 0-100 ratings', () => {
    const team = makeTeam()
    const opponent: Team = makeTeam({ slug: 'opp-1', fifaRanking: 25, name: 'Opp' })
    const fixtures = [makeFixture(1)]

    const tenScale = computeMatchProjection(
      makePlayer({ rating: 8.8 }),
      team,
      fixtures,
      [opponent],
    )
    const hundredScale = computeMatchProjection(
      makePlayer({ rating: 88 }),
      team,
      fixtures,
      [opponent],
    )

    expect(tenScale.rows[0].threatTier).toBe(hundredScale.rows[0].threatTier)
    expect(tenScale.rows[0].keyMatchupNote).toBe(hundredScale.rows[0].keyMatchupNote)
  })

  it('returns binary minutes for goalkeepers (90 fit / 0 benched) and no key matchup note', () => {
    const team = makeTeam()
    const opponent = makeTeam({
      slug: 'opp-1',
      fifaRanking: 5,
      name: 'Top Side',
    })
    const fixtures = [makeFixture(1)]

    const startingKeeper = computeMatchProjection(
      makePlayer({ position: 'GK', selectionRisk: 'low', rating: 88 }),
      team,
      fixtures,
      [opponent],
    )
    expect(startingKeeper.rows[0].projectedMinutesPct).toBe(90)
    expect(startingKeeper.rows[0].keyMatchupNote).toBeUndefined()

    const benchedKeeper = computeMatchProjection(
      makePlayer({ position: 'GK', selectionRisk: 'high', rating: 88 }),
      team,
      fixtures,
      [opponent],
    )
    expect(benchedKeeper.rows[0].projectedMinutesPct).toBe(0)
    expect(benchedKeeper.rows[0].keyMatchupNote).toBeUndefined()
  })

  it('returns empty rows and zero confidence when there are no fixtures', () => {
    const result = computeMatchProjection(makePlayer(), makeTeam(), [])
    expect(result.rows).toEqual([])
    expect(result.signalCount).toBe(0)
    expect(result.sourceCount).toBe(0)
  })

  it('returns empty rows when no fixtures involve the player team', () => {
    const team = makeTeam({ slug: 'home-team' })
    const stranger: MatchFixture = {
      ...makeFixture(1),
      homeTeamSlug: 'other-a',
      awayTeamSlug: 'other-b',
    }
    const result = computeMatchProjection(makePlayer(), team, [stranger])
    expect(result.rows).toEqual([])
  })

  it('only emits a key matchup note when player rating and opponent threshold are met', () => {
    const team = makeTeam()
    const fixtures = [makeFixture(1)]

    const strongOpponent = makeTeam({
      slug: 'opp-1',
      fifaRanking: 8,
      name: 'Elite Side',
    })
    const noteRow = computeMatchProjection(
      makePlayer({ rating: 86, position: 'FWD', selectionRisk: 'low' }),
      team,
      fixtures,
      [strongOpponent],
    )
    expect(noteRow.rows[0].keyMatchupNote).toBeDefined()
    expect(noteRow.rows[0].keyMatchupNote).toContain('Elite Side')

    const weakOpponent = makeTeam({
      slug: 'opp-1',
      fifaRanking: 60,
      name: 'Weak Side',
    })
    const noNoteRow = computeMatchProjection(
      makePlayer({ rating: 86, position: 'FWD', selectionRisk: 'low' }),
      team,
      fixtures,
      [weakOpponent],
    )
    expect(noNoteRow.rows[0].keyMatchupNote).toBeUndefined()

    // Low-rated player vs strong opponent: still no note (no fabrication).
    const lowRated = computeMatchProjection(
      makePlayer({ rating: 70, position: 'FWD', selectionRisk: 'low' }),
      team,
      fixtures,
      [strongOpponent],
    )
    expect(lowRated.rows[0].keyMatchupNote).toBeUndefined()
  })

  it('sorts fixtures chronologically before slicing', () => {
    const team = makeTeam()
    const out: MatchFixture[] = [
      {
        ...makeFixture(3),
        kickoffUtc: '2026-06-20T18:00:00Z',
        awayTeamSlug: 'opp-late',
      },
      {
        ...makeFixture(1),
        kickoffUtc: '2026-06-10T18:00:00Z',
        awayTeamSlug: 'opp-early',
      },
      {
        ...makeFixture(2),
        kickoffUtc: '2026-06-15T18:00:00Z',
        awayTeamSlug: 'opp-mid',
      },
    ]
    const result = computeMatchProjection(makePlayer(), team, out)
    expect(result.rows.map((r) => r.opponentSlug)).toEqual([
      'opp-early',
      'opp-mid',
      'opp-late',
    ])
  })

  it('filters already-played fixtures before slicing projections', () => {
    const team = makeTeam()
    const fixtures: MatchFixture[] = [
      makeFixture(1, { kickoffUtc: '2026-05-20T18:00:00Z', awayTeamSlug: 'opp-past' }),
      makeFixture(2, { kickoffUtc: '2026-06-02T18:00:00Z', awayTeamSlug: 'opp-next' }),
      makeFixture(3, { kickoffUtc: '2026-06-05T18:00:00Z', awayTeamSlug: 'opp-later' }),
    ]

    const result = computeMatchProjection(makePlayer(), team, fixtures)

    expect(result.rows.map((r) => r.opponentSlug)).toEqual(['opp-next', 'opp-later'])
  })
})
