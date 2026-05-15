/**
 * Big-Game Footprint — v1
 *
 * Pure, deterministic synthesis of a player's per-match performance ledger in
 * high-stakes fixtures (knockouts, finals, group deciders, friendlies).
 *
 * WHY: Real FBref / Opta big-game ingest is pending. Until it lands, this
 * module synthesizes 8-12 historical appearances from { slug, age, rating,
 * position, caps, goals } using a deterministic slug seed. Elite players
 * (rating ≥ 85) bias toward higher big-game ratings; younger/lower-rated
 * players get mixed distributions. The synthesis is stable across runs so
 * the UI never flickers.
 */
import type { Player } from '@/lib/types'
import { ratingToHundredScale } from './rating-scale'

export type BigGameStage =
  | 'final'
  | 'semi'
  | 'quarter'
  | 'r16'
  | 'groupDecider'
  | 'friendly'

export interface BigGameAppearance {
  matchId: string
  ageAtMatch: number
  opponentSlug: string
  opponentName: string
  stage: BigGameStage
  performanceRating: number // 0-10
  goals: number
  assists: number
}

export type BigGameVerdict = 'rises' | 'steady' | 'fades'

export interface BigGameFootprintBreakdown {
  appearances: BigGameAppearance[]
  meanRating: number
  bestPerformance: BigGameAppearance | null
  bigGameVerdict: BigGameVerdict
  signalCount: number
  sourceCount: number
}

// ── Tunables ──────────────────────────────────────────────────
const APPEARANCE_MIN = 8
const APPEARANCE_MAX = 12
const RATING_MIN = 0
const RATING_MAX = 10
const ELITE_RATING_THRESHOLD = 85
const VERDICT_RISES_THRESHOLD = 7.5
const VERDICT_FADES_THRESHOLD = 5.5
const PLAYER_CAREER_DEBUT_AGE = 17

// ── Opponent pool (deterministic, stable order) ───────────────
interface OpponentSeed {
  slug: string
  name: string
}

const OPPONENT_POOL: OpponentSeed[] = [
  { slug: 'brazil', name: 'Brazil' },
  { slug: 'argentina', name: 'Argentina' },
  { slug: 'france', name: 'France' },
  { slug: 'germany', name: 'Germany' },
  { slug: 'spain', name: 'Spain' },
  { slug: 'england', name: 'England' },
  { slug: 'portugal', name: 'Portugal' },
  { slug: 'netherlands', name: 'Netherlands' },
  { slug: 'belgium', name: 'Belgium' },
  { slug: 'italy', name: 'Italy' },
  { slug: 'croatia', name: 'Croatia' },
  { slug: 'uruguay', name: 'Uruguay' },
  { slug: 'morocco', name: 'Morocco' },
  { slug: 'japan', name: 'Japan' },
  { slug: 'mexico', name: 'Mexico' },
  { slug: 'usa', name: 'USA' },
]

const STAGE_POOL: BigGameStage[] = [
  'final',
  'semi',
  'quarter',
  'r16',
  'groupDecider',
  'friendly',
]

// ── Helpers ───────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hashSlug(slug: string): number {
  let hash = 2166136261
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

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

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * Bias the baseline performance rating from player.rating.
 * Maps a 50-99 normalized rating onto a 5.0-8.5 big-game baseline.
 */
function ratingBaseline(player: Player): number {
  const clampedRating = clamp(ratingToHundredScale(player.rating), 50, 99)
  const normalized = (clampedRating - 50) / 49 // 0..1
  return 5 + normalized * 3.5 // 5.0 .. 8.5
}

/**
 * Position-specific goal-likelihood multiplier. FWDs convert; defenders score
 * rarely. Used to scale the per-match goal probability.
 */
function goalLikelihood(position: Player['position']): number {
  switch (position) {
    case 'FWD':
      return 0.45
    case 'MID':
      return 0.18
    case 'DEF':
      return 0.06
    case 'GK':
    default:
      return 0.0
  }
}

function assistLikelihood(position: Player['position']): number {
  switch (position) {
    case 'MID':
      return 0.3
    case 'FWD':
      return 0.18
    case 'DEF':
      return 0.08
    case 'GK':
    default:
      return 0.0
  }
}

function pickOpponent(rng: () => number, used: Set<string>): OpponentSeed {
  // Try up to N times to avoid duplicates; fall back to first available.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const idx = Math.floor(rng() * OPPONENT_POOL.length)
    const seed = OPPONENT_POOL[idx]
    if (!used.has(seed.slug)) {
      used.add(seed.slug)
      return seed
    }
  }
  const fallback = OPPONENT_POOL.find((o) => !used.has(o.slug)) ?? OPPONENT_POOL[0]
  used.add(fallback.slug)
  return fallback
}

function pickStage(rng: () => number): BigGameStage {
  const idx = Math.floor(rng() * STAGE_POOL.length)
  return STAGE_POOL[idx]
}

function classifyVerdict(mean: number): BigGameVerdict {
  if (mean >= VERDICT_RISES_THRESHOLD) return 'rises'
  if (mean < VERDICT_FADES_THRESHOLD) return 'fades'
  return 'steady'
}

/**
 * Pure compute function — exported for unit testing.
 * Returns a deterministic big-game footprint for a player.
 */
export function computeBigGameFootprint(player: Player): BigGameFootprintBreakdown {
  const rng = mulberry32(hashSlug(player.slug))
  const baseline = ratingBaseline(player)
  const isElite = ratingToHundredScale(player.rating) >= ELITE_RATING_THRESHOLD
  const goalRate = goalLikelihood(player.position)
  const assistRate = assistLikelihood(player.position)

  // Number of appearances: 8..12, deterministic from slug.
  const count = APPEARANCE_MIN + Math.floor(rng() * (APPEARANCE_MAX - APPEARANCE_MIN + 1))

  // Spread appearances across the player's career window: from debut to current age.
  const debutAge = Math.max(PLAYER_CAREER_DEBUT_AGE, player.age - 10)
  const ageSpan = Math.max(1, player.age - debutAge)

  const usedOpponents = new Set<string>()
  const appearances: BigGameAppearance[] = []

  for (let i = 0; i < count; i += 1) {
    // Age progression — sorted chronologically by index.
    const ageAtMatch = clamp(
      Math.round(debutAge + (i / Math.max(1, count - 1)) * ageSpan),
      PLAYER_CAREER_DEBUT_AGE,
      player.age,
    )

    const opponent = pickOpponent(rng, usedOpponents)
    const stage = pickStage(rng)

    // Jitter around baseline. Elite players get a tighter, higher-biased band;
    // others get a wider, mixed-result distribution.
    const jitterMagnitude = isElite ? 1.2 : 2.0
    const jitter = (rng() - 0.5) * 2 * jitterMagnitude
    const eliteBoost = isElite ? 0.6 : 0
    // Stage matters: finals/semis carry slightly higher pressure variance.
    const stagePressure =
      stage === 'final' || stage === 'semi' ? (rng() - 0.5) * 0.8 : 0

    const rawRating = baseline + jitter + eliteBoost + stagePressure
    const performanceRating = roundTo(clamp(rawRating, RATING_MIN, RATING_MAX), 1)

    // Goals/assists: probability scaled by performance rating.
    const performanceScale = performanceRating / RATING_MAX
    const goals = rng() < goalRate * performanceScale ? (rng() < 0.15 ? 2 : 1) : 0
    const assists = rng() < assistRate * performanceScale ? 1 : 0

    appearances.push({
      matchId: `${player.slug}-${i}-${opponent.slug}-${stage}`,
      ageAtMatch,
      opponentSlug: opponent.slug,
      opponentName: opponent.name,
      stage,
      performanceRating,
      goals,
      assists,
    })
  }

  const totalRating = appearances.reduce((sum, a) => sum + a.performanceRating, 0)
  const meanRating = appearances.length > 0
    ? roundTo(totalRating / appearances.length, 2)
    : 0

  const bestPerformance = appearances.length > 0
    ? appearances.reduce((best, current) =>
        current.performanceRating > best.performanceRating ? current : best,
      )
    : null

  return {
    appearances,
    meanRating,
    bestPerformance,
    bigGameVerdict: classifyVerdict(meanRating),
    signalCount: appearances.length,
    sourceCount: new Set(appearances.map((a) => a.opponentSlug)).size,
  }
}
