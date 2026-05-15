/**
 * StatTwinRadar — SVG radar that overlays up to 3 historical comparables
 * on the main player's polygon. Server component (no animation, no
 * IntersectionObserver) — kept separate from the animated `StatRadar`
 * because P3 is a server-rendered intelligence module.
 *
 * Layout choice: main polygon stays in the team's primary green tone;
 * overlays use translucent gray strokes/fills so they don't compete for
 * visual attention.
 */

import type { DerivedStats } from '@/lib/player-derived-stats'

const LABELS = ['PAC', 'SHO', 'PAS', 'PHY', 'DEF', 'OVR'] as const
const STAT_KEYS: (keyof DerivedStats)[] = [
  'pace',
  'shooting',
  'passing',
  'physical',
  'defense',
  'overall',
]

const CX = 150
const CY = 150
const MAX_R = 110
const ANGLE_STEP = 360 / 6
const RINGS = [0.2, 0.4, 0.6, 0.8, 1.0] as const

// Up to three overlay slots; each gets a distinct gray stroke shade so
// they remain readable when stacked.
const OVERLAY_STROKES = [
  'rgba(226, 232, 240, 0.85)', // slate-200
  'rgba(148, 163, 184, 0.75)', // slate-400
  'rgba(100, 116, 139, 0.65)', // slate-500
] as const

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const GRID_PATHS = RINGS.map((scale) => {
  const r = MAX_R * scale
  const points = Array.from({ length: 6 }, (_, i) => {
    const p = polarToCart(CX, CY, r, i * ANGLE_STEP)
    return `${p.x},${p.y}`
  })
  return `M${points.join('L')}Z`
})

const AXIS_LINES = Array.from({ length: 6 }, (_, i) => {
  const p = polarToCart(CX, CY, MAX_R, i * ANGLE_STEP)
  return { x2: p.x, y2: p.y }
})

const LABEL_POSITIONS = LABELS.map((label, i) => {
  const p = polarToCart(CX, CY, MAX_R + 22, i * ANGLE_STEP)
  return { label, x: p.x, y: p.y, statKey: STAT_KEYS[i] }
})

function buildPolygonPath(stats: DerivedStats): string {
  const points = STAT_KEYS.map((key, i) => {
    const r = MAX_R * (stats[key] / 99)
    return polarToCart(CX, CY, r, i * ANGLE_STEP)
  })
  return `M${points.map((p) => `${p.x},${p.y}`).join('L')}Z`
}

export interface ComparableOverlay {
  /** Comparable's display label for the polygon — typically last name. */
  label: string
  /** Synthesised stat vector for the comparable. Values 0–99. */
  stats: DerivedStats
}

interface StatTwinRadarProps {
  /** Main player's stat vector — rendered in the team's primary color. */
  stats: DerivedStats
  /** Primary fill/stroke color for the main polygon. */
  teamGlow: string
  /** Solid color used for the main polygon's data points. */
  teamPrimary: string
  /** Up to 3 ghost overlays. */
  overlays?: ComparableOverlay[]
  /** Optional id-stable suffix for SVG gradient defs (SSR-safe). */
  idSuffix?: string
}

export default function StatTwinRadar({
  stats,
  teamGlow,
  teamPrimary,
  overlays = [],
  idSuffix = 'stat-twin',
}: StatTwinRadarProps) {
  const dataPath = buildPolygonPath(stats)
  const dataPoints = STAT_KEYS.map((key, i) => {
    const r = MAX_R * (stats[key] / 99)
    return polarToCart(CX, CY, r, i * ANGLE_STEP)
  })

  const fillId = `radarFill-${idSuffix}`
  const cappedOverlays = overlays.slice(0, 3)

  return (
    <svg
      viewBox="0 0 300 300"
      className="w-full max-w-[320px] mx-auto"
      role="img"
      aria-label="Stat radar with historical comparables overlaid"
    >
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={teamGlow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={teamGlow} stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      {GRID_PATHS.map((d, i) => (
        <path
          key={`grid-${i}`}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={i === GRID_PATHS.length - 1 ? 1.5 : 0.5}
        />
      ))}

      {/* Axis lines */}
      {AXIS_LINES.map((line, i) => (
        <line
          key={`axis-${i}`}
          x1={CX}
          y1={CY}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />
      ))}

      {/* Overlays — rendered BEHIND the main polygon */}
      {cappedOverlays.map((overlay, i) => (
        <path
          key={`overlay-${i}`}
          d={buildPolygonPath(overlay.stats)}
          fill="rgba(148, 163, 184, 0.06)"
          stroke={OVERLAY_STROKES[i] ?? OVERLAY_STROKES[OVERLAY_STROKES.length - 1]}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.9}
        />
      ))}

      {/* Main player polygon — primary green, drawn ON TOP */}
      <path
        d={dataPath}
        fill={`url(#${fillId})`}
        stroke={teamGlow}
        strokeWidth={2}
      />

      {/* Main data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={`point-${i}`}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={teamPrimary}
          stroke={teamGlow}
          strokeWidth={1.5}
        />
      ))}

      {/* Axis labels + main player values */}
      {LABEL_POSITIONS.map((item) => (
        <g key={item.label}>
          <text
            x={item.x}
            y={item.y - 7}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#94a3b8] text-[9px] font-bold tracking-widest"
            style={{ fontFamily: 'var(--font-condensed)' }}
          >
            {item.label}
          </text>
          <text
            x={item.x}
            y={item.y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[13px] font-black"
            style={{ fontFamily: 'var(--font-display)', fill: teamGlow }}
          >
            {stats[item.statKey]}
          </text>
        </g>
      ))}
    </svg>
  )
}
