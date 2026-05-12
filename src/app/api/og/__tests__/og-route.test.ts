import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoist the mock constructor so vi.mock factory can reference it safely
// ---------------------------------------------------------------------------

interface MockImageResponseShape {
  element: unknown
  options: unknown
  status: number
}

const { MockImageResponse } = vi.hoisted(() => {
  class MockImageResponse {
    public readonly element: unknown
    public readonly options: unknown
    public readonly status: number

    constructor(element: unknown, options?: { width?: number; height?: number; headers?: Record<string, string> }) {
      this.element = element
      this.options = options
      this.status = 200
    }
  }
  return { MockImageResponse }
})

vi.mock('next/og', () => ({
  ImageResponse: MockImageResponse,
}))

// ---------------------------------------------------------------------------
// Mock global fetch for metadata calls
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
global.fetch = mockFetch

// ---------------------------------------------------------------------------
// Import after mocks are wired up
// ---------------------------------------------------------------------------

import { fetchOgMetadata } from '@/lib/og-metadata'
import { GET } from '../[type]/[id]/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(type: string, id: string): Request {
  return new Request(`http://localhost/api/og/${type}/${id}`)
}

function makeParams(type: string, id: string): { params: Promise<{ type: string; id: string }> } {
  return { params: Promise.resolve({ type, id }) }
}

function collectText(node: unknown): string[] {
  if (node == null || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(collectText)
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props
    return collectText(props?.children)
  }
  return []
}

const SAMPLE_MATCH_METADATA = {
  match_id: 'match-123',
  home_team: 'BRA',
  away_team: 'ARG',
  kickoff_utc: '2026-07-01T20:00:00Z',
  stage: 'final',
  venue_city: 'Lusail',
  predicted_winner: 'BRA',
  predicted_p_win: 0.56,
  headline: 'BRA 56% to beat ARG',
  ts: '2026-06-15T10:00:00Z',
}

const SAMPLE_BRACKET_METADATA = {
  fork_id: 'fork-abc',
  user_id: 'user-1',
  title: 'Brazil wins the WC',
  share_url: '/bracket/fork-abc',
  points_earned: 42,
  max_possible: 100,
  rank_percentile: 95.5,
  headline: '42/100 pts',
  ts: '2026-06-15T10:00:00Z',
}

const SAMPLE_SLAYER_METADATA = {
  user_id: 'user-42',
  headline: 'Top Slayer — Week 3',
  total_picks: 10,
  correct_picks: 7,
  accuracy_pct: 70,
  badge_tier: 'gold',
  ts: '2026-06-15T10:00:00Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OG route — fetchOgMetadata helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches match metadata via the prediction bridge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_MATCH_METADATA,
    } as Response)

    const result = await fetchOgMetadata('match', 'match-123')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/og/match/match-123'),
      { cache: 'no-store' },
    )
    expect(result.type).toBe('match')
    expect(result.data).toEqual(SAMPLE_MATCH_METADATA)
  })

  it('fetches bracket metadata via direct fetch when bridge has no bracket helper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_BRACKET_METADATA,
    } as Response)

    const result = await fetchOgMetadata('bracket', 'fork-abc')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/og/bracket/fork-abc'),
      { cache: 'no-store' },
    )
    expect(result.type).toBe('bracket')
    expect(result.data).toEqual(SAMPLE_BRACKET_METADATA)
  })

  it('fetches slayer metadata via direct fetch when bridge has no slayer helper', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_SLAYER_METADATA,
    } as Response)

    const result = await fetchOgMetadata('slayer', 'user-42')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/og/slayer/user-42'),
      { cache: 'no-store' },
    )
    expect(result.type).toBe('slayer')
    expect(result.data).toEqual(SAMPLE_SLAYER_METADATA)
  })
})

describe('OG route — GET handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an ImageResponse for a valid match type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_MATCH_METADATA,
    } as Response)

    const response = await GET(makeRequest('match', 'match-123') as never, makeParams('match', 'match-123'))

    expect(response).toBeInstanceOf(MockImageResponse)
    expect((response as unknown as MockImageResponseShape).status).toBe(200)
  })

  it('returns an ImageResponse for a valid bracket type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_BRACKET_METADATA,
    } as Response)

    const response = await GET(makeRequest('bracket', 'fork-abc') as never, makeParams('bracket', 'fork-abc'))

    expect(response).toBeInstanceOf(MockImageResponse)
    expect((response as unknown as MockImageResponseShape).status).toBe(200)
  })

  it('returns an ImageResponse for a valid slayer type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_SLAYER_METADATA,
    } as Response)

    const response = await GET(makeRequest('slayer', 'user-42') as never, makeParams('slayer', 'user-42'))

    expect(response).toBeInstanceOf(MockImageResponse)
    expect((response as unknown as MockImageResponseShape).status).toBe(200)
  })

  it('falls back to pick-derived slayer accuracy when metadata accuracy is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...SAMPLE_SLAYER_METADATA,
        total_picks: 10,
        correct_picks: 7,
        accuracy_pct: null,
      }),
    } as Response)

    const response = await GET(makeRequest('slayer', 'user-42') as never, makeParams('slayer', 'user-42'))
    const textParts = collectText((response as unknown as MockImageResponseShape).element)
    const text = textParts.join(' ')

    expect(textParts).toContain('70')
    expect(text).toContain('Win rate')
  })

  it('returns a 400 Response for an unknown type', async () => {
    const response = await GET(makeRequest('unknown', 'anything') as never, makeParams('unknown', 'anything'))

    expect(response).toBeInstanceOf(Response)
    expect((response as Response).status).toBe(400)
    const text = await (response as Response).text()
    expect(text).toContain('Unknown OG type')
  })

  it('returns a fallback ImageResponse (status 200) when metadata fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Service unavailable'))

    const response = await GET(makeRequest('match', 'bad-id') as never, makeParams('match', 'bad-id'))

    // Must still return ImageResponse (the fallback), not a 500
    expect(response).toBeInstanceOf(MockImageResponse)
    expect((response as unknown as MockImageResponseShape).status).toBe(200)
  })

  it('includes cache-control header in the image response options', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_MATCH_METADATA,
    } as Response)

    const response = await GET(makeRequest('match', 'match-123') as never, makeParams('match', 'match-123'))

    const opts = (response as unknown as MockImageResponseShape).options as {
      headers?: Record<string, string>
    }
    expect(opts?.headers?.['Cache-Control']).toBe('public, max-age=1800, s-maxage=3600')
  })
})
