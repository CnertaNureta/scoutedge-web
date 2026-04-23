import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const matchId = url.pathname.split('/')[3]

  const supabase = getSupabaseAdmin()

  const { data: polls, error } = await supabase
    .from('match_polls')
    .select(`
      id, question, poll_type, is_active, total_votes, closes_at, created_at,
      poll_options (id, option_text, vote_count, position)
    `)
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 })
  }

  return NextResponse.json({ polls })
}

export const POST = withAuth(async (req: NextRequest, user, accessToken) => {
  const url = new URL(req.url)
  const matchId = url.pathname.split('/')[3]

  const body = await req.json()
  const { question, options, closes_in_minutes } = body as {
    question?: string
    options?: string[]
    closes_in_minutes?: number
  }

  if (!question || question.trim().length < 5) {
    return NextResponse.json({ error: 'Question must be at least 5 characters' }, { status: 400 })
  }

  if (!options || options.length < 2 || options.length > 6) {
    return NextResponse.json({ error: 'Must provide 2-6 options' }, { status: 400 })
  }

  const invalidOption = options.find(o => !o || o.trim().length === 0 || o.length > 100)
  if (invalidOption !== undefined) {
    return NextResponse.json({ error: 'Each option must be 1-100 characters' }, { status: 400 })
  }

  const closesAt = closes_in_minutes
    ? new Date(Date.now() + closes_in_minutes * 60_000).toISOString()
    : null

  const supabase = getSupabaseForUser(accessToken)

  const { data: poll, error: pollError } = await supabase
    .from('match_polls')
    .insert({
      match_id: matchId,
      created_by: user.id,
      question: question.trim(),
      closes_at: closesAt,
    })
    .select()
    .single()

  if (pollError) {
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }

  const optionRows = options.map((text, i) => ({
    poll_id: poll.id,
    option_text: text.trim(),
    position: i,
  }))

  const { data: createdOptions, error: optError } = await supabase
    .from('poll_options')
    .insert(optionRows)
    .select()

  if (optError) {
    return NextResponse.json({ error: 'Failed to create poll options' }, { status: 500 })
  }

  return NextResponse.json({
    poll: { ...poll, poll_options: createdOptions },
  }, { status: 201 })
})
