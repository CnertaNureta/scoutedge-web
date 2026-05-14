import { describe, it, expect } from 'vitest'
import {
  computeScoutEdgeScore,
  aggregateTeamSignals,
  getISOWeek,
} from '../ScoutEdgeScore'
import type { Team, Player, MarketIntelData } from '@/lib/types'

const labels = {
  attack: 'Attack',
  spine: 'Spine',
  bench: 'Bench',
  coach: 'Coach',
  form: 'Form',
  edge: 'Edge',
}

const hints = {
  attack: 'a',
  spine: 's',
  bench: 'b',
  coach: 'c',
  form: 'f',
  edge: 'e',
}

const verdicts = {
  elite: 'ELITE',
  strong: 'STRONG',
  viable: 'VIABLE',
  limited: 'LIMITED',
}

const baseOpts = {
  dossierId: 'SCT-TST-T1-W01-2026',
  verdicts,
  labels,
  hints,
  signalCount: 10,
  sourceCount: 2,
  lastUpdatedAt: '2026-05-14T00:00:00.000Z',
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'testland',
    name: 'Testland',
    flag: '🏴',
    group: 'A',
    confederation: 'UEFA',
    fifaRanking: 10,
    coachName: 'Coach X',
    chemistry: 70,
    familiarity: 60,
    stability: 65,
    morale: 75,
    archetypeMatch: '',
    keyInsight: '',
    seoArticle: '',
    ...overrides,
  }
}

function makePlayer(
  position: Player['position'],
  rating: number,
  i = 0,
): Player {
  return {
    slug: `p-${position}-${i}`,
    name: `Player ${i}`,
    teamSlug: 'testland',
    position,
    number: i + 1,
    age: 25,
    club: 'FC X',
    caps: 30,
    goals: 0,
    assists: 0,
    rating,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 0,
    sentimentLabel: 'neutral',
    seoArticle: '',
  }
}

function makeSquad(): Player[] {
  const out: Player[] = []
  out.push(makePlayer('GK', 80, 0))
  out.push(makePlayer('GK', 70, 1))
  // 6 DEF
  for (let i = 0; i < 6; i++) out.push(makePlayer('DEF', 78 - i * 2, 10 + i))
  // 8 MID
  for (let i = 0; i < 8; i++) out.push(makePlayer('MID', 80 - i * 2, 20 + i))
  // 7 FWD
  for (let i = 0; i < 7; i++) out.push(makePlayer('FWD', 82 - i * 2, 30 + i))
  return out
}

function strongEdge(): MarketIntelData {
  return {
    tournamentPrices: [],
    averageOdds: 5,
    impliedProbability: 20,
    movement: 'stable',
    modelEdge: {
      ourProbability: 0.3,
      marketProbability: 0.2,
      edge: 0.05,
      bestOdds: 6,
      bestSource: 'Consensus A',
      signalStrength: 'moderate',
    },
  }
}

describe('computeScoutEdgeScore', () => {
  it('returns exactly 6 breakdown dimensions with labels passed in', () => {
    const team = makeTeam()
    const score = computeScoutEdgeScore(team, strongEdge(), makeSquad(), baseOpts)
    expect(score.breakdown).toHaveLength(6)
    expect(score.breakdown.map((d) => d.label)).toEqual([
      'Attack',
      'Spine',
      'Bench',
      'Coach',
      'Form',
      'Edge',
    ])
  })

  it('keeps total within 0-100', () => {
    const team = makeTeam()
    const score = computeScoutEdgeScore(team, strongEdge(), makeSquad(), baseOpts)
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
  })

  it('keeps each breakdown dim within 0-100', () => {
    const team = makeTeam()
    const score = computeScoutEdgeScore(team, strongEdge(), makeSquad(), baseOpts)
    for (const dim of score.breakdown) {
      expect(dim.value).toBeGreaterThanOrEqual(0)
      expect(dim.value).toBeLessThanOrEqual(100)
    }
  })

  it('falls back to familiarity + 10 when modelEdge is null', () => {
    const team = makeTeam({ familiarity: 40 })
    const score = computeScoutEdgeScore(team, undefined, makeSquad(), baseOpts)
    const edgeDim = score.breakdown.find((d) => d.label === 'Edge')
    expect(edgeDim).toBeDefined()
    // 40 + 10 = 50, rounded
    expect(edgeDim?.value).toBe(50)
  })

  it('uses modelEdge.edge when present (50 + edge*200)', () => {
    const team = makeTeam({ familiarity: 0 })
    const intel: MarketIntelData = {
      ...strongEdge(),
      modelEdge: {
        ourProbability: 0.3,
        marketProbability: 0.2,
        edge: 0.05, // → 50 + 10 = 60
        bestOdds: 6,
        bestSource: 'Consensus A',
        signalStrength: 'moderate',
      },
    }
    const score = computeScoutEdgeScore(team, intel, makeSquad(), baseOpts)
    const edgeDim = score.breakdown.find((d) => d.label === 'Edge')
    expect(edgeDim?.value).toBe(60)
  })

  it('clamps Edge dim when modelEdge.edge is wildly positive', () => {
    const team = makeTeam()
    const intel: MarketIntelData = {
      ...strongEdge(),
      modelEdge: { ...strongEdge().modelEdge!, edge: 5 }, // ridiculous edge
    }
    const score = computeScoutEdgeScore(team, intel, makeSquad(), baseOpts)
    const edgeDim = score.breakdown.find((d) => d.label === 'Edge')
    expect(edgeDim?.value).toBe(100)
  })

  it('picks elite verdict when total >= 80', () => {
    const team = makeTeam({ chemistry: 100, stability: 100, morale: 100, familiarity: 100 })
    // boost ratings via squad of high-rated players
    const squad: Player[] = []
    for (let i = 0; i < 23; i++) {
      squad.push(makePlayer(i === 0 ? 'GK' : i < 6 ? 'DEF' : i < 14 ? 'MID' : 'FWD', 95, i))
    }
    const score = computeScoutEdgeScore(team, strongEdge(), squad, baseOpts)
    expect(score.total).toBeGreaterThanOrEqual(80)
    expect(score.verdict).toBe('ELITE')
  })

  it('picks limited verdict when total < 50', () => {
    const team = makeTeam({
      chemistry: 20,
      stability: 20,
      morale: 20,
      familiarity: 10,
    })
    const squad: Player[] = []
    for (let i = 0; i < 23; i++) {
      squad.push(makePlayer(i === 0 ? 'GK' : i < 6 ? 'DEF' : i < 14 ? 'MID' : 'FWD', 30, i))
    }
    const score = computeScoutEdgeScore(team, undefined, squad, baseOpts)
    expect(score.total).toBeLessThan(50)
    expect(score.verdict).toBe('LIMITED')
  })

  it('verdict tier matches the documented total ranges', () => {
    // Build a fixture where we can force specific totals via team.morale (Form dim, weight 0.20).
    // We pin every other input the same and walk the cutoffs.
    const cases: Array<[number, string]> = [
      [10, 'LIMITED'], // very low
      [55, 'VIABLE'],
      [70, 'STRONG'],
      [90, 'ELITE'],
    ]
    for (const [chem, expected] of cases) {
      const team = makeTeam({ chemistry: chem, stability: chem, morale: chem, familiarity: chem })
      const squad: Player[] = []
      for (let i = 0; i < 23; i++) {
        squad.push(makePlayer(i === 0 ? 'GK' : i < 6 ? 'DEF' : i < 14 ? 'MID' : 'FWD', chem, i))
      }
      const score = computeScoutEdgeScore(team, undefined, squad, baseOpts)
      expect(score.verdict).toBe(expected)
    }
  })

  it('still produces a score with an empty squad (graceful fallback)', () => {
    const team = makeTeam()
    const score = computeScoutEdgeScore(team, undefined, [], baseOpts)
    expect(score.breakdown).toHaveLength(6)
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
  })

  it('propagates dossierId and timestamps through unchanged', () => {
    const team = makeTeam()
    const score = computeScoutEdgeScore(team, undefined, makeSquad(), baseOpts)
    expect(score.dossierId).toBe('SCT-TST-T1-W01-2026')
    expect(score.lastUpdatedAt).toBe('2026-05-14T00:00:00.000Z')
    expect(score.signalCount).toBe(10)
    expect(score.sourceCount).toBe(2)
  })
})

describe('aggregateTeamSignals', () => {
  it('returns defaults when no intel data is present', () => {
    const { signalCount, sourceCount } = aggregateTeamSignals([
      makePlayer('FWD', 80, 0),
    ])
    expect(signalCount).toBe(32)
    expect(sourceCount).toBe(4)
  })

  it('sums signal counts and de-duplicates source types', () => {
    const p1: Player = {
      ...makePlayer('FWD', 80, 0),
      intelSignalCount: 5,
      recentSignals: [
        { type: 'training', text: 't', sourceType: 'player_profile' },
        { type: 'data', text: 'd', sourceType: 'derived_rule' },
      ],
    }
    const p2: Player = {
      ...makePlayer('MID', 80, 1),
      intelSignalCount: 3,
      recentSignals: [
        { type: 'quote', text: 'q', sourceType: 'player_profile' }, // duplicate source
        { type: 'data', text: 'd', sourceType: 'seo_article' },
      ],
    }
    const { signalCount, sourceCount } = aggregateTeamSignals([p1, p2])
    expect(signalCount).toBe(8)
    expect(sourceCount).toBe(3)
  })
})

describe('getISOWeek', () => {
  it('returns 1 for early January', () => {
    expect(getISOWeek(new Date(Date.UTC(2026, 0, 5)))).toBe(2) // Jan 5 2026 is week 2
    // Jan 1 2026 (Thursday) → ISO week 1
    expect(getISOWeek(new Date(Date.UTC(2026, 0, 1)))).toBe(1)
  })

  it('returns a value within 1-53', () => {
    for (let m = 0; m < 12; m++) {
      const w = getISOWeek(new Date(Date.UTC(2026, m, 15)))
      expect(w).toBeGreaterThanOrEqual(1)
      expect(w).toBeLessThanOrEqual(53)
    }
  })
})
