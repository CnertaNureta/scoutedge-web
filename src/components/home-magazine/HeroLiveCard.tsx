'use client'

import { useEffect, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { Flag } from './visual-system'

interface HeroLiveCardFixture {
  homeName: string
  homeCode: string
  homeColors: [string, string, string]
  awayName: string
  awayCode: string
  awayColors: [string, string, string]
  group: string
  round: string
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  kickoffLabel: string
}

interface LiveScoreline {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  round: string
  minute?: string
}

interface ApiPayload {
  fetchedAt: string
  live: LiveScoreline[]
  upcoming: HeroLiveCardFixture[]
  nextFixture: HeroLiveCardFixture | null
}

interface HeroLiveCardProps {
  initialFixture?: HeroLiveCardFixture
}

const POLL_INTERVAL_MS = 30_000
const ENDPOINT = '/api/v1/live-matches'

function toPct(value: number): number {
  return value > 1 ? value : value * 100
}

/**
 * Client island that re-fetches `/api/v1/live-matches` every 30s. SSR provides
 * `initialFixture` so the first paint matches the static homepage; the client
 * silently takes over after hydration.
 *
 * When a match is live (any non-null score in the live cache), the card swaps
 * to a LIVE pulse + scoreline. Otherwise it shows the next upcoming fixture
 * with the model's win-probability bar.
 */
export function HeroLiveCard({ initialFixture }: HeroLiveCardProps) {
  const [fixture, setFixture] = useState<HeroLiveCardFixture | undefined>(
    initialFixture
  )
  const [liveMatch, setLiveMatch] = useState<LiveScoreline | null>(null)
  const lastFetchOk = useRef(true)

  useEffect(() => {
    let cancelled = false

    const fetchData = async (): Promise<void> => {
      try {
        const res = await fetch(ENDPOINT, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as ApiPayload
        if (cancelled) return
        lastFetchOk.current = true
        if (data.live && data.live.length > 0) {
          setLiveMatch(data.live[0])
        } else {
          setLiveMatch(null)
        }
        if (data.nextFixture) {
          setFixture(data.nextFixture)
        }
      } catch {
        // Silently swallow — the homepage should never blink with error UI.
        // Keep last-good state until next successful tick.
        lastFetchOk.current = false
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

  const card = fixture ?? {
    homeName: 'Brazil',
    homeCode: 'BRA',
    homeColors: ['#009C3B', '#FFDF00', '#002776'] as [string, string, string],
    awayName: 'Argentina',
    awayCode: 'ARG',
    awayColors: ['#75AADB', '#FFFFFF', '#75AADB'] as [string, string, string],
    group: 'D',
    round: 'M14',
    homeWinProb: 58,
    drawProb: 14,
    awayWinProb: 28,
    kickoffLabel: 'TONIGHT',
  }

  const homePct = toPct(card.homeWinProb)
  const drawPct = toPct(card.drawProb)
  const awayPct = toPct(card.awayWinProb)
  const homeWins = homePct >= awayPct

  return (
    <div
      data-testid="hero-live-card"
      style={{
        position: 'absolute',
        top: 110,
        right: 56,
        width: 340,
        zIndex: 11,
        background: 'rgba(15,26,19,0.72)',
        backdropFilter: 'blur(16px) saturate(1.3)',
        border: '1px solid var(--line-strong)',
        padding: 26,
        overflow: 'hidden',
      }}
    >
      {/* Corner ribbon — LIVE pulse or TONIGHT'S PICK */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          padding: '8px 14px',
          background: liveMatch ? 'var(--red)' : 'var(--green)',
          color: 'var(--ink)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {liveMatch && <span className="ko-tick" />}
        <span className="ko-label" style={{ fontSize: 9 }}>
          {liveMatch ? 'LIVE NOW' : "★ TONIGHT'S PICK"}
        </span>
      </div>

      <div
        className="ko-eyebrow ko-gold"
        style={{ marginTop: 6, marginBottom: 6, fontSize: 10 }}
      >
        GROUP {card.group} · {card.round}
      </div>
      <div
        className="ko-mono ko-muted"
        style={{ fontSize: 10, marginBottom: 18, letterSpacing: '0.14em' }}
      >
        {card.kickoffLabel}
      </div>

      {/* Teams */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Flag
            colors={card.homeColors}
            style={{ width: 34, height: 24, marginBottom: 8 }}
          />
          <div
            className="ko-label"
            style={{
              fontSize: 12,
              color: homeWins ? 'var(--green)' : 'var(--cream)',
              marginBottom: 4,
            }}
          >
            {card.homeCode}
          </div>
          <div
            className="ko-mono ko-muted"
            style={{ fontSize: 9, letterSpacing: '0.16em', marginBottom: 8 }}
          >
            {card.homeName.toUpperCase()}
          </div>
          <div
            className="ko-bignum"
            style={{
              fontSize: 36,
              color: homeWins ? 'var(--green)' : 'var(--cream)',
            }}
          >
            {liveMatch && liveMatch.homeScore !== null
              ? liveMatch.homeScore
              : `${Math.round(homePct)}%`}
          </div>
        </div>
        <div
          className="ko-display"
          style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--muted)' }}
        >
          {liveMatch ? '—' : 'vs'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <Flag
            colors={card.awayColors}
            style={{ width: 34, height: 24, marginBottom: 8 }}
          />
          <div
            className="ko-label"
            style={{
              fontSize: 12,
              color: !homeWins ? 'var(--gold)' : 'var(--cream)',
              marginBottom: 4,
            }}
          >
            {card.awayCode}
          </div>
          <div
            className="ko-mono ko-muted"
            style={{ fontSize: 9, letterSpacing: '0.16em', marginBottom: 8 }}
          >
            {card.awayName.toUpperCase()}
          </div>
          <div
            className="ko-bignum"
            style={{
              fontSize: 36,
              color: !homeWins ? 'var(--gold)' : 'var(--cream)',
            }}
          >
            {liveMatch && liveMatch.awayScore !== null
              ? liveMatch.awayScore
              : `${Math.round(awayPct)}%`}
          </div>
        </div>
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: 18 }}>
        <div
          className="ko-mono ko-muted"
          style={{ fontSize: 9, marginBottom: 6, letterSpacing: '0.18em' }}
        >
          {liveMatch ? 'LIVE · IN PROGRESS' : 'WIN PROBABILITY · MODEL'}
        </div>
        <div
          style={{
            display: 'flex',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            background: 'var(--surface)',
          }}
        >
          <div
            style={{
              width: `${homePct}%`,
              background: 'linear-gradient(90deg, var(--green), #c8f08a)',
            }}
          />
          <div
            style={{ width: `${drawPct}%`, background: 'var(--surface-2)' }}
          />
          <div
            style={{
              width: `${awayPct}%`,
              background: 'linear-gradient(90deg, #e8a060, var(--gold))',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <span className="ko-mono ko-green" style={{ fontSize: 10 }}>
            {card.homeCode} · {Math.round(homePct)}%
          </span>
          <span className="ko-mono ko-muted" style={{ fontSize: 10 }}>
            DRAW · {Math.round(drawPct)}%
          </span>
          <span className="ko-mono ko-gold" style={{ fontSize: 10 }}>
            {card.awayCode} · {Math.round(awayPct)}%
          </span>
        </div>
      </div>

      <Link
        href="/matches"
        className="ko-btn ko-btn-primary"
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '11px 0',
          fontSize: 11,
        }}
      >
        Open Match Brief →
      </Link>
    </div>
  )
}

export type { HeroLiveCardFixture }
