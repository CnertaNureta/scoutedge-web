import { fitnessColorClass } from '@/lib/utils'

interface FitnessIndicatorProps {
  status: 'green' | 'amber' | 'red'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_LABELS: Record<string, string> = {
  green: 'FIT',
  amber: 'MONITORING',
  red: 'INJURED',
}

export default function FitnessIndicator({ status, showLabel = false, size = 'sm' }: FitnessIndicatorProps) {
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div className="flex items-center gap-2" role="status" aria-label={`Fitness: ${STATUS_LABELS[status]}`}>
      <span className={`${sizeClass} rounded-full ${fitnessColorClass(status)} inline-block`} aria-hidden="true" />
      {showLabel && (
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {STATUS_LABELS[status]}
        </span>
      )}
    </div>
  )
}
