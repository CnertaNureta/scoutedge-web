import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parsePagination } from '@/lib/api-v1/response'

const SIGNAL_COLUMNS = 'id, signal_type, category, summary, evidence, team_slug, player_slug, player_name, confidence, weight, source_key, happened_at, created_at'

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split('/')
  const teamSlugIdx = segments.indexOf('signals') + 1
  const teamSlug = segments[teamSlugIdx]
  if (!teamSlug) return apiError('Missing team slug', 400)

  const url = new URL(req.url)
  const { page, limit, offset } = parsePagination(url)
  const signalType = url.searchParams.get('signal_type')

  const admin = getSupabaseAdmin()

  let query = admin
    .from('signals')
    .select(SIGNAL_COLUMNS, { count: 'exact' })
    .eq('team_slug', teamSlug)
    .order('happened_at', { ascending: false })

  if (signalType) query = query.eq('signal_type', signalType)

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return apiError('Failed to fetch signals', 500)
  }

  return apiSuccess(data ?? [], { total: count ?? 0, page, limit })
})
