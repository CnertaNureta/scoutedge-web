'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

interface TimeUnit {
  value: number
  labelKey: 'days' | 'hours' | 'minutes' | 'seconds'
}

interface CountdownTimerProps {
  targetDate: string
  className?: string
}

function getTimeRemaining(target: Date): TimeUnit[] {
  const now = new Date()
  const diff = Math.max(0, target.getTime() - now.getTime())

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)

  return [
    { value: days, labelKey: 'days' },
    { value: hours, labelKey: 'hours' },
    { value: minutes, labelKey: 'minutes' },
    { value: seconds, labelKey: 'seconds' },
  ]
}

export default function CountdownTimer({ targetDate, className = '' }: CountdownTimerProps) {
  const t = useTranslations('countdown')
  const target = useMemo(() => new Date(targetDate), [targetDate])
  const [units, setUnits] = useState<TimeUnit[]>(getTimeRemaining(target))

  useEffect(() => {
    const interval = setInterval(() => {
      setUnits(getTimeRemaining(target))
    }, 1000)
    return () => clearInterval(interval)
  }, [target])

  const ariaText = units.map((u) => `${u.value} ${t(u.labelKey)}`).join(', ')

  return (
    <div className={`flex items-center gap-3 sm:gap-5 ${className}`} role="timer" aria-label={t('ariaLabel', { time: ariaText })}>
      {units.map((unit, i) => (
        <div key={unit.labelKey} className="flex items-center gap-3 sm:gap-5">
          <div className="flex flex-col items-center">
            <span className="font-headline text-3xl sm:text-5xl md:text-6xl tracking-tight text-on-surface tabular-nums leading-none">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="font-label text-[10px] sm:text-xs text-on-surface-variant uppercase tracking-widest font-medium mt-1">
              {t(unit.labelKey)}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className="font-headline text-2xl sm:text-4xl text-on-surface-variant/40 -mt-4 sm:-mt-5">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
