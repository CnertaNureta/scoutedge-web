'use client'

import { useEffect, useId, useRef, useState } from 'react'

interface TeamRadarStats {
  atk: number // 0-99
  mid: number
  def: number
  chm: number
  exp: number
  fit: number
}

interface TeamRadarProps {
  stats: TeamRadarStats
  teamGlow: string
  teamPrimary: string
}

const LABELS = ['ATK', 'MID', 'DEF', 'CHM', 'EXP', 'FIT'] as const
const STAT_KEYS: (keyof TeamRadarStats)[] = ['atk', 'mid', 'def', 'chm', 'exp', 'fit']

const CX = 150
const CY = 150
const MAX_R = 110
const ANGLE_STEP = 360 / 6
const RINGS = [0.2, 0.4, 0.6, 0.8, 1.0]

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

export type { TeamRadarStats }

export default function TeamRadar({ stats, teamGlow, teamPrimary }: TeamRadarProps) {
  const [animated, setAnimated] = useState(false)
  const ref = useRef<SVGSVGElement>(null)
  const svgId = useId()

  const fillId = `teamRadarFill-${svgId}`
  const glowId = `teamRadarGlow-${svgId}`

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

  const ariaDescription = STAT_KEYS
    .map((key, i) => `${LABELS[i]}: ${stats[key]}`)
    .join(', ')

  return (
    <svg
      ref={ref}
      viewBox="0 0 300 300"
      className="w-full max-w-[280px] mx-auto"
      role="img"
      aria-label={`Team tactical radar chart. ${ariaDescription}`}
    >
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

      {GRID_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={i === GRID_PATHS.length - 1 ? 1.5 : 0.5}
        />
      ))}

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

      <path
        d={dataPath}
        fill={`url(#${fillId})`}
        stroke={teamGlow}
        strokeWidth={2}
        filter={`url(#${glowId})`}
        className="transition-all duration-1000 ease-out"
      />

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

      {LABEL_POSITIONS.map((item) => (
        <g key={item.label}>
          <text
            x={item.x}
            y={item.y - 7}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-on-surface-variant text-xs font-bold tracking-widest"
            style={{ fontFamily: 'var(--font-label)' }}
          >
            {item.label}
          </text>
          <text
            x={item.x}
            y={item.y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[13px] font-black"
            style={{ fontFamily: 'var(--font-headline)', fill: teamGlow }}
          >
            {animated ? stats[item.statKey] : 0}
          </text>
        </g>
      ))}
    </svg>
  )
}
