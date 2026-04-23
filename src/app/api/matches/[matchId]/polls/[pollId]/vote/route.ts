import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseForUser } from '@/lib/supabase-server'

export const POST = withAuth(async (req: NextRequest, user, accessToken) => {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const pollId = segments[5]

  const body = await req.json()
  const { option_id } = body as { option_id?: string }

  if (!option_id) {
    return NextResponse.json({ error: 'option_id is required' }, { status: 400 })
  }

  const supabase = getSupabaseForUser(accessToken)

  const { data: poll } = await supabase
    .from('match_polls')
    .select('id, is_active, closes_at')
    .eq('id', pollId)
    .single()

  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
  }

  if (!poll.is_active) {
    return NextResponse.json({ error: 'Poll is closed' }, { status: 410 })
  }

  if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
    return NextResponse.json({ error: 'Poll has expired' }, { status: 410 })
  }

  const { error } = await supabase
    .from('user_poll_votes')
    .insert({
      user_id: user.id,
      poll_id: pollId,
      option_id,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already voted on this poll' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }

  return NextResponse.json({ voted: true }, { status: 201 })
})
