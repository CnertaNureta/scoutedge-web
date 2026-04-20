import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const POST = withAuth(async (_req, user) => {
  const admin = getSupabaseAdmin()

  const { data, error } = await admin.rpc('daily_checkin', {
    p_user_id: user.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
})
