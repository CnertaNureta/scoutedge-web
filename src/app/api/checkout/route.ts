import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PASS_PRICE_MAP, type PassType } from '@/lib/stripe'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

const VALID_PASS_TYPES = new Set<string>(['match_pass', 'team_pass', 'tournament_pass', 'scout_pass'])

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

    const body = await req.json() as {
      passType: string
      scope?: string
    }

    if (!VALID_PASS_TYPES.has(body.passType)) {
      return NextResponse.json({ error: 'Invalid pass type' }, { status: 400 })
    }

    const passType = body.passType as PassType

    if ((passType === 'match_pass' || passType === 'team_pass') && !body.scope) {
      return NextResponse.json({ error: 'Scope required for match/team passes' }, { status: 400 })
    }

    const priceId = PASS_PRICE_MAP[passType]
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this pass' }, { status: 500 })
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

    if (passType === 'match_pass' || passType === 'team_pass') {
      const { data: existing } = await admin
        .from('user_entitlements')
        .select('id')
        .eq('user_id', user.id)
        .eq('entitlement_type', passType)
        .eq('scope', body.scope!)
        .gt('valid_until', new Date().toISOString())
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'You already own this pass' }, { status: 409 })
      }
    } else {
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
    }

    const origin = req.headers.get('origin') ?? ''

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        type: 'pass_purchase',
        pass_type: passType,
        scope: body.scope ?? '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
