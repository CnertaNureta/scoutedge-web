import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
  retryAfterSec?: number
}

// --- Upstash Redis rate limiter (production) ---

let redisRatelimiters: Map<number, Ratelimit> | null = null

function getRedisRatelimiter(limitPerMinute: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  if (!redisRatelimiters) {
    redisRatelimiters = new Map()
  }

  let rl = redisRatelimiters.get(limitPerMinute)
  if (!rl) {
    const redis = new Redis({ url, token })
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limitPerMinute, '1 m'),
      prefix: 'api-v1-rl',
    })
    redisRatelimiters.set(limitPerMinute, rl)
  }

  return rl
}

// --- In-memory fallback (local dev only) ---

interface WindowEntry {
  count: number
  resetAt: number
}

const windows = new Map<string, WindowEntry>()
const WINDOW_MS = 60_000

function cleanStaleEntries() {
  const now = Date.now()
  for (const [key, entry] of windows) {
    if (now >= entry.resetAt) {
      windows.delete(key)
    }
  }
}

setInterval(cleanStaleEntries, 5 * 60_000).unref?.()

function checkMinuteLimitInMemory(keyId: string, limitPerMinute: number): RateLimitResult {
  const now = Date.now()
  const entry = windows.get(keyId)

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + WINDOW_MS
    windows.set(keyId, { count: 1, resetAt })
    return {
      allowed: true,
      limit: limitPerMinute,
      remaining: limitPerMinute - 1,
      resetAt: new Date(resetAt),
    }
  }

  entry.count++

  if (entry.count > limitPerMinute) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000)
    return {
      allowed: false,
      limit: limitPerMinute,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfterSec,
    }
  }

  return {
    allowed: true,
    limit: limitPerMinute,
    remaining: limitPerMinute - entry.count,
    resetAt: new Date(entry.resetAt),
  }
}

// --- Public API ---

export async function checkMinuteLimit(keyId: string, limitPerMinute: number): Promise<RateLimitResult> {
  const rl = getRedisRatelimiter(limitPerMinute)

  if (rl) {
    try {
      const { success, limit, remaining, reset } = await rl.limit(keyId)
      return {
        allowed: success,
        limit,
        remaining: Math.max(0, remaining),
        resetAt: new Date(reset),
        retryAfterSec: success ? undefined : Math.ceil((reset - Date.now()) / 1000),
      }
    } catch {
      return {
        allowed: false,
        limit: limitPerMinute,
        remaining: 0,
        resetAt: new Date(Date.now() + WINDOW_MS),
        retryAfterSec: 60,
      }
    }
  }

  return checkMinuteLimitInMemory(keyId, limitPerMinute)
}

export async function checkMonthLimit(
  keyId: string,
  limitPerMonth: number,
): Promise<RateLimitResult> {
  const admin = getSupabaseAdmin()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count, error } = await admin
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', keyId)
    .gte('created_at', monthStart)

  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  if (error) {
    return {
      allowed: false,
      limit: limitPerMonth,
      remaining: 0,
      resetAt: monthEnd,
      retryAfterSec: 60,
    }
  }

  const totalUsed = count ?? 0

  if (totalUsed >= limitPerMonth) {
    return {
      allowed: false,
      limit: limitPerMonth,
      remaining: 0,
      resetAt: monthEnd,
      retryAfterSec: Math.ceil((monthEnd.getTime() - now.getTime()) / 1000),
    }
  }

  return {
    allowed: true,
    limit: limitPerMonth,
    remaining: limitPerMonth - totalUsed,
    resetAt: monthEnd,
  }
}
