import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination, parseDate } from '@/lib/api-v1/response'

const SIGNAL_COLUMNS = 'id, signal_type, category, summary, evidence, team_slug, player_slug, player_name, confidence, weight, source_key, happened_at, created_at'

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)

  const signalType = url.searchParams.get('signal_type')
  const category = url.searchParams.get('category')
  const sinceParam = parseDate(url.searchParams.get('since'))
  if (sinceParam === false) return apiError('Invalid since format, use YYYY-MM-DD', 400)

  const admin = getSupabaseAdmin()

  let query = admin
    .from('signals')
    .select(SIGNAL_COLUMNS, { count: 'exact' })
    .order('happened_at', { ascending: false })

  if (signalType) query = query.eq('signal_type', signalType)
  if (category) query = query.eq('category', category)
  if (sinceParam) query = query.gte('happened_at', `${sinceParam}T00:00:00Z`)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return apiError('Failed to fetch signals', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
