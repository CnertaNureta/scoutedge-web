import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApiKey } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination } from '@/lib/api-v1/response'

const SORTABLE_COLUMNS: Record<string, string> = {
  name: 'name',
  fifa_rank: 'fifa_rank',
  confederation: 'confederation',
  group_code: 'group_code',
  elo_rating: 'elo_rating',
}

export const GET = withApiKey(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)

  const group = url.searchParams.get('group')
  const confederation = url.searchParams.get('confederation')
  const sortParam = url.searchParams.get('sort')

  const sortColumn = sortParam && SORTABLE_COLUMNS[sortParam] ? SORTABLE_COLUMNS[sortParam] : 'name'

  const admin = getSupabaseAdmin()

  let query = admin
    .from('teams')
    .select(
      'id, name, slug, flag_url, group_code, confederation, fifa_rank, elo_rating, coach_name, created_at, updated_at',
      { count: 'exact' },
    )
    .order(sortColumn, { ascending: true })

  if (group) query = query.eq('group_code', group)
  if (confederation) query = query.eq('confederation', confederation)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return apiError('Failed to fetch teams', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
