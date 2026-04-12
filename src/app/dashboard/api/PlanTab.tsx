'use client'

import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import { useState } from 'react'

const TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$5,000/mo',
    mode: 'subscription' as const,
    features: ['60 req/min', '10K requests/mo', 'Predictions, Teams, Standings'],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price: '$15,000/mo',
    mode: 'subscription' as const,
    features: ['120 req/min', '100K requests/mo', 'Full endpoint access', 'Signals, Chemistry, Odds'],
  },
  {
    id: 'event',
    name: 'Event Pass',
    price: '$25,000',
    mode: 'payment' as const,
    features: ['200 req/min', 'Unlimited (30 days)', 'Full access', 'Tournament window'],
  },
  {
    id: 'whitelabel',
    name: 'White Label',
    price: 'Custom',
    mode: 'custom' as const,
    features: ['300+ req/min', 'Unlimited', 'Raw data export', 'Custom branding'],
  },
]

interface Props {
  currentTier: string
}

export default function PlanTab({ currentTier }: Props) {
  const { apiFetch } = useApi()
  const { toast } = useToast()
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  async function handleUpgrade(tierId: string) {
    if (tierId === 'whitelabel') {
      window.open('mailto:api@worldcapiq.com?subject=White Label API Inquiry', '_blank')
      return
    }
    setCheckingOut(tierId)
    try {
      const data = await apiFetch('/api/checkout/api-subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: tierId }),
      })
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      toast('Failed to start checkout', 'destructive')
    } finally {
      setCheckingOut(null)
    }
  }

  const currentConfig = TIERS.find((t) => t.id === currentTier)

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      {currentConfig && (
        <div className="neon-border-card rounded-2xl p-[1px]">
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-display text-4xl md:text-5xl text-primary uppercase">{currentConfig.name}</p>
                <p className="font-mono text-2xl font-bold text-on-surface mt-1">{currentConfig.price}</p>
              </div>
              <Badge variant="primary" size="md">Current</Badge>
            </div>
            <p className="font-body text-sm text-on-surface-variant">
              {currentConfig.features.join('  ·  ')}
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://billing.stripe.com/p/login/test"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                Manage in Stripe ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div>
        <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface mb-4">
          {currentConfig ? 'Available Plans' : 'Choose a Plan'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TIERS.map((tier) => {
            const isCurrent = tier.id === currentTier
            return (
              <GlassCard
                key={tier.id}
                className={`p-5 md:p-6 flex flex-col ${isCurrent ? 'ring-1 ring-primary/30 bg-primary/[0.03]' : ''}`}
              >
                <h3 className="font-headline text-lg font-bold uppercase text-on-surface">{tier.name}</h3>
                <p className="font-mono text-xl font-bold text-primary mt-1">{tier.price}</p>
                {tier.mode === 'payment' && (
                  <p className="font-body text-xs text-on-surface-variant">one-time</p>
                )}
                <div className="h-px bg-outline-variant my-3" />
                <ul className="font-body text-sm text-on-surface-variant space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <Badge variant="primary" size="md">Current Plan</Badge>
                  ) : tier.mode === 'custom' ? (
                    <button onClick={() => handleUpgrade(tier.id)} className="btn-secondary w-full text-sm">
                      Contact Sales
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={checkingOut === tier.id}
                      className="btn-primary w-full text-sm"
                    >
                      {checkingOut === tier.id ? 'Loading...' : currentTier === 'none' ? 'Get Started' : 'Switch Plan'}
                    </button>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}
