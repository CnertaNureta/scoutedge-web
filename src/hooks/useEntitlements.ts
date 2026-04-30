'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { Entitlement, ContentType } from '@/lib/entitlements'
import { hasAccess as checkAccess, getHighestTier, getUpgradeTarget } from '@/lib/entitlements'

export function useEntitlements() {
  const { user, session } = useAuth()
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !session?.access_token) {
      setEntitlements([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch('/api/entitlements', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(({ entitlements: data }) => {
        setEntitlements((data as Entitlement[]) ?? [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load entitlements:', err)
        setError(err.message ?? 'Unknown error')
        setEntitlements([])
        setLoading(false)
      })
  }, [user, session?.access_token])

  const hasAccess = useCallback(
    (contentType: ContentType, scope?: string) =>
      checkAccess(entitlements, contentType, scope),
    [entitlements],
  )

  const tier = getHighestTier(entitlements)

  const suggestUpgrade = useCallback(
    (contentType: ContentType) => getUpgradeTarget(entitlements, contentType),
    [entitlements],
  )

  return { entitlements, loading, error, hasAccess, tier, suggestUpgrade }
}
