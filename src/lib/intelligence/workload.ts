import type { Player } from '@/lib/types'

// ── Workload thresholds (rolling 12-month minutes) ─────────────
const FRESH_MAX_MINUTES = 2200
const MANAGED_MAX_MINUTES = 3300
const AMBER_MAX_MINUTES = 4000
// status === 'red' when totalMinutes > AMBER_MAX_MINUTES

// ── Position-aware baselines (per-month averages) ──────────────
// Tuned so 12-month totals land in realistic professional ranges:
//   GK regulars ≈ 2700-3600
//   Outfield regulars ≈ 2400-3600
//   Bench rotators (lower base) ≈ 1200-1800
const POSITION_BASELINE: Record<
  Player['position'],
  { minutesPerStart: number; gamesPerMonth: number }
> = {
  GK: { minutesPerStart: 90, gamesPerMonth: 3.3 },
  DEF: { minutesPerStart: 86, gamesPerMonth: 3.2 },
  MID: { minutesPerStart: 80, gamesPerMonth: 3.4 },
  FWD: { minutesPerStart: 78, gamesPerMonth: 3.1 },
}

const MONTHS = 12
const NATIONAL_TEAM_MAX_WINDOWS = 4

export type WorkloadStatus = 'fresh' | 'managed' | 'amber' | 'red'

export interface WorkloadMonth {
  /** -11 oldest, 0 current month */
  monthOffset: number
  minutes: number
  games: number
}

export interface WorkloadBreakdown {
  months: WorkloadMonth[]
  totalMinutes: number
  totalGames: number
  nationalTeamWindows: number
  status: WorkloadStatus
  /** Present when status !== 'fresh'. Translation key fragment. */
  amberZoneReason?: string
  injuryFlag: { active: boolean; note?: string }
  signalCount: number
  sourceCount: number
}

/**
 * Deterministic FNV-1a hash for a slug → 32-bit unsigned int.
 */
function hashSlug(slug: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

/** Deterministic PRNG seeded from a 32-bit int. Mulberry32. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function deriveStatus(
  totalMinutes: number,
  fitnessStatus: Player['fitnessStatus'],
): WorkloadStatus {
  if (fitnessStatus === 'red') return 'red'
  if (totalMinutes > AMBER_MAX_MINUTES) return 'red'
  if (totalMinutes > MANAGED_MAX_MINUTES) return 'amber'
  if (fitnessStatus === 'amber') return 'amber'
  if (totalMinutes > FRESH_MAX_MINUTES) return 'managed'
  return 'fresh'
}

function reasonForStatus(
  status: WorkloadStatus,
  totalMinutes: number,
  fitnessStatus: Player['fitnessStatus'],
): string | undefined {
  if (status === 'fresh') return undefined
  if (status === 'red' && fitnessStatus === 'red') return 'injuryHold'
  if (status === 'red') return 'overload'
  if (status === 'amber' && totalMinutes > MANAGED_MAX_MINUTES) return 'heavyLoad'
  if (status === 'amber') return 'fitnessFlag'
  if (totalMinutes > FRESH_MAX_MINUTES) return 'steady'
  return 'steady'
}

/**
 * Pure compute fn for the 12-month rolling workload module.
 *
 * WHY: workload signals don't yet exist as a first-class table — this is
 * deterministic synthesis (seeded by player.slug) over `caps`/`position`/
 * `fitnessStatus`, pending real club-game ingest. Same player ⇒ same series.
 */
export function computeWorkload(player: Player): WorkloadBreakdown {
  const rng = makeRng(hashSlug(player.slug))
  const baseline = POSITION_BASELINE[player.position] ?? POSITION_BASELINE.MID

  // Cap activity is a proxy for how senior / rotation-protected the player is.
  // Higher caps → more national-team windows; very junior players play fewer
  // club games on average.
  const capsActivity = clamp(player.caps / 80, 0.45, 1.1)

  // Form one stable "rotation factor" per player so the whole 12 months feel
  // coherent (bench rotators stay bench rotators).
  const rotationFactor = 0.55 + rng() * 0.65 // 0.55 .. 1.20

  const months: WorkloadMonth[] = []
  for (let i = 0; i < MONTHS; i += 1) {
    const monthOffset = i - (MONTHS - 1) // -11 .. 0
    // Per-month jitter — keeps months distinguishable but bounded.
    const jitter = 0.7 + rng() * 0.6 // 0.7 .. 1.3
    const games = Math.max(
      0,
      Math.round(baseline.gamesPerMonth * rotationFactor * capsActivity * jitter),
    )
    const minutesPerGameJitter = 0.78 + rng() * 0.24 // 0.78 .. 1.02
    const minutes = Math.max(
      0,
      Math.round(games * baseline.minutesPerStart * minutesPerGameJitter),
    )
    months.push({ monthOffset, minutes, games })
  }

  const totalMinutes = months.reduce((acc, m) => acc + m.minutes, 0)
  const totalGames = months.reduce((acc, m) => acc + m.games, 0)
  const nationalTeamWindows = clamp(
    Math.round(capsActivity * 2 + rng() * 2),
    0,
    NATIONAL_TEAM_MAX_WINDOWS,
  )

  const status = deriveStatus(totalMinutes, player.fitnessStatus)
  const amberZoneReason = reasonForStatus(status, totalMinutes, player.fitnessStatus)
  const injuryFlag = {
    active: player.fitnessStatus !== 'green',
    note: player.fitnessStatus !== 'green' ? player.fitnessNote : undefined,
  }

  // Signal count = months with material activity (a useful proxy for sample size).
  const signalCount = months.filter((m) => m.minutes > 0).length
  // Source count: club-games line + national-team windows + injury flag (if active).
  const sourceCount =
    1 + (nationalTeamWindows > 0 ? 1 : 0) + (injuryFlag.active ? 1 : 0)

  return {
    months,
    totalMinutes,
    totalGames,
    nationalTeamWindows,
    status,
    amberZoneReason,
    injuryFlag,
    signalCount,
    sourceCount,
  }
}
