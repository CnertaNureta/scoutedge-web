/**
 * Career Arc — P10
 *
 * Pure, deterministic synthesis of a player's career rating trajectory and a
 * matched set of archetype comparables.
 *
 * WHY: Rating history is not a first-class field on the Player model. Until
 * a real `ratingHistory` ingest lands, this module synthesizes a plausible
 * curve from { age, rating, position } using a position-aware peak band and
 * a slug-seeded random walk. Comparables are hand-picked archetypes (not
 * per-player fabrications) matched by position group + age proximity.
 */
import type { Player } from '@/lib/types'
import { ratingToHundredScale } from './rating-scale'

export type CareerPhase =
  | 'ascending'
  | 'peaking'
  | 'declining'
  | 'transitioning'

export interface CareerPoint {
  age: number
  rating: number
}

export interface CareerComparable {
  name: string
  trait: string
  trajectory: CareerPoint[]
}

export interface CareerArcBreakdown {
  phase: CareerPhase
  trajectory: CareerPoint[]
  comparables: CareerComparable[] // 2-3
  signalCount: number
  sourceCount: number
}

// ── Constants ─────────────────────────────────────────────────
const RATING_MIN = 50
const RATING_MAX = 99
const FUTURE_HORIZON = 4
const TRAJECTORY_START_AGE = 16
const TRANSITION_BUFFER = 2
const COMPARABLE_TARGET_COUNT = 3
const COMPARABLE_MIN_COUNT = 2

/**
 * Position-aware peak bands. Player.position is a coarse enum
 * (GK / DEF / MID / FWD); we map to typical peak windows for each group.
 * These mirror the more granular bands described in the T9 brief but are
 * computed locally — DO NOT import from T9 (which may or may not land).
 */
const PEAK_BANDS: Record<Player['position'], { low: number; high: number }> = {
  GK: { low: 27, high: 34 },
  DEF: { low: 26, high: 32 },
  MID: { low: 24, high: 30 },
  FWD: { low: 24, high: 30 },
}

// ── Comparable archetype library ──────────────────────────────
type PositionGroup = Player['position']

interface ArchetypeSeed {
  name: string
  trait: string
  positions: PositionGroup[]
  peakAge: number
  peakRating: number
  retireAge: number
  shape: 'late-peak' | 'clean-exit' | 'sudden-decline' | 'extended-tail' | 'early-bloom' | 'slow-burn'
}

const ARCHETYPES: ArchetypeSeed[] = [
  {
    name: 'Modrić',
    trait: 'Sustained late peak',
    positions: ['MID'],
    peakAge: 32,
    peakRating: 93,
    retireAge: 38,
    shape: 'late-peak',
  },
  {
    name: 'Iniesta',
    trait: 'Clean exit at the top',
    positions: ['MID'],
    peakAge: 28,
    peakRating: 94,
    retireAge: 34,
    shape: 'clean-exit',
  },
  {
    name: 'Diego Costa',
    trait: 'Sudden decline after peak',
    positions: ['FWD'],
    peakAge: 27,
    peakRating: 88,
    retireAge: 33,
    shape: 'sudden-decline',
  },
  {
    name: 'Maldini',
    trait: 'Extended tail, slow fade',
    positions: ['DEF'],
    peakAge: 30,
    peakRating: 94,
    retireAge: 40,
    shape: 'extended-tail',
  },
  {
    name: 'Mbappé',
    trait: 'Early-bloom phenom',
    positions: ['FWD'],
    peakAge: 25,
    peakRating: 95,
    retireAge: 35,
    shape: 'early-bloom',
  },
  {
    name: 'Pirlo',
    trait: 'Slow-burn late-career conversion',
    positions: ['MID'],
    peakAge: 31,
    peakRating: 92,
    retireAge: 37,
    shape: 'slow-burn',
  },
  {
    name: 'Buffon',
    trait: 'Extended tail, calm fade',
    positions: ['GK'],
    peakAge: 30,
    peakRating: 94,
    retireAge: 41,
    shape: 'extended-tail',
  },
  {
    name: 'Casillas',
    trait: 'Clean exit after peak',
    positions: ['GK'],
    peakAge: 28,
    peakRating: 93,
    retireAge: 36,
    shape: 'clean-exit',
  },
]

// ── Helpers ───────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Deterministic 32-bit hash from a string (FNV-1a-ish).
 * Stable across runs and platforms.
 */
function hashSlug(slug: string): number {
  let hash = 2166136261
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i)
    // multiply with 32-bit overflow
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Mulberry32 PRNG seeded from a 32-bit integer.
 * Returns a function producing values in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function classifyPhase(age: number, position: Player['position']): CareerPhase {
  const band = PEAK_BANDS[position]
  if (age < band.low - TRANSITION_BUFFER) return 'ascending'
  if (age > band.high + TRANSITION_BUFFER) return 'declining'
  if (age >= band.low && age <= band.high) {
    // Within band: 'peaking' unless we're at the very edge.
    const nearLow = age - band.low < TRANSITION_BUFFER
    const nearHigh = band.high - age < TRANSITION_BUFFER
    if (nearLow || nearHigh) return 'transitioning'
    return 'peaking'
  }
  // Outside band but within buffer → transitioning
  return 'transitioning'
}

/**
 * Build a synthesized rating trajectory for a player.
 * Guarantees the trajectory's current-age point equals the normalized player rating.
 */
function buildTrajectory(player: Player): CareerPoint[] {
  const band = PEAK_BANDS[player.position]
  const currentAge = player.age
  const endAge = currentAge + FUTURE_HORIZON
  const rng = mulberry32(hashSlug(player.slug))
  const currentRating = ratingToHundredScale(player.rating)

  // Synthesize a peak rating slightly above current rating, capped at 99.
  const peakOffset = 2 + Math.floor(rng() * 6) // 2..7
  const synthesizedPeak = clamp(currentRating + peakOffset, RATING_MIN, RATING_MAX)
  const peakAge = clamp(
    Math.round((band.low + band.high) / 2),
    band.low,
    band.high,
  )

  const points: CareerPoint[] = []
  for (let age = TRAJECTORY_START_AGE; age <= endAge; age += 1) {
    let baseline: number
    if (age <= peakAge) {
      // Rising arc from ~RATING_MIN+10 toward peak
      const t = (age - TRAJECTORY_START_AGE) / Math.max(1, peakAge - TRAJECTORY_START_AGE)
      baseline = RATING_MIN + 10 + (synthesizedPeak - (RATING_MIN + 10)) * t
    } else {
      // Falling arc from peak toward ~peak - 15 by retirement
      const span = Math.max(1, endAge - peakAge)
      const t = (age - peakAge) / span
      baseline = synthesizedPeak - (synthesizedPeak - (RATING_MIN + 15)) * t * 0.4
    }
    const jitter = (rng() - 0.5) * 4 // ±2
    const rating = clamp(Math.round(baseline + jitter), RATING_MIN, RATING_MAX)
    points.push({ age, rating })
  }

  // Pin current-age point to the same 50-100 scale used by the chart.
  const currentIdx = points.findIndex((p) => p.age === currentAge)
  if (currentIdx >= 0) {
    points[currentIdx] = { age: currentAge, rating: currentRating }
  }

  return points
}

function buildComparableTrajectory(seed: ArchetypeSeed): CareerPoint[] {
  const points: CareerPoint[] = []
  const startAge = TRAJECTORY_START_AGE
  const endAge = seed.retireAge

  for (let age = startAge; age <= endAge; age += 1) {
    let rating: number
    if (age <= seed.peakAge) {
      const t = (age - startAge) / Math.max(1, seed.peakAge - startAge)
      rating = RATING_MIN + 10 + (seed.peakRating - (RATING_MIN + 10)) * t
    } else {
      const span = Math.max(1, endAge - seed.peakAge)
      const t = (age - seed.peakAge) / span
      switch (seed.shape) {
        case 'late-peak':
          rating = seed.peakRating - 4 * t
          break
        case 'clean-exit':
          rating = seed.peakRating - 6 * t
          break
        case 'sudden-decline':
          rating = seed.peakRating - 18 * t
          break
        case 'extended-tail':
          rating = seed.peakRating - 8 * t
          break
        case 'early-bloom':
          rating = seed.peakRating - 7 * t
          break
        case 'slow-burn':
          rating = seed.peakRating - 5 * t
          break
        default:
          rating = seed.peakRating - 8 * t
      }
    }
    points.push({ age, rating: clamp(Math.round(rating), RATING_MIN, RATING_MAX) })
  }
  return points
}

function pickComparables(player: Player): CareerComparable[] {
  // Filter by position group; rank by age proximity to player.age, then
  // by archetype name for stable ordering on ties.
  const sameGroup = ARCHETYPES.filter((a) => a.positions.includes(player.position))
  const ranked = [...sameGroup].sort((a, b) => {
    const aDist = Math.abs(a.peakAge - player.age)
    const bDist = Math.abs(b.peakAge - player.age)
    if (aDist !== bDist) return aDist - bDist
    return a.name.localeCompare(b.name)
  })

  // Take up to 3; ensure at least 2 by falling back to other groups if needed.
  const picks: ArchetypeSeed[] = ranked.slice(0, COMPARABLE_TARGET_COUNT)
  if (picks.length < COMPARABLE_MIN_COUNT) {
    const others = ARCHETYPES.filter((a) => !a.positions.includes(player.position))
    const padded = [...others].sort((a, b) => {
      const aDist = Math.abs(a.peakAge - player.age)
      const bDist = Math.abs(b.peakAge - player.age)
      if (aDist !== bDist) return aDist - bDist
      return a.name.localeCompare(b.name)
    })
    while (picks.length < COMPARABLE_MIN_COUNT && padded.length > 0) {
      const next = padded.shift()
      if (next) picks.push(next)
    }
  }

  return picks.map((seed) => ({
    name: seed.name,
    trait: seed.trait,
    trajectory: buildComparableTrajectory(seed),
  }))
}

/**
 * Pure compute function — exported for unit testing.
 * Returns a deterministic career-arc breakdown for a player.
 */
export function computeCareerArc(player: Player): CareerArcBreakdown {
  const phase = classifyPhase(player.age, player.position)
  const trajectory = buildTrajectory(player)
  const comparables = pickComparables(player)

  return {
    phase,
    trajectory,
    comparables,
    signalCount: trajectory.length,
    sourceCount: comparables.length,
  }
}
