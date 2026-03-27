'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'

export type NotificationType = 'match_reminder' | 'prediction_update' | 'daily_brief' | 'breaking_news'

export interface NotificationPreferences {
  match_reminder: boolean
  prediction_update: boolean
  daily_brief: boolean
  breaking_news: boolean
}

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

interface UsePushNotificationsReturn {
  /** Whether Web Push is supported in this browser */
  isSupported: boolean
  /** Current Notification.permission state */
  permission: PushPermissionState
  /** Whether the user has an active push subscription */
  isSubscribed: boolean
  /** Current notification preferences (null until subscribed) */
  preferences: NotificationPreferences | null
  /** True while an async operation is in flight */
  loading: boolean
  /** Last error message, if any */
  error: string | null
  /** Request permission and subscribe */
  subscribe: (prefs?: Partial<NotificationPreferences>) => Promise<void>
  /** Unsubscribe and remove from server */
  unsubscribe: () => Promise<void>
  /** Update preferences for an existing subscription */
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported())
  const [permission, setPermission] = useState<PushPermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)

  // Sync permission state and check existing subscription on mount
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission as PushPermissionState)

    // Check for an existing push subscription in the browser
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setIsSubscribed(true)
          setCurrentEndpoint(sub.endpoint)
        }
      })
    })
  }, [isSupported])

  const subscribe = useCallback(
    async (prefs?: Partial<NotificationPreferences>) => {
      if (!isSupported) {
        setError('Push notifications are not supported in this browser.')
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Request notification permission
        const perm = await Notification.requestPermission()
        setPermission(perm as PushPermissionState)

        if (perm !== 'granted') {
          setError('Notification permission was denied.')
          return
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          setError('Push notifications are not configured.')
          return
        }

        const reg = await navigator.serviceWorker.ready

        // Convert VAPID public key from base64url to Uint8Array
        const keyBytes = Uint8Array.from(
          atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')),
          (c) => c.charCodeAt(0),
        )

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        })

        const { endpoint, keys } = subscription.toJSON() as {
          endpoint: string
          keys: { p256dh: string; auth: string }
        }

        const token = await getAccessToken()
        if (!token) {
          setError('You must be signed in to enable notifications.')
          await subscription.unsubscribe()
          return
        }

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: { endpoint, keys }, preferences: prefs }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error ?? 'Failed to save subscription')
        }

        const data = (await res.json()) as { subscription: { preferences: NotificationPreferences } }
        setIsSubscribed(true)
        setCurrentEndpoint(endpoint)
        setPreferences(data.subscription.preferences)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.')
      } finally {
        setLoading(false)
      }
    },
    [isSupported],
  )

  const unsubscribe = useCallback(async () => {
    if (!currentEndpoint) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        setError('You must be signed in to manage notifications.')
        return
      }

      // Remove browser-side subscription
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await sub?.unsubscribe()

      // Remove server-side subscription
      const res = await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: currentEndpoint }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Failed to remove subscription')
      }

      setIsSubscribed(false)
      setCurrentEndpoint(null)
      setPreferences(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
    } finally {
      setLoading(false)
    }
  }, [currentEndpoint])

  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>) => {
      if (!currentEndpoint) {
        setError('No active subscription to update.')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const token = await getAccessToken()
        if (!token) {
          setError('You must be signed in to manage notifications.')
          return
        }

        const res = await fetch('/api/push/subscribe', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ endpoint: currentEndpoint, preferences: prefs }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error((body as { error?: string }).error ?? 'Failed to update preferences')
        }

        const data = (await res.json()) as { subscription: { preferences: NotificationPreferences } }
        setPreferences(data.subscription.preferences)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.')
      } finally {
        setLoading(false)
      }
    },
    [currentEndpoint],
  )

  return {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    loading,
    error,
    subscribe,
    unsubscribe,
    updatePreferences,
  }
}
