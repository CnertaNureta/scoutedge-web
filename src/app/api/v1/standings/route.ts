import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApiKey } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError } from '@/lib/api-v1/response'

export const GET = withApiKey(async (req: NextRequest) => {
  const url = new URL(req.url)
  const group = url.searchParams.get('group')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('standings')
    .select(
      `id, team_id, group_code, ranking, played, wins, draws, losses,
       goals_for, goals_against, goal_difference, points, created_at, updated_at,
       team:teams!team_id(id, name, slug, flag_url)`,
      { count: 'exact' },
    )
    .order('group_code', { ascending: true })
    .order('ranking', { ascending: true })

  if (group) query = query.eq('group_code', group)

  const { data, error, count } = await query

  if (error) {
    return apiError('Failed to fetch standings', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page: 1, limit: count ?? 0 })
})
