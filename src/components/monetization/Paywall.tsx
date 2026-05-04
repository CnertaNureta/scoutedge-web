'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEntitlements } from '@/hooks/useEntitlements'
import { PASS_PRICES, type ContentType, type EntitlementType } from '@/lib/entitlements'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

interface PaywallProps {
  children: React.ReactNode
  contentType: ContentType
  scope?: string
  previewLines?: number
  className?: string
}

export default function Paywall({
  children,
  contentType,
  scope,
  previewLines = 3,
  className = '',
}: PaywallProps) {
  const { user } = useAuth()
  const { hasAccess, loading, error, suggestUpgrade } = useEntitlements()
  const t = useTranslations('paywall')

  if (loading) {
    return (
      <div className={className}>
        <div
          className="overflow-hidden"
          style={{ maxHeight: `${previewLines * 1.75}rem` }}
        >
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: previewLines }, (_, i) => (
              <div
                key={i}
                className="h-4 bg-on-surface/5 rounded"
                style={{ width: `${85 - i * 10}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (hasAccess(contentType, scope)) {
    return <div className={className}>{children}</div>
  }

  const target = suggestUpgrade(contentType)
  const pass = PASS_PRICES[target]

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative overflow-hidden"
        style={{ maxHeight: `${previewLines * 1.75}rem` }}
      >
        {children}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/95 to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-8 pt-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-tertiary/10 border border-tertiary/20 px-3 py-1 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-tertiary">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
          </svg>
          <span className="text-tertiary font-label text-[11px] font-bold uppercase tracking-widest">
            {t('premiumBadge')}
          </span>
        </div>

        <h3 className="text-on-surface font-headline text-lg font-bold mb-2">
          {getGateHeadline(contentType, t)}
        </h3>

        <p className="text-on-surface-variant text-sm mb-5 leading-relaxed">
          {pass.description}
        </p>

        {error && (
          <p className="text-error text-xs mb-3">
            {t('entitlementLoadError')}
          </p>
        )}

        {user ? (
          <PassPurchaseButton passType={target} scope={scope} />
        ) : (
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            {t('signUpToUnlock')}
          </Link>
        )}

        {target !== 'tournament_pass' && target !== 'scout_pass' && (
          <p className="text-on-surface-variant/60 text-xs mt-3">
            {t.rich('tournamentPassUpsell', {
              link: (chunks) => <Link href="/pricing" className="text-primary hover:underline">{chunks}</Link>,
            })}
          </p>
        )}

        {target === 'tournament_pass' && (
          <p className="text-on-surface-variant/60 text-xs mt-3">
            {t.rich('scoutPassUpsell', {
              link: (chunks) => <Link href="/pricing" className="text-primary hover:underline">{chunks}</Link>,
            })}
          </p>
        )}
      </div>
    </div>
  )
}

function PassPurchaseButton({ passType, scope }: { passType: EntitlementType; scope?: string }) {
  const { session } = useAuth()
  const pass = PASS_PRICES[passType]
  const t = useTranslations('paywall')
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  async function handlePurchase() {
    if (!session?.access_token || purchasing) return

    setPurchasing(true)
    setPurchaseError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ passType, scope }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPurchaseError(data.error ?? t('checkoutFailed'))
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setPurchaseError(t('checkoutFailed'))
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePurchase}
        disabled={purchasing}
        className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {purchasing ? t('processing') : t('unlockButton', { amount: (pass.amount / 100).toFixed(2) })}
      </button>
      {purchaseError && (
        <p className="text-error text-xs mt-2">{purchaseError}</p>
      )}
    </div>
  )
}

function getGateHeadline(
  contentType: ContentType,
  t: ReturnType<typeof useTranslations<'paywall'>>,
): string {
  switch (contentType) {
    case 'match': return t('headlineMatch')
    case 'team': return t('headlineTeam')
    case 'prediction': return t('headlinePrediction')
    case 'daily_briefing': return t('headlineDailyBriefing')
    case 'blog': return t('headlineBlog')
    case 'live_analytics': return t('headlineLiveAnalytics')
    case 'bracket_simulator': return t('headlineBracketSimulator')
    case 'scout_report': return t('headlineScoutReport')
    case 'player_intel': return t('headlinePlayerIntel')
    default: return t('headlineDefault')
  }
}
