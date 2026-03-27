'use client'

import { useEffect, useRef, RefObject } from 'react'

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Minimum horizontal distance to count as a swipe (default: 50px) */
  threshold?: number
  /** Optional element ref to attach listeners to (defaults to document) */
  target?: RefObject<HTMLElement | null>
}

/**
 * Detects horizontal swipe gestures via touch events.
 * Ignores predominantly vertical movements (scrolling).
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  target,
}: SwipeGestureOptions): void {
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)

  useEffect(() => {
    const el: EventTarget = target?.current ?? document.documentElement

    function handleTouchStart(e: Event) {
      const touch = (e as TouchEvent).touches[0]
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
    }

    function handleTouchEnd(e: Event) {
      if (startXRef.current === null || startYRef.current === null) return
      const touch = (e as TouchEvent).changedTouches[0]
      const deltaX = touch.clientX - startXRef.current
      const deltaY = Math.abs(touch.clientY - startYRef.current)
      // Only fire for horizontal-dominant swipes
      if (Math.abs(deltaX) >= threshold && Math.abs(deltaX) > deltaY) {
        if (deltaX < 0) onSwipeLeft?.()
        else onSwipeRight?.()
      }
      startXRef.current = null
      startYRef.current = null
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, threshold, target])
}
