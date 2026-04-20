import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockConstructEvent = vi.fn()
const mockSubscriptionsRetrieve = vi.fn()

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }),
  getWebhookSecret: () => 'whsec_test_secret',
  STRIPE_CONFIG: {
    proMonthlyPriceId: 'price_monthly',
    proTournamentPriceId: 'price_tournament',
  },
}))

const mockGenerateApiKey = vi.fn()
vi.mock('@/lib/api-keys', () => ({
  generateApiKey: (...args: unknown[]) => mockGenerateApiKey(...args),
}))

vi.mock('@/lib/api-subscription-types', () => ({
  API_CANCELLATION_GRACE_DAYS: 7,
  API_EVENT_EXPIRY_ISO: '2026-07-20T23:59:59Z',
}))

type ChainMethods = Record<string, ReturnType<typeof vi.fn>>

function createMockAdmin() {
  const tables: Record<string, ChainMethods> = {}

  function getChain(table: string): ChainMethods {
    if (!tables[table]) {
      const chain: ChainMethods = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.insert = vi.fn().mockReturnValue(chain)
      chain.update = vi.fn().mockReturnValue(chain)
      chain.upsert = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.in = vi.fn().mockReturnValue(chain)
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      tables[table] = chain
    }
    return tables[table]
  }

  const admin = {
    from: vi.fn((table: string) => getChain(table)),
    _tables: tables,
    _getChain: getChain,
  }

  return admin
}

let mockAdmin: ReturnType<typeof createMockAdmin>

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => mockAdmin,
}))

import { POST } from '../route'

function makeWebhookRequest(body = '{}', signature = 'sig_test'): NextRequest {
  const headers = new Headers()
  if (signature) headers.set('stripe-signature', signature)
  headers.set('content-type', 'application/json')

  return new NextRequest(new URL('http://localhost:3847/api/webhooks/stripe'), {
    method: 'POST',
    body,
    headers,
  })
}

function makeEvent(type: string, data: Record<string, unknown>) {
  return { type, data: { object: data } }
}

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdmin = createMockAdmin()
  })

  describe('signature verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const req = new NextRequest(
        new URL('http://localhost:3847/api/webhooks/stripe'),
        { method: 'POST', body: '{}' },
      )
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Missing signature')
    })

    it('returns 400 when signature verification fails', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })
      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('Invalid signature')
    })
  })

  describe('checkout.session.completed — API subscription', () => {
    const sessionBase = {
      id: 'cs_test_123',
      mode: 'subscription',
      subscription: 'sub_abc',
      customer: 'cus_xyz',
      payment_intent: null,
      metadata: {
        type: 'api_subscription',
        api_tier: 'advanced',
        api_key_name: 'My API Key',
        supabase_user_id: 'user-1',
      },
    }

    it('provisions an API key on first checkout', async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', sessionBase),
      )

      mockGenerateApiKey.mockResolvedValue({
        key: 'se_live_xxx',
        record: { id: 'key-1' },
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)

      expect(mockGenerateApiKey).toHaveBeenCalledWith(
        'user-1',
        'advanced',
        'My API Key',
        {
          stripeSubscriptionId: 'sub_abc',
          stripeCheckoutSessionId: 'cs_test_123',
          expiresAt: undefined,
        },
      )
    })

    it('skips provisioning when key already exists (idempotency)', async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', sessionBase),
      )

      // Simulate existing key for this checkout session
      mockAdmin._getChain('api_keys').maybeSingle.mockResolvedValue({
        data: { id: 'existing-key' },
        error: null,
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)
      expect(mockGenerateApiKey).not.toHaveBeenCalled()
    })

    it('sets expiresAt for one-time payment (event tier)', async () => {
      const eventSession = {
        ...sessionBase,
        mode: 'payment',
        subscription: null,
        metadata: {
          type: 'api_subscription',
          api_tier: 'event',
          supabase_user_id: 'user-1',
        },
      }

      mockConstructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', eventSession),
      )

      mockGenerateApiKey.mockResolvedValue({
        key: 'se_live_xxx',
        record: { id: 'key-2' },
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)

      expect(mockGenerateApiKey).toHaveBeenCalledWith(
        'user-1',
        'event',
        'event Key',
        {
          stripeSubscriptionId: undefined,
          stripeCheckoutSessionId: 'cs_test_123',
          expiresAt: '2026-07-20T23:59:59Z',
        },
      )
    })

    it('skips processing when userId is missing', async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          ...sessionBase,
          metadata: { type: 'api_subscription' },
        }),
      )

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)
      expect(mockGenerateApiKey).not.toHaveBeenCalled()
    })
  })

  describe('checkout.session.completed — booster purchase', () => {
    it('skips fulfillment when order already exists (idempotency)', async () => {
      const boosterSession = {
        id: 'cs_booster_1',
        mode: 'payment',
        payment_intent: 'pi_existing',
        metadata: {
          type: 'booster_purchase',
          store_item_id: 'item-1',
          supabase_user_id: 'user-1',
        },
      }

      mockConstructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', boosterSession),
      )

      // Simulate existing order
      mockAdmin._getChain('store_orders').maybeSingle.mockResolvedValue({
        data: { id: 'order-existing' },
        error: null,
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)

      // Should NOT have inserted a new order
      expect(mockAdmin._getChain('store_orders').insert).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.updated', () => {
    it('throttles API keys when subscription goes past_due', async () => {
      const sub = {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'past_due',
        items: { data: [{ price: { id: 'price_1' } }] },
      }

      mockConstructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', sub),
      )

      // No user profile lookup needed for API key path
      mockAdmin._getChain('api_keys').eq.mockImplementation(function (this: ChainMethods) {
        return this
      })

      // Return linked API key on first call (getApiKeysForSubscription)
      const apiKeysChain = mockAdmin._getChain('api_keys')
      const originalEq = apiKeysChain.eq
      let eqCallCount = 0
      apiKeysChain.eq = vi.fn().mockImplementation((...args: unknown[]) => {
        eqCallCount++
        // First eq call: getApiKeysForSubscription select
        if (eqCallCount === 1) {
          return Promise.resolve({
            data: [{ id: 'key-1', user_id: 'user-1', tier: 'basic', is_active: true }],
            error: null,
          })
        }
        // Subsequent eq calls: update chain
        originalEq.mockReturnValue(apiKeysChain)
        return (originalEq as unknown as (...a: unknown[]) => unknown)(...args)
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)
    })

    it('deactivates API keys on terminal statuses', async () => {
      const sub = {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'unpaid',
        items: { data: [{ price: { id: 'price_1' } }] },
      }

      mockConstructEvent.mockReturnValue(
        makeEvent('customer.subscription.updated', sub),
      )

      const apiKeysChain = mockAdmin._getChain('api_keys')
      let eqCallCount = 0
      apiKeysChain.eq = vi.fn().mockImplementation(() => {
        eqCallCount++
        if (eqCallCount === 1) {
          return Promise.resolve({
            data: [{ id: 'key-1', user_id: 'user-1', tier: 'advanced', is_active: true }],
            error: null,
          })
        }
        return apiKeysChain
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)

      // Verify update was called with deactivation
      expect(apiKeysChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
        }),
      )
    })
  })

  describe('customer.subscription.deleted', () => {
    it('applies grace period to linked API keys', async () => {
      const sub = {
        id: 'sub_del',
        customer: 'cus_1',
        status: 'canceled',
      }

      mockConstructEvent.mockReturnValue(
        makeEvent('customer.subscription.deleted', sub),
      )

      const apiKeysChain = mockAdmin._getChain('api_keys')
      let eqCallCount = 0
      apiKeysChain.eq = vi.fn().mockImplementation(() => {
        eqCallCount++
        if (eqCallCount === 1) {
          return Promise.resolve({
            data: [{ id: 'key-1', user_id: 'user-1', tier: 'basic', is_active: true }],
            error: null,
          })
        }
        return apiKeysChain
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)

      expect(apiKeysChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      )
    })

    it('downgrades user to free when no active subscriptions remain', async () => {
      const sub = {
        id: 'sub_del2',
        customer: 'cus_2',
        status: 'canceled',
      }

      mockConstructEvent.mockReturnValue(
        makeEvent('customer.subscription.deleted', sub),
      )

      // No linked API keys
      const apiKeysChain = mockAdmin._getChain('api_keys')
      apiKeysChain.eq = vi.fn().mockResolvedValue({ data: [], error: null })

      // getUserIdFromCustomer
      const profilesChain = mockAdmin._getChain('user_profiles')
      profilesChain.single = vi.fn()
        .mockResolvedValueOnce({ data: { id: 'user-2' }, error: null })

      // Check active subs returns empty
      const subsChain = mockAdmin._getChain('subscriptions')
      const originalSubsEq = subsChain.eq
      subsChain.in = vi.fn().mockResolvedValue({ data: [], error: null })
      subsChain.eq = vi.fn().mockReturnValue(subsChain)

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)
    })
  })

  describe('invoice.payment_failed', () => {
    it('marks subscription past_due and throttles linked API keys', async () => {
      const invoice = {
        id: 'in_1',
        parent: {
          subscription_details: {
            subscription: 'sub_failing',
          },
        },
      }

      mockConstructEvent.mockReturnValue(
        makeEvent('invoice.payment_failed', invoice),
      )

      const subsChain = mockAdmin._getChain('subscriptions')
      subsChain.eq = vi.fn().mockReturnValue(subsChain)

      const apiKeysChain = mockAdmin._getChain('api_keys')
      let eqCallCount = 0
      apiKeysChain.eq = vi.fn().mockImplementation(() => {
        eqCallCount++
        if (eqCallCount === 1) {
          return Promise.resolve({
            data: [{ id: 'key-1', user_id: 'user-1', tier: 'basic', is_active: true }],
            error: null,
          })
        }
        return apiKeysChain
      })

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)

      // Verify subscription marked past_due
      expect(subsChain.update).toHaveBeenCalledWith({ status: 'past_due' })

      // Verify API key throttled
      expect(apiKeysChain.update).toHaveBeenCalledWith({
        rate_limit_per_minute: 10,
        rate_limit_per_month: 100,
      })
    })
  })

  describe('handler errors', () => {
    it('returns 500 when handler throws', async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent('checkout.session.completed', {
          id: 'cs_err',
          mode: 'subscription',
          subscription: 'sub_err',
          metadata: {
            type: 'api_subscription',
            api_tier: 'basic',
            supabase_user_id: 'user-1',
          },
        }),
      )

      mockAdmin._getChain('api_keys').maybeSingle.mockRejectedValue(
        new Error('DB connection failed'),
      )

      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.error).toBe('Handler failed')
    })
  })
})
