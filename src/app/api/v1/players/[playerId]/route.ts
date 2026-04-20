import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withAdvancedTier } from '@/lib/api-v1/middleware'
import { apiSuccess, apiError, parseUuid } from '@/lib/api-v1/response'

export const GET = withAdvancedTier(async (req: NextRequest) => {
  const id = parseUuid(req.nextUrl.pathname.split('/').pop())
  if (id === null) return apiError('Invalid or missing playerId (UUID required)', 400)

  const admin = getSupabaseAdmin()

  const { data: player, error: playerError } = await admin
    .from('players')
    .select(`
      id, name_en, slug, team_id, position, birth_date,
      height, preferred_foot, club_name, market_role,
      created_at, updated_at
    `)
    .eq('id', id)
    .single()

  if (playerError || !player) {
    return apiError('Player not found', 404)
  }

  const { data: signals } = await admin
    .from('signals')
    .select('id, signal_type, summary, evidence, confidence, weight, source_key, happened_at')
    .eq('player_slug', player.slug)
    .order('happened_at', { ascending: false })
    .limit(10)

  return apiSuccess({
    ...player,
    recent_signals: signals ?? [],
  })
})
