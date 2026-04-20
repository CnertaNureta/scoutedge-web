'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRealtimeChannel, type ConnectionStatus } from './useRealtimeChannel'
import {
  channels,
  RealtimeEvent,
  type OddsShiftPayload,
  type OddsSharpMovePayload,
} from '@/lib/realtime-channels'

type OddsPayload = OddsShiftPayload | OddsSharpMovePayload

export interface OddsLiveState {
  latestShift: OddsShiftPayload | null
  sharpMoves: OddsSharpMovePayload[]
  shiftCount: number
}

interface UseOddsLiveReturn {
  state: OddsLiveState
  connectionStatus: ConnectionStatus
  lastUpdatedAt: Date | null
}

const ODDS_EVENTS = [
  RealtimeEvent.ODDS_SHIFT,
  RealtimeEvent.ODDS_SHARP_MOVE,
]

export function useOddsLive(matchId: string | null): UseOddsLiveReturn {
  const [state, setState] = useState<OddsLiveState>({
    latestShift: null,
    sharpMoves: [],
    shiftCount: 0,
  })

  const topic = useMemo(
    () => (matchId ? channels.oddsMovement(matchId) : ''),
    [matchId],
  )

  const handleMessage = useCallback((event: string, payload: OddsPayload) => {
    switch (event) {
      case RealtimeEvent.ODDS_SHIFT: {
        const p = payload as OddsShiftPayload
        setState((prev) => ({
          ...prev,
          latestShift: p,
          shiftCount: prev.shiftCount + 1,
        }))
        break
      }
      case RealtimeEvent.ODDS_SHARP_MOVE: {
        const p = payload as OddsSharpMovePayload
        setState((prev) => ({
          ...prev,
          sharpMoves: [...prev.sharpMoves.slice(-19), p],
        }))
        break
      }
    }
  }, [])

  const { status: connectionStatus, lastUpdatedAt } = useRealtimeChannel<OddsPayload>({
    topic,
    events: ODDS_EVENTS,
    enabled: !!matchId,
    onMessage: handleMessage,
  })

  return { state, connectionStatus, lastUpdatedAt }
}
