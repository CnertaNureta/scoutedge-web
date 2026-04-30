import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ entitlements: [] })
  }

  const token = authHeader.slice(7)
  const supabaseUser = getSupabaseForUser(token)
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ entitlements: [] })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('user_entitlements')
    .select('id, entitlement_type, scope, valid_from, valid_until')
    .eq('user_id', user.id)
    .gt('valid_until', new Date().toISOString())

  if (error) {
    console.error('Entitlements query error:', error)
    return NextResponse.json({ entitlements: [], error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entitlements: data ?? [] })
}
