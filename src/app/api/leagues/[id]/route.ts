import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseForUser, getSupabaseAdmin } from '@/lib/supabase-server'

export const GET = withAuth(async (
  _req: NextRequest,
  user,
  token
) => {
  const url = new URL(_req.url)
  const leagueId = url.pathname.split('/').at(-1)

  if (!leagueId) {
    return NextResponse.json({ error: 'League ID required' }, { status: 400 })
  }

  const supabase = getSupabaseForUser(token)

  const { data: league, error: leagueErr } = await supabase
    .from('prediction_leagues')
    .select('*')
    .eq('id', leagueId)
    .single()

  if (leagueErr || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const admin = getSupabaseAdmin()

  const { data: members } = await admin
    .from('league_members')
    .select(`
      user_id, role, joined_at,
      user_profiles (display_name, avatar_url, favorite_team_slug)
    `)
    .eq('league_id', leagueId)
    .order('joined_at', { ascending: true })

  const { data: standings } = await admin
    .from('league_standings')
    .select('*')
    .eq('league_id', leagueId)
    .order('rank', { ascending: true })
    .limit(100)

  const isMember = members?.some(m => m.user_id === user.id) ?? false

  return NextResponse.json({
    league,
    members: members ?? [],
    standings: standings ?? [],
    is_member: isMember,
    member_count: members?.length ?? 0,
  })
})
