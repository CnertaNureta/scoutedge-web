import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { safeCompare } from '@/lib/crypto-utils'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey || !safeCompare(authHeader, `Bearer ${serviceKey}`)) {
    return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 })
  }

  const body = await req.json()
  const { match_id } = body as { match_id: string }

  if (!match_id) {
    return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: match } = await admin
    .from('matches')
    .select('id, home_score, away_score, match_status')
    .eq('id', match_id)
    .single()

  if (!match || match.match_status !== 'finished') {
    return NextResponse.json({ error: 'Match is not finished' }, { status: 400 })
  }

  if (match.home_score === null || match.away_score === null) {
    return NextResponse.json({ error: 'Match scores not available' }, { status: 400 })
  }

  const actualOutcome = match.home_score > match.away_score ? 'home'
    : match.away_score > match.home_score ? 'away'
    : 'draw'
  const goalDiff = match.home_score - match.away_score

  const { data: predictions } = await admin
    .from('user_match_predictions')
    .select('id, user_id, predicted_outcome, predicted_home_score, predicted_away_score')
    .eq('match_id', match_id)

  if (!predictions?.length) {
    return NextResponse.json({ scored: 0 })
  }

  const { data: alreadyScored } = await admin
    .from('prediction_scores')
    .select('prediction_id')
    .eq('match_id', match_id)

  const scoredIds = new Set(alreadyScored?.map(s => s.prediction_id) ?? [])
  const toScore = predictions.filter(p => !scoredIds.has(p.id))

  if (!toScore.length) {
    return NextResponse.json({ scored: 0, message: 'All predictions already scored' })
  }

  const scores = toScore.map(p => {
    const predDiff = p.predicted_home_score - p.predicted_away_score
    let accuracyType: string
    let points: number

    if (p.predicted_home_score === match.home_score && p.predicted_away_score === match.away_score) {
      accuracyType = 'exact_score'
      points = 10
    } else if (p.predicted_outcome === actualOutcome && predDiff === goalDiff) {
      accuracyType = 'correct_outcome_diff'
      points = 5
    } else if (p.predicted_outcome === actualOutcome) {
      accuracyType = 'correct_outcome'
      points = 3
    } else {
      accuracyType = 'wrong'
      points = 0
    }

    return {
      prediction_id: p.id,
      user_id: p.user_id,
      match_id,
      points_awarded: points,
      accuracy_type: accuracyType,
      bonus_points: 0,
      actual_home_score: match.home_score,
      actual_away_score: match.away_score,
    }
  })

  const { error: insertErr } = await admin
    .from('prediction_scores')
    .insert(scores)

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Award ScoutCoins for correct predictions
  for (const score of scores) {
    if (score.points_awarded > 0) {
      const isExact = score.accuracy_type === 'exact_score'
      const coinAmount = isExact ? 150 : 50
      const txType = isExact ? 'prediction_exact' : 'prediction_correct'
      await admin.rpc('earn_points', {
        p_user_id: score.user_id,
        p_amount: coinAmount,
        p_type: txType,
        p_reference_id: score.prediction_id,
        p_description: isExact ? 'Exact score prediction' : 'Correct prediction outcome',
      }).then(null, err => console.error('earn_points failed:', err))
    }
  }

  const { error: refreshErr } = await admin.rpc('refresh_leaderboards')
  if (refreshErr) {
    console.error('Leaderboard refresh failed:', refreshErr.message)
  }

  return NextResponse.json({ scored: scores.length })
}
