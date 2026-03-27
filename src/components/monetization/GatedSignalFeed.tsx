'use client'

import Paywall from '@/components/monetization/Paywall'
import { DAILY_BRIEFING_FREE_SIGNALS, PREMIUM_BRIEFING } from '@/lib/premium-content'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface GatedSignalFeedProps {
  /** Total number of signals */
  totalCount: number
  /** The free signals (rendered server-side, passed as children) */
  freeSlot: React.ReactNode
  /** The premium signals (rendered server-side, passed as children) */
  premiumSlot: React.ReactNode
}

/**
 * Splits the daily briefing signal feed into free preview + premium gated content.
 * Free users see the first N high-impact signals, then a paywall.
 * Pro users see everything.
 */
export default function GatedSignalFeed({
  totalCount,
  freeSlot,
  premiumSlot,
}: GatedSignalFeedProps) {
  const { isPro, loading } = useSubscription()

  return (
    <>
      {/* Always show free signals */}
      {freeSlot}

      {/* Premium signals */}
      {loading ? (
        <div className="animate-pulse space-y-3 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-container rounded-2xl" />
          ))}
        </div>
      ) : isPro ? (
        premiumSlot
      ) : (
        <div className="mt-3">
          <Paywall
            feature={PREMIUM_BRIEFING.label}
            variant={PREMIUM_BRIEFING.variant}
            preview={
              <div className="text-center py-4">
                <p className="text-on-surface-variant text-sm">
                  Showing {DAILY_BRIEFING_FREE_SIGNALS} of {totalCount} signals
                </p>
              </div>
            }
          >
            {premiumSlot}
          </Paywall>
        </div>
      )}
    </>
  )
}
