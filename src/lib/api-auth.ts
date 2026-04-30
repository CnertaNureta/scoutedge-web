import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser, getSupabaseAdmin } from '@/lib/supabase-server'
import { hasAccess, type ContentType, type Entitlement } from '@/lib/entitlements'
import type { User } from '@supabase/supabase-js'

export type AuthenticatedHandler = (
  req: NextRequest,
  user: User,
  accessToken: string
) => Promise<NextResponse>

export type OptionalAuthHandler = (
  req: NextRequest,
  user: User | null,
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

export function withOptionalAuth(handler: OptionalAuthHandler) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return handler(req, null)
    }

    const token = authHeader.slice(7)
    const supabase = getSupabaseForUser(token)
    const { data: { user } } = await supabase.auth.getUser()

    return handler(req, user ?? null)
  }
}

export async function checkEntitlement(
  userId: string,
  contentType: ContentType,
  scope?: string,
): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { data } = await admin
    .from('user_entitlements')
    .select('id, entitlement_type, scope, valid_from, valid_until')
    .eq('user_id', userId)
    .gt('valid_until', new Date().toISOString())

  return hasAccess((data ?? []) as Entitlement[], contentType, scope)
}
