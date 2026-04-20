import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkMinuteLimit } from '../rate-limiter'

describe('checkMinuteLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('allows first request and returns full remaining', async () => {
    const result = await checkMinuteLimit('key-1', 60)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(59)
    expect(result.limit).toBe(60)
  })

  it('decrements remaining on each call', async () => {
    await checkMinuteLimit('key-2', 5)
    await checkMinuteLimit('key-2', 5)
    const result = await checkMinuteLimit('key-2', 5)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('rejects when limit exceeded', async () => {
    for (let i = 0; i < 3; i++) {
      await checkMinuteLimit('key-3', 3)
    }
    const result = await checkMinuteLimit('key-3', 3)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it('resets after window expires', async () => {
    for (let i = 0; i < 3; i++) {
      await checkMinuteLimit('key-4', 3)
    }
    const blocked = await checkMinuteLimit('key-4', 3)
    expect(blocked.allowed).toBe(false)

    vi.advanceTimersByTime(61_000)

    const fresh = await checkMinuteLimit('key-4', 3)
    expect(fresh.allowed).toBe(true)
    expect(fresh.remaining).toBe(2)
  })

  it('isolates different keys', async () => {
    for (let i = 0; i < 3; i++) {
      await checkMinuteLimit('key-5a', 3)
    }
    const result = await checkMinuteLimit('key-5b', 3)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })
})
