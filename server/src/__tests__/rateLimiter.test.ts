import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit } from '../services/rateLimiter'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('allows requests within the limit', () => {
    const key = `test-${Date.now()}-1`
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 30_000)).toBe(true)
    }
  })

  it('blocks the 6th request within the window', () => {
    const key = `test-${Date.now()}-2`
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 30_000)
    expect(checkRateLimit(key, 5, 30_000)).toBe(false)
  })

  it('resets after the window expires', () => {
    const key = `test-${Date.now()}-3`
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 30_000)
    expect(checkRateLimit(key, 5, 30_000)).toBe(false)

    // Advance time past the window
    vi.advanceTimersByTime(31_000)
    expect(checkRateLimit(key, 5, 30_000)).toBe(true)
  })

  it('tracks different keys independently', () => {
    const key1 = `test-${Date.now()}-4a`
    const key2 = `test-${Date.now()}-4b`
    for (let i = 0; i < 5; i++) checkRateLimit(key1, 5, 30_000)
    expect(checkRateLimit(key1, 5, 30_000)).toBe(false)
    expect(checkRateLimit(key2, 5, 30_000)).toBe(true)
  })
})
