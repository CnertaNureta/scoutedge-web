import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50', 10))
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10))

  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('global_leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leaderboard: data ?? [], limit, offset })
}
