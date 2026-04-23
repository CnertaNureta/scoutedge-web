import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { playerASlug, playerAName, playerBSlug, playerBName, scoreA, scoreB, winnerSlug, sessionId } = body

  if (!playerASlug || !playerBSlug || scoreA == null || scoreB == null || !sessionId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { error } = await admin.from('pk_battles').insert({
    player_a_slug: playerASlug,
    player_a_name: playerAName,
    player_b_slug: playerBSlug,
    player_b_name: playerBName,
    score_a: scoreA,
    score_b: scoreB,
    winner_slug: winnerSlug,
    session_id: sessionId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
