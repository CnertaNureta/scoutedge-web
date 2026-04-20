import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApiKey } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parseUuid } from '@/lib/api-v1/response'

export const GET = withApiKey(async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split('/')
  const teamsIdx = segments.indexOf('teams')
  const id = parseUuid(segments[teamsIdx + 1])
  if (id === null) return apiError('Invalid or missing teamId (UUID required)', 400)

  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('teams')
    .select(`
      id, name, slug, flag_url, group_code, confederation,
      fifa_rank, elo_rating, coach_name, created_at, updated_at,
      team_stats (*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return apiError('Team not found', 404)
  }

  return apiSuccess(data)
})
