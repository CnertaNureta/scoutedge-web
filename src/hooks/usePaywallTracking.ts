'use client'

import { useEffect, useRef, useCallback } from 'react'

interface PaywallEvent {
  action: 'impression' | 'cta_click'
  feature: string
  location: string
  timestamp: number
}

/**
 * Tracks paywall conversion events: impressions (paywall shown) and CTA clicks.
 *
 * Events are batched in sessionStorage and can be flushed to an analytics endpoint.
 * For now, stores locally — ready to wire up to Supabase or any analytics service.
 */
export function usePaywallTracking(feature: string, location: string) {
  const hasTrackedImpression = useRef(false)

  useEffect(() => {
    if (hasTrackedImpression.current) return
    hasTrackedImpression.current = true
    trackEvent({ action: 'impression', feature, location, timestamp: Date.now() })
  }, [feature, location])

  const trackCtaClick = useCallback(() => {
    trackEvent({ action: 'cta_click', feature, location, timestamp: Date.now() })
  }, [feature, location])

  return { trackCtaClick }
}

const STORAGE_KEY = 'scoutedge_paywall_events'

function trackEvent(event: PaywallEvent) {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY)
    const events: PaywallEvent[] = existing ? JSON.parse(existing) : []
    events.push(event)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // sessionStorage unavailable (SSR, private browsing) — silently skip
  }
}

/** Retrieve all tracked events (for flush to analytics backend) */
export function getPaywallEvents(): PaywallEvent[] {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/** Clear tracked events after successful flush */
export function clearPaywallEvents(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // noop
  }
}
