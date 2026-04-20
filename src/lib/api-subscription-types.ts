import type { ApiTier } from '@/lib/api-v1/middleware'

export type ApiSubscriptionTier = Exclude<ApiTier, 'whitelabel'>

export interface ApiTierConfig {
  tier: ApiSubscriptionTier
  priceEnvKey: 'apiBasicPriceId' | 'apiAdvancedPriceId' | 'apiEventPriceId'
  mode: 'subscription' | 'payment'
  label: string
  monthlyCents: number | null
  oneTimeCents: number | null
}

export const API_TIER_CONFIGS: Record<ApiSubscriptionTier, ApiTierConfig> = {
  basic: {
    tier: 'basic',
    priceEnvKey: 'apiBasicPriceId',
    mode: 'subscription',
    label: 'Basic API',
    monthlyCents: 500_000,
    oneTimeCents: null,
  },
  advanced: {
    tier: 'advanced',
    priceEnvKey: 'apiAdvancedPriceId',
    mode: 'subscription',
    label: 'Advanced API',
    monthlyCents: 1_500_000,
    oneTimeCents: null,
  },
  event: {
    tier: 'event',
    priceEnvKey: 'apiEventPriceId',
    mode: 'payment',
    label: 'Event API Pass',
    monthlyCents: null,
    oneTimeCents: 2_500_000,
  },
} as const

export const API_CANCELLATION_GRACE_DAYS = 7

export const API_EVENT_EXPIRY_ISO = '2026-07-20T23:59:59Z'
