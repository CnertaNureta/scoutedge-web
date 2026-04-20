import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  let query = admin
    .from('store_items')
    .select('id, slug, name, description, category, point_cost, real_money_cents, image_url, metadata, stock, is_featured, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data: items } = await query

  return NextResponse.json({ items: items ?? [] })
}
