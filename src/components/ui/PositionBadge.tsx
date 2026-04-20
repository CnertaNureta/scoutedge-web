import { POSITION_HEX } from '@/lib/brand-tokens'

interface PositionBadgeProps {
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  variant?: 'dot' | 'pill' | 'border'
  className?: string
}

const POSITION_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  GK:  { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  DEF: { bg: 'bg-blue-500/15',  text: 'text-blue-400',  border: 'border-blue-500/30',  dot: 'bg-blue-400' },
  MID: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  FWD: { bg: 'bg-red-500/15',  text: 'text-red-400',  border: 'border-red-500/30',  dot: 'bg-red-400' },
}

export function getPositionColor(position: string): string {
  return POSITION_HEX[position as keyof typeof POSITION_HEX] ?? POSITION_HEX.MID
}

export default function PositionBadge({ position, variant = 'pill', className = '' }: PositionBadgeProps) {
  const colors = POSITION_COLORS[position] ?? POSITION_COLORS.MID

  if (variant === 'dot') {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${colors.dot} ${className}`}
        aria-label={position}
      />
    )
  }

  if (variant === 'border') {
    return (
      <span
        className={`inline-block w-[3px] h-full rounded-full ${colors.dot} ${className}`}
        aria-label={position}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {position}
    </span>
  )
}
