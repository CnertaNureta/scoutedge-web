type ConversionEvent =
  | { event: 'registration_complete'; method: 'email' | 'google' | 'apple' }
  | { event: 'subscription_purchase'; plan: string; value?: number; currency?: string }
  | { event: 'tool_engaged'; tool_name: string; tool_context?: string }
  | { event: 'affiliate_click'; affiliate_id: string; placement?: string; context?: string }

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[]
  }
}

export function trackEvent(payload: ConversionEvent) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
}
