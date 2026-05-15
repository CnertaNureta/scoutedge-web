import type { Player } from '@/lib/types'

/**
 * T9 Age & Peak Window — pure compute layer.
 *
 * Maps each player to a positional peak band and aggregates the squad's age
 * distribution per position group. Used by the team page AgePeakWindow module.
 *
 * Peak bands are intentionally inlined here (not in a separate data file)
 * because they are domain constants tied to this compute, not site data.
 */

export type PositionGroup =
  | 'GK'
  | 'CB'
  | 'FB'
  | 'DM'
  | 'CM'
  | 'AM'
  | 'W'
  | 'ST'

export interface PeakBand {
  low: number
  high: number
}

export interface AgePeakRow {
  group: PositionGroup
  peakBand: PeakBand
  playerCount: number
  inPeakCount: number
  /** strictly below peakBand.low */
  ascendingCount: number
  /** strictly above peakBand.high */
  decliningCount: number
  /** mean age in this group; 0 when playerCount === 0 */
  avgAge: number
  /** mean signed distance from band center; 0 when playerCount === 0 */
  avgDistanceFromCenter: number
}

export type Verdict = 'peaking' | 'ascending' | 'declining' | 'mixed'

export interface AgePeakBreakdown {
  rows: AgePeakRow[]
  verdict: Verdict
  totalPlayers: number
  totalInPeak: number
  totalAscending: number
  totalDeclining: number
  signalCount: number
  sourceCount: number
}

/**
 * Position peak windows — empirically motivated, deliberately not pulled from
 * external data so this module remains pure and deterministic.
 */
export const PEAK_BANDS: Readonly<Record<PositionGroup, PeakBand>> = {
  GK: { low: 27, high: 34 },
  CB: { low: 26, high: 32 },
  FB: { low: 24, high: 30 },
  DM: { low: 25, high: 31 },
  CM: { low: 24, high: 30 },
  AM: { low: 24, high: 29 },
  W: { low: 23, high: 28 },
  ST: { low: 24, high: 30 },
}

/** Stable display order for the chart. */
export const POSITION_GROUP_ORDER: ReadonlyArray<PositionGroup> = [
  'GK',
  'CB',
  'FB',
  'DM',
  'CM',
  'AM',
  'W',
  'ST',
]

/**
 * Map the project's broad position values (`GK | DEF | MID | FWD`) plus any
 * granular hint values to a position group. Today the dataset only carries
 * the four broad codes, so DEF → CB, MID → CM, FWD → ST. We still match a
 * handful of common granular codes so future schema enrichment Just Works.
 */
export function mapPositionToGroup(rawPosition: string): PositionGroup {
  const p = rawPosition.trim().toUpperCase()

  if (p === 'GK' || p === 'G' || p === 'GOALKEEPER') return 'GK'

  // Fullbacks / wingbacks first — they're a subset of DEF.
  if (
    p === 'FB' ||
    p === 'LB' ||
    p === 'RB' ||
    p === 'LWB' ||
    p === 'RWB' ||
    p === 'WB'
  ) {
    return 'FB'
  }
  if (p === 'CB' || p === 'DEF' || p === 'D' || p === 'DEFENDER') return 'CB'

  if (p === 'DM' || p === 'CDM' || p === 'DEFENSIVE MIDFIELDER') return 'DM'
  if (p === 'AM' || p === 'CAM' || p === 'ATTACKING MIDFIELDER') return 'AM'
  if (p === 'W' || p === 'LW' || p === 'RW' || p === 'WINGER') return 'W'
  if (p === 'CM' || p === 'MID' || p === 'M' || p === 'MIDFIELDER') return 'CM'

  if (
    p === 'ST' ||
    p === 'CF' ||
    p === 'FWD' ||
    p === 'F' ||
    p === 'FORWARD' ||
    p === 'STRIKER'
  ) {
    return 'ST'
  }

  // Fallback — treat unknown markers as central midfield rather than throw,
  // since this is a visual/analytic module, not a validation boundary.
  return 'CM'
}

interface GroupAccumulator {
  ages: number[]
  inPeakCount: number
  ascendingCount: number
  decliningCount: number
}

function emptyAccumulator(): GroupAccumulator {
  return {
    ages: [],
    inPeakCount: 0,
    ascendingCount: 0,
    decliningCount: 0,
  }
}

function bandCenter(band: PeakBand): number {
  return (band.low + band.high) / 2
}

function mean(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

/**
 * Decide the squad-wide verdict from the totals.
 *
 * Rules:
 * - empty squad → 'mixed' (no signal)
 * - all in peak → 'peaking'
 * - all above peak → 'declining'
 * - all below peak → 'ascending'
 * - else → 'mixed'
 *
 * "all in peak" is checked first so a squad with everyone inside their
 * positional bands gets the strongest reading.
 */
function pickVerdict(totals: {
  totalPlayers: number
  totalInPeak: number
  totalAscending: number
  totalDeclining: number
}): Verdict {
  const { totalPlayers, totalInPeak, totalAscending, totalDeclining } = totals
  if (totalPlayers === 0) return 'mixed'
  if (totalInPeak === totalPlayers) return 'peaking'
  if (totalAscending === totalPlayers) return 'ascending'
  if (totalDeclining === totalPlayers) return 'declining'
  return 'mixed'
}

/**
 * Pure compute — bucket players into position groups, count in/above/below
 * the band, compute averages, return per-group rows plus squad totals.
 */
export function computeAgePeak(
  players: ReadonlyArray<Player>,
): AgePeakBreakdown {
  if (players.length === 0) {
    return {
      rows: [],
      verdict: 'mixed',
      totalPlayers: 0,
      totalInPeak: 0,
      totalAscending: 0,
      totalDeclining: 0,
      signalCount: 0,
      sourceCount: 0,
    }
  }

  const groups = new Map<PositionGroup, GroupAccumulator>()

  for (const player of players) {
    const group = mapPositionToGroup(player.position)
    const band = PEAK_BANDS[group]
    const acc = groups.get(group) ?? emptyAccumulator()

    acc.ages.push(player.age)
    if (player.age < band.low) {
      acc.ascendingCount += 1
    } else if (player.age > band.high) {
      acc.decliningCount += 1
    } else {
      acc.inPeakCount += 1
    }

    groups.set(group, acc)
  }

  const rows: AgePeakRow[] = POSITION_GROUP_ORDER.filter((g) =>
    groups.has(g),
  ).map((group) => {
    const acc = groups.get(group)!
    const band = PEAK_BANDS[group]
    const avgAge = mean(acc.ages)
    const center = bandCenter(band)
    const avgDistanceFromCenter = acc.ages.length === 0 ? 0 : avgAge - center

    return {
      group,
      peakBand: band,
      playerCount: acc.ages.length,
      inPeakCount: acc.inPeakCount,
      ascendingCount: acc.ascendingCount,
      decliningCount: acc.decliningCount,
      avgAge,
      avgDistanceFromCenter,
    }
  })

  const totals = rows.reduce(
    (agg, row) => {
      agg.totalPlayers += row.playerCount
      agg.totalInPeak += row.inPeakCount
      agg.totalAscending += row.ascendingCount
      agg.totalDeclining += row.decliningCount
      return agg
    },
    { totalPlayers: 0, totalInPeak: 0, totalAscending: 0, totalDeclining: 0 },
  )

  return {
    rows,
    verdict: pickVerdict(totals),
    ...totals,
    // signalCount = unique players considered; sourceCount = distinct
    // position groups they fall into. Matches the IntelligenceModule contract.
    signalCount: totals.totalPlayers,
    sourceCount: rows.length,
  }
}
