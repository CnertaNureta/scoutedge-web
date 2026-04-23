import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10))

  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('pk_player_leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leaderboard: data ?? [] })
}
