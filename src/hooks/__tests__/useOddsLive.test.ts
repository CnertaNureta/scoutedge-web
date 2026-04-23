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

import { useOddsLive } from '../useOddsLive'
import { RealtimeEvent, type OddsShiftPayload, type OddsSharpMovePayload } from '@/lib/realtime-channels'

const SHIFT: OddsShiftPayload = {
  match_id: 'm1',
  market: 'Winner',
  source: 'Consensus Feed',
  previous_odds: { yes: 0.45, no: 0.55 },
  current_odds: { yes: 0.48, no: 0.52 },
  shift_pct: 0.03,
  timestamp: '2026-06-15T12:00:00Z',
}

const SHARP_MOVE: OddsSharpMovePayload = {
  match_id: 'm1',
  market: 'Winner',
  direction: 'home',
  magnitude: 0.05,
  source_count: 3,
  timestamp: '2026-06-15T12:01:00Z',
}

describe('useOddsLive', () => {
  beforeEach(() => {
    capturedOnMessage = undefined
    capturedOptions = undefined
  })

  it('subscribes to correct topic and events', () => {
    renderHook(() => useOddsLive('match-42'))
    expect(capturedOptions?.topic).toBe('odds:match-42:movement')
    expect(capturedOptions?.events).toEqual([
      RealtimeEvent.ODDS_SHIFT,
      RealtimeEvent.ODDS_SHARP_MOVE,
    ])
    expect(capturedOptions?.enabled).toBe(true)
  })

  it('disables channel when matchId is null', () => {
    renderHook(() => useOddsLive(null))
    expect(capturedOptions?.enabled).toBe(false)
    expect(capturedOptions?.topic).toBe('')
  })

  it('starts with empty state', () => {
    const { result } = renderHook(() => useOddsLive('m1'))
    expect(result.current.state).toEqual({
      latestShift: null,
      sharpMoves: [],
      shiftCount: 0,
    })
  })

  it('updates latestShift and increments shiftCount on ODDS_SHIFT', () => {
    const { result } = renderHook(() => useOddsLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.ODDS_SHIFT, SHIFT))

    expect(result.current.state.latestShift).toEqual(SHIFT)
    expect(result.current.state.shiftCount).toBe(1)
  })

  it('accumulates shift count across multiple shifts', () => {
    const { result } = renderHook(() => useOddsLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.ODDS_SHIFT, SHIFT))
    act(() => capturedOnMessage!(RealtimeEvent.ODDS_SHIFT, { ...SHIFT, shift_pct: 0.01 }))
    act(() => capturedOnMessage!(RealtimeEvent.ODDS_SHIFT, { ...SHIFT, shift_pct: -0.02 }))

    expect(result.current.state.shiftCount).toBe(3)
  })

  it('appends sharp moves on ODDS_SHARP_MOVE', () => {
    const { result } = renderHook(() => useOddsLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.ODDS_SHARP_MOVE, SHARP_MOVE))

    expect(result.current.state.sharpMoves).toEqual([SHARP_MOVE])
  })

  it('caps sharp moves at 20', () => {
    const { result } = renderHook(() => useOddsLive('m1'))

    for (let i = 0; i < 25; i++) {
      act(() =>
        capturedOnMessage!(RealtimeEvent.ODDS_SHARP_MOVE, {
          ...SHARP_MOVE,
          timestamp: `2026-06-15T12:${String(i).padStart(2, '0')}:00Z`,
        }),
      )
    }

    expect(result.current.state.sharpMoves.length).toBe(20)
    expect(result.current.state.sharpMoves[19].timestamp).toBe('2026-06-15T12:24:00Z')
  })

  it('handles both event types independently', () => {
    const { result } = renderHook(() => useOddsLive('m1'))

    act(() => capturedOnMessage!(RealtimeEvent.ODDS_SHIFT, SHIFT))
    act(() => capturedOnMessage!(RealtimeEvent.ODDS_SHARP_MOVE, SHARP_MOVE))

    expect(result.current.state.latestShift).toEqual(SHIFT)
    expect(result.current.state.sharpMoves).toEqual([SHARP_MOVE])
    expect(result.current.state.shiftCount).toBe(1)
  })

  it('ignores unknown events', () => {
    const { result } = renderHook(() => useOddsLive('m1'))

    act(() => capturedOnMessage!('odds:unknown', { data: 'test' }))

    expect(result.current.state).toEqual({
      latestShift: null,
      sharpMoves: [],
      shiftCount: 0,
    })
  })
})
