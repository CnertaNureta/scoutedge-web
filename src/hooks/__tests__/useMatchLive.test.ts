import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

let capturedOnMessage: ((event: string, payload: unknown) => void) | undefined
let capturedOptions: { topic: string; events: string[]; enabled: boolean } | undefined

vi.mock('../useRealtimeChannel', () => ({
  useRealtimeChannel: (opts: { topic: string; events: string[]; enabled: boolean; onMessage: (e: string, p: unknown) => void }) => {
    capturedOptions = { topic: opts.topic, events: opts.events, enabled: opts.enabled ?? true }
    capturedOnMessage = opts.onMessage
    return { status: 'connected' as const, lastMessage: null, lastUpdatedAt: null }
  },
}))

import { useMatchLive } from '../useMatchLive'
import {
  RealtimeEvent,
  type MatchScorePayload,
  type MatchStatusPayload,
  type MatchMinutePayload,
  type MatchIncidentPayload,
} from '@/lib/realtime-channels'

const STATUS_CHANGE: MatchStatusPayload = {
  match_id: 'm1',
  previous_status: 'not_started',
  new_status: 'first_half',
  minute: 1,
  timestamp: '2026-06-15T14:00:00Z',
}

const SCORE_UPDATE: MatchScorePayload = {
  match_id: 'm1',
  home_score: 1,
  away_score: 0,
  scorer: 'Mbappé',
  minute: 23,
  timestamp: '2026-06-15T14:23:00Z',
}

const MINUTE_UPDATE: MatchMinutePayload = {
  match_id: 'm1',
  minute: 45,
  period: 'first_half',
  timestamp: '2026-06-15T14:45:00Z',
}

const INCIDENT: MatchIncidentPayload = {
  match_id: 'm1',
  type: 'goal',
  player: 'Mbappé',
  team_id: 't1',
  minute: 23,
  detail: 'Left foot, bottom right corner',
  timestamp: '2026-06-15T14:23:00Z',
}

describe('useMatchLive', () => {
  beforeEach(() => {
    capturedOnMessage = undefined
    capturedOptions = undefined
  })

  it('subscribes to correct topic and events', () => {
    renderHook(() => useMatchLive('match-7'))
    expect(capturedOptions?.topic).toBe('match:match-7:live')
    expect(capturedOptions?.events).toEqual([
      RealtimeEvent.MATCH_STATUS_CHANGE,
      RealtimeEvent.MATCH_SCORE_UPDATE,
      RealtimeEvent.MATCH_MINUTE_UPDATE,
      RealtimeEvent.MATCH_INCIDENT,
    ])
    expect(capturedOptions?.enabled).toBe(true)
  })

  it('disables channel when matchId is null', () => {
    renderHook(() => useMatchLive(null))
    expect(capturedOptions?.enabled).toBe(false)
  })

  it('starts with default state', () => {
    const { result } = renderHook(() => useMatchLive('m1'))
    expect(result.current.state).toEqual({
      status: null,
      homeScore: 0,
      awayScore: 0,
      minute: null,
      incidents: [],
    })
  })

  it('accepts initial state overrides', () => {
    const { result } = renderHook(() =>
      useMatchLive('m1', { status: 'half_time', homeScore: 2, awayScore: 1, minute: 45 }),
    )
    expect(result.current.state.status).toBe('half_time')
    expect(result.current.state.homeScore).toBe(2)
    expect(result.current.state.awayScore).toBe(1)
    expect(result.current.state.minute).toBe(45)
  })

  it('updates status and minute on MATCH_STATUS_CHANGE', () => {
    const { result } = renderHook(() => useMatchLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.MATCH_STATUS_CHANGE, STATUS_CHANGE))

    expect(result.current.state.status).toBe('first_half')
    expect(result.current.state.minute).toBe(1)
  })

  it('updates scores and minute on MATCH_SCORE_UPDATE', () => {
    const { result } = renderHook(() => useMatchLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.MATCH_SCORE_UPDATE, SCORE_UPDATE))

    expect(result.current.state.homeScore).toBe(1)
    expect(result.current.state.awayScore).toBe(0)
    expect(result.current.state.minute).toBe(23)
  })

  it('updates minute on MATCH_MINUTE_UPDATE', () => {
    const { result } = renderHook(() => useMatchLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.MATCH_MINUTE_UPDATE, MINUTE_UPDATE))

    expect(result.current.state.minute).toBe(45)
  })

  it('appends incidents and updates minute on MATCH_INCIDENT', () => {
    const { result } = renderHook(() => useMatchLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.MATCH_INCIDENT, INCIDENT))

    expect(result.current.state.incidents).toEqual([INCIDENT])
    expect(result.current.state.minute).toBe(23)
  })

  it('caps incidents at 50', () => {
    const { result } = renderHook(() => useMatchLive('m1'))

    for (let i = 0; i < 55; i++) {
      act(() =>
        capturedOnMessage!(RealtimeEvent.MATCH_INCIDENT, {
          ...INCIDENT,
          minute: i,
          timestamp: `2026-06-15T14:${String(i).padStart(2, '0')}:00Z`,
        }),
      )
    }

    expect(result.current.state.incidents.length).toBe(50)
    expect(result.current.state.incidents[49].minute).toBe(54)
  })

  it('handles full match flow', () => {
    const { result } = renderHook(() => useMatchLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.MATCH_STATUS_CHANGE, STATUS_CHANGE))
    act(() => capturedOnMessage!(RealtimeEvent.MATCH_SCORE_UPDATE, SCORE_UPDATE))
    act(() => capturedOnMessage!(RealtimeEvent.MATCH_INCIDENT, INCIDENT))
    act(() =>
      capturedOnMessage!(RealtimeEvent.MATCH_STATUS_CHANGE, {
        ...STATUS_CHANGE,
        previous_status: 'first_half',
        new_status: 'half_time',
        minute: 45,
      }),
    )

    expect(result.current.state.status).toBe('half_time')
    expect(result.current.state.homeScore).toBe(1)
    expect(result.current.state.awayScore).toBe(0)
    expect(result.current.state.minute).toBe(45)
    expect(result.current.state.incidents.length).toBe(1)
  })

  it('ignores unknown events', () => {
    const { result } = renderHook(() => useMatchLive('m1'))

    act(() => capturedOnMessage!('match:unknown', { data: 'test' }))

    expect(result.current.state).toEqual({
      status: null,
      homeScore: 0,
      awayScore: 0,
      minute: null,
      incidents: [],
    })
  })
})
