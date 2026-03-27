'use client'

import { useState, useEffect, useRef } from 'react'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import Badge from '@/components/ui/Badge'

export interface Bookmaker {
  name: string
  logoUrl: string
  odds: string
  affiliateUrl: string
  promoText?: string
}

interface ValueBetInfo {
  bestOdds: string
  bestBookmaker: string
  edge: number
}

type Region = 'us' | 'uk' | 'latam' | 'global'

interface AffiliateCTAProps {
  variant: 'inline' | 'match-card' | 'compact' | 'sticky'
  bookmakers?: Bookmaker[]
  matchContext?: {
    homeTeam: string
    awayTeam: string
    homeWinProb: number
    awayWinProb: number
  }
  valueBet?: ValueBetInfo
  teamSlug?: string
  region?: Region // V2: geo-targeted bookmakers. Defaults to 'us' for V1 launch.
}

// V1 launch partners (confirmed by CEO 2026-03-26)
// Affiliate URLs are placeholders — replace with real tracking URLs when accounts are provisioned
const DEFAULT_BOOKMAKERS: Bookmaker[] = [
  {
    name: 'Bet365',
    logoUrl: '/affiliates/bet365.svg',
    odds: '+850',
    affiliateUrl: 'https://www.bet365.com/#/AS/B1/', // placeholder
    promoText: 'Bet $5, Get $150',
  },
  {
    name: 'FanDuel',
    logoUrl: '/affiliates/fanduel.svg',
    odds: '+800',
    affiliateUrl: 'https://www.fanduel.com/sportsbook', // placeholder
    promoText: 'Bet $5, Get $200 in Bonus Bets',
  },
  {
    name: 'DraftKings',
    logoUrl: '/affiliates/draftkings.svg',
    odds: '+825',
    affiliateUrl: 'https://www.draftkings.com/sportsbook', // placeholder
  },
]

function Disclaimer() {
  return (
    <p className="text-[9px] text-on-surface-variant/50 mt-4 leading-relaxed">
      18+ | Gamble responsibly |{' '}
      <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="underline">
        BeGambleAware.org
      </a>{' '}
      | Odds subject to change | T&amp;Cs apply | Ad
    </p>
  )
}

function BookmakerLogo({ name }: { name: string }) {
  // Fallback to initials when logo images aren't available
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div className="w-10 h-10 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
      <span className="font-label text-xs font-bold text-on-surface-variant">{initials}</span>
    </div>
  )
}

// ─── Inline variant (MarketIntel section) ────────────────────────

function InlineVariant({ bookmakers, valueBet, teamSlug }: {
  bookmakers: Bookmaker[]
  valueBet?: ValueBetInfo
  teamSlug?: string
}) {
  return (
    <div className="mt-6 pt-6 border-t border-white/[0.06]">
      <h3 className="font-headline text-sm uppercase tracking-tight mb-4 flex items-center gap-2">
        <span className="text-tertiary" aria-hidden="true">⚡</span>
        Best Available Odds
      </h3>

      {valueBet && valueBet.edge > 3 && (
        <div className="mb-4 p-4 rounded-xl border border-primary/30 bg-primary/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="primary" size="sm">Value Bet</Badge>
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              {valueBet.edge.toFixed(1)}% edge detected
            </span>
          </div>
          <p className="text-sm text-on-surface">
            {valueBet.bestBookmaker} offers{' '}
            <span className="font-mono font-bold text-primary">{valueBet.bestOdds}</span> —
            our model suggests this is undervalued.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {bookmakers.map((bk) => (
          <a
            key={bk.name}
            href={bk.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-affiliate-bookmaker={bk.name}
            data-affiliate-odds={bk.odds}
            data-affiliate-context="inline"
            data-affiliate-team={teamSlug}
            aria-label={`Bet at ${bk.odds} on ${bk.name}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]
              hover:border-tertiary/30 hover:bg-white/[0.06] transition-all group"
          >
            <BookmakerLogo name={bk.name} />

            <div className="flex-1 min-w-0">
              <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                {bk.name}
              </span>
              {bk.promoText && (
                <span className="block text-tertiary text-[10px] font-label uppercase tracking-widest mt-0.5">
                  {bk.promoText}
                </span>
              )}
            </div>

            <span className="font-mono text-lg font-bold text-on-surface">{bk.odds}</span>

            <span
              className="px-4 py-2 rounded-lg bg-tertiary/15 text-tertiary text-xs font-label font-bold
                uppercase tracking-widest group-hover:bg-tertiary group-hover:text-on-tertiary transition-all"
            >
              Bet Now →
            </span>
          </a>
        ))}
      </div>

      <Disclaimer />
    </div>
  )
}

// ─── Match-card variant (below ProbabilityBar) ───────────────────

function MatchCardVariant({ bookmakers, teamSlug }: {
  bookmakers: Bookmaker[]
  teamSlug?: string
}) {
  // Find best odds (highest positive number from American odds string)
  const bestIdx = bookmakers.reduce((best, bk, i) => {
    const current = parseInt(bk.odds.replace('+', ''), 10) || 0
    const bestVal = parseInt(bookmakers[best].odds.replace('+', ''), 10) || 0
    return current > bestVal ? i : best
  }, 0)

  return (
    <div className="mt-4">
      <h3 className="font-headline text-sm uppercase tracking-tight mb-3 flex items-center gap-2">
        <span className="text-tertiary" aria-hidden="true">⚡</span>
        Place Your Bet
      </h3>

      <div className="grid grid-cols-3 gap-3">
        {bookmakers.slice(0, 3).map((bk, i) => (
          <a
            key={bk.name}
            href={bk.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-affiliate-bookmaker={bk.name}
            data-affiliate-odds={bk.odds}
            data-affiliate-context="match-card"
            data-affiliate-team={teamSlug}
            aria-label={`Bet at ${bk.odds} on ${bk.name}`}
            className="relative text-center p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]
              hover:border-tertiary/30 hover:bg-white/[0.06] transition-all group"
          >
            {i === bestIdx && (
              <span className="absolute -top-2 -right-2">
                <Badge variant="tertiary" size="sm">Best</Badge>
              </span>
            )}

            <BookmakerLogo name={bk.name} />
            <span className="font-mono text-xl font-bold text-on-surface block mt-2 mb-2">{bk.odds}</span>
            <span className="text-[10px] font-label font-bold uppercase tracking-widest text-tertiary
              group-hover:text-on-tertiary transition-colors">
              Bet Now
            </span>
          </a>
        ))}
      </div>

      <Disclaimer />
    </div>
  )
}

// ─── Compact variant (sidebar / player pages) ────────────────────

function CompactVariant({ bookmakers, teamSlug }: {
  bookmakers: Bookmaker[]
  teamSlug?: string
}) {
  const bk = bookmakers[0]
  if (!bk) return null

  return (
    <GlassCard className="p-5 relative overflow-hidden">
      <NeonAccentBar color="#e9c400" />
      <h3 className="font-headline text-sm uppercase tracking-tight mb-3 flex items-center gap-2">
        <span className="text-tertiary" aria-hidden="true">🎯</span>
        Bet on This Match
      </h3>

      <div className="flex items-center gap-3 mb-3">
        <BookmakerLogo name={bk.name} />
        <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">{bk.name}</span>
        <span className="font-mono text-lg font-bold text-on-surface ml-auto">{bk.odds}</span>
      </div>

      <a
        href={bk.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-affiliate-bookmaker={bk.name}
        data-affiliate-odds={bk.odds}
        data-affiliate-context="compact"
        data-affiliate-team={teamSlug}
        aria-label={`${bk.promoText || 'Bet Now'} on ${bk.name}`}
        className="block w-full text-center py-3 rounded-xl bg-tertiary text-on-tertiary
          font-label text-xs font-bold uppercase tracking-widest
          hover:opacity-90 transition-opacity"
      >
        {bk.promoText || 'Bet Now →'}
      </a>

      <p className="text-[9px] text-on-surface-variant/50 mt-3 leading-relaxed">
        18+ | T&amp;Cs apply | Ad
      </p>
    </GlassCard>
  )
}

// ─── Sticky variant (mobile match pages) ─────────────────────────

function StickyVariant({ bookmakers, teamSlug, triggerRef }: {
  bookmakers: Bookmaker[]
  teamSlug?: string
  triggerRef?: React.RefObject<HTMLElement | null>
}) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!triggerRef?.current || dismissed) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky when the inline CTA scrolls out of view
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(triggerRef.current)
    return () => observer.disconnect()
  }, [triggerRef, dismissed])

  const bk = bookmakers[0]
  if (!bk || dismissed || !visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40
        bg-surface-dim/95 backdrop-blur-xl border-t border-white/[0.08]
        px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="complementary"
      aria-label="Betting promotion"
    >
      <div className="flex items-center gap-3 max-w-[1440px] mx-auto">
        <BookmakerLogo name={bk.name} />

        <div className="flex-1 min-w-0">
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant block">
            {bk.name}
          </span>
          <span className="font-mono text-lg font-bold text-on-surface">{bk.odds}</span>
        </div>

        <a
          href={bk.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          data-affiliate-bookmaker={bk.name}
          data-affiliate-odds={bk.odds}
          data-affiliate-context="sticky"
          data-affiliate-team={teamSlug}
          className="bg-tertiary text-on-tertiary px-6 py-2.5 rounded-full
            font-label text-xs font-bold uppercase tracking-widest
            hover:opacity-90 transition-opacity shrink-0"
        >
          Bet Now
        </a>

        <button
          onClick={() => setDismissed(true)}
          className="w-11 h-11 flex items-center justify-center text-on-surface-variant/50
            hover:text-on-surface-variant transition-colors shrink-0"
          aria-label="Dismiss betting prompt"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="text-[8px] text-on-surface-variant/40 mt-1 text-center">
        18+ | Gamble responsibly | Ad
      </p>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────

export default function AffiliateCTA({
  variant,
  bookmakers = DEFAULT_BOOKMAKERS,
  valueBet,
  teamSlug,
}: AffiliateCTAProps) {
  switch (variant) {
    case 'inline':
      return <InlineVariant bookmakers={bookmakers} valueBet={valueBet} teamSlug={teamSlug} />
    case 'match-card':
      return <MatchCardVariant bookmakers={bookmakers} teamSlug={teamSlug} />
    case 'compact':
      return <CompactVariant bookmakers={bookmakers} teamSlug={teamSlug} />
    case 'sticky':
      return <StickyVariant bookmakers={bookmakers} teamSlug={teamSlug} />
  }
}

export { StickyVariant as AffiliateStickyWrapper }
