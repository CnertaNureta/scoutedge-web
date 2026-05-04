'use client'

import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import { PASS_PRICES, type EntitlementType } from '@/lib/entitlements'
import { Link } from '@/i18n/navigation'

interface TierDef {
  type: EntitlementType
  badgeKey?: 'badgeBestValue' | 'badgeForProfessionals'
  highlight?: boolean
  featureKeys: readonly string[]
  noteKey?: 'perMatch' | 'perTeam'
}

const RETAIL_TIERS: TierDef[] = [
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
]

const PRO_TIER: TierDef = {
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
}

export default function PricingTiers() {
  const t = useTranslations('pricingTiers')
  const { user, session } = useAuth()
  const { tier, entitlements } = useEntitlements()
  void entitlements

  return (
    <section className="max-w-6xl mx-auto px-4 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 xl:gap-6 items-stretch">
        <FreeTierCard />
        {RETAIL_TIERS.map((tierDef) => (
          <TierCard
            key={tierDef.type}
            tier={tierDef}
            owned={tier === tierDef.type || tierIncludes(tier, tierDef.type)}
            session={session}
            user={user}
          />
        ))}
      </div>

      <ProfessionalPanel
        owned={tier === PRO_TIER.type}
        session={session}
        user={user}
      />

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

function FreeTierCard() {
  const t = useTranslations('pricingTiers.freeTier')
  return (
    <div className="relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6">
      <div className="mb-5">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-1">{t('label')}</h3>
        <div className="flex items-baseline gap-1">
          <span className="font-headline text-3xl font-bold text-on-surface">{t('price')}</span>
        </div>
        <p className="text-on-surface-variant text-xs mt-1.5 leading-relaxed">{t('description')}</p>
      </div>
      <ul className="flex-1 space-y-2.5 mb-6">
        <FeatureLine label={t('feature1')} />
        <FeatureLine label={t('feature2')} />
        <FeatureLine label={t('feature3')} />
      </ul>
      <Link
        href="/predictions"
        className="block w-full text-center py-3 rounded-full font-label text-xs font-bold uppercase tracking-widest bg-white/[0.06] text-on-surface border border-white/[0.1] hover:bg-white/[0.1] transition-colors"
      >
        {t('cta')} &rarr;
      </Link>
    </div>
  )
}

function FeatureLine({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-on-surface-variant">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary mt-0.5 shrink-0">
        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </li>
  )
}

function ProfessionalPanel({
  owned,
  session,
  user,
}: {
  owned: boolean
  session: { access_token: string } | null
  user: unknown
}) {
  const t = useTranslations('pricingTiers')
  const proT = useTranslations('pricingTiers.proPanel')
  const pass = PASS_PRICES[PRO_TIER.type]

  async function handleCheckout() {
    if (!session?.access_token) return
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ passType: PRO_TIER.type }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  return (
    <section className="mt-16 rounded-2xl border border-tertiary/30 bg-gradient-to-br from-tertiary/[0.04] via-transparent to-tertiary/[0.02] p-6 md:p-10">
      <div className="md:grid md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 mb-6 md:mb-0">
          <span className="inline-flex rounded-full bg-tertiary/15 border border-tertiary/30 px-3 py-1 mb-4 text-tertiary font-label text-[10px] font-bold uppercase tracking-[0.2em]">
            {t('badgeForProfessionals')}
          </span>
          <h3 className="font-headline text-2xl md:text-3xl font-bold text-on-surface uppercase tracking-tight mb-3">
            {proT('heading')}
          </h3>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-6">{proT('intro')}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:hello@kickoracle.com?subject=Scout%20Pass%20demo"
              className="inline-block bg-tertiary text-on-tertiary font-label text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              {proT('demoButton')} &rarr;
            </a>
            <a
              href="/sample/kickoracle-scout-pass-sample.csv"
              className="inline-block border border-white/15 text-on-surface font-label text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-full hover:bg-white/[0.05] transition-colors"
            >
              {proT('csvSample')}
            </a>
          </div>
        </div>

        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-tertiary/20 bg-tertiary/[0.04] p-5 flex flex-col">
            <p className="font-label text-xs font-bold uppercase tracking-widest text-tertiary mb-2">
              {proT('individual')}
            </p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="font-headline text-3xl font-bold text-on-surface">
                ${(pass.amount / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-on-surface-variant text-xs mb-4 leading-relaxed">{pass.description}</p>
            <ul className="flex-1 space-y-2 mb-5 text-sm text-on-surface-variant">
              {PRO_TIER.featureKeys.slice(0, 5).map((key) => (
                <FeatureLine key={key} label={t(key)} />
              ))}
            </ul>
            {owned ? (
              <div className="text-center text-tertiary font-label text-xs font-bold uppercase tracking-widest py-3">
                {t('active')}
              </div>
            ) : user ? (
              <button
                onClick={handleCheckout}
                className="w-full py-3 rounded-full font-label text-xs font-bold uppercase tracking-widest bg-tertiary text-on-tertiary hover:opacity-90"
              >
                {t('getPass', { label: pass.label })}
              </button>
            ) : (
              <Link
                href="/auth/register"
                className="block w-full text-center py-3 rounded-full font-label text-xs font-bold uppercase tracking-widest bg-tertiary text-on-tertiary hover:opacity-90"
              >
                {t('signUp')}
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col">
            <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              {proT('teamLicense')}
            </p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="font-headline text-3xl font-bold text-on-surface">{proT('teamLicensePrice')}</span>
              <span className="text-on-surface-variant text-xs">/ {proT('teamLicenseSeats')}</span>
            </div>
            <p className="text-on-surface-variant text-xs mb-4 leading-relaxed">{proT('teamLicenseDesc')}</p>
            <ul className="flex-1 space-y-2 mb-5 text-sm text-on-surface-variant">
              <FeatureLine label={t('scoutPass.feature7')} />
              <FeatureLine label={t('scoutPass.feature8')} />
              <FeatureLine label={t('scoutPass.feature9')} />
            </ul>
            <a
              href="mailto:hello@kickoracle.com?subject=Team%20License"
              className="block w-full text-center py-3 rounded-full font-label text-xs font-bold uppercase tracking-widest border border-white/15 text-on-surface hover:bg-white/[0.05]"
            >
              {proT('demoButton')}
            </a>
          </div>
        </div>
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
      className={`relative flex flex-col rounded-2xl border transition-all ${
        tier.highlight
          ? 'border-primary/40 bg-primary/[0.06] shadow-[0_0_80px_rgba(160,212,148,0.1)] p-7 md:p-8 xl:scale-[1.04] xl:z-10 ring-1 ring-primary/20'
          : 'border-white/[0.08] bg-white/[0.02] p-6'
      }`}
    >
      {tier.badgeKey && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
          tier.highlight
            ? 'bg-primary text-on-primary shadow-[0_4px_20px_rgba(160,212,148,0.4)]'
            : 'bg-tertiary/20 text-tertiary border border-tertiary/20'
        }`}>
          {t(tier.badgeKey)}
        </div>
      )}

      <div className="mb-5">
        <h3 className={`font-headline font-bold text-on-surface mb-1 ${tier.highlight ? 'text-xl' : 'text-lg'}`}>
          {pass.label}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className={`font-headline font-bold text-on-surface ${tier.highlight ? 'text-4xl' : 'text-3xl'}`}>
            ${(pass.amount / 100).toFixed(2)}
          </span>
          {tier.noteKey && (
            <span className="text-on-surface-variant text-xs">/{t(tier.noteKey)}</span>
          )}
        </div>
        <p className="text-on-surface-variant text-xs mt-1.5 leading-relaxed">
          {pass.description}
        </p>
        {tier.type === 'tournament_pass' && (
          <div className="mt-3 space-y-1">
            <p className="text-secondary text-[11px] font-label uppercase tracking-widest font-semibold">
              {t('tournamentAnchor')} · {t('tournamentPaybackHint')}
            </p>
            <p className="text-on-surface-variant/80 text-[11px]">
              {t('tournamentSavings')}
            </p>
          </div>
        )}
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
