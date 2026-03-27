'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  /** Pixels of pull needed to trigger refresh (default: 72) */
  threshold?: number
  /** Max visual pull distance in px (default: 120) */
  maxPull?: number
}

interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  /** Current pull distance 0–maxPull, for driving CSS transforms */
  pullDistance: number
}

/**
 * Adds pull-to-refresh behaviour to the document.
 * Only activates when the page is already scrolled to the top.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 72,
  maxPull = 120,
}: PullToRefreshOptions): PullToRefreshState {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startYRef = useRef<number | null>(null)
  const pullDistRef = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY <= 0) {
      startYRef.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startYRef.current === null || isRefreshing) return

      const delta = e.touches[0].clientY - startYRef.current
      if (delta > 0 && window.scrollY <= 0) {
        // Resistance curve: full feel for first threshold, slower after
        const clamped = Math.min(delta * 0.5, maxPull)
        pullDistRef.current = clamped
        setPullDistance(clamped)
        setIsPulling(clamped > 4)
        // Prevent default scroll only once pulling has started
        if (delta > 10) e.preventDefault()
      } else {
        pullDistRef.current = 0
        setPullDistance(0)
        setIsPulling(false)
        startYRef.current = null
      }
    },
    [isRefreshing, maxPull],
  )

  const handleTouchEnd = useCallback(async () => {
    const dist = pullDistRef.current
    setPullDistance(0)
    setIsPulling(false)
    startYRef.current = null
    pullDistRef.current = 0

    if (dist >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
  }, [threshold, onRefresh])

  useEffect(() => {
    const el = document.documentElement
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { isPulling, isRefreshing, pullDistance }
}
