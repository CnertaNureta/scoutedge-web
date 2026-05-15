/**
 * Chemistry Web — v1
 *
 * Pure, deterministic synthesis of pairwise chemistry scores among a team's
 * starting eleven. Outputs a force-graph payload (nodes + edges) that the
 * UI renders as an inline SVG. No runtime simulation — node positions are
 * pre-computed per position line so the layout is stable across renders.
 *
 * Real implementation will ingest pairwise SCA / xT-on counts from FBref;
 * v1 synthesizes edges from existing roster fields only.
 */
import type { Player, Team } from '@/lib/types'

export type ChemistryLine = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface ChemistryNode {
  playerId: string
  playerName: string
  number: number
  position: string
  line: ChemistryLine
  x: number // 0..1 normalized
  y: number // 0..1 normalized
}

export interface ChemistryEdge {
  a: string // playerId
  b: string // playerId
  score: number // 0..1
}

export interface ChemistryWebBreakdown {
  nodes: ChemistryNode[] // up to 11
  edges: ChemistryEdge[] // all pairs; component filters by threshold for rendering
  strongestPairs: ChemistryEdge[] // top 3
  signalCount: number
  sourceCount: number
}

// ── Tunables ───────────────────────────────────────────────────────────
const MAX_STARTERS = 11
const STRONGEST_PAIR_COUNT = 3
const SAME_LINE_BONUS = 0.4
const ADJACENT_LINE_BONUS = 0.3
const SAME_CLUB_BONUS = 0.4
const AGE_PROXIMITY_BONUS = 0.2
const AGE_PROXIMITY_YEARS = 3
const RATING_BOOST_WEIGHT = 0.1

// Adjacency map between position lines.
const ADJACENT_LINES: Record<ChemistryLine, ReadonlyArray<ChemistryLine>> = {
  GK: ['DEF'],
  DEF: ['GK', 'MID'],
  MID: ['DEF', 'FWD'],
  FWD: ['MID'],
}

const LINE_ORDER: ReadonlyArray<ChemistryLine> = ['GK', 'DEF', 'MID', 'FWD']

// Horizontal column positions per line (x in 0..1).
const LINE_X: Record<ChemistryLine, number> = {
  GK: 0.08,
  DEF: 0.32,
  MID: 0.6,
  FWD: 0.88,
}

function clamp01(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function pickStarters(players: ReadonlyArray<Player>): Player[] {
  // Sort descending by rating so we pick the strongest XI deterministically.
  // Tie-break on slug to keep the ordering stable.
  const sorted = [...players].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating
    return a.slug.localeCompare(b.slug)
  })
  return sorted.slice(0, MAX_STARTERS)
}

function layoutNode(player: Player, indexInLine: number, totalInLine: number): ChemistryNode {
  const line = player.position as ChemistryLine
  const x = LINE_X[line] ?? 0.5
  // Distribute players vertically within their column. Single players center.
  const y = totalInLine === 1 ? 0.5 : 0.12 + (indexInLine * 0.76) / (totalInLine - 1)
  return {
    playerId: player.slug,
    playerName: player.name,
    number: player.number,
    position: player.position,
    line,
    x,
    y,
  }
}

function buildNodes(starters: ReadonlyArray<Player>): ChemistryNode[] {
  const grouped: Record<ChemistryLine, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const player of starters) {
    const line = (player.position as ChemistryLine) in grouped ? (player.position as ChemistryLine) : 'MID'
    grouped[line].push(player)
  }

  const nodes: ChemistryNode[] = []
  for (const line of LINE_ORDER) {
    const group = grouped[line]
    // Stable order within a column: by jersey number, then slug.
    group.sort((a, b) => {
      if (a.number !== b.number) return a.number - b.number
      return a.slug.localeCompare(b.slug)
    })
    group.forEach((player, idx) => {
      nodes.push(layoutNode(player, idx, group.length))
    })
  }
  return nodes
}

function computePairScore(a: Player, b: Player): number {
  // WHY: Stub edges derived from position adjacency + shared-club + age proximity, pending real SCA/xT-on ingest.
  let score = 0

  const lineA = a.position as ChemistryLine
  const lineB = b.position as ChemistryLine

  if (lineA === lineB) {
    score += SAME_LINE_BONUS
  } else if (ADJACENT_LINES[lineA]?.includes(lineB)) {
    score += ADJACENT_LINE_BONUS
  }

  if (a.club && b.club && a.club === b.club) {
    score += SAME_CLUB_BONUS
  }

  if (Math.abs(a.age - b.age) <= AGE_PROXIMITY_YEARS) {
    score += AGE_PROXIMITY_BONUS
  }

  const minRating = Math.min(a.rating, b.rating)
  score += (RATING_BOOST_WEIGHT * minRating) / 100

  return clamp01(score)
}

function buildEdges(starters: ReadonlyArray<Player>): ChemistryEdge[] {
  const edges: ChemistryEdge[] = []
  for (let i = 0; i < starters.length; i++) {
    for (let j = i + 1; j < starters.length; j++) {
      const a = starters[i]
      const b = starters[j]
      edges.push({
        a: a.slug,
        b: b.slug,
        score: computePairScore(a, b),
      })
    }
  }
  return edges
}

function pickStrongestPairs(edges: ReadonlyArray<ChemistryEdge>): ChemistryEdge[] {
  return [...edges]
    .sort((p, q) => {
      if (q.score !== p.score) return q.score - p.score
      // Deterministic tie-break: lexicographic on (a, b).
      const aKey = `${p.a}|${p.b}`
      const bKey = `${q.a}|${q.b}`
      return aKey.localeCompare(bKey)
    })
    .slice(0, STRONGEST_PAIR_COUNT)
}

export function computeChemistryWeb(_team: Team, players: ReadonlyArray<Player>): ChemistryWebBreakdown {
  if (!players || players.length === 0) {
    return {
      nodes: [],
      edges: [],
      strongestPairs: [],
      signalCount: 0,
      sourceCount: 0,
    }
  }

  const starters = pickStarters(players)
  const nodes = buildNodes(starters)
  const edges = buildEdges(starters)
  const strongestPairs = pickStrongestPairs(edges)

  return {
    nodes,
    edges,
    strongestPairs,
    signalCount: edges.length,
    sourceCount: starters.length,
  }
}
