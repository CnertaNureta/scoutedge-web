import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pro Plans — Premium World Cup Intelligence',
  description: 'Upgrade to ScoutEdge Pro for real-time alerts, advanced AI predictions, and exclusive scouting reports for World Cup 2026.',
}

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    accent: '#c2c9bb',
    features: [
      'All 48 team profiles',
      'Group stage analysis',
      'Basic AI predictions',
      'Community forum access',
      'Daily briefing',
      'Prediction challenge game',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    accent: '#e9c400',
    featured: true,
    features: [
      'Everything in Free',
      'Real-time match alerts',
      'Advanced AI match predictions',
      'Player fitness live tracking',
      'Betting market intelligence',
      'Custom comparison reports',
      'Ad-free experience',
      'Priority access to new features',
    ],
    cta: 'Coming Soon',
    ctaDisabled: true,
  },
  {
    name: 'Team',
    price: '$29.99',
    period: '/month',
    accent: '#a0d494',
    features: [
      'Everything in Pro',
      'API access',
      'Custom data exports',
      'Team collaboration tools',
      'White-label reports',
      'Dedicated support',
    ],
    cta: 'Contact Us',
    ctaDisabled: true,
  },
] as { name: string; price: string; period: string; accent: string; featured?: boolean; features: string[]; cta: string; ctaDisabled: boolean }[]

export default function PricingPage() {
  return (
    <div className="page-container py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary/10 border border-tertiary/30 font-label text-xs font-semibold tracking-widest uppercase mb-6 text-tertiary">
          Pro Intelligence
        </span>
        <h1 className="font-headline text-5xl md:text-7xl tracking-wide uppercase mb-4">
          Choose Your <span className="text-tertiary">Edge</span>
        </h1>
        <p className="text-on-surface-variant text-lg max-w-xl mx-auto">
          Free for everyone. Upgrade to Pro for real-time intelligence and advanced AI predictions during World Cup 2026.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative glass-panel rounded-2xl border overflow-hidden transition-all hover:-translate-y-1 ${
              plan.featured
                ? 'border-tertiary/40 shadow-[0_0_30px_rgba(233,196,0,0.15)]'
                : 'border-white/[0.08]'
            }`}
          >
            {plan.featured && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tertiary/0 via-tertiary to-tertiary/0" />
            )}

            <div className="p-8">
              <h3
                className="font-headline text-xl uppercase tracking-wide mb-2"
                style={{ color: plan.accent }}
              >
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-headline text-4xl text-on-surface">{plan.price}</span>
                <span className="text-on-surface-variant text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.ctaDisabled}
                className={`w-full py-3 rounded-xl font-label font-bold text-sm uppercase tracking-widest transition-all ${
                  plan.featured
                    ? 'bg-tertiary text-on-tertiary opacity-60 cursor-not-allowed'
                    : 'bg-surface-container-high text-on-surface-variant opacity-60 cursor-not-allowed'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-headline text-2xl uppercase tracking-wide text-primary mb-4">Questions?</h2>
        <p className="text-on-surface-variant mb-4">
          Pro features will launch ahead of the World Cup 2026 opening match on June 11.
          Sign up for free now and you will be first in line.
        </p>
        <Link
          href="/"
          className="text-primary font-label font-semibold uppercase tracking-widest text-sm hover:underline"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
