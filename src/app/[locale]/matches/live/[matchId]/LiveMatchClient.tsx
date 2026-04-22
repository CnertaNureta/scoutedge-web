'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useMatchLive } from '@/hooks/useMatchLive'
import { usePredictions } from '@/hooks/usePredictions'
import { useMatchStats } from '@/hooks/useMatchStats'
import {
  LiveMatchHeader,
  PredictionVoting,
  LiveLeaderboard,
  MatchTimeline,
  LiveMatchStats,
} from '@/components/live-match'
import type { Team, MatchFixture } from '@/lib/types'
import SignalsFeed from '@/components/signals/SignalsFeed'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'

interface LiveMatchClientProps {
  matchId: string
  fixture: MatchFixture
  homeTeam: Team
  awayTeam: Team
}

export default function LiveMatchClient({
  matchId,
  fixture,
  homeTeam,
  awayTeam,
}: LiveMatchClientProps) {
  const { state: matchState, connectionStatus, lastUpdatedAt } = useMatchLive(matchId, {
    status: 'not_started',
    homeScore: 0,
    awayScore: 0,
    minute: null,
    incidents: [],
  })

  const {
    markets,
    userPredictions,
    leaderboard,
    submitPrediction,
    isSubmitting,
  } = usePredictions(matchId)

  const isLive = matchState.status && !['not_started', 'finished'].includes(matchState.status)

  const { stats: liveStats } = useMatchStats(matchId, !!isLive)

  const matchInfo = useMemo(() => ({
    venue: fixture.venue,
    city: fixture.city,
    kickoff: new Date(fixture.kickoffUtc).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
  }), [fixture])

  return (
    <div className="min-h-screen bg-surface">
      <div className="page-container py-8 md:py-12">
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/matches" className="hover:text-primary transition-colors">
            Matches
          </Link>
          <span>/</span>
          <span className="text-on-surface">
            {homeTeam.name} vs {awayTeam.name}
          </span>
        </nav>

        <LiveMatchHeader
          home={homeTeam}
          away={awayTeam}
          matchState={matchState}
          connectionStatus={connectionStatus}
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Badge variant="outline" size="sm">{matchInfo.venue}</Badge>
          <Badge variant="outline" size="sm">{matchInfo.city}</Badge>
          <Badge variant="outline" size="sm">{matchInfo.kickoff}</Badge>
          <Badge variant="outline" size="sm">Group {fixture.group}</Badge>
        </div>

        {lastUpdatedAt && (
          <p className="mt-3 text-center font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Last update: {lastUpdatedAt.toLocaleTimeString()}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <section>
              <h2 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
                Predict & Compete
              </h2>
              <PredictionVoting
                markets={markets}
                userPredictions={userPredictions}
                onVote={submitPrediction}
                isSubmitting={isSubmitting}
              />
            </section>

            <section>
              <h2 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 px-1">
                Match Flow
              </h2>
              <LiveMatchStats
                stats={liveStats}
                homeTeamName={homeTeam.name}
                awayTeamName={awayTeam.name}
              />
            </section>
          </div>

          <aside className="space-y-6">
            <LiveLeaderboard entries={leaderboard} />

            <MatchTimeline
              incidents={matchState.incidents}
              homeTeamId={null}
              homeTeamName={homeTeam.name}
              awayTeamName={awayTeam.name}
            />

            <SignalsFeed maxVisible={5} />

            <GlassCard className="p-5">
              <h3 className="font-headline text-base uppercase tracking-wide text-on-surface mb-3">
                Model Edge
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface">{homeTeam.name} win</span>
                  <span className="font-mono text-sm font-bold text-primary">
                    {Math.round(fixture.homeWinProb * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface">Draw</span>
                  <span className="font-mono text-sm font-bold text-on-surface-variant">
                    {Math.round(fixture.drawProb * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface">{awayTeam.name} win</span>
                  <span className="font-mono text-sm font-bold text-secondary">
                    {Math.round(fixture.awayWinProb * 100)}%
                  </span>
                </div>
              </div>
              <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full">
                <div className="bg-primary" style={{ width: `${fixture.homeWinProb * 100}%` }} />
                <div className="bg-on-surface-variant/30" style={{ width: `${fixture.drawProb * 100}%` }} />
                <div className="bg-secondary" style={{ width: `${fixture.awayWinProb * 100}%` }} />
              </div>
              <p className="mt-3 text-xs text-on-surface-variant">
                Pre-match model. Live odds may differ during play.
              </p>
            </GlassCard>
          </aside>
        </div>
      </div>
    </div>
  )
}
