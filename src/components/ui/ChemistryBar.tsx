'use client'

import { chemistryColorClass } from '@/lib/utils'

interface ChemistryBarProps {
  value: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ChemistryBar({ value, label, showValue = true, size = 'md' }: ChemistryBarProps) {
  const height = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-3'

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest">{label}</span>}
          {showValue && <span className="font-mono text-sm text-on-surface font-bold">{value}</span>}
        </div>
      )}
      <div className={`w-full bg-surface-container-highest ${height} rounded-full overflow-hidden`}>
        <div
          className={`${chemistryColorClass(value)} ${height} rounded-full animate-bar-fill`}
          style={{ '--bar-width': `${value}%`, width: `${value}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
