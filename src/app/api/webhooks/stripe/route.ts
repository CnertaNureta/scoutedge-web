import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_CONFIG } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-server'
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
      STRIPE_CONFIG.webhookSecret
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
        const plan = session.metadata?.plan as 'monthly' | 'tournament' | undefined

        if (!userId) break

        if (session.mode === 'subscription' && session.subscription) {
          // Monthly subscription — fetch full subscription object
          const sub = await getStripe().subscriptions.retrieve(
            session.subscription as string
          )
          await upsertSubscription(admin, sub, userId, plan ?? 'monthly')
        } else if (session.mode === 'payment' && plan === 'tournament') {
          // One-time tournament pass — create a synthetic subscription record
          await admin.from('subscriptions').upsert({
            id: session.id,
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_price_id: STRIPE_CONFIG.proTournamentPriceId,
            plan: 'tournament',
            status: 'active',
            current_period_start: new Date().toISOString(),
            // Tournament pass valid until end of World Cup (2026-07-20)
            current_period_end: '2026-07-20T23:59:59Z',
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
        if (userId) {
          await upsertSubscription(admin, sub, userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = await getUserIdFromCustomer(admin, sub.customer as string)

        await admin
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('id', sub.id)

        if (userId) {
          // Check if user has any other active subscriptions
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
        const subscriptionRef = (invoice as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null
        }).subscription
        const subId =
          typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id ?? null
        if (subId) {
          await admin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', subId)
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
