import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createHash, createHmac } from 'crypto'
import { apiError } from './response'
import { checkMinuteLimit, checkMonthLimit, type RateLimitResult } from './rate-limiter'
import { logApiUsage } from './usage-logger'

export type ApiTier = 'basic' | 'advanced' | 'event' | 'whitelabel'

const ADVANCED_TIERS: ApiTier[] = ['advanced', 'event', 'whitelabel']


export interface ApiKeyContext {
  keyId: string
  tier: ApiTier
  rateLimitPerMinute: number
  rateLimitPerMonth: number
}

export type ApiHandler = (
  req: NextRequest,
  ctx: ApiKeyContext
) => Promise<NextResponse>

function hashKey(raw: string): string {
  const pepper = process.env.API_KEY_PEPPER
  if (pepper) {
    return createHmac('sha256', pepper).update(raw).digest('hex')
  }
  return createHash('sha256').update(raw).digest('hex')
}

async function validateApiKey(raw: string): Promise<ApiKeyContext | null> {
  const admin = getSupabaseAdmin()
  const hash = hashKey(raw)

  const { data, error } = await admin
    .from('api_keys')
    .select('id, tier, rate_limit_per_minute, rate_limit_per_month, is_active, expires_at, revoked_at')
    .eq('key_hash', hash)
    .single()

  if (error || !data) return null
  if (!data.is_active) return null
  if (data.revoked_at) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  await admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    keyId: data.id,
    tier: data.tier as ApiTier,
    rateLimitPerMinute: data.rate_limit_per_minute,
    rateLimitPerMonth: data.rate_limit_per_month,
  }
}

function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)))
  response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString())
  return response
}

function rateLimitResponse(result: RateLimitResult): NextResponse {
  const resp = NextResponse.json(
    { status: 'error', data: null, error: 'Rate limit exceeded' },
    { status: 429 },
  )
  addRateLimitHeaders(resp, result)
  if (result.retryAfterSec) {
    resp.headers.set('Retry-After', String(result.retryAfterSec))
  }
  return resp
}

export function withApiKey(handler: ApiHandler) {
  return async (req: NextRequest, routeCtx?: unknown) => {
    const startTime = Date.now()
    const raw = req.headers.get('x-api-key')
    if (!raw) {
      return apiError('Missing X-API-Key header', 401)
    }

    const ctx = await validateApiKey(raw)
    if (!ctx) {
      return apiError('Invalid or expired API key', 401)
    }

    const minuteResult = await checkMinuteLimit(ctx.keyId, ctx.rateLimitPerMinute)
    if (!minuteResult.allowed) {
      logApiUsage(ctx.keyId, new URL(req.url).pathname, req.method, 429, Date.now() - startTime)
      return rateLimitResponse(minuteResult)
    }

    const monthResult = await checkMonthLimit(ctx.keyId, ctx.rateLimitPerMonth)
    if (!monthResult.allowed) {
      logApiUsage(ctx.keyId, new URL(req.url).pathname, req.method, 429, Date.now() - startTime)
      return rateLimitResponse(monthResult)
    }

    const response = await handler(req, ctx)

    addRateLimitHeaders(response, minuteResult)

    logApiUsage(ctx.keyId, new URL(req.url).pathname, req.method, response.status, Date.now() - startTime)

    return response
  }
}

export function withAdvancedTier(handler: ApiHandler) {
  return withApiKey(async (req: NextRequest, ctx: ApiKeyContext) => {
    if (!ADVANCED_TIERS.includes(ctx.tier)) {
      return apiError(
        'This endpoint requires an Advanced, Event, or White Label subscription',
        403,
      )
    }
    return handler(req, ctx)
  })
}

