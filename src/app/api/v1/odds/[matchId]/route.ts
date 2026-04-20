import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination, parseUuid } from '@/lib/api-v1/response'

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const id = parseUuid(req.nextUrl.pathname.split('/').pop())
  if (id === null) return apiError('Invalid or missing matchId (UUID required)', 400)

  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)
  const bookmaker = url.searchParams.get('bookmaker')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('odds_snapshots')
    .select('id, match_id, team_id, team_name, market, bookmaker, outcome, decimal_odds, implied_probability, snapshot_at, created_at', { count: 'exact' })
    .eq('match_id', id)
    .order('snapshot_at', { ascending: false })

  if (bookmaker) query = query.eq('bookmaker', bookmaker)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    if (error.code === 'PGRST205') return apiSuccess([], { total: 0, page, limit })
    return apiError('Failed to fetch odds', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
