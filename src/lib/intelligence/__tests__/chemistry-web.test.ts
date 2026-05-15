import { describe, expect, it } from 'vitest'
import { computeChemistryWeb } from '../chemistry-web'
import type { Player, Team } from '@/lib/types'

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    slug: 'test-team',
    name: 'Test Team',
    flag: '🏳️',
    group: 'A',
    confederation: 'UEFA',
    fifaRanking: 1,
    coachName: 'Test Coach',
    chemistry: 80,
    familiarity: 80,
    stability: 80,
    morale: 80,
    archetypeMatch: '',
    keyInsight: '',
    seoArticle: '',
    ...overrides,
  }
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    slug: 'p-default',
    name: 'Default Player',
    teamSlug: 'test-team',
    position: 'MID',
    number: 8,
    age: 27,
    club: 'Default FC',
    caps: 50,
    goals: 5,
    assists: 5,
    rating: 80,
    fitnessStatus: 'green',
    fitnessNote: '',
    sentimentScore: 60,
    sentimentLabel: 'neutral',
    seoArticle: '',
    ...overrides,
  }
}

function makeRoster(size: number): Player[] {
  return Array.from({ length: size }, (_, idx) => {
    const positions: Player['position'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD']
    return makePlayer({
      slug: `p-${idx}`,
      name: `Player ${idx}`,
      number: idx + 1,
      position: positions[idx % positions.length],
      age: 22 + (idx % 10),
      club: `Club ${idx % 4}`,
      rating: 70 + (idx % 20),
    })
  })
}

describe('computeChemistryWeb — shape & bounds', () => {
  it('caps nodes at 11 even with bigger rosters', () => {
    const players = makeRoster(23)
    const { nodes } = computeChemistryWeb(makeTeam(), players)
    expect(nodes.length).toBeLessThanOrEqual(11)
    expect(nodes.length).toBe(11)
  })

  it('all edge scores live in [0, 1]', () => {
    const { edges } = computeChemistryWeb(makeTeam(), makeRoster(11))
    for (const edge of edges) {
      expect(edge.score).toBeGreaterThanOrEqual(0)
      expect(edge.score).toBeLessThanOrEqual(1)
    }
  })

  it('produces a complete graph among picked nodes', () => {
    const { nodes, edges } = computeChemistryWeb(makeTeam(), makeRoster(11))
    expect(edges.length).toBe((nodes.length * (nodes.length - 1)) / 2)
  })

  it('returns 3 strongest pairs when enough players exist', () => {
    const { strongestPairs } = computeChemistryWeb(makeTeam(), makeRoster(11))
    expect(strongestPairs.length).toBe(3)
  })

  it('returns fewer strongest pairs when very few players exist', () => {
    const tiny = makeRoster(2)
    const { strongestPairs } = computeChemistryWeb(makeTeam(), tiny)
    expect(strongestPairs.length).toBe(1)
  })

  it('strongest pairs are sorted descending by score', () => {
    const { strongestPairs } = computeChemistryWeb(makeTeam(), makeRoster(11))
    for (let i = 1; i < strongestPairs.length; i++) {
      expect(strongestPairs[i - 1].score).toBeGreaterThanOrEqual(strongestPairs[i].score)
    }
  })

  it('nodes have x and y coordinates in [0, 1]', () => {
    const { nodes } = computeChemistryWeb(makeTeam(), makeRoster(11))
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(1)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(1)
    }
  })
})

describe('computeChemistryWeb — determinism & rules', () => {
  it('same input yields identical breakdown', () => {
    const team = makeTeam()
    const roster = makeRoster(11)
    const first = computeChemistryWeb(team, roster)
    const second = computeChemistryWeb(team, roster)
    expect(second).toEqual(first)
  })

  it('two players in same club score higher than two in different clubs (all else equal)', () => {
    const baseA = makePlayer({
      slug: 'a',
      name: 'A',
      number: 1,
      position: 'MID',
      age: 27,
      club: 'Shared FC',
      rating: 80,
    })
    const baseB = makePlayer({
      slug: 'b',
      name: 'B',
      number: 2,
      position: 'MID',
      age: 27,
      club: 'Shared FC',
      rating: 80,
    })
    const baseC = makePlayer({
      slug: 'c',
      name: 'C',
      number: 3,
      position: 'MID',
      age: 27,
      club: 'Other FC',
      rating: 80,
    })

    const { edges: sharedEdges } = computeChemistryWeb(makeTeam(), [baseA, baseB])
    const { edges: differentEdges } = computeChemistryWeb(makeTeam(), [baseA, baseC])

    expect(sharedEdges[0].score).toBeGreaterThan(differentEdges[0].score)
  })

  it('adjacent position lines (MID-FWD) score higher than non-adjacent (GK-FWD)', () => {
    const mid = makePlayer({
      slug: 'mid',
      name: 'M',
      number: 8,
      position: 'MID',
      age: 27,
      club: 'Club X',
      rating: 80,
    })
    const fwd = makePlayer({
      slug: 'fwd',
      name: 'F',
      number: 9,
      position: 'FWD',
      age: 27,
      club: 'Club Y',
      rating: 80,
    })
    const gk = makePlayer({
      slug: 'gk',
      name: 'G',
      number: 1,
      position: 'GK',
      age: 27,
      club: 'Club Z',
      rating: 80,
    })

    const adjacent = computeChemistryWeb(makeTeam(), [mid, fwd])
    const nonAdjacent = computeChemistryWeb(makeTeam(), [gk, fwd])

    expect(adjacent.edges[0].score).toBeGreaterThan(nonAdjacent.edges[0].score)
  })
})

describe('computeChemistryWeb — edge cases', () => {
  it('empty roster yields no nodes or edges without crashing', () => {
    const result = computeChemistryWeb(makeTeam(), [])
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
    expect(result.strongestPairs).toEqual([])
    expect(result.signalCount).toBe(0)
    expect(result.sourceCount).toBe(0)
  })
})
