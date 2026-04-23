'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSupabase } from '@/lib/supabase'
import type { Entitlement, ContentType } from '@/lib/entitlements'
import { hasAccess as checkAccess, getHighestTier, getUpgradeTarget } from '@/lib/entitlements'

export function useEntitlements() {
  const { user } = useAuth()
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setEntitlements([])
      setLoading(false)
      return
    }

    const supabase = getSupabase()
    supabase
      .from('user_entitlements')
      .select('id, entitlement_type, scope, valid_from, valid_until')
      .eq('user_id', user.id)
      .gt('valid_until', new Date().toISOString())
      .then(({ data }) => {
        setEntitlements((data as Entitlement[]) ?? [])
        setLoading(false)
      })
  }, [user])

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

  return { entitlements, loading, hasAccess, tier, suggestUpgrade }
}
