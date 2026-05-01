'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

const KICKOFF_DATE = new Date('2026-06-11T16:00:00-07:00')
const FINAL_DATE = new Date('2026-07-25T20:00:00-04:00')

function getDaysUntilKickoff(): number {
  const now = new Date()
  const diff = KICKOFF_DATE.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function shouldShow(): boolean {
  const now = new Date()
  return now < FINAL_DATE
}

export default function CountdownStrip() {
  const t = useTranslations('urgencyStrip')
  const [days, setDays] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!shouldShow()) return
    if (typeof window !== 'undefined' && window.localStorage.getItem('urgencyStripDismissed') === '1') {
      setDismissed(true)
      return
    }
    setDays(getDaysUntilKickoff())
    const interval = setInterval(() => setDays(getDaysUntilKickoff()), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (dismissed || days === null) return null

  let kickoffText: string
  if (days < 0) {
    kickoffText = t('kickoffLive')
  } else if (days === 0) {
    kickoffText = t('kickoffToday')
  } else {
    kickoffText = `${t('kickoffPrefix')} ${days} ${t('kickoffSuffixDays')}`
  }

  function dismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('urgencyStripDismissed', '1')
    }
  }

  return (
    <div className="bg-gradient-to-r from-primary/15 via-secondary/10 to-primary/15 border-b border-white/10 backdrop-blur-sm">
      <div className="max-w-[1440px] mx-auto px-4 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <p className="flex items-center gap-2 text-on-surface flex-1 min-w-0">
          <span aria-hidden="true">⏱</span>
          <span className="font-medium truncate">{kickoffText}</span>
          <span className="text-on-surface-variant hidden sm:inline">·</span>
          <span className="text-on-surface-variant hidden sm:inline truncate">
            {t('tournamentPass')}{' '}
            <span className="text-on-surface-variant/70">{t('priceRiseHint')}</span>
          </span>
        </p>
        <Link
          href="/pricing"
          className="font-label text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 whitespace-nowrap"
        >
          {t('ctaLabel')}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('dismiss')}
          className="text-on-surface-variant/60 hover:text-on-surface-variant text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  )
}
