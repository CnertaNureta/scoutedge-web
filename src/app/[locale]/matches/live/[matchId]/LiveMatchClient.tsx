'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useMatchLive } from '@/hooks/useMatchLive'
import { usePredictions } from '@/hooks/usePredictions'
import { useMatchStats } from '@/hooks/useMatchStats'
import { useEntitlements } from '@/hooks/useEntitlements'
import {
  LiveMatchHeader,
  PredictionVoting,
  LiveLeaderboard,
  MatchTimeline,
  LiveMatchStats,
} from '@/components/live-match'
import type { Team, MatchFixture } from '@/lib/types'
import SignalsFeed from '@/components/signals/SignalsFeed'
import OddsTracker from '@/components/odds/OddsTracker'
import Paywall from '@/components/monetization/Paywall'
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
  const locale = useLocale()
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

  const { hasAccess } = useEntitlements()
  const hasPremium = hasAccess('match', matchId)

  const isLive = matchState.status && !['not_started', 'finished'].includes(matchState.status)

  const { stats: liveStats } = useMatchStats(matchId, !!isLive)

  const matchInfo = useMemo(() => ({
    venue: fixture.venue,
    city: fixture.city,
    kickoff: new Date(fixture.kickoffUtc).toLocaleString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
  }), [fixture, locale])

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
              <div className="flex items-center gap-2 mb-3 px-1">
                <h2 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Match Flow
                </h2>
                {!hasPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 border border-tertiary/20 px-2 py-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-tertiary">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                    </svg>
                    <span className="text-tertiary font-label text-[9px] font-bold uppercase tracking-widest">VIP</span>
                  </span>
                )}
              </div>
              <Paywall contentType="match" scope={matchId} previewLines={4}>
                <LiveMatchStats
                  stats={liveStats}
                  homeTeamName={homeTeam.name}
                  awayTeamName={awayTeam.name}
                />
              </Paywall>
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

            <Paywall contentType="match" scope={matchId} previewLines={3}>
              <OddsTracker matchId={matchId} />
            </Paywall>

            <Paywall contentType="match" scope={matchId} previewLines={2}>
              <SignalsFeed maxVisible={5} />
            </Paywall>

            <Paywall contentType="match" scope={matchId} previewLines={3}>
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
            </Paywall>
          </aside>
        </div>
      </div>
    </div>
  )
}
