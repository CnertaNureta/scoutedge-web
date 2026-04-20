import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockCustomersCreate = vi.fn()
const mockCheckoutSessionsCreate = vi.fn()

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    customers: { create: mockCustomersCreate },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
  }),
  STRIPE_CONFIG: {
    apiBasicPriceId: 'price_basic_test',
    apiAdvancedPriceId: 'price_advanced_test',
    apiEventPriceId: 'price_event_test',
  },
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
  getSupabaseForUser: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

import { POST } from '../route'

function makeRequest(
  body: unknown,
  opts?: { token?: string; origin?: string },
): NextRequest {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (opts?.token) {
    headers.set('authorization', `Bearer ${opts.token}`)
  }
  if (opts?.origin) {
    headers.set('origin', opts.origin)
  }

  return new NextRequest(
    new URL('http://localhost:3847/api/checkout/api-subscription'),
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    },
  )
}

function mockProfileLookup(stripeCustomerId: string | null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : null,
      error: null,
    }),
    update: vi.fn().mockReturnThis(),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('API subscription checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://kickoracle.com'
  })

  it('returns 401 when no auth header', async () => {
    const req = makeRequest({ tier: 'basic' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when auth header is malformed', async () => {
    const headers = new Headers({ authorization: 'Basic abc' })
    const req = new NextRequest(
      new URL('http://localhost:3847/api/checkout/api-subscription'),
      { method: 'POST', body: '{"tier":"basic"}', headers },
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when user session is invalid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    })
    const req = makeRequest({ tier: 'basic' }, { token: 'bad-token' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid request body', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    })

    const headers = new Headers({
      'content-type': 'application/json',
      authorization: 'Bearer valid-token',
    })
    const req = new NextRequest(
      new URL('http://localhost:3847/api/checkout/api-subscription'),
      { method: 'POST', body: 'not-json', headers },
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid request body')
  })

  it('returns 400 for invalid tier', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    })

    const req = makeRequest({ tier: 'platinum' }, { token: 'valid' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid tier')
  })

  it('creates checkout session for valid basic tier request', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    })

    mockProfileLookup('cus_existing')

    mockCheckoutSessionsCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session_123',
    })

    const req = makeRequest(
      { tier: 'basic', name: 'Production Key' },
      { token: 'valid', origin: 'https://kickoracle.com' },
    )
    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.url).toBe('https://checkout.stripe.com/session_123')

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        mode: 'subscription',
        metadata: expect.objectContaining({
          type: 'api_subscription',
          api_tier: 'basic',
          api_key_name: 'Production Key',
          supabase_user_id: 'u1',
        }),
      }),
    )
  })

  it('creates a Stripe customer when none exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    })

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(chain)

    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' })
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/new',
    })

    const req = makeRequest({ tier: 'advanced' }, { token: 'valid' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'test@test.com',
      metadata: { supabase_user_id: 'u1' },
    })
  })

  it('sanitizes key name — trims and clamps to 100 chars', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    })

    mockProfileLookup('cus_1')
    mockCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })

    const longName = 'A'.repeat(200)
    const req = makeRequest(
      { tier: 'basic', name: `  ${longName}  ` },
      { token: 'valid' },
    )
    const res = await POST(req)
    expect(res.status).toBe(200)

    const sessionCall = mockCheckoutSessionsCreate.mock.calls[0][0]
    expect(sessionCall.metadata.api_key_name).toHaveLength(100)
  })

  it('falls back to app URL when origin is not in allowlist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    })

    mockProfileLookup('cus_1')
    mockCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })

    const req = makeRequest(
      { tier: 'basic' },
      { token: 'valid', origin: 'https://evil.com' },
    )
    const res = await POST(req)
    expect(res.status).toBe(200)

    const sessionCall = mockCheckoutSessionsCreate.mock.calls[0][0]
    expect(sessionCall.success_url).toContain('https://kickoracle.com')
    expect(sessionCall.success_url).not.toContain('evil.com')
  })

  it('uses event mode (payment) for event tier', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@test.com' } },
      error: null,
    })

    mockProfileLookup('cus_1')
    mockCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })

    const req = makeRequest({ tier: 'event' }, { token: 'valid' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment' }),
    )
  })
})
