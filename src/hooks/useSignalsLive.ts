'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRealtimeChannel, type ConnectionStatus } from './useRealtimeChannel'
import {
  channels,
  RealtimeEvent,
  type SignalNewPayload,
  type SignalUpgradedPayload,
} from '@/lib/realtime-channels'

type SignalPayload = SignalNewPayload | SignalUpgradedPayload

export interface SignalsLiveState {
  signals: SignalNewPayload[]
  upgrades: SignalUpgradedPayload[]
  unreadCount: number
}

interface UseSignalsLiveReturn {
  state: SignalsLiveState
  connectionStatus: ConnectionStatus
  lastUpdatedAt: Date | null
  markRead: () => void
}

const SIGNAL_EVENTS = [
  RealtimeEvent.SIGNAL_NEW,
  RealtimeEvent.SIGNAL_UPGRADED,
]

export function useSignalsLive(
  teamSlug?: string,
): UseSignalsLiveReturn {
  const [state, setState] = useState<SignalsLiveState>({
    signals: [],
    upgrades: [],
    unreadCount: 0,
  })

  const topic = useMemo(
    () => (teamSlug ? channels.teamSignals(teamSlug) : channels.signalsFeed()),
    [teamSlug],
  )

  const handleMessage = useCallback((event: string, payload: SignalPayload) => {
    switch (event) {
      case RealtimeEvent.SIGNAL_NEW: {
        const p = payload as SignalNewPayload
        setState((prev) => ({
          ...prev,
          signals: [p, ...prev.signals.slice(0, 49)],
          unreadCount: prev.unreadCount + 1,
        }))
        break
      }
      case RealtimeEvent.SIGNAL_UPGRADED: {
        const p = payload as SignalUpgradedPayload
        setState((prev) => ({
          ...prev,
          upgrades: [p, ...prev.upgrades.slice(0, 19)],
          unreadCount: prev.unreadCount + 1,
        }))
        break
      }
    }
  }, [])

  const { status: connectionStatus, lastUpdatedAt } = useRealtimeChannel<SignalPayload>({
    topic,
    events: SIGNAL_EVENTS,
    enabled: true,
    onMessage: handleMessage,
  })

  const markRead = useCallback(() => {
    setState((prev) => ({ ...prev, unreadCount: 0 }))
  }, [])

  return { state, connectionStatus, lastUpdatedAt, markRead }
}
