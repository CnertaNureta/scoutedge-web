'use client'

import { useCallback } from 'react'

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection'

// Duration (ms) or vibration pattern arrays
const PATTERNS: Record<HapticPattern, number | number[]> = {
  selection: 8,
  light: 15,
  medium: 30,
  heavy: 60,
  success: [10, 40, 10],
  error: [50, 30, 50],
}

interface UseHapticFeedbackReturn {
  /** Whether the Vibration API is available */
  isSupported: boolean
  /** Trigger a haptic pattern */
  trigger: (pattern?: HapticPattern) => void
}

/**
 * Thin wrapper over the Vibration API.
 * Silently no-ops when the API is unavailable (desktop, iOS Safari pre-16).
 */
export function useHapticFeedback(): UseHapticFeedbackReturn {
  const isSupported =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

  const trigger = useCallback(
    (pattern: HapticPattern = 'medium') => {
      if (!isSupported) return
      try {
        navigator.vibrate(PATTERNS[pattern])
      } catch {
        // Silently ignore — vibration can be blocked by browser policy
      }
    },
    [isSupported],
  )

  return { isSupported, trigger }
}
