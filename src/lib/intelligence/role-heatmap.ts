import type { Player, Team } from '@/lib/types'

/**
 * Pitch is discretized into a 6×9 grid (54 zones).
 * Rows (0..5) run top-to-bottom across the pitch width:
 *   0 = top touchline (left wing for an attacking-right team)
 *   5 = bottom touchline (right wing)
 *   2..3 = central channels
 * Columns (0..8) run left-to-right along pitch length, in the direction
 * of attack for the player's team:
 *   0 = own goal line
 *   1..2 = defensive third
 *   3..5 = midfield third
 *   6..7 = attacking third
 *   8 = opposition goal line
 *
 * Zone ID format: "r{row}c{col}" — e.g. "r0c0", "r5c8".
 */
export type PitchZone = string

export interface RoleHeatmap {
  roleTags: string[]
  zoneIntensities: Record<PitchZone, number>
  primaryZone: PitchZone
  signalCount: number
  sourceCount: number
}

export const PITCH_ROWS = 6
export const PITCH_COLS = 9
export const TOTAL_ZONES = PITCH_ROWS * PITCH_COLS

interface RoleTemplate {
  tags: string[]
  /**
   * Map of zone IDs to base intensity (0..1). Zones not listed default to 0.
   */
  zoneWeights: Record<PitchZone, number>
}

/**
 * Build a Record<PitchZone, number> from a 2D row-major matrix.
 * Cells are clamped to [0, 1].
 */
function gridToWeights(grid: number[][]): Record<PitchZone, number> {
  const out: Record<PitchZone, number> = {}
  for (let r = 0; r < PITCH_ROWS; r++) {
    for (let c = 0; c < PITCH_COLS; c++) {
      const v = grid[r]?.[c] ?? 0
      out[`r${r}c${c}`] = Math.max(0, Math.min(1, v))
    }
  }
  return out
}

/**
 * Role templates — deterministic zone profiles per position+role hint.
 * Keys are matched in this order:
 *   1) `${position}:${roleHint}` (e.g. "FWD:LW")
 *   2) `${position}` (fallback by raw position)
 *   3) "MID" (final fallback)
 */
const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  GK: {
    tags: ['Sweeper-Keeper', 'Distribution Hub'],
    zoneWeights: gridToWeights([
      [0.10, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.40, 0.15, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.85, 0.40, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.95, 0.45, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.40, 0.15, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.10, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    ]),
  },

  'DEF:CB': {
    tags: ['Anchor 6', 'Aerial Commander'],
    zoneWeights: gridToWeights([
      [0.05, 0.10, 0.10, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.20, 0.50, 0.55, 0.30, 0.10, 0.05, 0.00, 0.00, 0.00],
      [0.40, 0.85, 0.90, 0.50, 0.20, 0.10, 0.05, 0.00, 0.00],
      [0.40, 0.85, 0.90, 0.50, 0.20, 0.10, 0.05, 0.00, 0.00],
      [0.20, 0.50, 0.55, 0.30, 0.10, 0.05, 0.00, 0.00, 0.00],
      [0.05, 0.10, 0.10, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00],
    ]),
  },

  'DEF:LB': {
    tags: ['Overlapping Fullback', 'Wide Outlet'],
    zoneWeights: gridToWeights([
      [0.30, 0.70, 0.80, 0.65, 0.55, 0.45, 0.40, 0.30, 0.10],
      [0.20, 0.45, 0.55, 0.45, 0.35, 0.25, 0.20, 0.10, 0.05],
      [0.05, 0.15, 0.20, 0.15, 0.10, 0.05, 0.05, 0.00, 0.00],
      [0.00, 0.05, 0.05, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    ]),
  },

  'DEF:RB': {
    tags: ['Overlapping Fullback', 'Wide Outlet'],
    zoneWeights: gridToWeights([
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.00, 0.05, 0.05, 0.05, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.05, 0.15, 0.20, 0.15, 0.10, 0.05, 0.05, 0.00, 0.00],
      [0.20, 0.45, 0.55, 0.45, 0.35, 0.25, 0.20, 0.10, 0.05],
      [0.30, 0.70, 0.80, 0.65, 0.55, 0.45, 0.40, 0.30, 0.10],
    ]),
  },

  DEF: {
    tags: ['Defensive Anchor', 'Last Line'],
    zoneWeights: gridToWeights([
      [0.10, 0.20, 0.25, 0.15, 0.05, 0.00, 0.00, 0.00, 0.00],
      [0.20, 0.55, 0.65, 0.40, 0.15, 0.05, 0.00, 0.00, 0.00],
      [0.30, 0.75, 0.85, 0.50, 0.20, 0.10, 0.05, 0.00, 0.00],
      [0.30, 0.75, 0.85, 0.50, 0.20, 0.10, 0.05, 0.00, 0.00],
      [0.20, 0.55, 0.65, 0.40, 0.15, 0.05, 0.00, 0.00, 0.00],
      [0.10, 0.20, 0.25, 0.15, 0.05, 0.00, 0.00, 0.00, 0.00],
    ]),
  },

  'MID:CDM': {
    tags: ['Anchor 6', 'Press-Resistant Pivot'],
    zoneWeights: gridToWeights([
      [0.00, 0.05, 0.10, 0.10, 0.05, 0.00, 0.00, 0.00, 0.00],
      [0.05, 0.20, 0.45, 0.55, 0.35, 0.15, 0.05, 0.00, 0.00],
      [0.10, 0.40, 0.85, 0.95, 0.65, 0.30, 0.10, 0.05, 0.00],
      [0.10, 0.40, 0.85, 0.95, 0.65, 0.30, 0.10, 0.05, 0.00],
      [0.05, 0.20, 0.45, 0.55, 0.35, 0.15, 0.05, 0.00, 0.00],
      [0.00, 0.05, 0.10, 0.10, 0.05, 0.00, 0.00, 0.00, 0.00],
    ]),
  },

  'MID:CAM': {
    tags: ['Half-Space 10', 'Final-Third Conductor'],
    zoneWeights: gridToWeights([
      [0.00, 0.00, 0.05, 0.10, 0.15, 0.20, 0.20, 0.10, 0.00],
      [0.00, 0.05, 0.15, 0.30, 0.55, 0.75, 0.65, 0.30, 0.05],
      [0.00, 0.05, 0.20, 0.45, 0.75, 0.90, 0.80, 0.40, 0.10],
      [0.00, 0.05, 0.20, 0.45, 0.75, 0.90, 0.80, 0.40, 0.10],
      [0.00, 0.05, 0.15, 0.30, 0.55, 0.75, 0.65, 0.30, 0.05],
      [0.00, 0.00, 0.05, 0.10, 0.15, 0.20, 0.20, 0.10, 0.00],
    ]),
  },

  MID: {
    tags: ['Box-to-Box Engine', 'Tempo Setter'],
    zoneWeights: gridToWeights([
      [0.00, 0.05, 0.10, 0.15, 0.15, 0.15, 0.10, 0.05, 0.00],
      [0.05, 0.20, 0.40, 0.55, 0.55, 0.45, 0.25, 0.10, 0.05],
      [0.10, 0.35, 0.65, 0.85, 0.85, 0.65, 0.40, 0.15, 0.05],
      [0.10, 0.35, 0.65, 0.85, 0.85, 0.65, 0.40, 0.15, 0.05],
      [0.05, 0.20, 0.40, 0.55, 0.55, 0.45, 0.25, 0.10, 0.05],
      [0.00, 0.05, 0.10, 0.15, 0.15, 0.15, 0.10, 0.05, 0.00],
    ]),
  },

  'FWD:LW': {
    tags: ['Inverted Winger', 'Half-Space 10'],
    zoneWeights: gridToWeights([
      [0.05, 0.15, 0.30, 0.45, 0.65, 0.80, 0.90, 0.85, 0.55],
      [0.05, 0.10, 0.25, 0.40, 0.55, 0.70, 0.75, 0.65, 0.40],
      [0.00, 0.05, 0.10, 0.20, 0.30, 0.45, 0.50, 0.45, 0.25],
      [0.00, 0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.20, 0.10],
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.05, 0.05, 0.05, 0.00],
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    ]),
  },

  'FWD:RW': {
    tags: ['Inverted Winger', 'Half-Space 10'],
    zoneWeights: gridToWeights([
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.00, 0.00, 0.00, 0.00, 0.00, 0.05, 0.05, 0.05, 0.00],
      [0.00, 0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.20, 0.10],
      [0.00, 0.05, 0.10, 0.20, 0.30, 0.45, 0.50, 0.45, 0.25],
      [0.05, 0.10, 0.25, 0.40, 0.55, 0.70, 0.75, 0.65, 0.40],
      [0.05, 0.15, 0.30, 0.45, 0.65, 0.80, 0.90, 0.85, 0.55],
    ]),
  },

  'FWD:ST': {
    tags: ['Box Crasher', 'Channel Runner'],
    zoneWeights: gridToWeights([
      [0.00, 0.00, 0.00, 0.00, 0.05, 0.10, 0.15, 0.20, 0.10],
      [0.00, 0.00, 0.05, 0.10, 0.20, 0.35, 0.55, 0.70, 0.50],
      [0.00, 0.05, 0.10, 0.20, 0.40, 0.65, 0.85, 0.95, 0.80],
      [0.00, 0.05, 0.10, 0.20, 0.40, 0.65, 0.85, 0.95, 0.80],
      [0.00, 0.00, 0.05, 0.10, 0.20, 0.35, 0.55, 0.70, 0.50],
      [0.00, 0.00, 0.00, 0.00, 0.05, 0.10, 0.15, 0.20, 0.10],
    ]),
  },

  FWD: {
    tags: ['Box Crasher', 'Channel Runner'],
    zoneWeights: gridToWeights([
      [0.00, 0.00, 0.00, 0.00, 0.05, 0.10, 0.20, 0.30, 0.15],
      [0.00, 0.00, 0.05, 0.10, 0.25, 0.40, 0.60, 0.70, 0.45],
      [0.00, 0.05, 0.10, 0.20, 0.40, 0.65, 0.85, 0.90, 0.65],
      [0.00, 0.05, 0.10, 0.20, 0.40, 0.65, 0.85, 0.90, 0.65],
      [0.00, 0.00, 0.05, 0.10, 0.25, 0.40, 0.60, 0.70, 0.45],
      [0.00, 0.00, 0.00, 0.00, 0.05, 0.10, 0.20, 0.30, 0.15],
    ]),
  },
}

/**
 * Stable string hash → 32-bit unsigned int.
 * Deterministic across runs; used as the seed for per-player jitter.
 */
function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}

/**
 * Deterministic pseudo-random in [0, 1) from a seed.
 * Mulberry32 — small, stable, no Math.random dependency.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Pull a role hint string from player metadata or fallback to position.
 * Order of preference: explicit `selectionNote` / `tacticalNote` text,
 * then derive from formation + position.
 */
function deriveRoleHint(
  player: Player,
  team: Team,
): { positionKey: string; roleHint: string } {
  const pos = player.position
  const notes = `${player.tacticalNote ?? ''} ${player.selectionNote ?? ''}`.toLowerCase()

  if (pos === 'GK') return { positionKey: 'GK', roleHint: 'GK' }

  if (pos === 'DEF') {
    if (/left[ -]?back|\blb\b|wing[- ]?back left/.test(notes)) {
      return { positionKey: 'DEF', roleHint: 'LB' }
    }
    if (/right[ -]?back|\brb\b|wing[- ]?back right/.test(notes)) {
      return { positionKey: 'DEF', roleHint: 'RB' }
    }
    if (/center[ -]?back|centre[ -]?back|\bcb\b|\bcentre half\b/.test(notes)) {
      return { positionKey: 'DEF', roleHint: 'CB' }
    }
    // Deterministic side-pick if no explicit hint: use a stable hash of slug.
    const sidePicker = fnv1a(`def:${player.slug}`) % 3
    if (sidePicker === 0) return { positionKey: 'DEF', roleHint: 'LB' }
    if (sidePicker === 1) return { positionKey: 'DEF', roleHint: 'RB' }
    return { positionKey: 'DEF', roleHint: 'CB' }
  }

  if (pos === 'MID') {
    if (/holding|defensive mid|\bcdm\b|anchor|number 6\b|\b6\b/.test(notes)) {
      return { positionKey: 'MID', roleHint: 'CDM' }
    }
    if (/attacking mid|\bcam\b|number 10\b|\b10\b|playmaker/.test(notes)) {
      return { positionKey: 'MID', roleHint: 'CAM' }
    }
    // Use formation as a tilt: 4-2-3-1 leans CDM, 4-3-3 leans box-to-box,
    // 3-4-2-1 leans CAM.
    const formation = team.archetypeMatch?.toLowerCase() ?? ''
    if (formation.includes('possession') || formation.includes('control')) {
      return { positionKey: 'MID', roleHint: 'CAM' }
    }
    return { positionKey: 'MID', roleHint: '' }
  }

  // FWD
  if (/left wing|\blw\b|inverted left/.test(notes)) {
    return { positionKey: 'FWD', roleHint: 'LW' }
  }
  if (/right wing|\brw\b|inverted right/.test(notes)) {
    return { positionKey: 'FWD', roleHint: 'RW' }
  }
  if (/striker|number 9\b|\b9\b|centre[- ]?forward|center[- ]?forward/.test(notes)) {
    return { positionKey: 'FWD', roleHint: 'ST' }
  }
  // Deterministic split for unlabeled forwards: roughly half ST, quarter each wing.
  const fwdPicker = fnv1a(`fwd:${player.slug}`) % 4
  if (fwdPicker === 0) return { positionKey: 'FWD', roleHint: 'LW' }
  if (fwdPicker === 1) return { positionKey: 'FWD', roleHint: 'RW' }
  return { positionKey: 'FWD', roleHint: 'ST' }
}

function pickTemplate(positionKey: string, roleHint: string): RoleTemplate {
  const composite = `${positionKey}:${roleHint}`
  if (roleHint && ROLE_TEMPLATES[composite]) return ROLE_TEMPLATES[composite]
  if (ROLE_TEMPLATES[positionKey]) return ROLE_TEMPLATES[positionKey]
  return ROLE_TEMPLATES.MID
}

/**
 * Compute role tags + zone heatmap for a player on a given team.
 * Pure & deterministic — same (player, team) always returns the same result.
 */
export function computeRoleHeatmap(player: Player, team: Team): RoleHeatmap {
  const { positionKey, roleHint } = deriveRoleHint(player, team)
  const template = pickTemplate(positionKey, roleHint)

  // Seeded jitter so different players in the same role look distinct.
  const seed = fnv1a(`${team.slug}|${player.slug}|${player.position}|${roleHint}`)
  const rng = mulberry32(seed)

  const intensities: Record<PitchZone, number> = {}
  let primaryZone = 'r2c4'
  let primaryValue = -1

  for (let r = 0; r < PITCH_ROWS; r++) {
    for (let c = 0; c < PITCH_COLS; c++) {
      const key = `r${r}c${c}`
      const base = template.zoneWeights[key] ?? 0
      // ±12% jitter — keeps base shape but breaks identical heatmaps.
      const jitter = (rng() - 0.5) * 0.24
      const value = Math.max(0, Math.min(1, base + base * jitter))
      intensities[key] = Number(value.toFixed(4))
      if (intensities[key] > primaryValue) {
        primaryValue = intensities[key]
        primaryZone = key
      }
    }
  }

  // Signal count proxy: number of zones meaningfully active.
  const signalCount = Object.values(intensities).filter((v) => v >= 0.2).length
  // Source count proxy: position bucket + role hint counted as inputs.
  const sourceCount = roleHint ? 3 : 2

  return {
    roleTags: [...template.tags],
    zoneIntensities: intensities,
    primaryZone,
    signalCount,
    sourceCount,
  }
}
