import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('pk_community_stats')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({
      totalBattles: 0,
      uniqueSessions: 0,
      totalDraws: 0,
      uniquePlayersUsed: 0,
    })
  }

  return NextResponse.json({
    totalBattles: data.total_battles ?? 0,
    uniqueSessions: data.unique_sessions ?? 0,
    totalDraws: data.total_draws ?? 0,
    uniquePlayersUsed: data.unique_players_used ?? 0,
  })
}
