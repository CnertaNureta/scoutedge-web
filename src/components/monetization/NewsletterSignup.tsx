'use client'

import { useState } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'

/**
 * Email newsletter signup component.
 * Stores emails in localStorage for now.
 * When a mailing provider (Mailchimp, Resend, etc.) is configured,
 * replace the localStorage logic with an API call.
 */

const STORAGE_KEY = 'scoutedge-newsletter-email'

export default function NewsletterSignup({ variant = 'inline' }: { variant?: 'inline' | 'banner' }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    // Store locally until a real provider is configured
    try {
      const existing = JSON.parse(localStorage.getItem('scoutedge-subscribers') || '[]')
      if (!existing.includes(email)) {
        existing.push(email)
        localStorage.setItem('scoutedge-subscribers', JSON.stringify(existing))
      }
      localStorage.setItem(STORAGE_KEY, email)
    } catch {}

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <GlassCard className={`${variant === 'banner' ? 'p-8 md:p-12' : 'p-6'} text-center relative overflow-hidden`}>
        <NeonAccentBar color="#a0d494" />
        <div className="text-2xl mb-2">{'\u2705'}</div>
        <h3 className="font-headline text-lg uppercase tracking-tight mb-1">You&apos;re In!</h3>
        <p className="text-on-surface-variant text-sm">
          You&apos;ll receive daily World Cup intelligence at <span className="text-primary">{email}</span>
        </p>
      </GlassCard>
    )
  }

  if (variant === 'banner') {
    return (
      <GlassCard className="p-8 md:p-12 relative overflow-hidden">
        <NeonAccentBar color="#e9c400" />
        <div className="md:flex items-center gap-8">
          <div className="flex-1 mb-6 md:mb-0">
            <h2 className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-tight mb-2">
              Daily Intelligence Briefing
            </h2>
            <p className="text-on-surface-variant text-sm">
              Get AI-powered World Cup 2026 analysis delivered to your inbox every morning.
              Team updates, injury news, prediction shifts, and match previews.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex-shrink-0 flex flex-col sm:flex-row gap-3 min-w-0 md:w-[400px]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              type="submit"
              className="bg-primary text-on-primary font-label text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity shrink-0"
            >
              Subscribe
            </button>
          </form>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </GlassCard>
    )
  }

  // Inline compact variant
  return (
    <GlassCard className="p-5 relative overflow-hidden">
      <NeonAccentBar color="#e9c400" />
      <h3 className="font-headline text-base uppercase tracking-tight mb-2">Daily Briefing Email</h3>
      <p className="text-on-surface-variant text-xs mb-3">
        AI intelligence delivered daily. Free.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          className="bg-primary text-on-primary font-label text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
        >
          Go
        </button>
      </form>
      {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
    </GlassCard>
  )
}
