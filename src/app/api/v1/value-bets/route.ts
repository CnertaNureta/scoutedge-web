import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination, parseUuid, parseFloat01 } from '@/lib/api-v1/response'

const VALUE_BET_COLUMNS = 'id, match_id, team_id, team_name, market, our_probability, market_probability, edge, best_odds, best_bookmaker, signal_strength, computed_at'
const VALID_STRENGTHS = new Set(['low', 'medium', 'high'])

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)

  const rawTeamId = url.searchParams.get('team_id')
  const teamId = rawTeamId ? parseUuid(rawTeamId) : undefined
  if (rawTeamId && teamId === null) return apiError('Invalid team_id (UUID required)', 400)

  const market = url.searchParams.get('market')
  const minEdgeParam = parseFloat01(url.searchParams.get('min_edge'))
  if (minEdgeParam === false) return apiError('Invalid min_edge, must be 0-1', 400)
  const signalStrength = url.searchParams.get('signal_strength')
  if (signalStrength && !VALID_STRENGTHS.has(signalStrength)) return apiError('Invalid signal_strength, must be low/medium/high', 400)

  const admin = getSupabaseAdmin()

  let query = admin
    .from('value_bets')
    .select(VALUE_BET_COLUMNS, { count: 'exact' })
    .order('edge', { ascending: false })

  if (teamId !== undefined) query = query.eq('team_id', teamId)
  if (market) query = query.eq('market', market)
  if (minEdgeParam !== null) query = query.gte('edge', minEdgeParam)
  if (signalStrength) query = query.eq('signal_strength', signalStrength)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    if (error.code === 'PGRST205') return apiSuccess([], { total: 0, page, limit })
    return apiError('Failed to fetch value bets', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
