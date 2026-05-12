import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useServiceHealth } from '../useServiceHealth'

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true })
})

describe('useServiceHealth', () => {
  it('returns healthy defaults before first fetch resolves', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useServiceHealth())
    expect(result.current.healthy).toBe(true)
    expect(result.current.ollamaOnline).toBe(true)
    expect(result.current.analyzedCount).toBe(0)
  })

  it('updates to healthy state when fetch succeeds', async () => {
    const payload = {
      ollamaOnline: true,
      lastScraperRun: new Date().toISOString(),
      analyzedCount: 42,
      webhookEnabled: true,
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
    const { result } = renderHook(() => useServiceHealth())
    await waitFor(() => expect(result.current.analyzedCount).toBe(42))
    expect(result.current.ollamaOnline).toBe(true)
    expect(result.current.webhookEnabled).toBe(true)
    expect(result.current.healthy).toBe(true)
  })

  it('marks unhealthy when ollamaOnline is false', async () => {
    const payload = { ollamaOnline: false, lastScraperRun: new Date().toISOString(), analyzedCount: 0, webhookEnabled: false }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
    const { result } = renderHook(() => useServiceHealth())
    await waitFor(() => expect(result.current.ollamaOnline).toBe(false))
    expect(result.current.healthy).toBe(false)
  })

  it('marks unhealthy when scraper run is stale (>45 min ago)', async () => {
    const staleTime = new Date(Date.now() - 50 * 60 * 1000).toISOString()
    const payload = { ollamaOnline: true, lastScraperRun: staleTime, analyzedCount: 5, webhookEnabled: false }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
    const { result } = renderHook(() => useServiceHealth())
    await waitFor(() => expect(result.current.lastScraperRun).toBe(staleTime))
    expect(result.current.healthy).toBe(false)
  })

  it('keeps previous state on fetch error (network failure)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useServiceHealth())
    // Give the hook time to attempt and fail the fetch
    await act(async () => { await Promise.resolve() })
    await act(async () => { await Promise.resolve() })
    // Initial defaults should be retained
    expect(result.current.healthy).toBe(true)
    expect(result.current.ollamaOnline).toBe(true)
  })

  it('skips fetch when document is hidden', async () => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderHook(() => useServiceHealth())
    await act(async () => { await Promise.resolve() })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('resumes polling when tab becomes visible', async () => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true })
    const payload = { ollamaOnline: true, lastScraperRun: new Date().toISOString(), analyzedCount: 7, webhookEnabled: false }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
    renderHook(() => useServiceHealth())
    expect(fetchSpy).not.toHaveBeenCalled()

    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
  })
})
