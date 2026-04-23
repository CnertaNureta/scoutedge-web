import type { Metadata } from 'next'
import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import SectionHeader from '@/components/ui/SectionHeader'

export const metadata: Metadata = {
  title: 'Developer Portal — KickOracle B2B Data API',
  description:
    'Access World Cup 2026 match data, AI predictions, team signals, and market probabilities through the KickOracle API. Built for sports media, analytics platforms, and intelligence teams.',
  openGraph: {
    title: 'KickOracle Developer Portal',
    description: 'World Cup 2026 intelligence API for sports media and analytics.',
  },
}

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/v1/matches',
    description: 'Live & upcoming match schedules with venue, broadcast, and status',
  },
  {
    method: 'GET',
    path: '/v1/matches/:id/predictions',
    description: 'AI-generated match outcome probabilities and score projections',
  },
  {
    method: 'GET',
    path: '/v1/standings',
    description: 'Group and knockout stage standings with tiebreaker detail',
  },
  {
    method: 'GET',
    path: '/v1/teams/:slug/signals',
    description: 'Real-time news, social sentiment, and injury signals per team',
  },
  {
    method: 'GET',
    path: '/v1/market-probabilities',
    description: 'Aggregated consensus probabilities with movement history',
  },
  {
    method: 'GET',
    path: '/v1/predictions/rankings',
    description: 'Tournament power rankings with Elo and composite scoring',
  },
] as const

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

const TIERS: TierInfo[] = [
  {
    name: 'Basic',
    price: '$5,000',
    period: '/mo',
    badge: 'outline',
    limits: '10K requests/mo',
    rateLimit: '60 req/min',
    popular: false,
    features: [
      'Match schedules & results',
      'Standings & group tables',
      'Team profiles & rosters',
      'Basic predictions',
    ],
  },
  {
    name: 'Advanced',
    price: '$15,000',
    period: '/mo',
    badge: 'primary',
    limits: '100K requests/mo',
    rateLimit: '120 req/min',
    popular: true,
    features: [
      'Everything in Basic',
      'AI prediction models',
      'News & social signals',
      'Market probability aggregation',
      'Historical data access',
      'Webhook notifications',
    ],
  },
  {
    name: 'Event Pass',
    price: '$25,000',
    period: ' one-time',
    badge: 'tertiary',
    limits: 'Unlimited requests',
    rateLimit: '200 req/min',
    popular: false,
    features: [
      'Everything in Advanced',
      'Full tournament coverage',
      'No monthly commitment',
      'Valid through July 20, 2026',
      'Priority support',
    ],
  },
]

export default function DevelopersPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[160px]" />
        <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-tertiary/6 blur-[140px]" />
        <div className="absolute inset-0 pitch-lines opacity-15 pointer-events-none" />
        <div className="page-container relative">
          <Badge variant="primary" size="md">B2B DATA API</Badge>
          <h1 className="mt-6 font-headline text-5xl md:text-7xl lg:text-8xl tracking-wide uppercase text-on-surface">
            World Cup 2026
            <br />
            <span className="gradient-text">Intelligence API</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-on-surface-variant font-body leading-relaxed">
            Match data, AI predictions, team signals, and market probabilities — delivered
            through a single REST API built for sports media, analytics platforms,
            and sports intelligence teams.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:bg-primary-fixed transition-colors"
            >
              View API Reference
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/dashboard/api"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-on-surface rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors"
            >
              Get API Key
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-16 flex flex-wrap gap-6 md:gap-10">
            {[
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '<100ms', label: 'P95 Latency' },
              { value: '50+', label: 'Data Sources' },
              { value: '104', label: 'Matches Covered' },
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
          <SectionHeader as="h2" withRule>Quick Start</SectionHeader>
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <StepCard step={1} title="Get your API key">
                Sign up and generate a key from the{' '}
                <Link href="/dashboard/api" className="text-primary hover:underline">
                  API dashboard
                </Link>
                . Keys are provisioned instantly after checkout.
              </StepCard>
              <StepCard step={2} title="Make your first request">
                All endpoints require a Bearer token. Responses are JSON with
                consistent envelope format.
              </StepCard>
              <StepCard step={3} title="Go live">
                Monitor usage, rotate keys, and manage billing from the dashboard.
                Rate limits scale with your tier.
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
          <SectionHeader as="h2" withRule>Endpoints</SectionHeader>
          <p className="mt-4 text-on-surface-variant font-body max-w-2xl">
            15 endpoints covering the complete World Cup 2026 data surface.
            All responses follow a consistent JSON envelope.
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
              See full API reference
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24">
        <div className="page-container">
          <SectionHeader as="h2" withRule>Pricing</SectionHeader>
          <p className="mt-4 text-on-surface-variant font-body max-w-2xl">
            Transparent pricing with no hidden fees. All plans include full API access
            at their tier level with instant key provisioning.
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
                      Popular
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
                  Get Started
                </Link>
              </GlassCard>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-on-surface-variant font-body">
            Need a custom plan or white-label solution?{' '}
            <a href="mailto:api@kickoracle.com" className="text-primary hover:underline">
              Contact our team
            </a>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-surface-container-lowest/50">
        <div className="page-container">
          <SectionHeader as="h2" withRule>Built for Production</SectionHeader>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={'\u{1F9E0}'}
              title="AI Predictions"
              description="Composite models blending Elo, form, and social signals for match outcome probabilities updated in real time."
            />
            <FeatureCard
              icon={'\u{1F4E1}'}
              title="Real-Time Signals"
              description="Injury reports, lineup changes, news sentiment, and social buzz aggregated from 50+ sources per team."
            />
            <FeatureCard
              icon={'\u{1F4CA}'}
              title="Consensus Probability Signals"
              description="Pre-match and in-play probability signals from market consensus sources with movement history and edge detection."
            />
            <FeatureCard
              icon={'\u26A1'}
              title="Low Latency"
              description="Edge-cached responses with sub-100ms P95 latency. Rate limits scale with your tier."
            />
            <FeatureCard
              icon={'\u{1F514}'}
              title="Webhook Events"
              description="Subscribe to match kickoff, goal, lineup, and prediction update events via webhooks."
            />
            <FeatureCard
              icon={'\u{1F4D6}'}
              title="OpenAPI 3.1"
              description="Full OpenAPI spec with interactive Redoc documentation. Generate typed clients in any language."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32">
        <div className="page-container text-center">
          <h2 className="font-display text-4xl md:text-6xl text-on-surface">
            Start building <span className="text-primary">today</span>
          </h2>
          <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl mx-auto">
            Free sandbox key available for evaluation. Production keys provisioned
            instantly after checkout.
          </p>
          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard/api"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:bg-primary-fixed transition-colors"
            >
              Get API Key
            </Link>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-on-surface rounded-xl font-label font-bold text-sm uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-colors"
            >
              Read the Docs
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
