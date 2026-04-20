import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  _stripe = new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    typescript: true,
  })
  return _stripe
}

export const STRIPE_CONFIG = {
  proMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
  proTournamentPriceId: process.env.STRIPE_PRO_TOURNAMENT_PRICE_ID ?? '',
  apiBasicPriceId: process.env.STRIPE_API_BASIC_PRICE_ID ?? '',
  apiAdvancedPriceId: process.env.STRIPE_API_ADVANCED_PRICE_ID ?? '',
  apiEventPriceId: process.env.STRIPE_API_EVENT_PRICE_ID ?? '',
} as const

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured')
  return secret
}
