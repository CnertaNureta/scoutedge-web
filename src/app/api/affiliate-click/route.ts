import { NextRequest, NextResponse } from 'next/server'
import { AFFILIATES, buildAffiliateUrl, type AffiliatePlacement } from '@/lib/affiliates'
import { getSupabase } from '@/lib/supabase'

interface ClickPayload {
  partnerId: string
  matchId: string
  placement: AffiliatePlacement
  userId?: string | null
  sessionId?: string | null
  country?: string | null
  usState?: string | null
  abVariant?: string | null
}

/**
 * POST /api/affiliate-click
 * Records a click event and returns the redirect URL.
 */
export async function POST(request: NextRequest) {
  let body: ClickPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { partnerId, matchId, placement, userId, sessionId, country, usState, abVariant } = body

  if (!partnerId || !placement) {
    return NextResponse.json({ error: 'partnerId and placement are required' }, { status: 400 })
  }

  const partner = AFFILIATES.find((p) => p.id === partnerId)
  if (!partner) {
    return NextResponse.json({ error: 'Unknown partner' }, { status: 400 })
  }

  // Write to Supabase (fire-and-forget — don't block the redirect)
  const supabase = getSupabase()
  supabase
    .from('affiliate_clicks')
    .insert({
      partner_id: partnerId,
      match_id: matchId || null,
      placement,
      user_id: userId || null,
      session_id: sessionId || null,
      country: country || null,
      us_state: usState || null,
      ab_variant: abVariant || null,
    })
    .then(({ error }) => {
      if (error) console.error('[affiliate-click] insert error:', error.message)
    })

  const redirectUrl = buildAffiliateUrl(partner, placement, matchId || 'general')

  return NextResponse.json({ redirectUrl })
}
