'use client'

import { useCallback, useState } from 'react'
import { useGeo } from '@/hooks/useGeo'
import {
  type AffiliatePartner,
  type AffiliatePlacement,
  buildAffiliateUrl,
  buildCtaText,
} from '@/lib/affiliates'
import { getAbVariant } from '@/lib/ab-test'
import GlassCard from '@/components/ui/GlassCard'
import NeonAccentBar from '@/components/ui/NeonAccentBar'
import Badge from '@/components/ui/Badge'

interface BettingCTAProps {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  homeWinProb: number
  awayWinProb: number
  drawProb: number
  placement: AffiliatePlacement
  variant?: 'compact' | 'banner' | 'card'
  className?: string
}

function getFavorite(
  homeTeamName: string,
  awayTeamName: string,
  homeWinProb: number,
  awayWinProb: number
): { name: string; prob: number } {
  if (homeWinProb >= awayWinProb) {
    return { name: homeTeamName, prob: homeWinProb }
  }
  return { name: awayTeamName, prob: awayWinProb }
}

function PartnerLogo({ partner }: { partner: AffiliatePartner }) {
  const [imgError, setImgError] = useState(false)
  const initials = partner.name.slice(0, 2).toUpperCase()

  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
      style={{ backgroundColor: `${partner.color}20` }}
    >
      {partner.logo && !imgError ? (
        <img
          src={partner.logo}
          alt={partner.name}
          className="w-full h-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-label text-[10px] font-bold" style={{ color: partner.color }}>
          {initials}
        </span>
      )}
    </div>
  )
}

function getAbCtaText(favoriteName: string): string {
  const variant = getAbVariant('cta-copy')
  switch (variant) {
    case 'see-odds':
      return 'See Odds'
    case 'back-team':
      return `Back ${favoriteName}`
    case 'bet-now':
    default:
      return 'Bet Now'
  }
}

function AgeBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/10 text-on-surface-variant/70">
      18+
    </span>
  )
}

function useTrackClick() {
  return useCallback(
    async (
      partner: AffiliatePartner,
      matchId: string,
      placement: AffiliatePlacement,
      country: string | null,
      usState: string | null
    ) => {
      const abVariant = getAbVariant('cta-copy')
      try {
        const res = await fetch('/api/affiliate-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partnerId: partner.id,
            matchId,
            placement,
            country,
            usState,
            abVariant,
          }),
        })
        const data = await res.json()
        if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank', 'noopener,noreferrer')
        }
      } catch {
        // Fallback: open the URL directly without tracking
        const url = buildAffiliateUrl(partner, placement, matchId)
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    []
  )
}

// ─── Compact variant (inside MatchPredictionCard) ──────────────
function CompactVariant({
  partner,
  favorite,
  matchId,
  placement,
  country,
  usState,
  className,
}: {
  partner: AffiliatePartner
  favorite: { name: string; prob: number }
  matchId: string
  placement: AffiliatePlacement
  country: string | null
  usState: string | null
  className?: string
}) {
  const trackClick = useTrackClick()
  const ctaText = buildCtaText(partner, favorite.name)
  const abButtonText = getAbCtaText(favorite.name)

  return (
    <div className={`mt-3 ${className || ''}`}>
      <button
        onClick={() => trackClick(partner, matchId, placement, country, usState)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/[0.08]
          bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06] transition-all group"
        aria-label={`${ctaText} — ${Math.round(favorite.prob * 100)}% AI confidence`}
      >
        <PartnerLogo partner={partner} />

        <span className="flex-1 text-left text-xs text-on-surface-variant">
          <span className="text-on-surface font-label font-semibold">{ctaText}</span>
          {' · '}
          <span className="text-primary">{Math.round(favorite.prob * 100)}% AI confidence</span>
        </span>

        <AgeBadge />

        <span
          className="px-3 py-1.5 rounded-lg text-[10px] font-label font-bold uppercase tracking-widest
            transition-all"
          style={{
            backgroundColor: `${partner.color}15`,
            color: partner.color,
          }}
        >
          {abButtonText}
        </span>
      </button>

      <p className="text-[8px] text-on-surface-variant/40 mt-1.5 text-center">
        Gambling involves risk.{' '}
        <a href="/affiliate-disclosure" className="underline">
          Affiliate disclosure
        </a>
        .
      </p>
    </div>
  )
}

// ─── Banner variant (between prediction sections) ──────────────
function BannerVariant({
  partners,
  favorite,
  matchId,
  placement,
  country,
  usState,
  className,
}: {
  partners: AffiliatePartner[]
  favorite: { name: string; prob: number }
  matchId: string
  placement: AffiliatePlacement
  country: string | null
  usState: string | null
  className?: string
}) {
  const trackClick = useTrackClick()
  const displayPartners = partners.slice(0, 2)
  const abButtonText = getAbCtaText(favorite.name)

  return (
    <GlassCard className={`p-6 md:p-8 relative overflow-hidden ${className || ''}`}>
      <NeonAccentBar color="#e9c400" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
            <span className="text-lg" aria-hidden="true">
              🏆
            </span>
            <h3 className="font-headline text-sm md:text-base uppercase tracking-tight text-on-surface">
              World Cup AI Picks are live
            </h3>
            <AgeBadge />
          </div>
          <p className="text-xs text-on-surface-variant">
            Bet the matches you just predicted — AI confidence scores included
          </p>
        </div>

        <div className="flex items-center gap-3">
          {displayPartners.map((partner) => (
            <button
              key={partner.id}
              onClick={() => trackClick(partner, matchId, placement, country, usState)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-label text-xs font-bold
                uppercase tracking-widest transition-all hover:opacity-90"
              style={{
                backgroundColor: partner.color,
                color: '#fff',
              }}
              aria-label={`${abButtonText} on ${partner.name}`}
            >
              {abButtonText} on {partner.name}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[8px] text-on-surface-variant/40 mt-4 text-center md:text-left">
        Gambling involves risk. 18+.{' '}
        {partners[0]?.responsibleGamblingText && (
          <>
            <a
              href={partners[0].responsibleGamblingUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {partners[0].responsibleGamblingText}
            </a>
            {' | '}
          </>
        )}
        <a href="/affiliate-disclosure" className="underline">
          Affiliate disclosure
        </a>
        .
      </p>
    </GlassCard>
  )
}

// ─── Card variant (MarketIntel / team pages) ────────────────────
function CardVariant({
  partner,
  favorite,
  matchId,
  placement,
  country,
  usState,
  teamName,
  className,
}: {
  partner: AffiliatePartner
  favorite: { name: string; prob: number }
  matchId: string
  placement: AffiliatePlacement
  country: string | null
  usState: string | null
  teamName?: string
  className?: string
}) {
  const trackClick = useTrackClick()
  const abButtonText = getAbCtaText(favorite.name)

  return (
    <div className={`mt-6 pt-6 border-t border-white/[0.06] ${className || ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-headline text-sm uppercase tracking-tight flex items-center gap-2">
          <span className="text-tertiary" aria-hidden="true">
            ⚡
          </span>
          {teamName ? `${teamName} Tournament Odds` : 'Best Available Odds'}
        </h3>
        <AgeBadge />
      </div>

      <button
        onClick={() => trackClick(partner, matchId, placement, country, usState)}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]
          hover:border-tertiary/30 hover:bg-white/[0.06] transition-all group"
        aria-label={`See ${teamName || favorite.name} odds on ${partner.name}`}
      >
        <PartnerLogo partner={partner} />

        <div className="flex-1 min-w-0 text-left">
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant block">
            {partner.name}
          </span>
          <span className="text-sm text-on-surface">
            See {teamName || favorite.name} tournament odds
          </span>
        </div>

        <span
          className="px-4 py-2 rounded-lg text-xs font-label font-bold uppercase tracking-widest
            transition-all group-hover:opacity-90"
          style={{
            backgroundColor: `${partner.color}15`,
            color: partner.color,
          }}
        >
          {abButtonText} →
        </span>
      </button>

      <p className="text-[8px] text-on-surface-variant/40 mt-2">
        Gambling involves risk. 18+.{' '}
        {partner.responsibleGamblingText && (
          <>
            <a
              href={partner.responsibleGamblingUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {partner.responsibleGamblingText}
            </a>
            {' | '}
          </>
        )}
        <a href="/affiliate-disclosure" className="underline">
          Affiliate disclosure
        </a>
        .
      </p>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────
export default function BettingCTA({
  matchId,
  homeTeamName,
  awayTeamName,
  homeWinProb,
  awayWinProb,
  drawProb: _drawProb,
  placement,
  variant = 'compact',
  className,
}: BettingCTAProps) {
  const { country, usState, isLoading, eligiblePartners } = useGeo()

  // Geo-block: render nothing if no eligible partners or still loading
  if (isLoading || eligiblePartners.length === 0) return null

  const favorite = getFavorite(homeTeamName, awayTeamName, homeWinProb, awayWinProb)

  switch (variant) {
    case 'compact':
      return (
        <CompactVariant
          partner={eligiblePartners[0]}
          favorite={favorite}
          matchId={matchId}
          placement={placement}
          country={country}
          usState={usState}
          className={className}
        />
      )
    case 'banner':
      return (
        <BannerVariant
          partners={eligiblePartners}
          favorite={favorite}
          matchId={matchId}
          placement={placement}
          country={country}
          usState={usState}
          className={className}
        />
      )
    case 'card':
      return (
        <CardVariant
          partner={eligiblePartners[0]}
          favorite={favorite}
          matchId={matchId}
          placement={placement}
          country={country}
          usState={usState}
          teamName={homeTeamName}
          className={className}
        />
      )
  }
}
