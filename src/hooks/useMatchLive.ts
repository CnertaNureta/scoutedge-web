'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRealtimeChannel, type ConnectionStatus } from './useRealtimeChannel'
import {
  channels,
  RealtimeEvent,
  type MatchScorePayload,
  type MatchStatusPayload,
  type MatchMinutePayload,
  type MatchIncidentPayload,
} from '@/lib/realtime-channels'

type MatchLivePayload =
  | MatchScorePayload
  | MatchStatusPayload
  | MatchMinutePayload
  | MatchIncidentPayload

export interface MatchLiveState {
  status: string | null
  homeScore: number
  awayScore: number
  minute: number | null
  incidents: MatchIncidentPayload[]
}

interface UseMatchLiveReturn {
  state: MatchLiveState
  connectionStatus: ConnectionStatus
  lastUpdatedAt: Date | null
}

const MATCH_EVENTS = [
  RealtimeEvent.MATCH_STATUS_CHANGE,
  RealtimeEvent.MATCH_SCORE_UPDATE,
  RealtimeEvent.MATCH_MINUTE_UPDATE,
  RealtimeEvent.MATCH_INCIDENT,
]

export function useMatchLive(
  matchId: string | null,
  initialState?: Partial<MatchLiveState>,
): UseMatchLiveReturn {
  const [state, setState] = useState<MatchLiveState>({
    status: initialState?.status ?? null,
    homeScore: initialState?.homeScore ?? 0,
    awayScore: initialState?.awayScore ?? 0,
    minute: initialState?.minute ?? null,
    incidents: initialState?.incidents ?? [],
  })

  const topic = useMemo(
    () => (matchId ? channels.matchLive(matchId) : ''),
    [matchId],
  )

  const handleMessage = useCallback((event: string, payload: MatchLivePayload) => {
    switch (event) {
      case RealtimeEvent.MATCH_STATUS_CHANGE: {
        const p = payload as MatchStatusPayload
        setState((prev) => ({ ...prev, status: p.new_status, minute: p.minute }))
        break
      }
      case RealtimeEvent.MATCH_SCORE_UPDATE: {
        const p = payload as MatchScorePayload
        setState((prev) => ({
          ...prev,
          homeScore: p.home_score,
          awayScore: p.away_score,
          minute: p.minute,
        }))
        break
      }
      case RealtimeEvent.MATCH_MINUTE_UPDATE: {
        const p = payload as MatchMinutePayload
        setState((prev) => ({ ...prev, minute: p.minute }))
        break
      }
      case RealtimeEvent.MATCH_INCIDENT: {
        const p = payload as MatchIncidentPayload
        setState((prev) => ({
          ...prev,
          incidents: [...prev.incidents.slice(-49), p],
          minute: p.minute,
        }))
        break
      }
    }
  }, [])

  const { status: connectionStatus, lastUpdatedAt } = useRealtimeChannel<MatchLivePayload>({
    topic,
    events: MATCH_EVENTS,
    enabled: !!matchId,
    onMessage: handleMessage,
  })

  return { state, connectionStatus, lastUpdatedAt }
}
