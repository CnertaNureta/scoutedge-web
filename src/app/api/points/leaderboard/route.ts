import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))

  const { data: leaderboard } = await admin
    .from('point_balances')
    .select(`
      user_id,
      balance,
      lifetime_earned,
      current_streak_days,
      user_profiles!inner(display_name, avatar_url)
    `)
    .gt('lifetime_earned', 0)
    .order('lifetime_earned', { ascending: false })
    .limit(limit)

  const entries = (leaderboard ?? []).map((row: Record<string, unknown>, i: number) => {
    const profile = row.user_profiles as Record<string, unknown> | null
    return {
      rank: i + 1,
      user_id: row.user_id,
      display_name: profile?.display_name ?? 'Anonymous',
      avatar_url: profile?.avatar_url ?? null,
      balance: row.balance,
      lifetime_earned: row.lifetime_earned,
      streak: row.current_streak_days,
    }
  })

  return NextResponse.json({ leaderboard: entries })
}
