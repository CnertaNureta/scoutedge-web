export type SubscriptionTier = 'free' | 'pro'
export type SubscriptionPlan = 'monthly' | 'tournament'

export interface Subscription {
  tier: SubscriptionTier
  plan: SubscriptionPlan | null
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null
  currentPeriodEnd: string | null
}

export const FREE_SUBSCRIPTION: Subscription = {
  tier: 'free',
  plan: null,
  status: null,
  currentPeriodEnd: null,
}

export const PRICING = {
  monthly: { amount: 9.99, label: '$9.99/mo', interval: 'month' as const },
  tournament: { amount: 29.99, label: '$29.99', interval: 'once' as const, description: 'Full tournament access' },
} as const

export const PRO_FEATURES = [
  'AI-powered match predictions with confidence scores',
  'Tactical deep-dive analysis for every match',
  'Real-time market intelligence & AI edges',
  'Player fitness & sentiment tracking',
  'Team chemistry index breakdowns',
  'Premium daily briefings',
  'Ad-free experience',
] as const
