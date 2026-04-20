import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { match_id, predicted_outcome, predicted_home_score, predicted_away_score, confidence } = body as {
    match_id: string
    predicted_outcome: 'home' | 'draw' | 'away'
    predicted_home_score: number
    predicted_away_score: number
    confidence?: number
  }

  if (!match_id || !predicted_outcome) {
    return NextResponse.json({ error: 'match_id and predicted_outcome are required' }, { status: 400 })
  }

  if (!['home', 'draw', 'away'].includes(predicted_outcome)) {
    return NextResponse.json({ error: 'predicted_outcome must be home, draw, or away' }, { status: 400 })
  }

  const homeScore = Math.max(0, Math.min(20, Math.round(predicted_home_score ?? 0)))
  const awayScore = Math.max(0, Math.min(20, Math.round(predicted_away_score ?? 0)))

  const safeConfidence = typeof confidence === 'number'
    && isFinite(confidence)
    && confidence >= 0
    && confidence <= 100
      ? confidence
      : null

  if (
    (predicted_outcome === 'home' && homeScore <= awayScore) ||
    (predicted_outcome === 'away' && awayScore <= homeScore) ||
    (predicted_outcome === 'draw' && homeScore !== awayScore)
  ) {
    return NextResponse.json({ error: 'Score prediction must match outcome' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: match, error: matchErr } = await admin
    .from('matches')
    .select('id, match_status, kickoff_utc')
    .eq('id', match_id)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match.match_status !== 'scheduled') {
    return NextResponse.json({ error: 'Match is no longer open for predictions' }, { status: 400 })
  }

  if (new Date(match.kickoff_utc) <= new Date()) {
    return NextResponse.json({ error: 'Predictions are locked after kickoff' }, { status: 400 })
  }

  const { data: prediction, error: upsertErr } = await admin
    .from('user_match_predictions')
    .upsert(
      {
        user_id: user.id,
        match_id,
        predicted_outcome,
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
        confidence: safeConfidence,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,match_id' }
    )
    .select()
    .single()

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ prediction })
})
