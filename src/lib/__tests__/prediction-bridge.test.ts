import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FullPrediction, FeedbackRequest, LiveFrame } from '../prediction-bridge'
import {
  BridgeError,
  configureBridge,
  DEFAULT_BRIDGE_CONFIG,
  getMatchPrediction,
  getMatchLive,
  postDivergenceFeedback,
  getDuelScorecard,
  openLiveSocket,
} from '../prediction-bridge'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURE_PREDICTION: FullPrediction = {
  match_id: 'match-001',
  final_probs: { home_win: 0.5, draw: 0.25, away_win: 0.25 },
  ml_probs: { home_win: 0.48, draw: 0.27, away_win: 0.25 },
  sb_probs: { home_win: 0.52, draw: 0.23, away_win: 0.25 },
  poly_probs: null,
  weights: { ml: 0.5, sb: 0.4, poly: 0.1 },
  diagnosis: null,
  synthesizer_raw: {},
  confidence: 'high',
  expected_margin: 0.8,
  risk_factor: null,
  rationale: 'Strong home form.',
  flags: [],
  feature_generator_output: null,
  divergence_features: {},
  explanation_text: null,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the bridge config to a test base URL before each test */
function resetBridge(): void {
  configureBridge({ baseUrl: 'http://localhost:8000/api', apiKey: undefined })
}

type FetchMock = ReturnType<typeof vi.fn>

function mockFetchOk(body: unknown): FetchMock {
  const mock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  })
  globalThis.fetch = mock as unknown as typeof fetch
  return mock
}

function mockFetchError(status: number, text = ''): FetchMock {
  const mock = vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('not json')),
    text: vi.fn().mockResolvedValue(text),
  })
  globalThis.fetch = mock as unknown as typeof fetch
  return mock
}

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  listeners: Record<string, ((e: unknown) => void)[]> = {}

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(_data: string): void {}
  close(): void {
    this.trigger('close', {})
  }

  addEventListener(type: string, handler: (e: unknown) => void): void {
    if (!this.listeners[type]) this.listeners[type] = []
    this.listeners[type].push(handler)
  }

  trigger(type: string, event: unknown): void {
    for (const fn of this.listeners[type] ?? []) fn(event)
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('prediction-bridge', () => {
  beforeEach(() => {
    resetBridge()
    MockWebSocket.instances = []
    // @ts-expect-error — replacing global WebSocket with mock
    globalThis.WebSocket = MockWebSocket
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clear the module-level cache between tests by resetting the bridge
    // (forces a new URL so cached entries from previous tests don't bleed in)
  })

  // 1. configureBridge merges into defaults
  it('configureBridge merges provided fields without wiping unset fields', () => {
    configureBridge({ apiKey: 'test-key' })
    // We re-configure with only apiKey; baseUrl set by resetBridge should survive
    // We verify by calling getMatchPrediction and checking the URL used
    const mock = mockFetchOk(FIXTURE_PREDICTION)
    // trigger a fetch to inspect the URL
    void getMatchPrediction('match-001')
    const calledUrl: string = (mock.mock.calls[0] as [string])[0]
    expect(calledUrl).toMatch(/localhost:8000/)
    expect(calledUrl).toMatch(/match-001/)
  })

  // 2. getMatchPrediction calls correct URL with language query param
  it('getMatchPrediction appends language query param when provided', async () => {
    const mock = mockFetchOk(FIXTURE_PREDICTION)
    await getMatchPrediction('match-001', { language: 'zh' })
    const calledUrl: string = (mock.mock.calls[0] as [string])[0]
    expect(calledUrl).toBe('http://localhost:8000/api/predict/match/match-001?language=zh')
  })

  // 3. getMatchPrediction returns parsed FullPrediction
  it('getMatchPrediction returns a parsed FullPrediction object', async () => {
    mockFetchOk(FIXTURE_PREDICTION)
    const result = await getMatchPrediction('match-999') // different ID to avoid cache collision
    expect(result.match_id).toBe('match-001')
    expect(result.confidence).toBe('high')
    expect(result.final_probs.home_win).toBe(0.5)
  })

  // 4. 401 throws a typed BridgeError with status 401
  it('throws BridgeError with status 401 on unauthorized response', async () => {
    mockFetchError(401, 'Unauthorized')
    await expect(getMatchPrediction('match-401')).rejects.toMatchObject({
      name: 'BridgeError',
      status: 401,
      retryable: false,
    })
  })

  // 5. 500 throws a typed BridgeError with retry hint
  it('throws retryable BridgeError on 500 server error', async () => {
    mockFetchError(500, 'Internal Server Error')
    let caught: unknown
    try {
      await getMatchPrediction('match-500')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(BridgeError)
    const err = caught as BridgeError
    expect(err.status).toBe(500)
    expect(err.retryable).toBe(true)
    expect(err.message).toMatch(/retry/i)
  })

  // 6. 30s cache: two consecutive calls → fetch called once
  it('caches GET responses: second identical call skips fetch', async () => {
    // Use a unique match ID per test run to avoid cross-test cache pollution
    const matchId = `cache-test-${Date.now()}`
    configureBridge({ baseUrl: `http://localhost:8000/api` })
    const mock = mockFetchOk({ ...FIXTURE_PREDICTION, match_id: matchId })

    await getMatchPrediction(matchId)
    await getMatchPrediction(matchId)

    expect(mock).toHaveBeenCalledTimes(1)
  })

  // 7. cache bypass when ?nocache=1
  it('bypasses cache when path contains nocache=1', async () => {
    // We test via getMatchLive which uses cache: no-store + skipCache
    const mock = mockFetchOk({ ...FIXTURE_PREDICTION, match_id: 'live-match' })
    await getMatchLive('live-match')
    await getMatchLive('live-match')
    // Should be called twice — live endpoint bypasses cache
    expect(mock).toHaveBeenCalledTimes(2)
  })

  // 8. postDivergenceFeedback POSTs JSON body
  it('postDivergenceFeedback sends a POST request with JSON body', async () => {
    const mock = mockFetchOk({ accepted: true, feedback_id: 'fb-123' })
    const input: FeedbackRequest = {
      match_id: 'match-001',
      user_id: 'user-abc',
      agreed: true,
      comment: 'Great call',
    }
    const result = await postDivergenceFeedback(input)
    expect(result.accepted).toBe(true)
    expect(mock).toHaveBeenCalledTimes(1)

    const [, callInit] = mock.mock.calls[0] as [string, RequestInit]
    expect(callInit.method).toBe('POST')
    const sentBody = JSON.parse(callInit.body as string) as FeedbackRequest
    expect(sentBody.match_id).toBe('match-001')
    expect(sentBody.agreed).toBe(true)
  })

  // 9. openLiveSocket constructs ws:// URL correctly
  it('openLiveSocket builds a ws:// URL from the http baseUrl', () => {
    const onMessage = vi.fn<(_frame: LiveFrame) => void>()
    configureBridge({ baseUrl: 'http://localhost:8000/api' })
    const { close } = openLiveSocket('match-ws-001', { onMessage: onMessage as (frame: LiveFrame) => void })

    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
    expect(ws.url).toBe('ws://localhost:8000/ws/live/match-ws-001')

    close()
  })

  it('openLiveSocket builds an absolute URL from a relative API baseUrl', () => {
    const onMessage = vi.fn<(_frame: LiveFrame) => void>()
    configureBridge({ baseUrl: '/api' })
    const { close } = openLiveSocket('relative match', {
      onMessage: onMessage as (frame: LiveFrame) => void,
    })

    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
    expect(ws.url).toBe('ws://localhost:3000/ws/live/relative%20match')

    close()
  })

  it('openLiveSocket normalizes uppercase URL schemes', () => {
    const onMessage = vi.fn<(_frame: LiveFrame) => void>()
    configureBridge({ baseUrl: 'HTTPS://API.EXAMPLE.COM/api' })
    const { close } = openLiveSocket('upper-case', {
      onMessage: onMessage as (frame: LiveFrame) => void,
    })

    const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
    expect(ws.url).toBe('wss://api.example.com/ws/live/upper-case')

    close()
  })

  // 10. getDuelScorecard builds correct URL with query params
  it('getDuelScorecard appends limit and only_finished query params', async () => {
    const mock = mockFetchOk({
      user_id: 'u1',
      total_duels: 10,
      wins: 7,
      losses: 2,
      draws: 1,
      score: 1200,
      recent: [],
    })
    await getDuelScorecard('u1', { limit: 5, only_finished: true })
    const calledUrl: string = (mock.mock.calls[0] as [string])[0]
    expect(calledUrl).toContain('limit=5')
    expect(calledUrl).toContain('only_finished=true')
  })

  // 11. X-API-Key header is sent when apiKey is configured
  it('sends X-API-Key header when apiKey is configured', async () => {
    configureBridge({ baseUrl: 'http://localhost:8000/api', apiKey: 'secret-key' })
    const mock = mockFetchOk({ ...FIXTURE_PREDICTION, match_id: 'auth-match' })
    await getMatchPrediction('auth-match')

    const [, callInit] = mock.mock.calls[0] as [string, RequestInit]
    const headers = callInit.headers as Record<string, string>
    expect(headers['X-API-Key']).toBe('secret-key')
  })
})
