import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, marketId, optionId } = body

    if (!matchId || !marketId || !optionId) {
      return NextResponse.json(
        { error: 'matchId, marketId, and optionId are required' },
        { status: 400 },
      )
    }

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to submit predictions' },
        { status: 401 },
      )
    }

    const { data: existing } = await supabase
      .from('match_predictions')
      .select('id')
      .eq('user_id', user.id)
      .eq('market_id', marketId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Already voted on this market' },
        { status: 409 },
      )
    }

    const { error: insertError } = await supabase
      .from('match_predictions')
      .insert({
        user_id: user.id,
        match_id: matchId,
        market_id: marketId,
        option_id: optionId,
        submitted_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('[predictions/live] Insert error:', insertError.message)
      return NextResponse.json(
        { error: 'Failed to submit prediction' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[predictions/live] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('matchId')

  if (!matchId) {
    return NextResponse.json(
      { error: 'matchId query parameter required' },
      { status: 400 },
    )
  }

  const supabase = getSupabase()

  const { data: markets, error } = await supabase
    .from('prediction_markets')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })

  if (error) {
    // Table missing / schema cache issue (common in dev + test environments
    // and during partial Supabase rollouts in prod). Log it but return an
    // empty payload instead of 500 so the live-match page degrades to a
    // "no markets yet" state rather than throwing a fetch error in the
    // browser console.
    console.warn('[predictions/live] Fetch warning:', error.message)
    return NextResponse.json({ markets: [], leaderboard: [] })
  }

  const { data: leaderboard } = await supabase
    .from('prediction_leaderboard')
    .select('*')
    .eq('match_id', matchId)
    .order('points', { ascending: false })
    .limit(50)

  return NextResponse.json({
    markets: markets ?? [],
    leaderboard: leaderboard ?? [],
  })
}
