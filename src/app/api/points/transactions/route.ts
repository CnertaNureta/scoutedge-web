import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const GET = withAuth(async (req: NextRequest, user) => {
  const admin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
  const offset = (page - 1) * limit

  const { data: transactions, count } = await admin
    .from('point_transactions')
    .select('id, amount, balance_after, type, description, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({
    transactions: transactions ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  })
})
