import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_CONFIG } from '@/lib/stripe'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

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

    const { plan } = await req.json() as { plan: 'monthly' | 'tournament' }
    if (plan !== 'monthly' && plan !== 'tournament') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId = plan === 'monthly'
      ? STRIPE_CONFIG.proMonthlyPriceId
      : STRIPE_CONFIG.proTournamentPriceId

    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 })
    }

    const stripe = getStripe()
    const admin = getSupabaseAdmin()

    // Get or create Stripe customer
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

    // Create checkout session
    const isTournament = plan === 'tournament'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isTournament ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.get('origin')}/pricing?success=true`,
      cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
