import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApiKey } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination, parseUuid, parseDate } from '@/lib/api-v1/response'

const MATCH_SELECT = `
  id, home_team_id, away_team_id, kickoff_utc, venue, city,
  group_code, round, stage, match_status, home_score, away_score, created_at, updated_at,
  home_team:teams!home_team_id(id, name, slug, flag_url),
  away_team:teams!away_team_id(id, name, slug, flag_url)
`

export const GET = withApiKey(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)

  const group = url.searchParams.get('group')
  const status = url.searchParams.get('status')
  const dateParam = parseDate(url.searchParams.get('date'))
  if (dateParam === false) return apiError('Invalid date format, use YYYY-MM-DD', 400)
  const date = dateParam
  const round = url.searchParams.get('round')
  const rawTeamId = url.searchParams.get('team_id')
  const teamId = rawTeamId ? parseUuid(rawTeamId) : undefined
  if (rawTeamId && teamId === null) return apiError('Invalid team_id (UUID required)', 400)

  const admin = getSupabaseAdmin()

  let query = admin
    .from('matches')
    .select(MATCH_SELECT, { count: 'exact' })
    .order('kickoff_utc', { ascending: true })

  if (group) query = query.eq('group_code', group)
  if (status) query = query.eq('match_status', status)
  if (round) query = query.eq('round', round)
  if (date) {
    query = query
      .gte('kickoff_utc', `${date}T00:00:00Z`)
      .lt('kickoff_utc', `${date}T23:59:59.999Z`)
  }
  if (teamId !== undefined) {
    query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return apiError('Failed to fetch matches', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
