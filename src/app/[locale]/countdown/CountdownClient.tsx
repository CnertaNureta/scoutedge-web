'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

const TARGET = new Date('2026-06-11T18:00:00Z').getTime()

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calcTimeLeft(): TimeLeft {
  const diff = Math.max(0, TARGET - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="glass-panel rounded-2xl border border-white/[0.08] px-5 py-4 md:px-8 md:py-6 min-w-[80px] md:min-w-[120px] text-center">
        <span className="font-headline text-5xl md:text-7xl tracking-wide text-primary">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="font-label text-[10px] md:text-xs text-on-surface-variant uppercase tracking-widest font-semibold mt-2">
        {label}
      </span>
    </div>
  )
}

export default function CountdownClient() {
  const t = useTranslations('countdownPage')
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTimeLeft(calcTimeLeft())
    const id = setInterval(() => setTimeLeft(calcTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  const labels = [
    { key: 'days' as const, label: t('days') },
    { key: 'hours' as const, label: t('hours') },
    { key: 'minutes' as const, label: t('minutes') },
    { key: 'seconds' as const, label: t('seconds') },
  ]

  if (!timeLeft) {
    return (
      <div className="flex justify-center gap-3 md:gap-6">
        {labels.map(({ key, label }) => (
          <Digit key={key} value={0} label={label} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex justify-center gap-3 md:gap-6">
      <Digit value={timeLeft.days} label={t('days')} />
      <Digit value={timeLeft.hours} label={t('hours')} />
      <Digit value={timeLeft.minutes} label={t('minutes')} />
      <Digit value={timeLeft.seconds} label={t('seconds')} />
    </div>
  )
}
