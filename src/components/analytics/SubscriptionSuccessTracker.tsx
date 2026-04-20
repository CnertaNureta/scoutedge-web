'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

const PLAN_BY_PATH: Record<string, string> = {
  '/pricing': 'pro',
  '/dashboard/api': 'api',
}

export default function SubscriptionSuccessTracker() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    if (searchParams.get('success') !== 'true') return

    const basePlan = PLAN_BY_PATH[pathname]
    if (!basePlan) return

    fired.current = true

    const tier = searchParams.get('tier')
    const plan = tier ? `${basePlan}_${tier}` : basePlan
    const sessionId = searchParams.get('session_id')

    if (sessionId) {
      fetch(`/api/checkout/session-amount?session_id=${encodeURIComponent(sessionId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { amount: number; currency: string } | null) => {
          trackEvent({
            event: 'subscription_purchase',
            plan,
            value: data?.amount,
            currency: data?.currency,
          })
        })
        .catch(() => {
          trackEvent({ event: 'subscription_purchase', plan })
        })
    } else {
      trackEvent({ event: 'subscription_purchase', plan })
    }
  }, [searchParams, pathname])

  return null
}
