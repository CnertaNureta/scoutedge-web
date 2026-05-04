'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import { BRAND } from '@/lib/brand-tokens'

type SubscribeSource = 'homepage' | 'article' | 'popup' | 'hero'

export default function NewsletterSignup({
  variant = 'inline',
  source = 'homepage',
}: {
  variant?: 'inline' | 'banner' | 'hero'
  source?: SubscribeSource
}) {
  const t = useTranslations('newsletter')
  const heroT = useTranslations('hero')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError(t('errorEmail'))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })

      if (res.status === 409) {
        setError(t('alreadySubscribed'))
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || t('errorGeneric'))
        return
      }

      setSubmitted(true)
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    if (variant === 'hero') {
      return (
        <div className="text-center max-w-xl mx-auto">
          <div className="text-3xl mb-3">{'✅'}</div>
          <h3 className="font-headline text-xl uppercase tracking-tight mb-1 text-on-surface">{t('successTitle')}</h3>
          <p className="text-on-surface-variant text-sm">
            {t('successMessage')} <span className="text-primary">{email}</span>
          </p>
        </div>
      )
    }
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

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-xl mx-auto text-center">
        <p className="font-label text-xs uppercase tracking-widest text-secondary mb-3">
          {heroT('emailCaptureHeadline')}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('placeholder')}
            aria-label="Email address"
            className="flex-1 bg-white/[0.08] border border-white/15 rounded-full px-5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/60 focus:bg-white/[0.12] transition-colors backdrop-blur"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,200,150,0.4)] transition-all shrink-0 disabled:opacity-50"
          >
            {loading ? '...' : t('button')}
          </button>
        </form>
        <p className="text-on-surface-variant/70 text-xs mt-3">
          {heroT('emailCaptureSub')}
        </p>
        {error && <p className="text-red-400 text-xs mt-2" role="alert">{error}</p>}
      </div>
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
              disabled={loading}
              className="bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
            >
              {loading ? '...' : t('button')}
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
          disabled={loading}
          className="bg-primary text-on-primary font-label text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? '...' : t('go')}
        </button>
      </form>
      {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
    </GlassCard>
  )
}
