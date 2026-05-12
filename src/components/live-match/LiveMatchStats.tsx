'use client'

import GlassCard from '@/components/ui/GlassCard'

export interface MatchStat {
  label: string
  home: number
  away: number
}

interface LiveMatchStatsProps {
  stats: MatchStat[]
  homeTeamName: string
  awayTeamName: string
}

function StatBar({ home, away, label }: MatchStat & { homeTeamName?: string; awayTeamName?: string }) {
  const total = home + away
  const homePct = total > 0 ? Math.round((home / total) * 100) : 50
  const awayPct = 100 - homePct

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-primary">{home}</span>
        <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        <span className="font-mono text-xs font-bold text-secondary">{away}</span>
      </div>
      <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        <div
          className="rounded-full bg-primary transition-all duration-500"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="rounded-full bg-secondary transition-all duration-500"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  )
}

export default function LiveMatchStats({ stats, homeTeamName, awayTeamName }: LiveMatchStatsProps) {
  if (stats.length === 0) {
    return (
      <div data-testid="live-match-stats">
        <GlassCard className="p-6 text-center">
          <span className="text-3xl mb-3 block">📊</span>
          <h3 className="font-headline text-lg uppercase tracking-wide text-on-surface mb-1">
            Live Stats
          </h3>
          <p className="text-sm text-on-surface-variant">
            Real-time match statistics will update here during play.
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div data-testid="live-match-stats">
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-5">
        <span className="font-label text-xs font-bold uppercase tracking-widest text-primary">
          {homeTeamName}
        </span>
        <h2 className="font-headline text-base uppercase tracking-wide text-on-surface">
          Stats
        </h2>
        <span className="font-label text-xs font-bold uppercase tracking-widest text-secondary">
          {awayTeamName}
        </span>
      </div>

      <div className="space-y-4">
        {stats.map((stat) => (
          <StatBar key={stat.label} {...stat} />
        ))}
      </div>
    </GlassCard>
    </div>
  )
}
