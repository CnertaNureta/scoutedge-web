'use client'

import { useTranslations } from 'next-intl'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'
import { useState } from 'react'

const TIERS = [
  {
    id: 'basic' as const,
    price: '$5,000/mo',
    mode: 'subscription' as const,
    featureKeys: ['basicReqMin', 'basicReqMonth', 'basicEndpoints'] as const,
  },
  {
    id: 'advanced' as const,
    price: '$15,000/mo',
    mode: 'subscription' as const,
    featureKeys: ['advancedReqMin', 'advancedReqMonth', 'advancedEndpoints', 'advancedExtras'] as const,
  },
  {
    id: 'event' as const,
    price: '$25,000',
    mode: 'payment' as const,
    featureKeys: ['eventReqMin', 'eventUnlimited', 'eventFull', 'eventTournament'] as const,
  },
  {
    id: 'whitelabel' as const,
    price: 'Custom',
    mode: 'custom' as const,
    featureKeys: ['whitelabelReqMin', 'whitelabelUnlimited', 'whitelabelExport', 'whitelabelBranding'] as const,
  },
]

interface Props {
  currentTier: string
}

export default function PlanTab({ currentTier }: Props) {
  const t = useTranslations('apiPlanTab')
  const { apiFetch } = useApi()
  const { toast } = useToast()
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  async function handleUpgrade(tierId: string) {
    if (tierId === 'whitelabel') {
      window.open('mailto:api@kickoracle.com?subject=White Label API Inquiry', '_blank')
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
      toast(t('checkoutFailed'), 'destructive')
    } finally {
      setCheckingOut(null)
    }
  }

  const currentConfig = TIERS.find((tier) => tier.id === currentTier)

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      {currentConfig && (
        <div className="neon-border-card rounded-2xl p-[1px]">
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-display text-4xl md:text-5xl text-primary uppercase">{t(`tiers.${currentConfig.id}`)}</p>
                <p className="font-mono text-2xl font-bold text-on-surface mt-1">{currentConfig.price}</p>
              </div>
              <Badge variant="primary" size="md">{t('current')}</Badge>
            </div>
            <p className="font-body text-sm text-on-surface-variant">
              {currentConfig.featureKeys.map((k) => t(`features.${k}`)).join('  ·  ')}
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://billing.stripe.com/p/login/test"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                {t('manageInStripe')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div>
        <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface mb-4">
          {currentConfig ? t('availablePlans') : t('choosePlan')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TIERS.map((tier) => {
            const isCurrent = tier.id === currentTier
            return (
              <GlassCard
                key={tier.id}
                className={`p-5 md:p-6 flex flex-col ${isCurrent ? 'ring-1 ring-primary/30 bg-primary/[0.03]' : ''}`}
              >
                <h3 className="font-headline text-lg font-bold uppercase text-on-surface">{t(`tiers.${tier.id}`)}</h3>
                <p className="font-mono text-xl font-bold text-primary mt-1">{tier.price}</p>
                {tier.mode === 'payment' && (
                  <p className="font-body text-xs text-on-surface-variant">{t('oneTime')}</p>
                )}
                <div className="h-px bg-outline-variant my-3" />
                <ul className="font-body text-sm text-on-surface-variant space-y-2 flex-1">
                  {tier.featureKeys.map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span> {t(`features.${k}`)}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <Badge variant="primary" size="md">{t('currentPlan')}</Badge>
                  ) : tier.mode === 'custom' ? (
                    <button onClick={() => handleUpgrade(tier.id)} className="btn-secondary w-full text-sm">
                      {t('contactSales')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(tier.id)}
                      disabled={checkingOut === tier.id}
                      className="btn-primary w-full text-sm"
                    >
                      {checkingOut === tier.id ? t('loading') : currentTier === 'none' ? t('getStarted') : t('switchPlan')}
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
