'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRealtimeChannel, type ConnectionStatus } from './useRealtimeChannel'
import { channels, RealtimeEvent, type PollVoteUpdatePayload } from '@/lib/realtime-channels'

export type PredictionType = 'next_goal' | 'halftime_score' | 'final_result' | 'next_event'

export interface PredictionOption {
  id: string
  label: string
  odds?: number
}

export interface PredictionMarket {
  id: string
  matchId: string
  type: PredictionType
  question: string
  options: PredictionOption[]
  closesAt: string | null
  status: 'open' | 'closed' | 'resolved'
  totalVotes: number
  votes: Record<string, number>
  resolvedOptionId?: string | null
}

export interface UserPrediction {
  marketId: string
  optionId: string
  submittedAt: string
  points?: number
}

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  points: number
  correctPredictions: number
  totalPredictions: number
  rank: number
  streak: number
}

interface UsePredictionsReturn {
  markets: PredictionMarket[]
  userPredictions: UserPrediction[]
  leaderboard: LeaderboardEntry[]
  connectionStatus: ConnectionStatus
  submitPrediction: (marketId: string, optionId: string) => Promise<boolean>
  isSubmitting: boolean
}

export function usePredictions(matchId: string | null): UsePredictionsReturn {
  const [markets, setMarkets] = useState<PredictionMarket[]>([])
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const topic = useMemo(
    () => (matchId ? channels.matchPolls(matchId) : ''),
    [matchId],
  )

  const handleMessage = useCallback((event: string, payload: PollVoteUpdatePayload) => {
    if (event === RealtimeEvent.POLL_VOTE_UPDATE) {
      setMarkets((prev) =>
        prev.map((m) =>
          m.id === payload.poll_id
            ? { ...m, votes: payload.option_votes, totalVotes: payload.total_votes }
            : m,
        ),
      )
    }
  }, [])

  const { status: connectionStatus } = useRealtimeChannel<PollVoteUpdatePayload>({
    topic,
    events: [RealtimeEvent.POLL_VOTE_UPDATE, RealtimeEvent.POLL_CREATED],
    enabled: !!matchId,
    onMessage: handleMessage,
  })

  const submitPrediction = useCallback(
    async (marketId: string, optionId: string): Promise<boolean> => {
      if (!matchId) return false
      setIsSubmitting(true)

      try {
        const res = await fetch('/api/v1/predictions/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, marketId, optionId }),
        })

        if (!res.ok) return false

        setUserPredictions((prev) => [
          ...prev,
          { marketId, optionId, submittedAt: new Date().toISOString() },
        ])

        setMarkets((prev) =>
          prev.map((m) =>
            m.id === marketId
              ? {
                  ...m,
                  totalVotes: m.totalVotes + 1,
                  votes: { ...m.votes, [optionId]: (m.votes[optionId] ?? 0) + 1 },
                }
              : m,
          ),
        )

        return true
      } catch {
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [matchId],
  )

  return {
    markets,
    userPredictions,
    leaderboard,
    connectionStatus,
    submitPrediction,
    isSubmitting,
  }
}
