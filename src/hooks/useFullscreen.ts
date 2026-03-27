'use client'

import { useState, useCallback, useEffect, RefObject } from 'react'

interface UseFullscreenReturn {
  /** Whether the Fullscreen API is available */
  isSupported: boolean
  /** Whether an element is currently fullscreen */
  isFullscreen: boolean
  /** Enter fullscreen for the given element (defaults to documentElement) */
  enter: (el?: HTMLElement | null) => Promise<void>
  /** Exit fullscreen */
  exit: () => Promise<void>
  /** Toggle fullscreen state */
  toggle: (el?: HTMLElement | null) => Promise<void>
}

/**
 * Fullscreen API wrapper with vendor prefix support (webkit for Safari).
 * Pass an element ref's current value to fullscreen a specific container
 * (e.g. a video player), or leave blank to fullscreen the whole page.
 */
export function useFullscreen(
  targetRef?: RefObject<HTMLElement | null>,
): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isSupported =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled ||
      (document as Document & { webkitFullscreenEnabled?: boolean })
        .webkitFullscreenEnabled === true)

  // Track fullscreen state changes (including Escape key)
  useEffect(() => {
    function onChange() {
      const fsEl =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element })
          .webkitFullscreenElement
      setIsFullscreen(!!fsEl)
    }

    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const enter = useCallback(
    async (el?: HTMLElement | null) => {
      if (!isSupported) return
      const target = el ?? targetRef?.current ?? document.documentElement
      try {
        if (target.requestFullscreen) {
          await target.requestFullscreen()
        } else {
          await (
            target as HTMLElement & {
              webkitRequestFullscreen?: () => Promise<void>
            }
          ).webkitRequestFullscreen?.()
        }
      } catch {
        // User denied or API unavailable in this context
      }
    },
    [isSupported, targetRef],
  )

  const exit = useCallback(async () => {
    if (!isSupported) return
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else {
        await (
          document as Document & { webkitExitFullscreen?: () => Promise<void> }
        ).webkitExitFullscreen?.()
      }
    } catch {
      // Already exited or not fullscreen
    }
  }, [isSupported])

  const toggle = useCallback(
    async (el?: HTMLElement | null) => {
      if (isFullscreen) await exit()
      else await enter(el)
    },
    [isFullscreen, enter, exit],
  )

  return { isSupported, isFullscreen, enter, exit, toggle }
}
