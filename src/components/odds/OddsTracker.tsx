'use client'

import { useOddsLive } from '@/hooks/useOddsLive'
import type { ConnectionStatus } from '@/hooks/useRealtimeChannel'
import type { OddsShiftPayload, OddsSharpMovePayload } from '@/lib/realtime-channels'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const color = status === 'connected'
    ? 'bg-emerald-400'
    : status === 'connecting'
      ? 'bg-amber-400 animate-pulse'
      : 'bg-red-400'
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
}

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ShiftRow({ shift }: { shift: OddsShiftPayload }) {
  const isPositive = shift.shift_pct >= 0
  const color = isPositive ? 'text-emerald-400' : 'text-red-400'

  return (
    <div data-testid="odds-row" className="flex items-center justify-between py-2.5 border-b border-white/[0.06] last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-on-surface truncate">{shift.market}</p>
        <span className="font-label text-[10px] tracking-wide text-on-surface-variant/60">
          {shift.source}
        </span>
      </div>
      <span className={`font-mono text-sm font-bold ${color}`}>
        {formatPct(shift.shift_pct)}
      </span>
    </div>
  )
}

function SharpMoveRow({ move }: { move: OddsSharpMovePayload }) {
  const dirLabel = move.direction.charAt(0).toUpperCase() + move.direction.slice(1)

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.06] last:border-0">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-on-surface">
          <span className="font-semibold">{dirLabel}</span> — {move.market}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" size="sm">
            {formatPct(move.magnitude)}
          </Badge>
          <span className="font-label text-[10px] tracking-wide text-on-surface-variant/60">
            {move.source_count} source{move.source_count !== 1 ? 's' : ''}
          </span>
          <span className="font-label text-[10px] tracking-wide text-on-surface-variant/60">
            {formatTimeAgo(move.timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface OddsTrackerProps {
  matchId: string
}

export default function OddsTracker({ matchId }: OddsTrackerProps) {
  const { state, connectionStatus, lastUpdatedAt } = useOddsLive(matchId)

  const hasData = state.latestShift || state.sharpMoves.length > 0

  return (
    <div data-testid="odds-widget">
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-headline text-base uppercase tracking-wide text-on-surface">
            Live Odds
          </h3>
          <ConnectionDot status={connectionStatus} />
        </div>
        {state.shiftCount > 0 && (
          <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
            {state.shiftCount} shift{state.shiftCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">
          {connectionStatus === 'connected'
            ? 'Waiting for odds movement...'
            : 'Connecting to odds feed...'}
        </p>
      ) : (
        <>
          {state.latestShift && (
            <div className="mb-3">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                Latest Shift
              </p>
              <ShiftRow shift={state.latestShift} />
            </div>
          )}

          {state.sharpMoves.length > 0 && (
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-amber-400 mb-2">
                Sharp Moves
              </p>
              {state.sharpMoves.slice(-5).reverse().map((move, i) => (
                <SharpMoveRow key={`${move.market}-${move.timestamp}-${i}`} move={move} />
              ))}
            </div>
          )}
        </>
      )}

      {lastUpdatedAt && (
        <p data-testid="odds-last-updated" className="mt-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50 text-right">
          Updated {lastUpdatedAt.toLocaleTimeString()}
        </p>
      )}
    </GlassCard>
    </div>
  )
}
