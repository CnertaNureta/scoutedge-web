import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const GET = withAuth(async (_req, user) => {
  const admin = getSupabaseAdmin()

  const { data: balance } = await admin
    .from('point_balances')
    .select('balance, lifetime_earned, lifetime_spent, current_streak_days, last_checkin_date')
    .eq('user_id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const checkedInToday = balance?.last_checkin_date === today

  return NextResponse.json({
    balance: balance?.balance ?? 0,
    lifetime_earned: balance?.lifetime_earned ?? 0,
    lifetime_spent: balance?.lifetime_spent ?? 0,
    current_streak_days: balance?.current_streak_days ?? 0,
    checked_in_today: checkedInToday,
  })
})
