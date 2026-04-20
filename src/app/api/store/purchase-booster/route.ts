import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

export const POST = withAuth(async (req: NextRequest, user) => {
  const admin = getSupabaseAdmin()
  const { item_slug } = await req.json()

  if (!item_slug) {
    return NextResponse.json({ error: 'item_slug is required' }, { status: 400 })
  }

  const { data: item, error: itemErr } = await admin
    .from('store_items')
    .select('id, slug, name, real_money_cents, stripe_price_id, metadata')
    .eq('slug', item_slug)
    .eq('is_active', true)
    .single()

  if (itemErr || !item || !item.real_money_cents) {
    return NextResponse.json({ error: 'Booster item not found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await admin
      .from('user_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ''

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: item.real_money_cents,
          product_data: {
            name: item.name,
            metadata: { store_item_id: item.id, item_slug: item.slug },
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'booster_purchase',
      store_item_id: item.id,
      user_id: user.id,
    },
    success_url: `${siteUrl}/store?purchase=success&item=${item.slug}`,
    cancel_url: `${siteUrl}/store?purchase=cancelled`,
  })

  return NextResponse.json({ checkout_url: session.url })
})
