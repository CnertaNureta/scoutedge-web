import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import type { User } from '@supabase/supabase-js'

export type AuthenticatedHandler = (
  req: NextRequest,
  user: User,
  accessToken: string
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = getSupabaseForUser(token)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    return handler(req, user, token)
  }
}
