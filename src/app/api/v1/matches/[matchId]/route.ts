import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApiKey } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parseUuid } from '@/lib/api-v1/response'

const MATCH_SELECT = `
  id, home_team_id, away_team_id, kickoff_utc, venue, city,
  group_code, round, stage, match_status, home_score, away_score, created_at, updated_at,
  home_team:teams!home_team_id(id, name, slug, flag_url),
  away_team:teams!away_team_id(id, name, slug, flag_url)
`

export const GET = withApiKey(async (req: NextRequest) => {
  const id = parseUuid(req.nextUrl.pathname.split('/').pop())
  if (id === null) return apiError('Invalid or missing matchId (UUID required)', 400)

  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) {
    return apiError('Match not found', 404)
  }

  return apiSuccess(data)
})
