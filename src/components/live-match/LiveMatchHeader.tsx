'use client'

import type { MatchLiveState } from '@/hooks/useMatchLive'
import type { ConnectionStatus } from '@/hooks/useRealtimeChannel'
import type { Team } from '@/lib/types'

interface LiveMatchHeaderProps {
  home: Team
  away: Team
  matchState: MatchLiveState
  connectionStatus: ConnectionStatus
  viewerCount?: number
}

const statusLabels: Record<string, string> = {
  not_started: 'PRE-MATCH',
  first_half: '1ST HALF',
  half_time: 'HALF TIME',
  second_half: '2ND HALF',
  extra_first: 'EXTRA 1ST',
  extra_second: 'EXTRA 2ND',
  penalties: 'PENALTIES',
  finished: 'FULL TIME',
}

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    connected: 'bg-green-400',
    connecting: 'bg-yellow-400 animate-pulse',
    disconnected: 'bg-red-400',
    error: 'bg-red-500',
  }

  return (
    <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
  )
}

export default function LiveMatchHeader({
  home,
  away,
  matchState,
  connectionStatus,
  viewerCount,
}: LiveMatchHeaderProps) {
  const statusLabel = matchState.status
    ? statusLabels[matchState.status] ?? matchState.status.toUpperCase()
    : 'UPCOMING'

  const isLive = matchState.status && !['not_started', 'finished'].includes(matchState.status)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent backdrop-blur-xl p-6 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <ConnectionDot status={connectionStatus} />
          <span className={`font-label text-xs font-bold uppercase tracking-widest ${isLive ? 'text-secondary animate-pulse' : 'text-on-surface-variant'}`}>
            {statusLabel}
          </span>
          {matchState.minute !== null && (
            <span className="rounded-full bg-secondary/20 px-3 py-0.5 font-mono text-xs font-bold text-secondary">
              {matchState.minute}&apos;
            </span>
          )}
          {viewerCount !== undefined && viewerCount > 0 && (
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              {viewerCount.toLocaleString()} watching
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-10">
          <div className="text-center">
            <span className="text-5xl md:text-6xl">{home.flag}</span>
            <div className="font-headline text-lg md:text-xl uppercase tracking-wide text-on-surface mt-2">
              {home.name}
            </div>
            <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              #{home.fifaRanking} FIFA
            </div>
          </div>

          <div className="text-center">
            <div className="font-headline text-5xl md:text-7xl tracking-tight text-on-surface tabular-nums">
              {matchState.homeScore}
              <span className="mx-2 text-on-surface-variant/50">:</span>
              {matchState.awayScore}
            </div>
          </div>

          <div className="text-center">
            <span className="text-5xl md:text-6xl">{away.flag}</span>
            <div className="font-headline text-lg md:text-xl uppercase tracking-wide text-on-surface mt-2">
              {away.name}
            </div>
            <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              #{away.fifaRanking} FIFA
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
