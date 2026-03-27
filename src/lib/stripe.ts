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
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
} as const
