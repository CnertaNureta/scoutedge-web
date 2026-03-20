'use client'

import { useEffect, useRef, useState } from 'react'
import type { DerivedStats } from '@/lib/player-derived-stats'

interface StatRadarProps {
  stats: DerivedStats
  teamGlow: string
  teamPrimary: string
}

const LABELS = ['PAC', 'SHO', 'PAS', 'PHY', 'DEF', 'OVR'] as const
const STAT_KEYS: (keyof DerivedStats)[] = ['pace', 'shooting', 'passing', 'physical', 'defense', 'overall']

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function StatRadar({ stats, teamGlow, teamPrimary }: StatRadarProps) {
  const [animated, setAnimated] = useState(false)
  const ref = useRef<SVGSVGElement>(null)

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

  const cx = 150
  const cy = 150
  const maxR = 110
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]
  const angleStep = 360 / 6

  const gridPaths = rings.map((scale) => {
    const r = maxR * scale
    const points = Array.from({ length: 6 }, (_, i) => {
      const p = polarToCart(cx, cy, r, i * angleStep)
      return `${p.x},${p.y}`
    })
    return `M${points.join('L')}Z`
  })

  const axisLines = Array.from({ length: 6 }, (_, i) => {
    const p = polarToCart(cx, cy, maxR, i * angleStep)
    return { x2: p.x, y2: p.y }
  })

  const values = STAT_KEYS.map((key) => stats[key] / 99)
  const dataPoints = values.map((v, i) => {
    const r = maxR * (animated ? v : 0)
    return polarToCart(cx, cy, r, i * angleStep)
  })
  const dataPath = `M${dataPoints.map((p) => `${p.x},${p.y}`).join('L')}Z`

  const labelPositions = LABELS.map((label, i) => {
    const p = polarToCart(cx, cy, maxR + 22, i * angleStep)
    return { label, x: p.x, y: p.y, value: stats[STAT_KEYS[i]] }
  })

  return (
    <svg ref={ref} viewBox="0 0 300 300" className="w-full max-w-[320px] mx-auto">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={teamGlow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={teamGlow} stopOpacity="0.08" />
        </radialGradient>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {gridPaths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={i === gridPaths.length - 1 ? 1.5 : 0.5}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="url(#radarFill)"
        stroke={teamGlow}
        strokeWidth={2}
        filter="url(#radarGlow)"
        className="transition-all duration-1000 ease-out"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={animated ? p.x : cx}
          cy={animated ? p.y : cy}
          r={4}
          fill={teamPrimary}
          stroke={teamGlow}
          strokeWidth={1.5}
          className="transition-all duration-1000 ease-out"
        />
      ))}

      {/* Labels + values */}
      {labelPositions.map((item) => (
        <g key={item.label}>
          <text
            x={item.x}
            y={item.y - 7}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-[#c2c9bb] text-[9px] font-bold tracking-widest"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {item.label}
          </text>
          <text
            x={item.x}
            y={item.y + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[13px] font-black"
            style={{ fontFamily: 'Epilogue, sans-serif', fill: teamGlow }}
          >
            {animated ? item.value : 0}
          </text>
        </g>
      ))}
    </svg>
  )
}
