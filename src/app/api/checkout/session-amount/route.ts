import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: [],
    })

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Session not paid' }, { status: 402 })
    }

    return NextResponse.json({
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? 'usd',
    })
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
}
