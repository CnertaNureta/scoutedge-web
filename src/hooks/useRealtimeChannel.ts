'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseRealtimeChannelOptions<T> {
  topic: string
  events: string[]
  enabled?: boolean
  onMessage?: (event: string, payload: T) => void
}

interface UseRealtimeChannelReturn<T> {
  status: ConnectionStatus
  lastMessage: { event: string; payload: T } | null
  lastUpdatedAt: Date | null
}

interface BroadcastPayload<T> {
  type: 'broadcast'
  event: string
  payload: T
  [key: string]: unknown
}

export function useRealtimeChannel<T = unknown>({
  topic,
  events,
  enabled = true,
  onMessage,
}: UseRealtimeChannelOptions<T>): UseRealtimeChannelReturn<T> {
  const realtimeEnabled = process.env.NEXT_PUBLIC_E2E_MOCKS !== '1'
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<{ event: string; payload: T } | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const handleBroadcast = useCallback((eventName: string) => {
    return (raw: BroadcastPayload<T>) => {
      const data = raw.payload
      setLastMessage({ event: eventName, payload: data })
      setLastUpdatedAt(new Date())
      onMessageRef.current?.(eventName, data)
    }
  }, [])

  const eventsKey = events.join(',')

  useEffect(() => {
    if (!realtimeEnabled || !enabled || !topic || events.length === 0) {
      setStatus('disconnected')
      return
    }

    const supabase = getSupabase()
    setStatus('connecting')

    let channel = supabase.channel(topic)

    for (const evt of events) {
      channel = channel.on(
        'broadcast' as const,
        { event: evt },
        handleBroadcast(evt) as (payload: { [key: string]: unknown }) => void,
      )
    }

    channel.subscribe((subscribeStatus) => {
      if (subscribeStatus === 'SUBSCRIBED') {
        setStatus('connected')
      } else if (subscribeStatus === 'CLOSED') {
        setStatus('disconnected')
      } else if (subscribeStatus === 'CHANNEL_ERROR') {
        setStatus('error')
      }
    })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setStatus('disconnected')
    }
  }, [topic, enabled, realtimeEnabled, eventsKey, events, handleBroadcast])

  return { status, lastMessage, lastUpdatedAt }
}
