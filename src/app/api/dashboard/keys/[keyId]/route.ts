import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { rotateApiKey, revokeApiKey } from '@/lib/api-keys'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const PATCH = withAuth(async (req, user) => {
  const keyId = req.nextUrl.pathname.split('/').at(-1)!
  const body = await req.json()

  if (body.action === 'rotate') {
    const result = await rotateApiKey(keyId, user.id)
    return NextResponse.json({ key: result.key, record: result.record })
  }

  if (body.action === 'revoke') {
    await revokeApiKey(keyId, user.id)
    return NextResponse.json({ success: true })
  }

  if (body.action === 'rename' && typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name || name.length > 64) {
      return NextResponse.json({ error: 'Name must be 1-64 characters' }, { status: 400 })
    }
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('api_keys')
      .update({ name })
      .eq('id', keyId)
      .eq('user_id', user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
})
