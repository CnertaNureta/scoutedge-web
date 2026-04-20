import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination, parseUuid } from '@/lib/api-v1/response'

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)

  const market = url.searchParams.get('market')
  const rawTeamId = url.searchParams.get('team_id')
  const teamId = rawTeamId ? parseUuid(rawTeamId) : undefined
  if (rawTeamId && teamId === null) return apiError('Invalid team_id (UUID required)', 400)

  const bookmaker = url.searchParams.get('bookmaker')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('odds_snapshots')
    .select('id, match_id, team_id, team_name, market, bookmaker, outcome, decimal_odds, implied_probability, snapshot_at, created_at', { count: 'exact' })
    .order('snapshot_at', { ascending: false })

  if (market) query = query.eq('market', market)
  if (teamId !== undefined) query = query.eq('team_id', teamId)
  if (bookmaker) query = query.eq('bookmaker', bookmaker)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    if (error.code === 'PGRST205') return apiSuccess([], { total: 0, page, limit })
    return apiError('Failed to fetch odds', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
