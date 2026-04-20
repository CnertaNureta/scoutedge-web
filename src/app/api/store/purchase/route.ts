import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const POST = withAuth(async (req: NextRequest, user) => {
  const admin = getSupabaseAdmin()
  const { item_id } = await req.json()

  if (!item_id) {
    return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
  }

  const { data, error } = await admin.rpc('purchase_store_item', {
    p_user_id: user.id,
    p_item_id: item_id,
  })

  if (error) {
    const status = error.message.includes('Insufficient balance') ? 402 : 400
    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json(data)
})
