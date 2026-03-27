'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { usePaywallTracking } from '@/hooks/usePaywallTracking'

export type PaywallVariant = 'article' | 'data' | 'signal'

interface PaywallProps {
  children: React.ReactNode
  /** What to show as a teaser before the paywall */
  preview?: React.ReactNode
  /** Label for what's being gated */
  feature?: string
  /** Controls CTA messaging */
  variant?: PaywallVariant
}

const VARIANT_COPY: Record<PaywallVariant, { description: string }> = {
  article: {
    description: 'Get Pro for AI-powered analysis before every match.',
  },
  data: {
    description: 'Win probabilities, edge detection, and detailed breakdowns.',
  },
  signal: {
    description: 'Breaking signals delivered to Pro subscribers in real time.',
  },
}

export default function Paywall({
  children,
  preview,
  feature = 'Premium Content',
  variant = 'article',
}: PaywallProps) {
  const { user } = useAuth()
  const { isPro, loading } = useSubscription()
  const { trackCtaClick } = usePaywallTracking(feature, variant)

  if (loading) {
    return (
      <div className="animate-pulse">
        {preview}
        <div className="h-32 bg-surface-container rounded-2xl mt-4" />
      </div>
    )
  }

  if (isPro) {
    return <>{children}</>
  }

  const copy = VARIANT_COPY[variant]

  return (
    <div className="relative" role="region" aria-label="Premium content">
      {preview && (
        <div className="relative">
          {preview}
          <div
            className="absolute bottom-0 left-0 right-0 h-[200px]
              bg-gradient-to-t from-surface-dim via-surface-dim/95 to-transparent
              pointer-events-none"
          />
        </div>
      )}

      <div className="relative glass-panel rounded-2xl border border-tertiary/20 p-6 md:p-8 text-center max-w-md mx-auto -mt-16">
        {/* Lock icon */}
        <div
          className="w-12 h-12 mx-auto mb-4 rounded-full bg-tertiary/15 border border-tertiary/30
            flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-tertiary" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3" y="9" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 9V6a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <h3 className="font-headline text-lg uppercase tracking-tight mb-2">
          Unlock {feature}
        </h3>
        <p className="text-on-surface-variant text-sm mb-5 max-w-sm mx-auto">
          {copy.description}
        </p>

        {user ? (
          <Link
            href="/pricing"
            onClick={trackCtaClick}
            className="inline-block w-full sm:w-auto px-8 py-3 rounded-xl bg-tertiary text-on-tertiary
              font-label text-sm font-bold uppercase tracking-widest
              hover:opacity-90 transition-opacity shadow-[0_8px_40px_rgba(233,196,0,0.2)]"
          >
            Get Pro Access — $9.99/mo
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/login"
              onClick={trackCtaClick}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-tertiary text-on-tertiary
                font-label text-sm font-bold uppercase tracking-widest text-center
                hover:opacity-90 transition-opacity shadow-[0_8px_40px_rgba(233,196,0,0.2)]"
            >
              Sign In
            </Link>
            <Link
              href="/pricing"
              onClick={trackCtaClick}
              className="w-full sm:w-auto px-8 py-3 rounded-xl border border-white/[0.12]
                text-on-surface-variant font-label text-sm font-bold uppercase tracking-widest text-center
                hover:border-tertiary/30 hover:text-tertiary transition-all"
            >
              View Plans
            </Link>
          </div>
        )}

        <p className="text-on-surface-variant text-[10px] mt-3">
          or $29.99 for the entire tournament · 7-day money-back guarantee
        </p>
      </div>
    </div>
  )
}
