'use client'

import AnimatedNumber from './AnimatedNumber'
import { BRAND } from '@/lib/brand-tokens'

interface StatItem {
  label: string
  value: number
  suffix?: string
  prefix?: string
  decimals?: number
}

interface StatsRibbonProps {
  stats: StatItem[]
  accentColor?: string
  className?: string
}

export default function StatsRibbon({
  stats,
  accentColor = BRAND.primary,
  className = '',
}: StatsRibbonProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:justify-between gap-6 lg:gap-0">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex flex-col items-center text-center lg:flex-1 ${
              i > 0 ? 'lg:border-l' : ''
            }`}
            style={i > 0 ? { borderColor: `color-mix(in srgb, ${accentColor} 15%, transparent)` } : undefined}
          >
            <AnimatedNumber
              value={stat.value}
              suffix={stat.suffix}
              prefix={stat.prefix}
              decimals={stat.decimals ?? 0}
              className="font-headline text-4xl md:text-5xl tracking-tight"
              style={{ color: accentColor }}
            />
            <span className="font-label text-[10px] md:text-xs text-on-surface-variant uppercase tracking-widest font-medium mt-1.5">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
