import { describe, it, expect } from 'vitest'
import { parsePagination, parseIntId, parseUuid, parseDate, parseFloat01 } from '../response'

describe('parseIntId', () => {
  it('returns valid positive integers', () => {
    expect(parseIntId('1')).toBe(1)
    expect(parseIntId('42')).toBe(42)
    expect(parseIntId('0')).toBe(0)
  })

  it('rejects null/undefined/empty', () => {
    expect(parseIntId(null)).toBeNull()
    expect(parseIntId(undefined)).toBeNull()
    expect(parseIntId('')).toBeNull()
  })

  it('rejects non-numeric strings', () => {
    expect(parseIntId('abc')).toBeNull()
    expect(parseIntId('12abc')).toBe(12) // parseInt behavior — still valid int
    expect(parseIntId('abc12')).toBeNull()
  })

  it('rejects negative numbers', () => {
    expect(parseIntId('-1')).toBeNull()
    expect(parseIntId('-999')).toBeNull()
  })

  it('rejects numbers exceeding int32 max', () => {
    expect(parseIntId('2147483648')).toBeNull()
    expect(parseIntId('99999999999')).toBeNull()
  })

  it('accepts numbers at int32 max boundary', () => {
    expect(parseIntId('2147483647')).toBe(2147483647)
  })
})

describe('parseUuid', () => {
  it('accepts valid v4 UUIDs', () => {
    expect(parseUuid('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(parseUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
  })

  it('accepts uppercase UUIDs', () => {
    expect(parseUuid('550E8400-E29B-41D4-A716-446655440000')).toBe('550E8400-E29B-41D4-A716-446655440000')
  })

  it('rejects null/undefined/empty', () => {
    expect(parseUuid(null)).toBeNull()
    expect(parseUuid(undefined)).toBeNull()
    expect(parseUuid('')).toBeNull()
  })

  it('rejects integers', () => {
    expect(parseUuid('1')).toBeNull()
    expect(parseUuid('42')).toBeNull()
    expect(parseUuid('999999')).toBeNull()
  })

  it('rejects malformed UUIDs', () => {
    expect(parseUuid('not-a-uuid')).toBeNull()
    expect(parseUuid('550e8400e29b41d4a716446655440000')).toBeNull()
    expect(parseUuid('550e8400-e29b-41d4-a716')).toBeNull()
  })
})

describe('parsePagination', () => {
  function makeUrl(params: Record<string, string> = {}): URL {
    const u = new URL('https://api.example.com/v1/test')
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
    return u
  }

  it('returns defaults when no params provided', () => {
    const result = parsePagination(makeUrl())
    expect(result).toEqual({ page: 1, limit: 20, offset: 0 })
  })

  it('respects valid page and limit', () => {
    const result = parsePagination(makeUrl({ page: '3', limit: '50' }))
    expect(result).toEqual({ page: 3, limit: 50, offset: 100 })
  })

  it('clamps limit to max 100', () => {
    const result = parsePagination(makeUrl({ limit: '500' }))
    expect(result.limit).toBe(100)
  })

  it('clamps page to min 1', () => {
    const result = parsePagination(makeUrl({ page: '0' }))
    expect(result.page).toBe(1)
  })

  it('handles NaN page gracefully', () => {
    const result = parsePagination(makeUrl({ page: 'abc' }))
    expect(result.page).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('handles NaN limit gracefully', () => {
    const result = parsePagination(makeUrl({ limit: 'xyz' }))
    expect(result.limit).toBe(20)
  })

  it('rejects negative page values', () => {
    const result = parsePagination(makeUrl({ page: '-5' }))
    expect(result.page).toBe(1)
  })
})

describe('parseDate', () => {
  it('returns null for null input', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('accepts valid YYYY-MM-DD', () => {
    expect(parseDate('2026-06-11')).toBe('2026-06-11')
    expect(parseDate('2026-01-01')).toBe('2026-01-01')
  })

  it('rejects invalid formats', () => {
    expect(parseDate('06-11-2026')).toBe(false)
    expect(parseDate('2026/06/11')).toBe(false)
    expect(parseDate('not-a-date')).toBe(false)
    expect(parseDate('2026-6-1')).toBe(false)
  })

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull()
  })

  it('rejects date with extra chars', () => {
    expect(parseDate('2026-06-11T00:00:00Z')).toBe(false)
    expect(parseDate('2026-06-11 extra')).toBe(false)
  })
})

describe('parseFloat01', () => {
  it('returns null for null input', () => {
    expect(parseFloat01(null)).toBeNull()
  })

  it('accepts valid 0-1 floats', () => {
    expect(parseFloat01('0')).toBe(0)
    expect(parseFloat01('0.5')).toBe(0.5)
    expect(parseFloat01('1')).toBe(1)
    expect(parseFloat01('0.95')).toBe(0.95)
  })

  it('rejects out of range', () => {
    expect(parseFloat01('-0.1')).toBe(false)
    expect(parseFloat01('1.1')).toBe(false)
    expect(parseFloat01('50')).toBe(false)
  })

  it('rejects non-numeric', () => {
    expect(parseFloat01('abc')).toBe(false)
  })

  it('returns null for empty string', () => {
    expect(parseFloat01('')).toBeNull()
  })
})
