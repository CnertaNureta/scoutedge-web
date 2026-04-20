import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApiKey } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination, parseUuid, parseDate } from '@/lib/api-v1/response'

const PREDICTION_SELECT = `
  id, match_id,
  home_win_prob, draw_prob, away_win_prob,
  confidence_interval, model_version, explanation_json, created_at,
  match:matches!match_id(
    kickoff_utc, match_status,
    home_team_id, away_team_id,
    home_team:teams!home_team_id(name),
    away_team:teams!away_team_id(name)
  )
`

export const GET = withApiKey(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)

  const dateParam = parseDate(url.searchParams.get('date'))
  if (dateParam === false) return apiError('Invalid date format, use YYYY-MM-DD', 400)
  const date = dateParam
  const rawTeamId = url.searchParams.get('team_id')
  const teamId = rawTeamId ? parseUuid(rawTeamId) : undefined
  if (rawTeamId && teamId === null) return apiError('Invalid team_id (UUID required)', 400)

  const admin = getSupabaseAdmin()

  let query = admin
    .from('predictions')
    .select(PREDICTION_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (date) {
    const matchIds = await getMatchIdsByDate(admin, date)
    if (matchIds.length === 0) {
      return apiSuccess([], { total: 0, page, limit })
    }
    query = query.in('match_id', matchIds)
  }

  if (teamId) {
    const teamMatchIds = await getMatchIdsByTeam(admin, teamId)
    if (teamMatchIds.length === 0) {
      return apiSuccess([], { total: 0, page, limit })
    }
    query = query.in('match_id', teamMatchIds)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return apiError('Failed to fetch predictions', 500)
  }

  const rows = (data ?? []).map(flattenPrediction)

  return apiSuccess(rows, { total: count ?? 0, page, limit })
})

function flattenPrediction(row: Record<string, unknown>) {
  const match = row.match as Record<string, unknown> | null
  const homeTeam = match?.home_team as Record<string, unknown> | null
  const awayTeam = match?.away_team as Record<string, unknown> | null

  return {
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
  }
}

async function getMatchIdsByDate(
  admin: ReturnType<typeof getSupabaseAdmin>,
  date: string,
): Promise<string[]> {
  const { data } = await admin
    .from('matches')
    .select('id')
    .gte('kickoff_utc', `${date}T00:00:00Z`)
    .lt('kickoff_utc', `${date}T23:59:59.999Z`)

  return (data ?? []).map((m: { id: string }) => m.id)
}

async function getMatchIdsByTeam(
  admin: ReturnType<typeof getSupabaseAdmin>,
  teamId: string,
): Promise<string[]> {
  const { data } = await admin
    .from('matches')
    .select('id')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)

  return (data ?? []).map((m: { id: string }) => m.id)
}
