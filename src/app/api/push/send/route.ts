import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { safeCompare } from '@/lib/crypto-utils'

export const dynamic = 'force-dynamic'

const NOTIFICATION_TYPES = [
  'match_reminder',
  'prediction_update',
  'daily_brief',
  'breaking_news',
] as const

type NotificationType = (typeof NOTIFICATION_TYPES)[number]

interface SendBody {
  type: NotificationType
  title: string
  body: string
  url?: string
  icon?: string
  /** Send to specific user IDs instead of all subscribers */
  userIds?: string[]
  /** Send to specific team followers (via user_profiles.favorite_team_slug) */
  teamSlug?: string
}

interface PushSubscriptionRow {
  id: number
  user_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  preferences: Record<string, boolean>
}

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      'VAPID not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.',
    )
  }

  return { publicKey, privateKey, subject }
}

/** POST — Send push notifications by type, with optional audience targeting */
export async function POST(req: NextRequest) {
  // Server-to-server auth via service role key
  const authHeader = req.headers.get('authorization') ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey || !safeCompare(authHeader, `Bearer ${serviceKey}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: SendBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.type || !NOTIFICATION_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${NOTIFICATION_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  if (!body.title || !body.body) {
    return NextResponse.json({ error: 'Missing title or body' }, { status: 400 })
  }

  const vapid = getVapidConfig()
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  const admin = getSupabaseAdmin()

  // Build query for target subscriptions
  let query = admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh_key, auth_key, preferences')

  // Filter by specific users if provided
  if (body.userIds?.length) {
    query = query.in('user_id', body.userIds)
  }

  // Filter by team followers if teamSlug is provided
  if (body.teamSlug) {
    const { data: followers } = await admin
      .from('user_profiles')
      .select('id')
      .eq('favorite_team_slug', body.teamSlug)

    if (!followers?.length) {
      return NextResponse.json({ sent: 0, failed: 0, cleaned: 0 })
    }

    const followerIds = followers.map((f) => f.id)
    query = query.in('user_id', followerIds)
  }

  const { data: subscriptions, error } = await query

  if (error) {
    console.error('Failed to fetch subscriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, failed: 0, cleaned: 0 })
  }

  // Filter by notification preference
  const eligible = (subscriptions as PushSubscriptionRow[]).filter(
    (sub) => sub.preferences?.[body.type] !== false,
  )

  const payload = JSON.stringify({
    type: body.type,
    title: body.title,
    body: body.body,
    url: body.url ?? '/',
    icon: body.icon ?? '/icons/icon-192x192.png',
    timestamp: Date.now(),
  })

  let sent = 0
  let failed = 0
  const staleEndpoints: number[] = []

  // Send in parallel with concurrency limit
  const BATCH_SIZE = 50
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          payload,
        ),
      ),
    )

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === 'fulfilled') {
        sent++
      } else {
        failed++
        // 410 Gone or 404 means subscription expired — mark for cleanup
        const statusCode = (result.reason as { statusCode?: number })?.statusCode
        if (statusCode === 410 || statusCode === 404) {
          staleEndpoints.push(batch[j].id)
        }
      }
    }
  }

  // Clean up stale subscriptions
  if (staleEndpoints.length > 0) {
    await admin
      .from('push_subscriptions')
      .delete()
      .in('id', staleEndpoints)
  }

  return NextResponse.json({
    sent,
    failed,
    cleaned: staleEndpoints.length,
  })
}
