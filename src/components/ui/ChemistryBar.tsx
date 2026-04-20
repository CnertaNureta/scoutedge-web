import { chemistryColor } from '@/lib/utils'
import { BRAND } from '@/lib/brand-tokens'

interface ChemistryBarProps {
  value: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function barGradient(value: number): string {
  if (value >= 70) return `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryFixed})`
  if (value >= 50) return `linear-gradient(90deg, ${BRAND.onPrimaryContainer}, ${BRAND.primary})`
  if (value >= 35) return `linear-gradient(90deg, ${BRAND.tertiary}, ${BRAND.tertiaryFixed})`
  return `linear-gradient(90deg, ${BRAND.secondary}, ${BRAND.secondaryFixed})`
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
      <div
        className={`w-full bg-white/[0.06] ${height} rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${value} out of 100` : `${value} out of 100`}
      >
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
