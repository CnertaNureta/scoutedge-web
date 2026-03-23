import { chemistryColor } from '@/lib/utils'

interface ChemistryBarProps {
  value: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function barGradient(value: number): string {
  if (value >= 70) return 'linear-gradient(90deg, #00ff87, #04f5ff)'
  if (value >= 50) return 'linear-gradient(90deg, #04f5ff, #3b82f6)'
  if (value >= 35) return 'linear-gradient(90deg, #ffd700, #f59e0b)'
  return 'linear-gradient(90deg, #ff4081, #ef4444)'
}

export default function ChemistryBar({ value, label, showValue = true, size = 'md' }: ChemistryBarProps) {
  const height = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-3'

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="font-label text-xs text-on-surface-variant uppercase tracking-widest font-medium">{label}</span>}
          {showValue && (
            <span className="font-mono text-sm font-bold" style={{ color: chemistryColor(value) }}>
              {value}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-white/[0.06] ${height} rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full animate-bar-fill`}
          style={{
            '--bar-width': `${value}%`,
            width: `${value}%`,
            background: barGradient(value),
          } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
