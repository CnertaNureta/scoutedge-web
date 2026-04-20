import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseForUser } from '@/lib/supabase-server'

export const GET = withAuth(async (req: NextRequest, user, token) => {
  const supabase = getSupabaseForUser(token)
  const url = new URL(req.url)
  const matchId = url.searchParams.get('match_id')

  let query = supabase
    .from('user_match_predictions')
    .select(`
      id, match_id, predicted_outcome, predicted_home_score, predicted_away_score,
      confidence, submitted_at, locked_at,
      prediction_scores (points_awarded, accuracy_type, bonus_points, actual_home_score, actual_away_score)
    `)
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })

  if (matchId) {
    query = query.eq('match_id', matchId)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ predictions: data ?? [] })
})
