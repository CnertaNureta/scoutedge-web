import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { BRAND } from '@/lib/brand-tokens'

export const dynamic = 'force-dynamic'

const VALID_SOURCES = ['homepage', 'article', 'popup'] as const
type Source = (typeof VALID_SOURCES)[number]

interface SubscribeBody {
  email: string
  source: Source
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function generateToken(email: string): string {
  const secret = process.env.NEWSLETTER_HMAC_SECRET
  if (!secret) throw new Error('NEWSLETTER_HMAC_SECRET not configured')
  return createHmac('sha256', secret).update(email).digest('hex')
}

/** POST — Subscribe an email to the newsletter */
export async function POST(req: NextRequest) {
  let body: SubscribeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, source } = body

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const admin = getSupabaseAdmin()

  // Check if already subscribed
  const { data: existing } = await admin
    .from('newsletter_subscribers')
    .select('id, confirmed, unsubscribed_at')
    .eq('email', normalizedEmail)
    .single()

  if (existing) {
    if (existing.confirmed && !existing.unsubscribed_at) {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
    }

    // Re-subscribe: clear unsubscribed_at, reset confirmation
    await admin
      .from('newsletter_subscribers')
      .update({
        unsubscribed_at: null,
        confirmed: false,
        source,
      })
      .eq('id', existing.id)
  } else {
    // Insert new subscriber
    const { error: insertError } = await admin
      .from('newsletter_subscribers')
      .insert({ email: normalizedEmail, source })

    if (insertError) {
      console.error('Newsletter subscribe error:', insertError)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }
  }

  // Send double opt-in confirmation email via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && resendKey !== 're_placeholder') {
    try {
      const resend = new Resend(resendKey)
      const token = generateToken(normalizedEmail)
      const origin = req.headers.get('origin') || 'https://kickoracle.com'
      const confirmUrl = `${origin}/api/newsletter/confirm?token=${token}&email=${encodeURIComponent(normalizedEmail)}`

      await resend.emails.send({
        from: 'KickOracle <noreply@kickoracle.com>',
        to: normalizedEmail,
        subject: 'Confirm your KickOracle subscription',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h1 style="font-size: 24px; color: #111;">Confirm your subscription</h1>
            <p style="color: #555; line-height: 1.6;">
              You're one click away from receiving daily World Cup 2026 intelligence
              from KickOracle — AI-powered team analysis, injury updates, prediction shifts,
              and match previews delivered to your inbox.
            </p>
            <a href="${confirmUrl}" style="display: inline-block; background: ${BRAND.primary}; color: #111; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin: 16px 0;">
              Confirm Subscription
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      })
    } catch (err) {
      // Log but don't fail the subscription — email can be resent
      console.error('Resend email error:', err)
    }
  }

  return NextResponse.json(
    { message: 'Subscription started. Please check your email to confirm.' },
    { status: 201 },
  )
}
