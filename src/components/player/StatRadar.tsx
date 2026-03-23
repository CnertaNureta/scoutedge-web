'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { DerivedStats } from '@/lib/player-derived-stats'

interface StatRadarProps {
  stats: DerivedStats
  teamGlow: string
  teamPrimary: string
}

const LABELS = ['PAC', 'SHO', 'PAS', 'PHY', 'DEF', 'OVR'] as const
const STAT_KEYS: (keyof DerivedStats)[] = ['pace', 'shooting', 'passing', 'physical', 'defense', 'overall']

const CX = 150
const CY = 150
const MAX_R = 110
const ANGLE_STEP = 360 / 6
const RINGS = [0.2, 0.4, 0.6, 0.8, 1.0]

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// Static geometry — computed once at module load
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

export default function StatRadar({ stats, teamGlow, teamPrimary }: StatRadarProps) {
  const [animated, setAnimated] = useState(false)
  const ref = useRef<SVGSVGElement>(null)
  const svgId = useId()

  const fillId = `radarFill-${svgId}`
  const glowId = `radarGlow-${svgId}`

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const values = STAT_KEYS.map((key) => stats[key] / 99)
  const dataPoints = values.map((v, i) => {
    const r = MAX_R * (animated ? v : 0)
    return polarToCart(CX, CY, r, i * ANGLE_STEP)
  })
  const dataPath = `M${dataPoints.map((p) => `${p.x},${p.y}`).join('L')}Z`

  return (
    <svg ref={ref} viewBox="0 0 300 300" className="w-full max-w-[320px] mx-auto">
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={teamGlow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={teamGlow} stopOpacity="0.08" />
        </radialGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {GRID_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={i === GRID_PATHS.length - 1 ? 1.5 : 0.5}
        />
      ))}

      {/* Axis lines */}
      {AXIS_LINES.map((line, i) => (
        <line
          key={i}
          x1={CX}
          y1={CY}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill={`url(#${fillId})`}
        stroke={teamGlow}
        strokeWidth={2}
        filter={`url(#${glowId})`}
        className="transition-all duration-1000 ease-out"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={animated ? p.x : CX}
          cy={animated ? p.y : CY}
          r={4}
          fill={teamPrimary}
          stroke={teamGlow}
          strokeWidth={1.5}
          className="transition-all duration-1000 ease-out"
        />
      ))}

      {/* Labels + values */}
      {LABEL_POSITIONS.map((item) => (
        <g key={item.label}>
          <text
            x={item.x}
            y={item.y - 7}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#94a3b8] text-[9px] font-bold tracking-widest"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            {item.label}
          </text>
          <text
            x={item.x}
            y={item.y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[13px] font-black"
            style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', fill: teamGlow }}
          >
            {animated ? stats[item.statKey] : 0}
          </text>
        </g>
      ))}
    </svg>
  )
}
