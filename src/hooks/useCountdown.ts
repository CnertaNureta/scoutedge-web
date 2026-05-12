'use client'

import { useEffect, useState } from 'react'

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const MS_PER_DAY = 86_400_000
const MS_PER_HOUR = 3_600_000
const MS_PER_MINUTE = 60_000
const MS_PER_SECOND = 1_000

/**
 * Hydration-safe countdown hook. The first render (both SSR and client
 * hydration) returns a deterministic value derived only from `targetIso`
 * (no `Date.now()`), so the server-rendered HTML matches the client's first
 * paint exactly. After mount, the value re-computes once per second from
 * the live clock.
 */
export function useCountdown(targetIso: string): Countdown {
  const computeFromNow = (): Countdown => {
    const diff = Math.max(0, new Date(targetIso).getTime() - Date.now())
    return {
      days: Math.floor(diff / MS_PER_DAY),
      hours: Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR),
      minutes: Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE),
      seconds: Math.floor((diff % MS_PER_MINUTE) / MS_PER_SECOND),
    }
  }

  // Deterministic seed for SSR + first client render — no `Date.now()`,
  // so the server HTML and the client hydration produce identical output.
  const seed: Countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const [value, setValue] = useState<Countdown>(seed)

  useEffect(() => {
    // Switch to the live clock only after mount.
    setValue(computeFromNow())
    const id = setInterval(() => setValue(computeFromNow()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso])

  return value
}
