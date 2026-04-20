import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const POST = withAuth(async (req: NextRequest, user) => {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const leagueId = segments[segments.indexOf('leagues') + 1]

  if (!leagueId) {
    return NextResponse.json({ error: 'League ID required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  const { data: league, error: leagueErr } = await admin
    .from('prediction_leagues')
    .select('id, league_type, invite_code, max_members, is_active')
    .eq('id', leagueId)
    .single()

  if (leagueErr || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  if (!league.is_active) {
    return NextResponse.json({ error: 'League is no longer active' }, { status: 400 })
  }

  if (league.league_type === 'private') {
    const body = await req.json().catch(() => ({}))
    if (body.invite_code !== league.invite_code) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 })
    }
  }

  const { count: memberCount } = await admin
    .from('league_members')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', leagueId)

  if (memberCount !== null && memberCount >= league.max_members) {
    return NextResponse.json({ error: 'League is full' }, { status: 400 })
  }

  const { error: joinErr } = await admin
    .from('league_members')
    .insert({
      league_id: leagueId,
      user_id: user.id,
      role: 'member',
    })

  if (joinErr) {
    if (joinErr.code === '23505') {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 })
    }
    return NextResponse.json({ error: joinErr.message }, { status: 500 })
  }

  return NextResponse.json({ joined: true })
})
