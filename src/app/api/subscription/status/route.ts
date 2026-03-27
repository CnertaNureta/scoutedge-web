import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForUser } from '@/lib/supabase-server'
import type { Subscription } from '@/lib/subscription-types'
import { FREE_SUBSCRIPTION } from '@/lib/subscription-types'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(FREE_SUBSCRIPTION)
  }

  const token = authHeader.slice(7)
  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(FREE_SUBSCRIPTION)
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sub) {
    return NextResponse.json(FREE_SUBSCRIPTION)
  }

  const subscription: Subscription = {
    tier: 'pro',
    plan: sub.plan as 'monthly' | 'tournament',
    status: sub.status as Subscription['status'],
    currentPeriodEnd: sub.current_period_end,
  }

  return NextResponse.json(subscription)
}
