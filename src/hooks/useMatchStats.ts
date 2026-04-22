'use client'

import { useState, useEffect, useRef } from 'react'
import type { MatchStat } from '@/components/live-match/LiveMatchStats'

interface UseMatchStatsReturn {
  stats: MatchStat[]
  loading: boolean
}

const POLL_INTERVAL_MS = 60_000

export function useMatchStats(
  matchId: string | null,
  isLive: boolean,
): UseMatchStatsReturn {
  const [stats, setStats] = useState<MatchStat[]>([])
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!matchId || !isLive) {
      setStats([])
      return
    }

    const fetchStats = async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${encodeURIComponent(matchId)}`,
        )
        if (!res.ok) return

        const data = await res.json()
        const event = data?.events?.[0]
        if (!event) return

        const parsed = parseEventStats(event)
        if (parsed.length > 0) setStats(parsed)
      } catch {
        // stats unavailable — keep last known state
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    intervalRef.current = setInterval(fetchStats, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [matchId, isLive])

  return { stats, loading }
}

function parseEventStats(event: Record<string, string | null>): MatchStat[] {
  const statPairs: [string, string, string][] = [
    ['intHomeShots', 'intAwayShots', 'Shots'],
    ['intHomeShotsOnTarget', 'intAwayShotsOnTarget', 'Shots on Target'],
    ['intHomeCorners', 'intAwayCorners', 'Corners'],
    ['intHomeFouls', 'intAwayFouls', 'Fouls'],
    ['intHomeYellowCards', 'intAwayYellowCards', 'Yellow Cards'],
    ['intHomeRedCards', 'intAwayRedCards', 'Red Cards'],
  ]

  const result: MatchStat[] = []

  const possession = parsePossession(event.strHomeFormation, event.strAwayFormation)
  if (possession) result.push(possession)

  for (const [homeKey, awayKey, label] of statPairs) {
    const home = parseInt(event[homeKey] ?? '', 10)
    const away = parseInt(event[awayKey] ?? '', 10)
    if (!isNaN(home) && !isNaN(away)) {
      result.push({ label, home, away })
    }
  }

  return result
}

function parsePossession(
  _homeFormation: string | null,
  _awayFormation: string | null,
): MatchStat | null {
  return null
}
