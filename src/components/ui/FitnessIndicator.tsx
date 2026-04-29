'use client'

import { useTranslations } from 'next-intl'
import { fitnessColorClass } from '@/lib/utils'

interface FitnessIndicatorProps {
  status: 'green' | 'amber' | 'red'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_KEYS: Record<FitnessIndicatorProps['status'], 'fit' | 'monitoring' | 'injured'> = {
  green: 'fit',
  amber: 'monitoring',
  red: 'injured',
}

export default function FitnessIndicator({ status, showLabel = false, size = 'sm' }: FitnessIndicatorProps) {
  const t = useTranslations('fitness')
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
  const label = t(STATUS_KEYS[status])

  return (
    <div className="flex items-center gap-2" role="status" aria-label={t('ariaLabel', { status: label })}>
      <span className={`${sizeClass} rounded-full ${fitnessColorClass(status)} inline-block`} aria-hidden="true" />
      {showLabel && (
        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
      )}
    </div>
  )
}
