import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination, parseUuid } from '@/lib/api-v1/response'

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)

  const rawTeamId = url.searchParams.get('team_id')
  const teamId = rawTeamId ? parseUuid(rawTeamId) : undefined
  if (rawTeamId && teamId === null) return apiError('Invalid team_id (UUID required)', 400)

  const position = url.searchParams.get('position')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('players')
    .select(`
      id, name_en, slug, team_id, position, birth_date,
      height, preferred_foot, club_name, market_role,
      created_at, updated_at
    `, { count: 'exact' })
    .order('name_en', { ascending: true })

  if (teamId !== undefined) query = query.eq('team_id', teamId)
  if (position) query = query.eq('position', position)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return apiError('Failed to fetch players', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
