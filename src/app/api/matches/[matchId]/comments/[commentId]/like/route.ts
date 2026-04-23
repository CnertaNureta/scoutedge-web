import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseForUser } from '@/lib/supabase-server'

interface RouteContext {
  params: Promise<{ matchId: string; commentId: string }>
}

export const POST = withAuth(async (req: NextRequest, user, accessToken) => {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const commentId = segments[5]

  const supabase = getSupabaseForUser(accessToken)

  const { error } = await supabase
    .from('comment_likes')
    .insert({ user_id: user.id, comment_id: commentId })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already liked' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 })
  }

  return NextResponse.json({ liked: true }, { status: 201 })
})

export const DELETE = withAuth(async (req: NextRequest, user, accessToken) => {
  const url = new URL(req.url)
  const segments = url.pathname.split('/')
  const commentId = segments[5]

  const supabase = getSupabaseForUser(accessToken)

  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('user_id', user.id)
    .eq('comment_id', commentId)

  if (error) {
    return NextResponse.json({ error: 'Failed to unlike comment' }, { status: 500 })
  }

  return NextResponse.json({ liked: false })
})
