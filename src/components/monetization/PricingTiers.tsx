'use client'

import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import { PASS_PRICES, type EntitlementType } from '@/lib/entitlements'
import Link from 'next/link'

interface TierDef {
  type: EntitlementType
  badgeKey?: 'badgeBestValue' | 'badgeForProfessionals'
  highlight?: boolean
  featureKeys: readonly string[]
  noteKey?: 'perMatch' | 'perTeam'
}

const TIERS: TierDef[] = [
  {
    type: 'match_pass',
    featureKeys: ['matchPass.feature1', 'matchPass.feature2', 'matchPass.feature3', 'matchPass.feature4', 'matchPass.feature5'],
    noteKey: 'perMatch',
  },
  {
    type: 'team_pass',
    featureKeys: ['teamPass.feature1', 'teamPass.feature2', 'teamPass.feature3', 'teamPass.feature4', 'teamPass.feature5'],
    noteKey: 'perTeam',
  },
  {
    type: 'tournament_pass',
    badgeKey: 'badgeBestValue',
    highlight: true,
    featureKeys: [
      'tournamentPass.feature1',
      'tournamentPass.feature2',
      'tournamentPass.feature3',
      'tournamentPass.feature4',
      'tournamentPass.feature5',
      'tournamentPass.feature6',
      'tournamentPass.feature7',
    ],
  },
  {
    type: 'scout_pass',
    badgeKey: 'badgeForProfessionals',
    featureKeys: [
      'scoutPass.feature1',
      'scoutPass.feature2',
      'scoutPass.feature3',
      'scoutPass.feature4',
      'scoutPass.feature5',
      'scoutPass.feature6',
      'scoutPass.feature7',
      'scoutPass.feature8',
      'scoutPass.feature9',
    ],
  },
]

export default function PricingTiers() {
  const t = useTranslations('pricingTiers')
  const { user, session } = useAuth()
  const { tier, entitlements } = useEntitlements()
  void entitlements

  return (
    <section className="max-w-6xl mx-auto px-4 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {TIERS.map((tierDef) => (
          <TierCard
            key={tierDef.type}
            tier={tierDef}
            owned={tier === tierDef.type || tierIncludes(tier, tierDef.type)}
            session={session}
            user={user}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-on-surface-variant text-sm mb-2">
          {t('buildingWithData')}
        </p>
        <Link
          href="/docs/api"
          className="text-primary font-label text-xs font-bold uppercase tracking-widest hover:underline"
        >
          {t('seeApiPlans')}
        </Link>
      </div>
    </section>
  )
}

function TierCard({
  tier,
  owned,
  session,
  user,
}: {
  tier: TierDef
  owned: boolean
  session: { access_token: string } | null
  user: unknown
}) {
  const t = useTranslations('pricingTiers')
  const pass = PASS_PRICES[tier.type]

  async function handleCheckout() {
    if (!session?.access_token) return

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ passType: tier.type }),
    })

    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
        tier.highlight
          ? 'border-primary/30 bg-primary/[0.04] shadow-[0_0_60px_rgba(160,212,148,0.06)]'
          : 'border-white/[0.08] bg-white/[0.02]'
      }`}
    >
      {tier.badgeKey && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
          tier.highlight
            ? 'bg-primary text-on-primary'
            : 'bg-tertiary/20 text-tertiary border border-tertiary/20'
        }`}>
          {t(tier.badgeKey)}
        </div>
      )}

      <div className="mb-5">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-1">
          {pass.label}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="font-headline text-3xl font-bold text-on-surface">
            ${(pass.amount / 100).toFixed(2)}
          </span>
          {tier.noteKey && (
            <span className="text-on-surface-variant text-xs">/{t(tier.noteKey)}</span>
          )}
        </div>
        <p className="text-on-surface-variant text-xs mt-1.5 leading-relaxed">
          {pass.description}
        </p>
      </div>

      <ul className="flex-1 space-y-2.5 mb-6">
        {tier.featureKeys.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-on-surface-variant">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary mt-0.5 shrink-0">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t(key)}
          </li>
        ))}
      </ul>

      {owned ? (
        <div className="text-center text-primary font-label text-xs font-bold uppercase tracking-widest py-3">
          {t('active')}
        </div>
      ) : user ? (
        <button
          onClick={handleCheckout}
          className={`w-full py-3 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90 ${
            tier.highlight
              ? 'bg-primary text-on-primary'
              : 'bg-white/[0.08] text-on-surface border border-white/[0.12] hover:bg-white/[0.12]'
          }`}
        >
          {t('getPass', { label: pass.label })}
        </button>
      ) : (
        <Link
          href="/auth/register"
          className={`block w-full text-center py-3 rounded-full font-label text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90 ${
            tier.highlight
              ? 'bg-primary text-on-primary'
              : 'bg-white/[0.08] text-on-surface border border-white/[0.12] hover:bg-white/[0.12]'
          }`}
        >
          {t('signUp')}
        </Link>
      )}
    </div>
  )
}

function tierIncludes(userTier: string, cardTier: EntitlementType): boolean {
  const hierarchy: Record<string, number> = {
    free: 0,
    match_pass: 1,
    team_pass: 2,
    tournament_pass: 3,
    scout_pass: 4,
  }
  return (hierarchy[userTier] ?? 0) > (hierarchy[cardTier] ?? 0)
}
