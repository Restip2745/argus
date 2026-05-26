import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useConflictLayer } from '../useConflictLayer'
import type { ConflictFeatureCollection } from '../useConflictLayer'

const MOCK_GEOJSON: ConflictFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Front A', control: 'frontline' },
      geometry: { type: 'LineString', coordinates: [[30, 50], [31, 51]] },
    },
  ],
}

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true })
})

describe('useConflictLayer', () => {
  it('returns null data and no error/loading when disabled', () => {
    const { result } = renderHook(() => useConflictLayer(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('sets loading=true while fetch is in-flight', async () => {
    let resolve!: (v: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(new Promise(r => { resolve = r }))
    const { result } = renderHook(() => useConflictLayer(true))
    await waitFor(() => expect(result.current.loading).toBe(true))
    // Resolve to avoid open handles
    resolve(new Response(JSON.stringify(MOCK_GEOJSON), { status: 200 }))
  })

  it('populates data on successful fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_GEOJSON), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
    const { result } = renderHook(() => useConflictLayer(true))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data?.features).toHaveLength(1)
    expect(result.current.error).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('sets error=true on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 503 }))
    const { result } = renderHook(() => useConflictLayer(true))
    await waitFor(() => expect(result.current.error).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets error=true on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useConflictLayer(true))
    await waitFor(() => expect(result.current.error).toBe(true))
    expect(result.current.loading).toBe(false)
  })

  it('resets to null/false when disabled after data loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_GEOJSON), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
    const { result, rerender } = renderHook(({ enabled }) => useConflictLayer(enabled), {
      initialProps: { enabled: true },
    })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    rerender({ enabled: false })
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe(false)
  })

  it('skips fetch when document is hidden', async () => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderHook(() => useConflictLayer(true))
    await act(async () => { await Promise.resolve() })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('resumes load when tab becomes visible', async () => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(MOCK_GEOJSON), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )
    renderHook(() => useConflictLayer(true))
    expect(fetchSpy).not.toHaveBeenCalled()

    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))
  })
})
