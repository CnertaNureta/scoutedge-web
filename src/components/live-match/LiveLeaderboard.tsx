'use client'

import Image from 'next/image'
import type { LeaderboardEntry } from '@/hooks/usePredictions'
import GlassCard from '@/components/ui/GlassCard'

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId?: string | null
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] font-mono text-xs text-on-surface-variant">
      {rank}
    </span>
  )
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-tertiary/20 px-2 py-0.5 font-label text-[10px] font-bold text-tertiary">
      🔥 {streak}
    </span>
  )
}

export default function LiveLeaderboard({ entries, currentUserId }: LiveLeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div data-testid="live-leaderboard">
        <GlassCard className="p-6 text-center">
          <span className="text-3xl mb-3 block">🏆</span>
          <h3 className="font-headline text-lg uppercase tracking-wide text-on-surface mb-1">
            Leaderboard
          </h3>
          <p className="text-sm text-on-surface-variant">
            Make predictions to climb the ranks. Points awarded for correct calls.
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div data-testid="live-leaderboard">
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-lg uppercase tracking-wide text-on-surface">
          Leaderboard
        </h2>
        <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          {entries.length} predictor{entries.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-1">
        {entries.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId
          const accuracy = entry.totalPredictions > 0
            ? Math.round((entry.correctPredictions / entry.totalPredictions) * 100)
            : 0

          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isCurrentUser
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-white/[0.03]'
              }`}
            >
              <RankBadge rank={entry.rank} />

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 text-xs font-bold text-on-surface">
                {entry.avatarUrl ? (
                  <Image
                    src={entry.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  entry.displayName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-on-surface">
                    {entry.displayName}
                    {isCurrentUser && <span className="text-primary ml-1">(you)</span>}
                  </span>
                  <StreakBadge streak={entry.streak} />
                </div>
                <div className="font-label text-[10px] text-on-surface-variant">
                  {entry.correctPredictions}/{entry.totalPredictions} correct · {accuracy}% accuracy
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono text-sm font-bold text-primary">
                  {entry.points}
                </div>
                <div className="font-label text-[10px] text-on-surface-variant">pts</div>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
    </div>
  )
}
