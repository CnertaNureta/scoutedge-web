import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('../rate-limiter', () => ({
  checkMinuteLimit: vi.fn(),
  checkMonthLimit: vi.fn(),
}))

vi.mock('../usage-logger', () => ({
  logApiUsage: vi.fn(),
}))

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkMinuteLimit, checkMonthLimit } from '../rate-limiter'
import { withApiKey, withAdvancedTier } from '../middleware'

const TEST_KEY = 'se_live_testkey123'
const TEST_KEY_HASH = createHash('sha256').update(TEST_KEY).digest('hex')

function makeRequest(path: string, apiKey?: string): NextRequest {
  const headers = new Headers()
  if (apiKey) headers.set('x-api-key', apiKey)
  return new NextRequest(new URL(`http://localhost:3847${path}`), { headers })
}

function mockSupabaseSelect(data: Record<string, unknown> | null) {
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  const selectChain = {
    eq: vi.fn().mockReturnThis() as ReturnType<typeof vi.fn>,
    single: vi.fn().mockResolvedValue({ data, error: null }),
  }
  const client = {
    from: vi.fn((table: string) => {
      return {
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue(updateChain),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    }),
  }
  ;(getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValue(client)
  return client
}

const allowedRateLimit = {
  allowed: true,
  limit: 60,
  remaining: 59,
  resetAt: new Date(Date.now() + 60_000),
}

const noopHandler = vi.fn(async () => NextResponse.json({ status: 'ok', data: null }))

describe('withApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(checkMinuteLimit as ReturnType<typeof vi.fn>).mockResolvedValue(allowedRateLimit)
    ;(checkMonthLimit as ReturnType<typeof vi.fn>).mockResolvedValue(allowedRateLimit)
  })

  it('returns 401 when X-API-Key header is missing', async () => {
    const handler = withApiKey(noopHandler)
    const res = await handler(makeRequest('/api/v1/teams'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/Missing/)
  })

  it('returns 401 for invalid key', async () => {
    mockSupabaseSelect(null)
    const handler = withApiKey(noopHandler)
    const res = await handler(makeRequest('/api/v1/teams', 'bad_key'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid/)
  })

  it('returns 401 for revoked key', async () => {
    mockSupabaseSelect({
      id: 'key-1',
      tier: 'basic',
      rate_limit_per_minute: 60,
      rate_limit_per_month: 10000,
      is_active: true,
      revoked_at: '2026-01-01T00:00:00Z',
      expires_at: null,
    })
    const handler = withApiKey(noopHandler)
    const res = await handler(makeRequest('/api/v1/teams', TEST_KEY))

    expect(res.status).toBe(401)
  })

  it('returns 401 for expired key', async () => {
    mockSupabaseSelect({
      id: 'key-1',
      tier: 'basic',
      rate_limit_per_minute: 60,
      rate_limit_per_month: 10000,
      is_active: true,
      revoked_at: null,
      expires_at: '2020-01-01T00:00:00Z',
    })
    const handler = withApiKey(noopHandler)
    const res = await handler(makeRequest('/api/v1/teams', TEST_KEY))

    expect(res.status).toBe(401)
  })

  it('passes valid key context to handler', async () => {
    mockSupabaseSelect({
      id: 'key-abc',
      tier: 'advanced',
      rate_limit_per_minute: 120,
      rate_limit_per_month: 100000,
      is_active: true,
      revoked_at: null,
      expires_at: null,
    })

    const spy = vi.fn(async () => NextResponse.json({ status: 'ok', data: null }))
    const handler = withApiKey(spy)
    await handler(makeRequest('/api/v1/teams', TEST_KEY))

    expect(spy).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({
        keyId: 'key-abc',
        tier: 'advanced',
        rateLimitPerMinute: 120,
        rateLimitPerMonth: 100000,
      }),
    )
  })

  it('adds rate limit headers to response', async () => {
    mockSupabaseSelect({
      id: 'key-abc',
      tier: 'basic',
      rate_limit_per_minute: 60,
      rate_limit_per_month: 10000,
      is_active: true,
      revoked_at: null,
      expires_at: null,
    })

    const handler = withApiKey(noopHandler)
    const res = await handler(makeRequest('/api/v1/teams', TEST_KEY))

    expect(res.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined()
  })

  it('returns 429 when minute limit exceeded', async () => {
    mockSupabaseSelect({
      id: 'key-abc',
      tier: 'basic',
      rate_limit_per_minute: 60,
      rate_limit_per_month: 10000,
      is_active: true,
      revoked_at: null,
      expires_at: null,
    })
    ;(checkMinuteLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: new Date(Date.now() + 30_000),
      retryAfterSec: 30,
    })

    const handler = withApiKey(noopHandler)
    const res = await handler(makeRequest('/api/v1/teams', TEST_KEY))

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })
})

describe('withAdvancedTier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(checkMinuteLimit as ReturnType<typeof vi.fn>).mockResolvedValue(allowedRateLimit)
    ;(checkMonthLimit as ReturnType<typeof vi.fn>).mockResolvedValue(allowedRateLimit)
  })

  it('returns 403 for basic tier on advanced endpoint', async () => {
    mockSupabaseSelect({
      id: 'key-basic',
      tier: 'basic',
      rate_limit_per_minute: 60,
      rate_limit_per_month: 10000,
      is_active: true,
      revoked_at: null,
      expires_at: null,
    })

    const handler = withAdvancedTier(noopHandler)
    const res = await handler(makeRequest('/api/v1/signals', TEST_KEY))

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/Advanced/)
  })

  it('allows advanced tier through', async () => {
    mockSupabaseSelect({
      id: 'key-adv',
      tier: 'advanced',
      rate_limit_per_minute: 120,
      rate_limit_per_month: 100000,
      is_active: true,
      revoked_at: null,
      expires_at: null,
    })

    const handler = withAdvancedTier(noopHandler)
    const res = await handler(makeRequest('/api/v1/signals', TEST_KEY))

    expect(res.status).toBe(200)
  })

  it('allows event tier through', async () => {
    mockSupabaseSelect({
      id: 'key-evt',
      tier: 'event',
      rate_limit_per_minute: 200,
      rate_limit_per_month: 999999,
      is_active: true,
      revoked_at: null,
      expires_at: null,
    })

    const handler = withAdvancedTier(noopHandler)
    const res = await handler(makeRequest('/api/v1/signals', TEST_KEY))

    expect(res.status).toBe(200)
  })
})

