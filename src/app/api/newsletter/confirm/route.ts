import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { safeCompare } from '@/lib/crypto-utils'
import { BRAND, SURFACE } from '@/lib/brand-tokens'

export const dynamic = 'force-dynamic'

function verifyToken(email: string, token: string): boolean {
  const secret = process.env.NEWSLETTER_HMAC_SECRET
  if (!secret) return false
  const expected = createHmac('sha256', secret).update(email).digest('hex')
  return safeCompare(token, expected)
}

/** GET — Confirm a newsletter subscription via double opt-in link */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return new NextResponse(confirmPage('Invalid link', 'The confirmation link is missing required parameters.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const normalizedEmail = decodeURIComponent(email).toLowerCase().trim()

  if (!verifyToken(normalizedEmail, token)) {
    return new NextResponse(confirmPage('Invalid token', 'This confirmation link is invalid or has expired.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const admin = getSupabaseAdmin()

  const { data: subscriber } = await admin
    .from('newsletter_subscribers')
    .select('id, confirmed')
    .eq('email', normalizedEmail)
    .single()

  if (!subscriber) {
    return new NextResponse(confirmPage('Not found', 'No subscription found for this email address.', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (subscriber.confirmed) {
    return new NextResponse(confirmPage('Already confirmed', 'Your subscription is already active. You\'re all set!', true), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const { error } = await admin
    .from('newsletter_subscribers')
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('id', subscriber.id)

  if (error) {
    console.error('Newsletter confirm error:', error)
    return new NextResponse(confirmPage('Error', 'Something went wrong. Please try again later.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return new NextResponse(confirmPage('Subscription confirmed!', 'You\'ll receive daily World Cup intelligence from KickOracle. Welcome aboard!', true), {
    headers: { 'Content-Type': 'text/html' },
  })
}

function confirmPage(title: string, message: string, success: boolean): string {
  const color = success ? BRAND.primary : BRAND.secondary
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — KickOracle</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: ${SURFACE.background}; color: ${SURFACE.onSurface}; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
    .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 48px; max-width: 480px; text-align: center; }
    h1 { font-size: 28px; margin-bottom: 12px; color: ${color}; }
    p { color: #a0a09c; line-height: 1.6; }
    a { display: inline-block; margin-top: 24px; background: ${color}; color: #111; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://kickoracle.com">Go to KickOracle</a>
  </div>
</body>
</html>`
}
