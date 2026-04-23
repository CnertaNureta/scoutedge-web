'use client'

import { useSignalsLive, type SignalsLiveState } from '@/hooks/useSignalsLive'
import type { ConnectionStatus } from '@/hooks/useRealtimeChannel'
import type { SignalNewPayload } from '@/lib/realtime-channels'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'

const SEVERITY_STYLES = {
  critical: { badge: 'primary' as const, dot: 'bg-red-500', label: 'CRITICAL' },
  high: { badge: 'secondary' as const, dot: 'bg-amber-500', label: 'HIGH' },
  medium: { badge: 'tertiary' as const, dot: 'bg-blue-400', label: 'MEDIUM' },
  low: { badge: 'outline' as const, dot: 'bg-white/30', label: 'LOW' },
} as const

function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const color = status === 'connected'
    ? 'bg-emerald-400'
    : status === 'connecting'
      ? 'bg-amber-400 animate-pulse'
      : 'bg-red-400'
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
}

function SignalRow({ signal }: { signal: SignalNewPayload }) {
  const style = SEVERITY_STYLES[signal.severity] ?? SEVERITY_STYLES.low
  const timeAgo = formatTimeAgo(signal.timestamp)

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.06] last:border-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-on-surface">{signal.headline}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={style.badge} size="sm">{style.label}</Badge>
          {signal.team_slug && (
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              {signal.team_slug}
            </span>
          )}
          <span className="font-label text-[10px] tracking-wide text-on-surface-variant/60">
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  )
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

interface SignalsFeedProps {
  teamSlug?: string
  maxVisible?: number
}

export default function SignalsFeed({ teamSlug, maxVisible = 10 }: SignalsFeedProps) {
  const { state, connectionStatus, lastUpdatedAt, markRead } = useSignalsLive(teamSlug)
  const visibleSignals = state.signals.slice(0, maxVisible)

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-headline text-base uppercase tracking-wide text-on-surface">
            Live Signals
          </h3>
          <ConnectionDot status={connectionStatus} />
        </div>
        {state.unreadCount > 0 && (
          <button
            onClick={markRead}
            className="font-label text-[10px] font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          >
            {state.unreadCount} new
          </button>
        )}
      </div>

      {visibleSignals.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">
          {connectionStatus === 'connected'
            ? 'Listening for signals...'
            : 'Connecting to live feed...'}
        </p>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {visibleSignals.map((signal) => (
            <SignalRow key={signal.signal_id} signal={signal} />
          ))}
        </div>
      )}

      {state.upgrades.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/[0.08]">
          <p className="font-label text-[10px] uppercase tracking-widest text-amber-400 mb-2">
            Recent Upgrades
          </p>
          {state.upgrades.slice(0, 3).map((u) => (
            <p key={`${u.signal_id}-${u.timestamp}`} className="text-xs text-on-surface-variant leading-relaxed">
              Signal upgraded: {u.previous_severity} → {u.new_severity} — {u.reason}
            </p>
          ))}
        </div>
      )}

      {lastUpdatedAt && (
        <p className="mt-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant/50 text-right">
          Updated {lastUpdatedAt.toLocaleTimeString()}
        </p>
      )}
    </GlassCard>
  )
}
