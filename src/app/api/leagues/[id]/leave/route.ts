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

  const { data: membership } = await admin
    .from('league_members')
    .select('id, role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member' }, { status: 404 })
  }

  if (membership.role === 'owner') {
    return NextResponse.json({ error: 'Owner cannot leave. Transfer ownership or delete the league.' }, { status: 400 })
  }

  const { error: leaveErr } = await admin
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', user.id)

  if (leaveErr) {
    return NextResponse.json({ error: leaveErr.message }, { status: 500 })
  }

  return NextResponse.json({ left: true })
})
