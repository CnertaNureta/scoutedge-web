'use client'

import { useState } from 'react'
import type { PredictionMarket, UserPrediction } from '@/hooks/usePredictions'
import GlassCard from '@/components/ui/GlassCard'

interface PredictionVotingProps {
  markets: PredictionMarket[]
  userPredictions: UserPrediction[]
  onVote: (marketId: string, optionId: string) => Promise<boolean>
  isSubmitting: boolean
}

function VoteBar({ votes, total, isSelected, isResolved, isWinner }: {
  votes: number
  total: number
  isSelected: boolean
  isResolved: boolean
  isWinner: boolean
}) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0
  const barColor = isResolved
    ? isWinner ? 'bg-primary' : 'bg-white/10'
    : isSelected ? 'bg-primary/60' : 'bg-white/10'

  return (
    <div className="relative h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function MarketCard({
  market,
  userPrediction,
  onVote,
  isSubmitting,
}: {
  market: PredictionMarket
  userPrediction?: UserPrediction
  onVote: (marketId: string, optionId: string) => Promise<boolean>
  isSubmitting: boolean
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    userPrediction?.optionId ?? null,
  )
  const hasVoted = !!userPrediction
  const isClosed = market.status !== 'open'

  const handleVote = async (optionId: string) => {
    if (hasVoted || isClosed || isSubmitting) return
    setSelectedOption(optionId)
    await onVote(market.id, optionId)
  }

  const typeIcons: Record<string, string> = {
    next_goal: '⚽',
    halftime_score: '⏱',
    final_result: '🏆',
    next_event: '📋',
  }

  const statusBadge = market.status === 'resolved'
    ? 'Resolved'
    : market.status === 'closed'
    ? 'Closed'
    : market.closesAt
    ? `Closes ${new Date(market.closesAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : 'Open'

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[market.type] ?? '🔮'}</span>
          <h3 className="font-headline text-base uppercase tracking-wide text-on-surface">
            {market.question}
          </h3>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 font-label text-[10px] font-bold uppercase tracking-widest ${
          market.status === 'open'
            ? 'bg-primary/20 text-primary'
            : market.status === 'resolved'
            ? 'bg-tertiary/20 text-tertiary'
            : 'bg-white/10 text-on-surface-variant'
        }`}>
          {statusBadge}
        </span>
      </div>

      <div className="space-y-2">
        {market.options.map((option) => {
          const votes = market.votes[option.id] ?? 0
          const pct = market.totalVotes > 0 ? Math.round((votes / market.totalVotes) * 100) : 0
          const isSelected = selectedOption === option.id
          const isWinner = market.resolvedOptionId === option.id

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || isClosed || isSubmitting}
              className={`w-full rounded-2xl border p-3 text-left transition-all ${
                isWinner
                  ? 'border-primary/40 bg-primary/10'
                  : isSelected
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              } ${(hasVoted || isClosed) ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-on-surface">
                  {isWinner && '✓ '}{option.label}
                </span>
                <span className="font-mono text-xs text-on-surface-variant">
                  {hasVoted || isClosed ? `${pct}%` : option.odds ? `×${option.odds.toFixed(1)}` : ''}
                </span>
              </div>
              {(hasVoted || isClosed) && (
                <VoteBar
                  votes={votes}
                  total={market.totalVotes}
                  isSelected={isSelected}
                  isResolved={market.status === 'resolved'}
                  isWinner={isWinner}
                />
              )}
            </button>
          )
        })}
      </div>

      {market.totalVotes > 0 && (
        <div className="mt-3 font-label text-[10px] uppercase tracking-widest text-on-surface-variant text-center">
          {market.totalVotes.toLocaleString()} prediction{market.totalVotes === 1 ? '' : 's'}
        </div>
      )}
    </GlassCard>
  )
}

export default function PredictionVoting({
  markets,
  userPredictions,
  onVote,
  isSubmitting,
}: PredictionVotingProps) {
  const openMarkets = markets.filter((m) => m.status === 'open')
  const resolvedMarkets = markets.filter((m) => m.status === 'resolved')
  const closedMarkets = markets.filter((m) => m.status === 'closed')

  if (markets.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <span className="text-4xl mb-4 block">🔮</span>
        <h3 className="font-headline text-xl uppercase tracking-wide text-on-surface mb-2">
          Predictions open at kickoff
        </h3>
        <p className="text-sm text-on-surface-variant">
          Live prediction markets will appear here once the match starts. Compete for points on the leaderboard.
        </p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {openMarkets.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-label text-xs font-bold uppercase tracking-widest text-primary">
            Active predictions
          </h2>
          {openMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              userPrediction={userPredictions.find((p) => p.marketId === market.id)}
              onVote={onVote}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}

      {resolvedMarkets.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-label text-xs font-bold uppercase tracking-widest text-tertiary">
            Resolved
          </h2>
          {resolvedMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              userPrediction={userPredictions.find((p) => p.marketId === market.id)}
              onVote={onVote}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}

      {closedMarkets.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Closed
          </h2>
          {closedMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              userPrediction={userPredictions.find((p) => p.marketId === market.id)}
              onVote={onVote}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
