import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const matchId = url.pathname.split('/')[3]

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase.rpc('get_match_viewer_count', {
    p_match_id: Number(matchId),
  })

  if (error) {
    return NextResponse.json({ viewer_count: 0 })
  }

  return NextResponse.json({ viewer_count: data ?? 0 })
}

export const POST = withAuth(async (req: NextRequest, user, accessToken) => {
  const url = new URL(req.url)
  const matchId = url.pathname.split('/')[3]

  const supabase = getSupabaseForUser(accessToken)

  const { error } = await supabase
    .from('match_presence')
    .upsert(
      { match_id: Number(matchId), user_id: user.id, last_seen_at: new Date().toISOString() },
      { onConflict: 'match_id,user_id' },
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 })
  }

  return NextResponse.json({ present: true })
})
