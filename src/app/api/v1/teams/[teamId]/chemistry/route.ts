import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parseUuid } from '@/lib/api-v1/response'

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split('/')
  const chemistryIdx = segments.indexOf('chemistry')
  const id = parseUuid(segments[chemistryIdx - 1])
  if (id === null) return apiError('Invalid or missing teamId (UUID required)', 400)

  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('team_chemistry')
    .select('team_id, chemistry, familiarity, stability, morale, chemistry_rank, updated_at')
    .eq('team_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return apiError('Chemistry data not found', 404)
  }

  return apiSuccess(data)
})
