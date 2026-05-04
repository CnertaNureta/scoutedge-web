'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

const STORAGE_KEY = 'subscriptionBannerDismissed'

export default function SubscriptionBanner() {
  const t = useTranslations('subscriptionBanner')
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) setDismissed(false)
  }, [])

  function dismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  if (dismissed) return null

  return (
    <div className="rounded-2xl border border-secondary/30 bg-gradient-to-r from-secondary/[0.06] via-tertiary/[0.04] to-secondary/[0.06] p-5 md:p-6 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex-1">
          <p className="font-headline text-base md:text-lg font-bold text-on-surface uppercase tracking-tight mb-1">
            {t('headline')}
          </p>
          <p className="text-on-surface-variant text-sm leading-relaxed">{t('subheadline')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/subscribe"
            className="bg-secondary text-on-secondary font-label text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            {t('cta')} &rarr;
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('dismiss')}
            className="text-on-surface-variant/60 hover:text-on-surface-variant text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
