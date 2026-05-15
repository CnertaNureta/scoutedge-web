import { describe, expect, it } from 'vitest'
import {
  computePressBoxBrief,
  PRESS_BOX_BRIEF_INTERNAL,
} from '../press-box-brief'
import type { Team, Player, MarketIntelData } from '@/lib/types'

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'brazil',
    name: 'Brazil',
    flag: '🇧🇷',
    group: 'C',
    confederation: 'CONMEBOL',
    fifaRanking: 5,
    coachName: 'Dorival Júnior',
    chemistry: 84,
    familiarity: 78,
    stability: 72,
    morale: 80,
    archetypeMatch: 'transition pressers',
    keyInsight: '',
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
    age: 28,
    club: 'Test FC',
    caps: 60,
    goals: 10,
    assists: 12,
    rating: 82,
    fitnessStatus: 'green',
    fitnessNote: 'Sharp.',
    sentimentScore: 70,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

function makeMarketIntel(): MarketIntelData {
  return {
    tournamentPrices: [],
    averageOdds: 5.5,
    impliedProbability: 0.18,
    movement: 'stable',
    modelEdge: {
      ourProbability: 0.22,
      marketProbability: 0.18,
      edge: 0.04,
      bestOdds: 6.0,
      bestSource: 'Pinnacle',
      signalStrength: 'moderate',
    },
  }
}

const samplePlayers: Player[] = [
  makePlayer({ slug: 'vinicius', name: 'Vinícius Jr', goals: 18, rating: 91, position: 'FWD' }),
  makePlayer({ slug: 'rodrygo', name: 'Rodrygo', goals: 12, rating: 86, position: 'FWD' }),
  makePlayer({ slug: 'casemiro', name: 'Casemiro', goals: 4, rating: 84, position: 'MID' }),
  makePlayer({ slug: 'marquinhos', name: 'Marquinhos', goals: 2, rating: 87, position: 'DEF' }),
]

describe('computePressBoxBrief — shape', () => {
  it('produces exactly 4 bullets', () => {
    const result = computePressBoxBrief(makeTeam(), samplePlayers)
    expect(result.bullets).toHaveLength(PRESS_BOX_BRIEF_INTERNAL.BULLET_COUNT)
    expect(result.bullets).toHaveLength(4)
  })

  it('every bullet has non-empty text and a templateId', () => {
    const result = computePressBoxBrief(makeTeam(), samplePlayers)
    for (const bullet of result.bullets) {
      expect(bullet.templateId.length).toBeGreaterThan(0)
      expect(bullet.text.length).toBeGreaterThan(0)
    }
  })

  it('weekLabel matches the WK\\d+ · 2026 pattern', () => {
    const result = computePressBoxBrief(makeTeam(), samplePlayers)
    expect(result.weekLabel).toMatch(/^WK\d+ · 2026$/)
  })

  it('signalCount and sourceCount are positive', () => {
    const result = computePressBoxBrief(makeTeam(), samplePlayers)
    expect(result.signalCount).toBeGreaterThan(0)
    expect(result.sourceCount).toBeGreaterThan(0)
  })
})

describe('computePressBoxBrief — determinism', () => {
  it('same team slug produces identical bullets', () => {
    const a = computePressBoxBrief(makeTeam(), samplePlayers)
    const b = computePressBoxBrief(makeTeam(), samplePlayers)
    expect(a.bullets).toEqual(b.bullets)
    expect(a.weekLabel).toBe(b.weekLabel)
  })

  it('different team slugs produce different bullet selections or fills', () => {
    const a = computePressBoxBrief(makeTeam({ slug: 'brazil', name: 'Brazil' }), samplePlayers)
    const b = computePressBoxBrief(
      makeTeam({ slug: 'argentina', name: 'Argentina', coachName: 'Lionel Scaloni' }),
      samplePlayers,
    )
    const aKey = a.bullets.map((x) => `${x.templateId}|${x.text}`).join('::')
    const bKey = b.bullets.map((x) => `${x.templateId}|${x.text}`).join('::')
    expect(aKey).not.toBe(bKey)
  })
})

describe('computePressBoxBrief — template substitution', () => {
  it('at least one bullet contains the team name', () => {
    const result = computePressBoxBrief(makeTeam(), samplePlayers)
    const teamMentions = result.bullets.filter((b) => b.text.includes('Brazil'))
    expect(teamMentions.length).toBeGreaterThan(0)
  })

  it('no rendered bullet contains an unresolved {placeholder}', () => {
    const result = computePressBoxBrief(makeTeam(), samplePlayers, makeMarketIntel())
    for (const bullet of result.bullets) {
      expect(bullet.text).not.toMatch(/\{[a-zA-Z]+\}/)
    }
  })
})

describe('computePressBoxBrief — market integration', () => {
  it('marketIntel presence is reflected in sourceCount', () => {
    const withMarket = computePressBoxBrief(makeTeam(), samplePlayers, makeMarketIntel())
    const withoutMarket = computePressBoxBrief(makeTeam(), samplePlayers, null)
    expect(withMarket.sourceCount).toBeGreaterThanOrEqual(withoutMarket.sourceCount)
  })
})

describe('computePressBoxBrief — low-data resilience', () => {
  it('still produces 4 bullets when player list is empty', () => {
    const result = computePressBoxBrief(makeTeam(), [])
    expect(result.bullets).toHaveLength(4)
    for (const bullet of result.bullets) {
      expect(bullet.text.length).toBeGreaterThan(0)
      expect(bullet.text).not.toMatch(/\{[a-zA-Z]+\}/)
    }
  })

  it('handles a single-player team without crashing', () => {
    const result = computePressBoxBrief(makeTeam(), [makePlayer()])
    expect(result.bullets).toHaveLength(4)
  })
})
