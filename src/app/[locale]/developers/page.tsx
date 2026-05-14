import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { OG_LOCALES } from '@/lib/og-utils'
import { buildAlternates } from '@/lib/seo/build-alternates'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'developersPage' })
  return {
    title: t('heroTitle1') + ' ' + t('heroTitle2'),
    description: t('heroDescription'),
    alternates: buildAlternates(locale, '/developers'),
    openGraph: {
      title: t('heroTitle1') + ' ' + t('heroTitle2'),
      description: t('heroDescription'),
      locale: OG_LOCALES[locale] ?? 'en_US',
    },
  }
}

interface TierInfo {
  name: string
  price: string
  period: string
  badge: 'primary' | 'secondary' | 'tertiary' | 'outline'
  limits: string
  rateLimit: string
  popular: boolean
  features: string[]
}

export default async function DevelopersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('developersPage')

  const ENDPOINTS = [
    { method: 'GET', path: '/v1/matches', description: t('endpointMatches') },
    { method: 'GET', path: '/v1/matches/:id/predictions', description: t('endpointPredictions') },
    { method: 'GET', path: '/v1/standings', description: t('endpointStandings') },
    { method: 'GET', path: '/v1/teams/:slug/signals', description: t('endpointSignals') },
    { method: 'GET', path: '/v1/market-probabilities', description: t('endpointMarket') },
    { method: 'GET', path: '/v1/predictions/rankings', description: t('endpointRankings') },
  ] as const

  const TIERS: TierInfo[] = [
    {
      name: t('tierBasic'),
      price: '$5,000',
      period: '/mo',
      badge: 'outline',
      limits: '10K requests/mo',
      rateLimit: '60 req/min',
      popular: false,
      features: [
        t('tierBasicFeature1'),
        t('tierBasicFeature2'),
        t('tierBasicFeature3'),
        t('tierBasicFeature4'),
      ],
    },
    {
      name: t('tierAdvanced'),
      price: '$15,000',
      period: '/mo',
      badge: 'primary',
      limits: '100K requests/mo',
      rateLimit: '120 req/min',
      popular: true,
      features: [
        t('tierAdvancedFeature1'),
        t('tierAdvancedFeature2'),
        t('tierAdvancedFeature3'),
        t('tierAdvancedFeature4'),
        t('tierAdvancedFeature5'),
        t('tierAdvancedFeature6'),
      ],
    },
    {
      name: t('tierEventPass'),
      price: '$25,000',
      period: ' one-time',
      badge: 'tertiary',
      limits: 'Unlimited requests',
      rateLimit: '200 req/min',
      popular: false,
      features: [
        t('tierEventPassFeature1'),
        t('tierEventPassFeature2'),
        t('tierEventPassFeature3'),
        t('tierEventPassFeature4'),
        t('tierEventPassFeature5'),
      ],
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[160px]" />
        <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[140px]" />
        <div className="absolute inset-0 pitch-lines opacity-15 pointer-events-none" />
        <div className="page-container relative">
          <Badge variant="primary" size="md">{t('badge')}</Badge>
          <h1 className="mt-6 font-headline text-5xl md:text-7xl lg:text-8xl tracking-wide uppercase text-on-surface">
            {t('heroTitle1')}
            <br />
            <span className="gradient-text">{t('heroTitle2')}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-on-surface-variant font-body leading-relaxed">
            {t('heroDescription')}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:bg-primary-fixed transition-colors"
            >
              {t('viewApiReference')}
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/dashboard/api"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-on-surface rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors"
            >
              {t('getApiKey')}
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-16 flex flex-wrap gap-6 md:gap-10">
            {[
              { value: '99.9%', label: t('uptimeSla') },
              { value: '<100ms', label: t('p95Latency') },
              { value: '50+', label: t('dataSources') },
              { value: '104', label: t('matchesCovered') },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="block font-mono text-2xl md:text-3xl font-bold text-primary">{stat.value}</span>
                <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 md:py-24">
        <div className="page-container">
          <SectionHeader as="h2" withRule>{t('quickStart')}</SectionHeader>
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <StepCard step={1} title={t('step1Title')}>
                {t('step1Desc')}
              </StepCard>
              <StepCard step={2} title={t('step2Title')}>
                {t('step2Desc')}
              </StepCard>
              <StepCard step={3} title={t('step3Title')}>
                {t('step3Desc')}
              </StepCard>
            </div>
            <GlassCard className="p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.08]">
                <span className="w-3 h-3 rounded-full bg-secondary/60" />
                <span className="w-3 h-3 rounded-full bg-tertiary/60" />
                <span className="w-3 h-3 rounded-full bg-primary/60" />
                <span className="ml-3 font-mono text-xs text-on-surface-variant">curl</span>
              </div>
              <pre className="p-5 overflow-x-auto text-sm leading-relaxed font-mono text-on-surface">
                <code>{`curl https://api.kickoracle.com/v1/matches \\
  -H "Authorization: Bearer se_live_..." \\
  -H "Accept: application/json"

{
  "success": true,
  "data": [
    {
      "id": "match_2026wc_001",
      "home": "Mexico",
      "away": "Canada",
      "kickoff": "2026-06-11T21:00:00Z",
      "venue": "Estadio Azteca",
      "stage": "Group A",
      "status": "scheduled"
    }
  ],
  "meta": { "total": 104, "page": 1 }
}`}</code>
              </pre>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="py-16 md:py-24 bg-surface-container-lowest/50">
        <div className="page-container">
          <SectionHeader as="h2" withRule>{t('endpoints')}</SectionHeader>
          <p className="mt-4 text-on-surface-variant font-body max-w-2xl">
            {t('endpointsDesc')}
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {ENDPOINTS.map((ep) => (
              <GlassCard key={ep.path} hover className="p-5">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded bg-primary/15 text-primary font-mono text-xs font-bold">
                    {ep.method}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-on-surface truncate">{ep.path}</p>
                    <p className="mt-1 text-sm text-on-surface-variant font-body">
                      {ep.description}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 text-primary font-label font-bold text-sm uppercase tracking-widest hover:underline"
            >
              {t('seeFullApiRef')}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24">
        <div className="page-container">
          <SectionHeader as="h2" withRule>{t('pricing')}</SectionHeader>
          <p className="mt-4 text-on-surface-variant font-body max-w-2xl">
            {t('pricingDesc')}
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <GlassCard
                key={tier.name}
                hover
                className={`p-6 md:p-8 flex flex-col ${
                  tier.popular ? 'ring-1 ring-primary/30' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge variant={tier.badge} size="md">{tier.name}</Badge>
                  {tier.popular && (
                    <span className="text-[10px] font-label font-bold uppercase tracking-widest text-primary">
                      {t('popular')}
                    </span>
                  )}
                </div>
                <div className="mt-6">
                  <span className="font-display text-4xl md:text-5xl text-on-surface">
                    {tier.price}
                  </span>
                  <span className="text-sm text-on-surface-variant font-body">{tier.period}</span>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-on-surface-variant font-mono">
                  <span>{tier.limits}</span>
                  <span className="text-white/20">|</span>
                  <span>{tier.rateLimit}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm font-body text-on-surface-variant">
                      <span className="mt-1 text-primary text-xs">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard/api?tab=billing"
                  className={`mt-8 block text-center px-6 py-3 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-colors ${
                    tier.popular
                      ? 'bg-primary text-on-primary hover:bg-primary-fixed'
                      : 'border border-white/20 text-on-surface hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {t('getStarted')}
                </Link>
              </GlassCard>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-on-surface-variant font-body">
            {t('customPlanText')}{' '}
            <a href="mailto:api@kickoracle.com" className="text-primary hover:underline">
              {t('contactTeam')}
            </a>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-surface-container-lowest/50">
        <div className="page-container">
          <SectionHeader as="h2" withRule>{t('builtForProduction')}</SectionHeader>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={'\u{1F9E0}'}
              title={t('featureAiPredictions')}
              description={t('featureAiPredictionsDesc')}
            />
            <FeatureCard
              icon={'\u{1F4E1}'}
              title={t('featureRealTimeSignals')}
              description={t('featureRealTimeSignalsDesc')}
            />
            <FeatureCard
              icon={'\u{1F4CA}'}
              title={t('featureConsensusProbability')}
              description={t('featureConsensusProbabilityDesc')}
            />
            <FeatureCard
              icon={'⚡'}
              title={t('featureLowLatency')}
              description={t('featureLowLatencyDesc')}
            />
            <FeatureCard
              icon={'\u{1F514}'}
              title={t('featureWebhookEvents')}
              description={t('featureWebhookEventsDesc')}
            />
            <FeatureCard
              icon={'\u{1F4D6}'}
              title={t('featureOpenApi')}
              description={t('featureOpenApiDesc')}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32">
        <div className="page-container text-center">
          <h2 className="font-display text-4xl md:text-6xl text-on-surface">
            {t('startBuildingToday')}
          </h2>
          <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl mx-auto">
            {t('startBuildingDesc')}
          </p>
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard/api"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:bg-primary-fixed transition-colors"
            >
              {t('getApiKey')}
            </Link>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-on-surface rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors"
            >
              {t('readTheDocs')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function StepCard({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center font-mono text-sm text-primary font-bold">
        {step}
      </div>
      <div>
        <h3 className="font-headline text-lg font-bold text-on-surface">{title}</h3>
        <p className="mt-1 text-sm text-on-surface-variant font-body leading-relaxed">{children}</p>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <GlassCard hover className="p-6">
      <span className="text-2xl">{icon}</span>
      <h3 className="mt-3 font-headline text-lg font-bold text-on-surface">{title}</h3>
      <p className="mt-2 text-sm text-on-surface-variant font-body leading-relaxed">{description}</p>
    </GlassCard>
  )
}
