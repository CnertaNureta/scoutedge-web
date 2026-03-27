'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseWakeLockReturn {
  /** Whether the Screen Wake Lock API is available */
  isSupported: boolean
  /** Whether a wake lock is currently held */
  isActive: boolean
  /** Request a screen wake lock */
  request: () => Promise<void>
  /** Release the current wake lock */
  release: () => Promise<void>
}

/**
 * Screen Wake Lock API wrapper.
 * Automatically re-acquires the lock when the tab becomes visible again,
 * because browsers release it on page hide.
 */
export function useWakeLock(): UseWakeLockReturn {
  const [isActive, setIsActive] = useState(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  const isSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator

  const request = useCallback(async () => {
    if (!isSupported) return
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      sentinelRef.current = sentinel
      setIsActive(true)
      sentinel.addEventListener('release', () => {
        sentinelRef.current = null
        setIsActive(false)
      })
    } catch {
      // Permission denied or unsupported in this context
    }
  }, [isSupported])

  const release = useCallback(async () => {
    if (!sentinelRef.current) return
    try {
      await sentinelRef.current.release()
    } catch {
      // Ignore — sentinel may already be released
    }
    sentinelRef.current = null
    setIsActive(false)
  }, [])

  // Re-acquire on visibility change — browsers auto-release on page hide
  useEffect(() => {
    if (!isActive) return
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        request()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive, request])

  // Release on unmount
  useEffect(() => {
    return () => {
      sentinelRef.current?.release().catch(() => {})
    }
  }, [])

  return { isSupported, isActive, request, release }
}
