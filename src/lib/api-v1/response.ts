import { NextResponse } from 'next/server'

export interface ApiMeta {
  total: number
  page: number
  limit: number
  rateLimit?: { remaining: number; resetAt: string }
}

export interface ApiEnvelope<T> {
  status: 'ok' | 'error'
  data: T | null
  meta?: ApiMeta
  error?: string
}

export function apiSuccess<T>(data: T, meta?: ApiMeta): NextResponse<ApiEnvelope<T>> {
  const body: ApiEnvelope<T> = { status: 'ok', data }
  if (meta) body.meta = meta
  return NextResponse.json(body)
}

export function apiError(message: string, status: number): NextResponse<ApiEnvelope<null>> {
  return NextResponse.json({ status: 'error', data: null, error: message }, { status })
}

export function parsePagination(url: URL): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

export function parseIntId(raw: string | undefined | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 0 || n > 2147483647) return null
  return n
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseUuid(raw: string | undefined | null): string | null {
  if (!raw) return null
  if (!UUID_RE.test(raw)) return null
  return raw
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseDate(raw: string | null): string | null | false {
  if (!raw) return null
  if (!DATE_RE.test(raw)) return false
  return raw
}

export function parseFloat01(raw: string | null): number | null | false {
  if (!raw) return null
  const n = parseFloat(raw)
  if (Number.isNaN(n) || n < 0 || n > 1) return false
  return n
}
