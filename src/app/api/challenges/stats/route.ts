import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const GET = withAuth(async (_req: NextRequest, user) => {
  const admin = getSupabaseAdmin()

  const { data: streak } = await admin
    .from('user_challenge_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  const { data: todayChallenge } = await admin
    .from('daily_challenges')
    .select('id')
    .eq('challenge_date', today)
    .single()

  let todayAttempts: Array<{
    id: string
    question_id: string
    submitted_answer: string
    is_correct: boolean | null
    points_earned: number
  }> = []

  if (todayChallenge) {
    const { data } = await admin
      .from('user_challenge_attempts')
      .select('id, question_id, submitted_answer, is_correct, points_earned')
      .eq('user_id', user.id)
      .eq('challenge_id', todayChallenge.id)
    todayAttempts = data ?? []
  }

  const { data: leaderboard } = await admin
    .from('challenge_leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(20)

  let userRank: number | null = null
  if (streak) {
    const { data: rankRow } = await admin
      .from('challenge_leaderboard')
      .select('rank')
      .eq('user_id', user.id)
      .single()
    userRank = rankRow?.rank ?? null
  }

  return NextResponse.json({
    streak: streak ?? {
      current_streak: 0,
      longest_streak: 0,
      total_challenges_completed: 0,
      total_points_earned: 0,
      last_challenge_date: null,
    },
    todayAttempts: todayAttempts ?? [],
    leaderboard: leaderboard ?? [],
    userRank,
  })
})
