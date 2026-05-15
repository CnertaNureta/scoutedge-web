export type FormCurveEntity = 'team' | 'player'

export type FormCurveTrend = 'up' | 'flat' | 'down'

export interface FormCurvePoint {
  monthOffset: number
  value: number
}

export interface FormCurveSeries {
  entity: FormCurveEntity
  slug: string
  points: FormCurvePoint[]
  mean: number
  delta: number
  trend: FormCurveTrend
}

const DEFAULT_MONTHS_LOOKBACK = 6
const TREND_THRESHOLD = 0.05
const MIN_MONTHS = 2
const MAX_MONTHS = 24

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

function clamp01(n: number): number {
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function deriveTrend(delta: number): FormCurveTrend {
  if (delta > TREND_THRESHOLD) return 'up'
  if (delta < -TREND_THRESHOLD) return 'down'
  return 'flat'
}

function normalizeMonths(monthsLookback: number | undefined): number {
  const n = monthsLookback ?? DEFAULT_MONTHS_LOOKBACK
  if (!Number.isFinite(n)) return DEFAULT_MONTHS_LOOKBACK
  const rounded = Math.round(n)
  if (rounded < MIN_MONTHS) return MIN_MONTHS
  if (rounded > MAX_MONTHS) return MAX_MONTHS
  return rounded
}

// WHY: Player rating history with month granularity is a known P10 gap pending FBref ingest;
// until then we synthesize a deterministic, slug-seeded curve so the UI is stable across renders.
export function buildFormCurveFromAvailable(
  entity: FormCurveEntity,
  slug: string,
  monthsLookback?: number
): FormCurveSeries {
  const months = normalizeMonths(monthsLookback)
  const entitySalt = entity === 'team' ? 0x7e4a1 : 0x91c3f
  const rng = mulberry32(hashSlug(`${entity}:${slug}`) ^ entitySalt)

  const baseline = 0.45 + rng() * 0.2
  const drift = (rng() - 0.5) * 0.06

  const rawValues: number[] = []
  let walker = baseline
  for (let i = 0; i < months; i += 1) {
    const noise = (rng() - 0.5) * 0.18
    walker = clamp01(walker + drift + noise * 0.5)
    rawValues.push(clamp01(walker))
  }

  const points: FormCurvePoint[] = rawValues.map((value, idx) => ({
    monthOffset: idx - (months - 1),
    value,
  }))

  const sum = points.reduce((acc, p) => acc + p.value, 0)
  const mean = sum / points.length
  const first = points[0].value
  const last = points[points.length - 1].value
  const delta = last - first

  return {
    entity,
    slug,
    points,
    mean,
    delta,
    trend: deriveTrend(delta),
  }
}

export function buildFormCurve(
  entity: FormCurveEntity,
  slug: string,
  monthsLookback?: number
): FormCurveSeries {
  return buildFormCurveFromAvailable(entity, slug, monthsLookback)
}
