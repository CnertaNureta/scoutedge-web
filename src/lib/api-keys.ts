import { createHash, createHmac, randomBytes } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { ApiTier } from '@/lib/api-v1/middleware'

const KEY_PREFIX = 'se_live_'

interface ApiKeyRecord {
  id: string
  userId: string
  name: string
  tier: ApiTier
  keyPrefix: string
  rateLimitPerMinute: number
  rateLimitPerMonth: number
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface GenerateResult {
  key: string
  record: ApiKeyRecord
}

const TIER_DEFAULTS: Record<ApiTier, { ratePerMin: number; ratePerMonth: number }> = {
  basic: { ratePerMin: 60, ratePerMonth: 10_000 },
  advanced: { ratePerMin: 120, ratePerMonth: 100_000 },
  event: { ratePerMin: 200, ratePerMonth: 999_999_999 },
  whitelabel: { ratePerMin: 300, ratePerMonth: 999_999_999 },
}

export function hashKey(raw: string): string {
  const pepper = process.env.API_KEY_PEPPER
  if (pepper) {
    return createHmac('sha256', pepper).update(raw).digest('hex')
  }
  return createHash('sha256').update(raw).digest('hex')
}

function generateRawKey(): string {
  const bytes = randomBytes(32)
  return KEY_PREFIX + bytes.toString('base64url')
}

function toRecord(row: Record<string, unknown>): ApiKeyRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    tier: row.tier as ApiTier,
    keyPrefix: row.key_prefix as string,
    rateLimitPerMinute: row.rate_limit_per_minute as number,
    rateLimitPerMonth: row.rate_limit_per_month as number,
    isActive: row.is_active as boolean,
    lastUsedAt: row.last_used_at as string | null,
    expiresAt: row.expires_at as string | null,
    revokedAt: row.revoked_at as string | null,
    createdAt: row.created_at as string,
  }
}

export async function generateApiKey(
  userId: string,
  tier: ApiTier,
  name = 'Default',
  options?: { expiresAt?: string; stripeSubscriptionId?: string; stripeCheckoutSessionId?: string },
): Promise<GenerateResult> {
  const admin = getSupabaseAdmin()
  const rawKey = generateRawKey()
  const hash = hashKey(rawKey)
  const prefix = rawKey.slice(0, KEY_PREFIX.length + 8)
  const defaults = TIER_DEFAULTS[tier]

  const { data, error } = await admin
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: hash,
      key_prefix: prefix,
      name,
      tier,
      rate_limit_per_minute: defaults.ratePerMin,
      rate_limit_per_month: defaults.ratePerMonth,
      expires_at: options?.expiresAt ?? null,
      stripe_subscription_id: options?.stripeSubscriptionId ?? null,
      stripe_checkout_session_id: options?.stripeCheckoutSessionId ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create API key: ${error?.message ?? 'unknown error'}`)
  }

  return { key: rawKey, record: toRecord(data) }
}

export async function validateApiKey(
  rawKey: string,
): Promise<ApiKeyRecord | null> {
  const admin = getSupabaseAdmin()
  const hash = hashKey(rawKey)

  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, name, tier, key_prefix, rate_limit_per_minute, rate_limit_per_month, is_active, last_used_at, expires_at, revoked_at, created_at')
    .eq('key_hash', hash)
    .single()

  if (error || !data) return null
  if (!data.is_active) return null
  if (data.revoked_at) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  return toRecord(data)
}

export async function rotateApiKey(
  keyId: string,
  userId: string,
): Promise<GenerateResult> {
  const admin = getSupabaseAdmin()

  const { data: existing, error: fetchError } = await admin
    .from('api_keys')
    .select('tier, name, stripe_subscription_id, expires_at')
    .eq('id', keyId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !existing) {
    throw new Error('API key not found or access denied')
  }

  const { error: revokeError } = await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString(), is_active: false })
    .eq('id', keyId)

  if (revokeError) {
    throw new Error(`Failed to revoke old key: ${revokeError.message}`)
  }

  return generateApiKey(userId, existing.tier as ApiTier, existing.name, {
    expiresAt: existing.expires_at,
    stripeSubscriptionId: existing.stripe_subscription_id,
  })
}

export async function revokeApiKey(
  keyId: string,
  userId: string,
): Promise<void> {
  const admin = getSupabaseAdmin()

  const { error } = await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString(), is_active: false })
    .eq('id', keyId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`)
  }
}

export async function listApiKeys(
  userId: string,
): Promise<ApiKeyRecord[]> {
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('api_keys')
    .select('id, user_id, name, tier, key_prefix, rate_limit_per_minute, rate_limit_per_month, is_active, last_used_at, expires_at, revoked_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`)
  }

  return (data ?? []).map(toRecord)
}
