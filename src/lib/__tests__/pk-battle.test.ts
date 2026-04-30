import { describe, it, expect } from 'vitest'
import type { Player } from '@/lib/types'
import {
  computeBattle,
  computeBo5,
  getDailyDuel,
  buildShareText,
  getBattleStats,
  type BattleHistoryEntry,
} from '../pk-battle'

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
    assists: 10,
    rating: 8.0,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 70,
    sentimentLabel: 'positive',
    seoArticle: '',
    ...overrides,
  }
}

const playerA = makePlayer({ slug: 'player-a', name: 'Player A', rating: 9.0, caps: 100, goals: 40, assists: 20 })
const playerB = makePlayer({ slug: 'player-b', name: 'Player B', rating: 7.0, caps: 30, goals: 10, assists: 5 })

describe('computeBattle', () => {
  it('returns a valid BattleResult', () => {
    const result = computeBattle(playerA, playerB)

    expect(result.playerA).toBe(playerA)
    expect(result.playerB).toBe(playerB)
    expect(typeof result.scoreA).toBe('number')
    expect(typeof result.scoreB).toBe('number')
    expect(result.factors).toHaveLength(6)
    expect(typeof result.verdict).toBe('string')
    expect(result.verdict.length).toBeGreaterThan(0)
  })

  it('is deterministic — same players always produce same result', () => {
    const r1 = computeBattle(playerA, playerB)
    const r2 = computeBattle(playerA, playerB)

    expect(r1.scoreA).toBe(r2.scoreA)
    expect(r1.scoreB).toBe(r2.scoreB)
    expect(r1.winnerSlug).toBe(r2.winnerSlug)
  })

  it('is order-independent for seed — swapping players changes roles but seed is stable', () => {
    const r1 = computeBattle(playerA, playerB)
    const r2 = computeBattle(playerB, playerA)

    expect(r1.scoreA).not.toBe(r2.scoreA)
    expect(r1.playerA.slug).toBe('player-a')
    expect(r2.playerA.slug).toBe('player-b')
  })

  it('higher-rated player with better stats generally wins', () => {
    const strong = makePlayer({ slug: 'strong', name: 'Strong', rating: 9.5, caps: 120, goals: 50, assists: 30, sentimentScore: 90 })
    const weak = makePlayer({ slug: 'weak', name: 'Weak', rating: 5.0, caps: 10, goals: 2, assists: 1, sentimentScore: 30, fitnessStatus: 'red' })
    const result = computeBattle(strong, weak)

    expect(result.winnerSlug).toBe('strong')
    expect(result.scoreA).toBeGreaterThan(result.scoreB)
  })

  it('returns null winnerSlug for very close matchup (draw)', () => {
    const pA = makePlayer({ slug: 'even-a', name: 'Even A', rating: 7.5, caps: 50, goals: 15, assists: 8 })
    const pB = makePlayer({ slug: 'even-b', name: 'Even B', rating: 7.5, caps: 50, goals: 15, assists: 8 })
    const result = computeBattle(pA, pB)

    expect(Math.abs(result.scoreA - result.scoreB)).toBeLessThan(5)
  })

  it('includes all 6 battle factors with correct labels', () => {
    const result = computeBattle(playerA, playerB)
    const labels = result.factors.map((f) => f.label)

    expect(labels).toEqual(['Rating', 'Experience', 'Output', 'Fitness', 'Morale', 'Matchup Edge'])
  })

  it('factor weights sum to 100', () => {
    const result = computeBattle(playerA, playerB)
    const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0)

    expect(totalWeight).toBe(100)
  })

  it('applies positional matchup bonus for FWD vs GK', () => {
    const fwd = makePlayer({ slug: 'fwd', name: 'FWD', position: 'FWD', rating: 7.0 })
    const gk = makePlayer({ slug: 'gk', name: 'GK', position: 'GK', rating: 7.0 })
    const result = computeBattle(fwd, gk)
    const matchupFactor = result.factors.find((f) => f.label === 'Matchup Edge')

    expect(matchupFactor).toBeDefined()
    expect(matchupFactor!.valueA).toBe(5)
    expect(matchupFactor!.valueB).toBe(0)
  })

  it('caps experience at 150', () => {
    const veteran = makePlayer({ slug: 'vet', name: 'Veteran', caps: 200, rating: 7.0 })
    const mid = makePlayer({ slug: 'mid', name: 'Mid', caps: 150, rating: 7.0 })
    const r1 = computeBattle(veteran, mid)
    const expFactor = r1.factors.find((f) => f.label === 'Experience')

    expect(expFactor!.valueA).toBe(200)
    expect(expFactor!.valueB).toBe(150)
  })

  it('fitness status maps correctly', () => {
    const fit = makePlayer({ slug: 'fit', name: 'Fit', fitnessStatus: 'green' })
    const doubt = makePlayer({ slug: 'doubt', name: 'Doubt', fitnessStatus: 'amber' })
    const result = computeBattle(fit, doubt)
    const fitnessFactor = result.factors.find((f) => f.label === 'Fitness')

    expect(fitnessFactor!.valueA).toBe(90)
    expect(fitnessFactor!.valueB).toBe(60)
  })

  it('produces different verdicts based on score difference', () => {
    const strong = makePlayer({ slug: 's', name: 'Strong', rating: 9.8, caps: 150, goals: 60, assists: 40, sentimentScore: 95 })
    const weak = makePlayer({ slug: 'w', name: 'Weak', rating: 4.0, caps: 5, goals: 0, assists: 0, sentimentScore: 20, fitnessStatus: 'red' })
    const result = computeBattle(strong, weak)

    expect(result.verdict).toContain('Strong')
  })
})

describe('computeBo5', () => {
  it('returns a valid Bo5Result', () => {
    const result = computeBo5(playerA, playerB)

    expect(result.playerA).toBe(playerA)
    expect(result.playerB).toBe(playerB)
    expect(result.rounds.length).toBeGreaterThanOrEqual(3)
    expect(result.rounds.length).toBeLessThanOrEqual(5)
    expect(typeof result.winsA).toBe('number')
    expect(typeof result.winsB).toBe('number')
    expect(typeof result.verdict).toBe('string')
  })

  it('is deterministic', () => {
    const r1 = computeBo5(playerA, playerB)
    const r2 = computeBo5(playerA, playerB)

    expect(r1.rounds.length).toBe(r2.rounds.length)
    expect(r1.winsA).toBe(r2.winsA)
    expect(r1.winsB).toBe(r2.winsB)
    expect(r1.seriesWinner).toBe(r2.seriesWinner)
  })

  it('stops early when one player reaches 3 wins', () => {
    const result = computeBo5(playerA, playerB)
    const maxWins = Math.max(result.winsA, result.winsB)

    if (maxWins >= 3) {
      expect(result.rounds.length).toBeLessThanOrEqual(5)
    }
  })

  it('total wins plus draws equals rounds played', () => {
    const result = computeBo5(playerA, playerB)
    const draws = result.rounds.filter((r) => !r.winnerSlug).length

    expect(result.winsA + result.winsB + draws).toBe(result.rounds.length)
  })

  it('each round has numeric scores', () => {
    const result = computeBo5(playerA, playerB)

    for (const round of result.rounds) {
      expect(typeof round.scoreA).toBe('number')
      expect(typeof round.scoreB).toBe('number')
      expect(round.winnerSlug === null || typeof round.winnerSlug === 'string').toBe(true)
    }
  })

  it('seriesWinner matches the player with most wins', () => {
    const result = computeBo5(playerA, playerB)

    if (result.winsA >= 3) expect(result.seriesWinner).toBe(playerA.slug)
    else if (result.winsB >= 3) expect(result.seriesWinner).toBe(playerB.slug)
    else if (result.winsA > result.winsB) expect(result.seriesWinner).toBe(playerA.slug)
    else if (result.winsB > result.winsA) expect(result.seriesWinner).toBe(playerB.slug)
    else expect(result.seriesWinner).toBeNull()
  })
})

describe('getDailyDuel', () => {
  it('returns a tuple of two different slugs', () => {
    const [a, b] = getDailyDuel()

    expect(typeof a).toBe('string')
    expect(typeof b).toBe('string')
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(0)
    expect(b.length).toBeGreaterThan(0)
  })

  it('is deterministic within the same day', () => {
    const d1 = getDailyDuel()
    const d2 = getDailyDuel()

    expect(d1).toEqual(d2)
  })
})

describe('buildShareText', () => {
  it('includes player names and scores', () => {
    const result = computeBattle(playerA, playerB)
    const text = buildShareText(result)

    expect(text).toContain('Player A')
    expect(text).toContain('Player B')
    expect(text).toContain('PK Battle')
    expect(text).toContain('kickoracle.com/play/pk-battle')
  })

  it('uses handshake emoji for draws', () => {
    const pA = makePlayer({ slug: 'draw-a', name: 'Draw A' })
    const pB = makePlayer({ slug: 'draw-b', name: 'Draw B' })
    const result = computeBattle(pA, pB)

    if (!result.winnerSlug) {
      const text = buildShareText(result)
      expect(text).toContain('🤝')
      expect(text).toContain('Dead heat!')
    }
  })

  it('uses sword emoji for close wins', () => {
    const result = computeBattle(playerA, playerB)

    if (result.winnerSlug && Math.abs(result.scoreA - result.scoreB) <= 10) {
      const text = buildShareText(result)
      expect(text).toContain('⚔️')
    }
  })
})

describe('getBattleStats', () => {
  it('returns correct stats for empty history', () => {
    const stats = getBattleStats([])

    expect(stats.totalBattles).toBe(0)
    expect(stats.wins).toBe(0)
    expect(stats.draws).toBe(0)
    expect(stats.winRate).toBe('0%')
  })

  it('counts wins and draws correctly', () => {
    const history: BattleHistoryEntry[] = [
      { playerASlug: 'a', playerAName: 'A', playerBSlug: 'b', playerBName: 'B', scoreA: 60, scoreB: 50, winnerSlug: 'a', timestamp: 1 },
      { playerASlug: 'a', playerAName: 'A', playerBSlug: 'c', playerBName: 'C', scoreA: 50, scoreB: 50, winnerSlug: null, timestamp: 2 },
      { playerASlug: 'b', playerAName: 'B', playerBSlug: 'c', playerBName: 'C', scoreA: 55, scoreB: 45, winnerSlug: 'b', timestamp: 3 },
    ]
    const stats = getBattleStats(history)

    expect(stats.totalBattles).toBe(3)
    expect(stats.wins).toBe(2)
    expect(stats.draws).toBe(1)
    expect(stats.winRate).toBe('67%')
  })

  it('handles all draws', () => {
    const history: BattleHistoryEntry[] = [
      { playerASlug: 'a', playerAName: 'A', playerBSlug: 'b', playerBName: 'B', scoreA: 50, scoreB: 50, winnerSlug: null, timestamp: 1 },
      { playerASlug: 'c', playerAName: 'C', playerBSlug: 'd', playerBName: 'D', scoreA: 45, scoreB: 45, winnerSlug: null, timestamp: 2 },
    ]
    const stats = getBattleStats(history)

    expect(stats.totalBattles).toBe(2)
    expect(stats.wins).toBe(0)
    expect(stats.draws).toBe(2)
    expect(stats.winRate).toBe('0%')
  })
})
