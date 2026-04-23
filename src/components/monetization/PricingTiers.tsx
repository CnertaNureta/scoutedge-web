'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import { PASS_PRICES, type EntitlementType } from '@/lib/entitlements'
import Link from 'next/link'

interface TierDef {
  type: EntitlementType
  badge?: string
  highlight?: boolean
  features: string[]
  note?: string
}

const TIERS: TierDef[] = [
  {
    type: 'match_pass',
    features: [
      'Full AI pre-match analysis',
      'Tactical matchup breakdown',
      'Squad depth & fitness report',
      'Post-match AI analysis',
      '48-hour access window',
    ],
    note: 'Per match',
  },
  {
    type: 'team_pass',
    features: [
      'Complete tactical DNA profile',
      'All player reports for squad',
      'All match passes for that team',
      'Team chemistry analysis',
      'Valid through tournament end',
    ],
    note: 'Per team',
  },
  {
    type: 'tournament_pass',
    badge: 'Best Value',
    highlight: true,
    features: [
      'Everything for all 48 teams',
      'Full daily briefing & alerts',
      'Advanced AI predictions',
      'Market intelligence dashboard',
      'Custom comparison reports',
      'Ad-free experience',
      'Prediction game premium',
    ],
  },
  {
    type: 'scout_pass',
    badge: 'For Professionals',
    features: [
      'Everything in Tournament Pass',
      'Live win probability engine',
      'Tactical shift detection',
      'Bracket simulator',
      'Scout-grade match reports',
      'Player watchlist & alerts',
      'Custom analytics workspace',
      'Data export (CSV/PDF)',
      'Early access to content',
    ],
  },
]

export default function PricingTiers() {
  const { user, session } = useAuth()
  const { tier, entitlements } = useEntitlements()

  return (
    <section className="max-w-6xl mx-auto px-4 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {TIERS.map((t) => (
          <TierCard
            key={t.type}
            tier={t}
            owned={tier === t.type || tierIncludes(tier, t.type)}
            session={session}
            user={user}
          />
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-on-surface-variant text-sm mb-2">
          Building with our data?
        </p>
        <Link
          href="/docs/api"
          className="text-primary font-label text-xs font-bold uppercase tracking-widest hover:underline"
        >
          See API Plans &rarr;
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
      {tier.badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
          tier.highlight
            ? 'bg-primary text-on-primary'
            : 'bg-tertiary/20 text-tertiary border border-tertiary/20'
        }`}>
          {tier.badge}
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
          {tier.note && (
            <span className="text-on-surface-variant text-xs">/{tier.note}</span>
          )}
        </div>
        <p className="text-on-surface-variant text-xs mt-1.5 leading-relaxed">
          {pass.description}
        </p>
      </div>

      <ul className="flex-1 space-y-2.5 mb-6">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-on-surface-variant">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary mt-0.5 shrink-0">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {owned ? (
        <div className="text-center text-primary font-label text-xs font-bold uppercase tracking-widest py-3">
          Active
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
          Get {pass.label}
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
          Sign up
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
