import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const GET = withAuth(async (_req, user) => {
  const admin = getSupabaseAdmin()

  const { data: inventory } = await admin
    .from('user_inventory')
    .select(`
      id,
      status,
      expires_at,
      activated_at,
      created_at,
      store_items(id, slug, name, description, category, image_url, metadata)
    `)
    .eq('user_id', user.id)
    .in('status', ['active', 'used'])
    .order('created_at', { ascending: false })

  return NextResponse.json({ inventory: inventory ?? [] })
})
