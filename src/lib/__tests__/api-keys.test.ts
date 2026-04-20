import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()

function buildChain() {
  const chain: Record<string, unknown> = {}
  chain.insert = mockInsert.mockReturnValue(chain)
  chain.select = mockSelect.mockReturnValue(chain)
  chain.update = mockUpdate.mockReturnValue(chain)
  chain.single = mockSingle
  chain.eq = mockEq.mockReturnValue(chain)
  chain.order = mockOrder
  return chain
}

const mockFrom = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}))

import {
  generateApiKey,
  validateApiKey,
  rotateApiKey,
  revokeApiKey,
  listApiKeys,
} from '../api-keys'

describe('api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateApiKey', () => {
    it('creates a key with correct tier defaults', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({
        data: {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Test',
          tier: 'basic',
          key_prefix: 'se_live_abcd1234',
          rate_limit_per_minute: 60,
          rate_limit_per_month: 10000,
          is_active: true,
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          created_at: '2026-04-13T00:00:00Z',
        },
        error: null,
      })

      const result = await generateApiKey('user-1', 'basic', 'Test')

      expect(result.key).toMatch(/^se_live_/)
      expect(result.record.tier).toBe('basic')
      expect(result.record.rateLimitPerMinute).toBe(60)
      expect(result.record.rateLimitPerMonth).toBe(10000)
      expect(mockFrom).toHaveBeenCalledWith('api_keys')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          tier: 'basic',
          name: 'Test',
          rate_limit_per_minute: 60,
          rate_limit_per_month: 10000,
        }),
      )
    })

    it('applies advanced tier defaults', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({
        data: {
          id: 'key-2',
          user_id: 'user-1',
          name: 'Default',
          tier: 'advanced',
          key_prefix: 'se_live_xyz',
          rate_limit_per_minute: 120,
          rate_limit_per_month: 100000,
          is_active: true,
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          created_at: '2026-04-13T00:00:00Z',
        },
        error: null,
      })

      const result = await generateApiKey('user-1', 'advanced')
      expect(result.record.rateLimitPerMinute).toBe(120)
      expect(result.record.rateLimitPerMonth).toBe(100000)
    })

    it('throws on insert failure', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'duplicate key_hash' },
      })

      await expect(generateApiKey('user-1', 'basic')).rejects.toThrow('Failed to create API key')
    })
  })

  describe('validateApiKey', () => {
    it('returns record for valid active key', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({
        data: {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Test',
          tier: 'basic',
          key_prefix: 'se_live_abcd',
          rate_limit_per_minute: 60,
          rate_limit_per_month: 10000,
          is_active: true,
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          created_at: '2026-04-13T00:00:00Z',
        },
        error: null,
      })

      const result = await validateApiKey('se_live_some_raw_key')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('key-1')
    })

    it('returns null for inactive key', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({
        data: {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Test',
          tier: 'basic',
          key_prefix: 'se_live_abcd',
          rate_limit_per_minute: 60,
          rate_limit_per_month: 10000,
          is_active: false,
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          created_at: '2026-04-13T00:00:00Z',
        },
        error: null,
      })

      const result = await validateApiKey('se_live_some_raw_key')
      expect(result).toBeNull()
    })

    it('returns null for revoked key', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({
        data: {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Test',
          tier: 'basic',
          key_prefix: 'se_live_abcd',
          rate_limit_per_minute: 60,
          rate_limit_per_month: 10000,
          is_active: true,
          last_used_at: null,
          expires_at: null,
          revoked_at: '2026-04-12T00:00:00Z',
          created_at: '2026-04-13T00:00:00Z',
        },
        error: null,
      })

      const result = await validateApiKey('se_live_some_raw_key')
      expect(result).toBeNull()
    })

    it('returns null for expired key', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({
        data: {
          id: 'key-1',
          user_id: 'user-1',
          name: 'Test',
          tier: 'basic',
          key_prefix: 'se_live_abcd',
          rate_limit_per_minute: 60,
          rate_limit_per_month: 10000,
          is_active: true,
          last_used_at: null,
          expires_at: '2020-01-01T00:00:00Z',
          revoked_at: null,
          created_at: '2026-04-13T00:00:00Z',
        },
        error: null,
      })

      const result = await validateApiKey('se_live_some_raw_key')
      expect(result).toBeNull()
    })

    it('returns null when key not found', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

      const result = await validateApiKey('se_live_nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('revokeApiKey', () => {
    it('sets revoked_at and is_active=false', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockEq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error: null })

      await revokeApiKey('key-1', 'user-1')

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      )
    })

    it('throws on failure', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockEq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error: { message: 'not found' } })

      await expect(revokeApiKey('key-1', 'user-1')).rejects.toThrow('Failed to revoke')
    })
  })

  describe('listApiKeys', () => {
    it('returns mapped records for user', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockOrder.mockResolvedValue({
        data: [
          {
            id: 'key-1',
            user_id: 'user-1',
            name: 'Prod Key',
            tier: 'advanced',
            key_prefix: 'se_live_abc',
            rate_limit_per_minute: 120,
            rate_limit_per_month: 100000,
            is_active: true,
            last_used_at: '2026-04-12T12:00:00Z',
            expires_at: null,
            revoked_at: null,
            created_at: '2026-04-10T00:00:00Z',
          },
        ],
        error: null,
      })

      const result = await listApiKeys('user-1')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Prod Key')
      expect(result[0].tier).toBe('advanced')
    })

    it('returns empty array when no keys', async () => {
      const chain = buildChain()
      mockFrom.mockReturnValue(chain)
      mockOrder.mockResolvedValue({ data: [], error: null })

      const result = await listApiKeys('user-1')
      expect(result).toHaveLength(0)
    })
  })
})
