import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PASS_PRICE_MAP, type PassType } from '@/lib/stripe'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'
import { computeUpgradeCredit, type EntitlementWithAmount } from '@/lib/entitlements'

const UPGRADE_TARGETS = new Set<string>(['tournament_pass', 'scout_pass'])

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

    const { targetPass } = await req.json() as { targetPass: string }

    if (!UPGRADE_TARGETS.has(targetPass)) {
      return NextResponse.json({ error: 'Invalid upgrade target' }, { status: 400 })
    }

    const passType = targetPass as PassType
    const priceId = PASS_PRICE_MAP[passType]
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
    }

    const admin = getSupabaseAdmin()
    const stripe = getStripe()

    const { data: existing } = await admin
      .from('user_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('entitlement_type', passType)
      .gt('valid_until', new Date().toISOString())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already own this pass' }, { status: 409 })
    }

    const { data: entitlements } = await admin
      .from('user_entitlements')
      .select('id, entitlement_type, scope, valid_from, valid_until, amount_paid_cents')
      .eq('user_id', user.id)
      .gt('valid_until', new Date().toISOString())

    const quote = computeUpgradeCredit(
      (entitlements ?? []) as EntitlementWithAmount[],
      passType,
    )

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

    const origin = req.headers.get('origin') ?? ''

    const discounts: { promotion_code: string }[] = []

    if (quote.creditCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: quote.creditCents,
        currency: 'usd',
        duration: 'once',
        name: `Pass credit: $${(quote.creditCents / 100).toFixed(2)} from prior purchases`,
        max_redemptions: 1,
        redeem_by: Math.floor(Date.now() / 1000) + 3600,
      })
      const promoCode = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: coupon.id },
        max_redemptions: 1,
        restrictions: { first_time_transaction: false },
        customer: customerId,
      })
      discounts.push({ promotion_code: promoCode.id })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      discounts,
      success_url: `${origin}/pricing?success=true&upgraded=${passType}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        type: 'pass_purchase',
        pass_type: passType,
        scope: '',
        upgrade_credit_cents: String(quote.creditCents),
      },
    })

    return NextResponse.json({ url: session.url, quote })
  } catch (err) {
    console.error('Upgrade checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create upgrade checkout session' },
      { status: 500 },
    )
  }
}
