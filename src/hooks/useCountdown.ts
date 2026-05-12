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
 * SSR-safe countdown hook. The initial value is computed from `targetIso` and
 * `Date.now()` at render time so the server and the client's first render are
 * deterministic from the same inputs. After mount, the value re-computes once
 * per second.
 */
export function useCountdown(targetIso: string): Countdown {
  const compute = (): Countdown => {
    const diff = Math.max(0, new Date(targetIso).getTime() - Date.now())
    return {
      days: Math.floor(diff / MS_PER_DAY),
      hours: Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR),
      minutes: Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE),
      seconds: Math.floor((diff % MS_PER_MINUTE) / MS_PER_SECOND),
    }
  }

  const [value, setValue] = useState<Countdown>(compute)

  useEffect(() => {
    const id = setInterval(() => setValue(compute()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso])

  return value
}
