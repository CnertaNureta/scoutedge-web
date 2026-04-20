'use client'

import type { MatchIncidentPayload } from '@/lib/realtime-channels'
import GlassCard from '@/components/ui/GlassCard'

interface MatchTimelineProps {
  incidents: MatchIncidentPayload[]
  homeTeamId: string | null
  homeTeamName: string
  awayTeamName: string
}

const incidentIcons: Record<string, string> = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
  var_decision: '📺',
  penalty: '⚡',
}

export default function MatchTimeline({
  incidents,
  homeTeamId,
  homeTeamName,
  awayTeamName,
}: MatchTimelineProps) {
  if (incidents.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <span className="text-3xl mb-3 block">📋</span>
        <h3 className="font-headline text-lg uppercase tracking-wide text-on-surface mb-1">
          Match Timeline
        </h3>
        <p className="text-sm text-on-surface-variant">
          Key events will appear here as the match unfolds.
        </p>
      </GlassCard>
    )
  }

  const sortedIncidents = [...incidents].sort((a, b) => b.minute - a.minute)

  return (
    <GlassCard className="p-5">
      <h2 className="font-headline text-lg uppercase tracking-wide text-on-surface mb-4">
        Timeline
      </h2>

      <div className="relative space-y-1">
        <div className="absolute left-[18px] top-3 bottom-3 w-px bg-white/[0.08]" />

        {sortedIncidents.map((incident, idx) => {
          const isHome = incident.team_id === homeTeamId
          const teamName = isHome ? homeTeamName : awayTeamName
          const icon = incidentIcons[incident.type] ?? '•'

          return (
            <div
              key={`${incident.minute}-${incident.type}-${idx}`}
              className="relative flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.02] transition-colors"
            >
              <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container border border-white/[0.08] text-base">
                {icon}
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-on-surface-variant">
                    {incident.minute}&apos;
                  </span>
                  <span className={`text-sm font-medium ${isHome ? 'text-primary' : 'text-secondary'}`}>
                    {incident.player ?? teamName}
                  </span>
                </div>
                {incident.detail && (
                  <p className="text-xs text-on-surface-variant mt-0.5">{incident.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
