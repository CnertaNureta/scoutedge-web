'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import { BRAND } from '@/lib/brand-tokens'

const STORAGE_KEY = 'kickoracle-newsletter-email'

export default function NewsletterSignup({ variant = 'inline' }: { variant?: 'inline' | 'banner' }) {
  const t = useTranslations('newsletter')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError(t('errorEmail'))
      return
    }

    try {
      const existing = JSON.parse(localStorage.getItem('kickoracle-subscribers') || '[]')
      if (!existing.includes(email)) {
        existing.push(email)
        localStorage.setItem('kickoracle-subscribers', JSON.stringify(existing))
      }
      localStorage.setItem(STORAGE_KEY, email)
    } catch {}

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <GlassCard className={`${variant === 'banner' ? 'p-8 md:p-12' : 'p-6'} text-center relative overflow-hidden`}>
        <NeonAccentBar color={BRAND.primary} />
        <div className="text-2xl mb-2">{'✅'}</div>
        <h3 className="font-headline text-lg uppercase tracking-tight mb-1">{t('successTitle')}</h3>
        <p className="text-on-surface-variant text-sm">
          {t('successMessage')} <span className="text-primary">{email}</span>
        </p>
      </GlassCard>
    )
  }

  if (variant === 'banner') {
    return (
      <GlassCard className="p-8 md:p-12 relative overflow-hidden">
        <NeonAccentBar color={BRAND.tertiary} />
        <div className="md:flex items-center gap-8">
          <div className="flex-1 mb-6 md:mb-0">
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mb-2">
              {t('title')}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {t('bannerDescription')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex-shrink-0 flex flex-col sm:flex-row gap-3 min-w-0 md:w-[400px]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder')}
              className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity shrink-0"
            >
              {t('button')}
            </button>
          </form>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-5 relative overflow-hidden">
      <NeonAccentBar color={BRAND.tertiary} />
      <h3 className="font-headline text-base uppercase tracking-tight mb-2">{t('inlineTitle')}</h3>
      <p className="text-on-surface-variant text-xs mb-3">
        {t('inlineDescription')}
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholder')}
          className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          className="bg-primary text-on-primary font-label text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
        >
          {t('go')}
        </button>
      </form>
      {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
    </GlassCard>
  )
}
