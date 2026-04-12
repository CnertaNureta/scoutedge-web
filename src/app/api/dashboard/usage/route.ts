import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const GET = withAuth(async (req, user) => {
  const admin = getSupabaseAdmin()
  const url = new URL(req.url)
  const days = Math.min(Number(url.searchParams.get('days') || '30'), 90)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString().split('T')[0]

  const { data: keys } = await admin
    .from('api_keys')
    .select('id')
    .eq('user_id', user.id)

  if (!keys?.length) {
    return NextResponse.json({ daily: [], endpoints: [], summary: { totalRequests: 0, totalErrors: 0, avgResponseTime: 0 } })
  }

  const keyIds = keys.map((k) => k.id)

  const { data: daily } = await admin
    .from('api_usage_daily')
    .select('api_key_id, date, endpoint, request_count, avg_response_time_ms, error_count')
    .in('api_key_id', keyIds)
    .gte('date', startStr)
    .order('date', { ascending: true })

  const rows = daily ?? []

  const byDate = new Map<string, { requests: number; errors: number }>()
  const byEndpoint = new Map<string, { requests: number; errors: number; totalTime: number; count: number }>()

  for (const r of rows) {
    const d = byDate.get(r.date) ?? { requests: 0, errors: 0 }
    d.requests += r.request_count
    d.errors += r.error_count
    byDate.set(r.date, d)

    const e = byEndpoint.get(r.endpoint) ?? { requests: 0, errors: 0, totalTime: 0, count: 0 }
    e.requests += r.request_count
    e.errors += r.error_count
    if (r.avg_response_time_ms) {
      e.totalTime += r.avg_response_time_ms * r.request_count
      e.count += r.request_count
    }
    byEndpoint.set(r.endpoint, e)
  }

  const dailyArr = Array.from(byDate.entries()).map(([date, v]) => ({ date, ...v }))
  const endpointsArr = Array.from(byEndpoint.entries())
    .map(([endpoint, v]) => ({
      endpoint,
      requests: v.requests,
      errors: v.errors,
      errorRate: v.requests > 0 ? (v.errors / v.requests) * 100 : 0,
      avgResponseTime: v.count > 0 ? Math.round(v.totalTime / v.count) : 0,
    }))
    .sort((a, b) => b.requests - a.requests)

  const totalRequests = rows.reduce((s, r) => s + r.request_count, 0)
  const totalErrors = rows.reduce((s, r) => s + r.error_count, 0)
  const totalTime = rows.reduce((s, r) => s + (r.avg_response_time_ms ?? 0) * r.request_count, 0)

  return NextResponse.json({
    daily: dailyArr,
    endpoints: endpointsArr,
    summary: {
      totalRequests,
      totalErrors,
      avgResponseTime: totalRequests > 0 ? Math.round(totalTime / totalRequests) : 0,
    },
  })
})
