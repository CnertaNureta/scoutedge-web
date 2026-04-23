import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

const VALID_REACTIONS = ['goal', 'fire', 'clap', 'cry', 'angry', 'laugh', 'heart', 'shocked'] as const
type ReactionType = typeof VALID_REACTIONS[number]

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const matchId = url.pathname.split('/')[3]

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('match_reaction_counts')
    .select('minute, reaction, count')
    .eq('match_id', matchId)
    .order('minute', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
  }

  return NextResponse.json({ reactions: data })
}

export const POST = withAuth(async (req: NextRequest, user, accessToken) => {
  const url = new URL(req.url)
  const matchId = url.pathname.split('/')[3]

  const body = await req.json()
  const { reaction, minute } = body as { reaction?: string; minute?: number }

  if (!reaction || !VALID_REACTIONS.includes(reaction as ReactionType)) {
    return NextResponse.json(
      { error: `Invalid reaction. Must be one of: ${VALID_REACTIONS.join(', ')}` },
      { status: 400 },
    )
  }

  const supabase = getSupabaseForUser(accessToken)

  const { error } = await supabase
    .from('match_reactions')
    .insert({
      match_id: matchId,
      user_id: user.id,
      reaction,
      minute: minute ?? null,
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit reaction' }, { status: 500 })
  }

  return NextResponse.json({ submitted: true }, { status: 201 })
})
