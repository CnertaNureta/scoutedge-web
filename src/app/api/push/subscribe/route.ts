import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseForUser } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/** Valid notification preference keys */
const VALID_PREFERENCES = [
  'match_reminder',
  'prediction_update',
  'daily_brief',
  'breaking_news',
] as const

type NotificationType = (typeof VALID_PREFERENCES)[number]

interface SubscribeBody {
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  preferences?: Partial<Record<NotificationType, boolean>>
}

/** POST — Save a push subscription for the authenticated user */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SubscribeBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { subscription, preferences } = body

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json(
      { error: 'Missing subscription data. Required: endpoint, keys.p256dh, keys.auth' },
      { status: 400 },
    )
  }

  // Build preferences, defaulting all to true
  const prefs: Record<NotificationType, boolean> = {
    match_reminder: true,
    prediction_update: true,
    daily_brief: true,
    breaking_news: true,
  }
  if (preferences) {
    for (const key of VALID_PREFERENCES) {
      if (typeof preferences[key] === 'boolean') {
        prefs[key] = preferences[key]
      }
    }
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        preferences: prefs,
      },
      { onConflict: 'endpoint' },
    )
    .select('id, endpoint, preferences, created_at')
    .single()

  if (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  return NextResponse.json({ subscription: data }, { status: 201 })
}

/** DELETE — Remove a push subscription by endpoint */
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { endpoint?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('user_id', user.id)

  if (error) {
    console.error('Push unsubscribe error:', error)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/** PATCH — Update notification preferences for an existing subscription */
export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = getSupabaseForUser(token)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { endpoint?: string; preferences?: Partial<Record<NotificationType, boolean>> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.endpoint || !body.preferences) {
    return NextResponse.json(
      { error: 'Missing endpoint or preferences' },
      { status: 400 },
    )
  }

  const admin = getSupabaseAdmin()

  // Fetch existing preferences
  const { data: existing } = await admin
    .from('push_subscriptions')
    .select('preferences')
    .eq('endpoint', body.endpoint)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  const merged = { ...(existing.preferences as Record<string, boolean>) }
  for (const key of VALID_PREFERENCES) {
    if (typeof body.preferences[key] === 'boolean') {
      merged[key] = body.preferences[key]
    }
  }

  const { data, error } = await admin
    .from('push_subscriptions')
    .update({ preferences: merged })
    .eq('endpoint', body.endpoint)
    .eq('user_id', user.id)
    .select('id, endpoint, preferences, updated_at')
    .single()

  if (error) {
    console.error('Push preferences update error:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }

  return NextResponse.json({ subscription: data })
}
