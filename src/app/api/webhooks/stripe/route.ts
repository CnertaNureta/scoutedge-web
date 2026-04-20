import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_CONFIG, getWebhookSecret } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateApiKey } from '@/lib/api-keys'
import { API_CANCELLATION_GRACE_DAYS, API_EVENT_EXPIRY_ISO } from '@/lib/api-subscription-types'
import type { ApiTier } from '@/lib/api-v1/middleware'
import type Stripe from 'stripe'

// Disable body parsing — Stripe needs the raw body for signature verification
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      getWebhookSecret()
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id

        if (!userId) break

        // B2B API subscription checkout
        if (session.metadata?.type === 'api_subscription') {
          // Idempotency: skip if already fulfilled for this checkout session
          const { data: existingKey } = await admin
            .from('api_keys')
            .select('id')
            .eq('stripe_checkout_session_id', session.id)
            .maybeSingle()

          if (existingKey) break

          const apiTier = session.metadata.api_tier as ApiTier
          const keyName = session.metadata.api_key_name ?? `${apiTier} Key`

          const subscriptionId = session.mode === 'subscription'
            ? (session.subscription as string)
            : undefined

          const expiresAt = session.mode === 'payment'
            ? API_EVENT_EXPIRY_ISO
            : undefined

          await generateApiKey(userId, apiTier, keyName, {
            stripeSubscriptionId: subscriptionId,
            stripeCheckoutSessionId: session.id,
            expiresAt,
          })
          break
        }

        // Booster pack purchase (one-time payment, non-subscription)
        if (session.metadata?.type === 'booster_purchase') {
          const storeItemId = session.metadata.store_item_id
          const paymentIntentId = session.payment_intent as string
          if (storeItemId && paymentIntentId) {
            // Idempotency: skip if already fulfilled for this payment intent
            const { data: existingOrder } = await admin
              .from('store_orders')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .maybeSingle()

            if (!existingOrder) {
              await fulfillBoosterPurchase(admin, userId, storeItemId, paymentIntentId)
            }
          }
          break
        }

        const plan = session.metadata?.plan as 'monthly' | 'tournament' | undefined

        if (session.mode === 'subscription' && session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(
            session.subscription as string
          )
          await upsertSubscription(admin, sub, userId, plan ?? 'monthly')
        } else if (session.mode === 'payment' && plan === 'tournament') {
          await admin.from('subscriptions').upsert({
            id: session.id,
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_price_id: STRIPE_CONFIG.proTournamentPriceId,
            plan: 'tournament',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: API_EVENT_EXPIRY_ISO,
            cancel_at_period_end: false,
          })
          await admin
            .from('user_profiles')
            .update({ subscription_tier: 'pro' })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = await getUserIdFromCustomer(admin, sub.customer as string)

        const linkedApiKeys = await getApiKeysForSubscription(admin, sub.id)
        if (linkedApiKeys.length > 0) {
          await handleApiSubscriptionUpdate(admin, sub, linkedApiKeys)
          break
        }

        if (userId) {
          await upsertSubscription(admin, sub, userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = await getUserIdFromCustomer(admin, sub.customer as string)

        const linkedApiKeys = await getApiKeysForSubscription(admin, sub.id)
        if (linkedApiKeys.length > 0) {
          await handleApiSubscriptionCancelled(admin, linkedApiKeys)
          break
        }

        await admin
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('id', sub.id)

        if (userId) {
          const { data: activeSubs } = await admin
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing'])

          if (!activeSubs?.length) {
            await admin
              .from('user_profiles')
              .update({ subscription_tier: 'free' })
              .eq('id', userId)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = getSubscriptionIdFromInvoice(invoice)
        if (subId) {
          await admin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', subId)

          // Also throttle linked API keys immediately
          const linkedApiKeys = await getApiKeysForSubscription(admin, subId)
          for (const key of linkedApiKeys) {
            if (key.is_active) {
              await admin
                .from('api_keys')
                .update({
                  rate_limit_per_minute: 10,
                  rate_limit_per_month: 100,
                })
                .eq('id', key.id)
            }
          }
        }
        break
      }
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription
  if (!subscription) return null
  return typeof subscription === 'string' ? subscription : subscription.id
}

async function upsertSubscription(
  admin: ReturnType<typeof getSupabaseAdmin>,
  sub: Stripe.Subscription,
  userId: string,
  plan?: string,
) {
  const priceId = sub.items.data[0]?.price.id ?? ''
  const resolvedPlan = plan ??
    (priceId === STRIPE_CONFIG.proTournamentPriceId ? 'tournament' : 'monthly')

  // Basil API uses start_date instead of current_period_start.
  // For current_period_end, use cancel_at or billing_cycle_anchor + 1 month.
  const periodStart = new Date(sub.start_date * 1000).toISOString()
  const periodEnd = sub.cancel_at
    ? new Date(sub.cancel_at * 1000).toISOString()
    : null

  await admin.from('subscriptions').upsert({
    id: sub.id,
    user_id: userId,
    stripe_customer_id: sub.customer as string,
    stripe_price_id: priceId,
    plan: resolvedPlan,
    status: sub.status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end,
  })

  const tier = ['active', 'trialing'].includes(sub.status) ? 'pro' : 'free'
  await admin
    .from('user_profiles')
    .update({ subscription_tier: tier })
    .eq('id', userId)
}

async function fulfillBoosterPurchase(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  storeItemId: string,
  paymentIntentId: string,
) {
  const { data: item } = await admin
    .from('store_items')
    .select('id, name, metadata')
    .eq('id', storeItemId)
    .single()

  if (!item) return

  const durationHours = (item.metadata as Record<string, unknown>)?.duration_hours as number | undefined
  const expiresAt = durationHours
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
    : null

  const { data: order } = await admin
    .from('store_orders')
    .insert({
      user_id: userId,
      item_id: storeItemId,
      point_cost: 0,
      stripe_payment_intent_id: paymentIntentId,
      status: 'completed',
      fulfilled_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (!order) return

  await admin.from('user_inventory').insert({
    user_id: userId,
    item_id: storeItemId,
    order_id: order.id,
    status: 'active',
    expires_at: expiresAt,
  })
}

async function getUserIdFromCustomer(
  admin: ReturnType<typeof getSupabaseAdmin>,
  customerId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.id ?? null
}

interface LinkedApiKey {
  id: string
  user_id: string
  tier: string
  is_active: boolean
}

async function getApiKeysForSubscription(
  admin: ReturnType<typeof getSupabaseAdmin>,
  subscriptionId: string,
): Promise<LinkedApiKey[]> {
  const { data } = await admin
    .from('api_keys')
    .select('id, user_id, tier, is_active')
    .eq('stripe_subscription_id', subscriptionId)

  return (data ?? []) as LinkedApiKey[]
}

const TIER_RATE_LIMITS: Record<string, { perMin: number; perMonth: number }> = {
  basic: { perMin: 60, perMonth: 10_000 },
  advanced: { perMin: 120, perMonth: 100_000 },
  event: { perMin: 200, perMonth: 999_999_999 },
  whitelabel: { perMin: 300, perMonth: 999_999_999 },
}

async function handleApiSubscriptionUpdate(
  admin: ReturnType<typeof getSupabaseAdmin>,
  sub: Stripe.Subscription,
  linkedKeys: LinkedApiKey[],
) {
  const isActive = ['active', 'trialing'].includes(sub.status)
  const isPastDue = sub.status === 'past_due'
  const isTerminal = ['unpaid', 'incomplete_expired', 'canceled'].includes(sub.status)

  for (const key of linkedKeys) {
    if (isActive) {
      const limits = TIER_RATE_LIMITS[key.tier] ?? TIER_RATE_LIMITS.basic
      await admin
        .from('api_keys')
        .update({
          is_active: true,
          revoked_at: null,
          rate_limit_per_minute: limits.perMin,
          rate_limit_per_month: limits.perMonth,
        })
        .eq('id', key.id)
    } else if (isPastDue) {
      await admin
        .from('api_keys')
        .update({
          rate_limit_per_minute: 10,
          rate_limit_per_month: 100,
        })
        .eq('id', key.id)
    } else if (isTerminal) {
      await admin
        .from('api_keys')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', key.id)
    }
  }
}

async function handleApiSubscriptionCancelled(
  admin: ReturnType<typeof getSupabaseAdmin>,
  linkedKeys: LinkedApiKey[],
) {
  const graceExpiry = new Date(
    Date.now() + API_CANCELLATION_GRACE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  for (const key of linkedKeys) {
    if (!key.is_active) continue

    await admin
      .from('api_keys')
      .update({ expires_at: graceExpiry })
      .eq('id', key.id)
  }
}
