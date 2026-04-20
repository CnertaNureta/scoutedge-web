import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_CONFIG } from '@/lib/stripe'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'
import { API_TIER_CONFIGS, type ApiSubscriptionTier } from '@/lib/api-subscription-types'

const VALID_TIERS: ApiSubscriptionTier[] = ['basic', 'advanced', 'event']

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabaseUser = getSupabaseForUser(token)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const tier = (body as Record<string, unknown>).tier as ApiSubscriptionTier

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(', ')}` },
        { status: 400 },
      )
    }

    const tierConfig = API_TIER_CONFIGS[tier]
    const priceId = STRIPE_CONFIG[tierConfig.priceEnvKey]

    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for tier: ${tier}` },
        { status: 500 },
      )
    }

    const stripe = getStripe()
    const admin = getSupabaseAdmin()

    const { data: profile } = await admin
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await admin
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const allowedOrigins = new Set([appUrl, 'https://kickoracle.com'].filter(Boolean))
    const rawOrigin = req.headers.get('origin') ?? ''
    const origin = allowedOrigins.has(rawOrigin) ? rawOrigin : appUrl

    const rawName = typeof (body as Record<string, unknown>).name === 'string'
      ? ((body as Record<string, unknown>).name as string)
      : ''
    const keyName = rawName.trim().slice(0, 100) || `${tierConfig.label} Key`

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: tierConfig.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/api?success=true&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/api?canceled=true`,
      metadata: {
        type: 'api_subscription',
        api_tier: tier,
        api_key_name: keyName,
        supabase_user_id: user.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('API subscription checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
