'use client'

import { useEffect, useState } from 'react'

interface LiveScoreline {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  round: string
  minute?: string
}

interface UpcomingPayload {
  homeCode: string
  awayCode: string
  hoursUntil: number
  minutesUntil: number
}

interface ApiPayload {
  fetchedAt: string
  live: LiveScoreline[]
  upcoming: UpcomingPayload[]
}

interface HeroLiveTickerProps {
  initialItems: string[]
}

const POLL_INTERVAL_MS = 30_000
const ENDPOINT = '/api/v1/live-matches'

function formatHoursUntil(hoursUntil: number, minutesUntil: number): string {
  const totalMinutes = hoursUntil * 60 + minutesUntil
  const days = Math.floor(hoursUntil / 24)
  if (days > 0) return `in ${days}d`
  if (hoursUntil > 0) return `in ${hoursUntil}h`
  return `in ${totalMinutes}m`
}

function liveToString(m: LiveScoreline): string {
  const score =
    m.homeScore !== null && m.awayScore !== null
      ? `${m.homeScore}—${m.awayScore}`
      : 'vs'
  const minute = m.minute ? ` · ${m.minute}` : ''
  return `${m.homeTeam} ${score} ${m.awayTeam} · ${m.round}${minute}`
}

function upcomingToString(f: UpcomingPayload): string {
  return `${f.homeCode} vs ${f.awayCode} · ${formatHoursUntil(f.hoursUntil, f.minutesUntil)}`
}

/**
 * Client island that mirrors the static SSR'd ticker, then polls every 30s for
 * fresh upcoming/live scorelines. On error we silently fall back to the last
 * known good state to avoid blinking the homepage.
 *
 * The CSS marquee scroll is purely decorative — keeping it short of full
 * animation here because magazine 1440px artboard scale is sensitive to
 * horizontal motion. If you want to add `@keyframes` translate, scope it to
 * a wrapper that respects `prefers-reduced-motion`.
 */
export function HeroLiveTicker({ initialItems }: HeroLiveTickerProps) {
  const [items, setItems] = useState<string[]>(initialItems)
  const [hasLive, setHasLive] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchData = async (): Promise<void> => {
      try {
        const res = await fetch(ENDPOINT, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as ApiPayload
        if (cancelled) return

        if (data.live && data.live.length > 0) {
          setItems(data.live.slice(0, 6).map(liveToString))
          setHasLive(true)
        } else if (data.upcoming && data.upcoming.length > 0) {
          setItems(data.upcoming.slice(0, 6).map(upcomingToString))
          setHasLive(false)
        }
      } catch {
        // Silently keep last good state.
      }
    }

    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void fetchData()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const tickerDisplay = items.length > 0 ? items : initialItems

  return (
    <div
      data-testid="hero-live-ticker"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: '12px 56px',
        background: 'var(--ink)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        fontSize: 11,
        fontFamily: 'var(--f-condensed)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        overflow: 'hidden',
        zIndex: 11,
      }}
    >
      <span
        className={`ko-strike ko-label${hasLive ? ' ko-live' : ''}`}
        style={{
          fontSize: 10,
          flexShrink: 0,
          color: hasLive ? 'var(--red)' : undefined,
          border: hasLive ? '1px solid var(--red)' : '1px solid var(--line-strong)',
          padding: '4px 10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {hasLive && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--red)',
            }}
          />
        )}
        {hasLive ? 'LIVE' : 'UPCOMING'}
      </span>
      <span
        style={{
          display: 'flex',
          gap: 32,
          opacity: 0.85,
          whiteSpace: 'nowrap',
        }}
      >
        {tickerDisplay.map((item, i) => (
          <span key={`${item}-${i}`} style={{ display: 'inline-flex', gap: 32 }}>
            <span>{item}</span>
            {i < tickerDisplay.length - 1 && (
              <span className="ko-muted">·</span>
            )}
          </span>
        ))}
      </span>
    </div>
  )
}
