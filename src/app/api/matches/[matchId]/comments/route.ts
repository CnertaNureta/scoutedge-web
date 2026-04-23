import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

interface RouteContext {
  params: Promise<{ matchId: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { matchId } = await context.params
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100)

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('match_comments')
    .select('id, user_id, display_name, avatar_url, body, minute, likes_count, is_pinned, created_at')
    .eq('match_id', matchId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }

  const nextCursor = data.length === limit ? data[data.length - 1].created_at : null

  return NextResponse.json({ comments: data, next_cursor: nextCursor })
}

export const POST = withAuth(async (req: NextRequest, user, accessToken) => {
  const url = new URL(req.url)
  const matchId = url.pathname.split('/')[3]

  const body = await req.json()
  const { text, minute } = body as { text?: string; minute?: number }

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
  }

  if (text.length > 500) {
    return NextResponse.json({ error: 'Comment must be 500 characters or less' }, { status: 400 })
  }

  const supabase = getSupabaseForUser(accessToken)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single()

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Fan'
  const avatarUrl = profile?.avatar_url || null

  const { data: comment, error } = await supabase
    .from('match_comments')
    .insert({
      match_id: matchId,
      user_id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      body: text.trim(),
      minute: minute ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })
  }

  return NextResponse.json({ comment }, { status: 201 })
})
