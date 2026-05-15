import type { Player, Team } from '@/lib/types'
import { ratingToHundredScale } from './rating-scale'

// ── Tier thresholds (score 0..100) ────────────────────────────
const TIER_ICE_MIN = 80
const TIER_COOL_MIN = 60
const TIER_WARM_MIN = 40

// ── Factor weights (sum to 1.0) ───────────────────────────────
// Big-game pressure handling is most predicted by experience and form;
// fitness/morale set the floor; archetype fit smooths team context.
const WEIGHTS = {
  experience: 0.28,
  form: 0.24,
  fitness: 0.18,
  morale: 0.18,
  archetypeFit: 0.12,
} as const

// ── Age curve constants — empirical "peak window" ─────────────
const AGE_PEAK_MIN = 26
const AGE_PEAK_MAX = 31
const AGE_YOUNG_FLOOR = 18

// ── Experience normalization ──────────────────────────────────
const CAPS_PEAK = 80
const GOALS_BONUS_PER_GOAL = 0.5

// ── Form normalization ────────────────────────────────────────
const RATING_FORM_MIN = 50
const RATING_FORM_MAX = 95

// ── Fitness lookup ────────────────────────────────────────────
const FITNESS_BY_STATUS: Record<Player['fitnessStatus'], number> = {
  green: 92,
  amber: 60,
  red: 28,
}

export type PressureTier = 'ice' | 'cool' | 'warm' | 'shaky'

export interface PressureFactor {
  key: 'experience' | 'form' | 'fitness' | 'morale' | 'archetypeFit'
  contribution: number
  weight: number
  label: string
}

export interface PressureIndexBreakdown {
  score: number
  tier: PressureTier
  factors: PressureFactor[]
  modelStub: true
  signalCount: number
  sourceCount: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function ageMaturity(age: number): number {
  if (age >= AGE_PEAK_MIN && age <= AGE_PEAK_MAX) return 1
  if (age < AGE_PEAK_MIN) {
    const span = AGE_PEAK_MIN - AGE_YOUNG_FLOOR
    return clamp((age - AGE_YOUNG_FLOOR) / span, 0, 1)
  }
  // post-peak, gentle decline floor at ~0.55 to reflect veteran composure
  const decline = (age - AGE_PEAK_MAX) * 0.04
  return clamp(1 - decline, 0.55, 1)
}

function computeExperience(player: Player): number {
  const capsScore = clamp((player.caps / CAPS_PEAK) * 100, 0, 100)
  const goalsBonus = clamp(player.goals * GOALS_BONUS_PER_GOAL, 0, 20)
  const maturity = ageMaturity(player.age)
  const raw = capsScore * 0.75 * maturity + goalsBonus
  return clamp(Math.round(raw + 18), 0, 100)
}

function computeForm(player: Player): number {
  const span = RATING_FORM_MAX - RATING_FORM_MIN
  const normalized = ((ratingToHundredScale(player.rating) - RATING_FORM_MIN) / span) * 100
  return clamp(Math.round(normalized), 0, 100)
}

function computeFitness(player: Player): number {
  return FITNESS_BY_STATUS[player.fitnessStatus] ?? 70
}

function computeMorale(player: Player): number {
  if (
    typeof player.sentimentScore === 'number' &&
    Number.isFinite(player.sentimentScore)
  ) {
    return clamp(Math.round(player.sentimentScore), 0, 100)
  }
  return 55
}

function computeArchetypeFit(team: Team): number {
  // Team environment factor — stable, high-morale squads buffer pressure.
  const morale = clamp(team.morale ?? 60, 0, 100)
  const stability = clamp(team.stability ?? 65, 0, 100)
  const blended = morale * 0.5 + stability * 0.5
  return clamp(Math.round(blended), 0, 100)
}

function deriveTier(score: number): PressureTier {
  if (score >= TIER_ICE_MIN) return 'ice'
  if (score >= TIER_COOL_MIN) return 'cool'
  if (score >= TIER_WARM_MIN) return 'warm'
  return 'shaky'
}

/**
 * Pure compute fn for the Pressure Index module.
 *
 * WHY: this is the rules-MVP — a deterministic weighted aggregate over
 * existing player/team fields. A trained model (workload deltas, big-game
 * splits, qualifying-vs-final variance) will replace `compute*` internals
 * in a Phase 3 follow-up; the contract here is intentionally stable so
 * the UI doesn't need to change when the model swaps in.
 */
export function computePressureIndex(
  player: Player,
  team: Team,
): PressureIndexBreakdown {
  const experience = computeExperience(player)
  const form = computeForm(player)
  const fitness = computeFitness(player)
  const morale = computeMorale(player)
  const archetypeFit = computeArchetypeFit(team)

  const factors: PressureFactor[] = [
    { key: 'experience', contribution: experience, weight: WEIGHTS.experience, label: 'experience' },
    { key: 'form', contribution: form, weight: WEIGHTS.form, label: 'form' },
    { key: 'fitness', contribution: fitness, weight: WEIGHTS.fitness, label: 'fitness' },
    { key: 'morale', contribution: morale, weight: WEIGHTS.morale, label: 'morale' },
    { key: 'archetypeFit', contribution: archetypeFit, weight: WEIGHTS.archetypeFit, label: 'archetypeFit' },
  ]

  const weightedSum = factors.reduce(
    (acc, f) => acc + f.contribution * f.weight,
    0,
  )
  const score = clamp(Math.round(weightedSum), 0, 100)
  const tier = deriveTier(score)

  return {
    score,
    tier,
    factors,
    modelStub: true,
    signalCount: factors.length,
    sourceCount: 3,
  }
}
