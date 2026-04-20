import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: card } = await admin
    .from('user_fan_cards')
    .select('display_name, team_slug, avatar, theme, badges, predictions_count, accuracy, fav_player, created_at')
    .eq('share_token', token)
    .eq('is_public', true)
    .single()

  if (!card) {
    return NextResponse.json({ error: 'Card not found or not shared' }, { status: 404 })
  }

  return NextResponse.json({ card })
}
