import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApiKey } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parseUuid } from '@/lib/api-v1/response'

const PREDICTION_SELECT = `
  id, match_id,
  home_win_prob, draw_prob, away_win_prob,
  confidence_interval, model_version, explanation_json, created_at,
  match:matches!match_id(
    kickoff_utc, venue, city, match_status,
    home_team_id, away_team_id,
    home_team:teams!home_team_id(name),
    away_team:teams!away_team_id(name)
  )
`

export const GET = withApiKey(async (req: NextRequest) => {
  const id = parseUuid(req.nextUrl.pathname.split('/').pop())
  if (id === null) return apiError('Invalid or missing matchId (UUID required)', 400)

  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('predictions')
    .select(PREDICTION_SELECT)
    .eq('match_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return apiError('Prediction not found', 404)
  }

  const row = data as Record<string, unknown>
  const match = row.match as Record<string, unknown> | null
  const homeTeam = match?.home_team as Record<string, unknown> | null
  const awayTeam = match?.away_team as Record<string, unknown> | null

  return apiSuccess({
    id: row.id,
    match_id: row.match_id,
    home_team_name: homeTeam?.name ?? null,
    away_team_name: awayTeam?.name ?? null,
    home_win_prob: row.home_win_prob,
    draw_prob: row.draw_prob,
    away_win_prob: row.away_win_prob,
    confidence_interval: row.confidence_interval,
    model_version: row.model_version,
    explanation_json: row.explanation_json,
    created_at: row.created_at,
    kickoff_utc: match?.kickoff_utc ?? null,
    venue: match?.venue ?? null,
    city: match?.city ?? null,
    match_status: match?.match_status ?? null,
  })
})
