import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppStore } from '../../store'
import { useSceneTime, readSceneTime } from '../useSceneTime'
import { useFilteredEvents } from '../useFilteredEvents'
import type { ArgusEvent } from '../../types'

const T0 = Date.UTC(2026, 6, 29, 12, 0, 0)
const HOUR = 3_600_000

function evt(id: string, hoursAgo: number, over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id, title: `Event ${id}`, title_zh: null, content: null, summary_zh: null,
    source: 'test', url: 'https://example.com',
    published_at: new Date(T0 - hoursAgo * HOUR).toISOString(),
    fetched_at: new Date(T0 - hoursAgo * HOUR).toISOString(),
    category: 'POLITICAL', intensity: 'LOW',
    location_type: 'geo', location_label: null, lat: null, lng: null, body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: null, heat_score: 0, expires_at: null, last_referenced: null,
    ...over,
  }
}

describe('useSceneTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    useAppStore.setState({ sceneTime: null, events: [] })
  })
  afterEach(() => { vi.useRealTimers() })

  it('follows the wall clock when live', () => {
    const { result } = renderHook(() => useSceneTime())
    expect(result.current.isLive).toBe(true)
    expect(result.current.now).toBe(T0)

    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.now).toBe(T0 + 5000)
  })

  it('freezes at the scrubbed instant and stops following the clock', () => {
    const { result } = renderHook(() => useSceneTime())
    act(() => { useAppStore.getState().setSceneTime(T0 - 3 * HOUR) })

    expect(result.current.isLive).toBe(false)
    expect(result.current.now).toBe(T0 - 3 * HOUR)

    // Reviewing the past means the past holds still.
    act(() => { vi.advanceTimersByTime(30_000) })
    expect(result.current.now).toBe(T0 - 3 * HOUR)
  })

  it('returns to the wall clock on returnToLive', () => {
    const { result } = renderHook(() => useSceneTime())
    act(() => { useAppStore.getState().setSceneTime(T0 - HOUR) })
    act(() => { useAppStore.getState().returnToLive() })

    expect(result.current.isLive).toBe(true)
    expect(result.current.now).toBe(T0)
  })

  it('readSceneTime matches without subscribing', () => {
    expect(readSceneTime()).toBe(T0)
    useAppStore.getState().setSceneTime(T0 - 7 * HOUR)
    expect(readSceneTime()).toBe(T0 - 7 * HOUR)
  })

  it('does not persist across reloads', () => {
    // A monitoring tool must never wake up silently stuck in the past.
    useAppStore.getState().setSceneTime(T0 - 5 * HOUR)
    const persisted = Object.keys(localStorage).filter((k) => /scene|time/i.test(k))
    expect(persisted).toEqual([])
  })
})

describe('rewind semantics in useFilteredEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    useAppStore.setState({
      sceneTime: null,
      hiddenCategories: [], searchQuery: '', showWatchlistOnly: false,
      bookmarkedIds: [], eventSortOrder: 'newest', timeRangeFilter: 'all',
      events: [evt('old', 10), evt('mid', 4), evt('fresh', 0.5)],
    })
  })
  afterEach(() => { vi.useRealTimers() })

  it('shows everything when live', () => {
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current.map((e) => e.id).sort()).toEqual(['fresh', 'mid', 'old'])
  })

  it('hides events that had not happened yet at the scrubbed instant', () => {
    const { result } = renderHook(() => useFilteredEvents())
    act(() => { useAppStore.getState().setSceneTime(T0 - 2 * HOUR) })

    // 'fresh' is 30 minutes old — it does not exist two hours ago.
    expect(result.current.map((e) => e.id).sort()).toEqual(['mid', 'old'])
  })

  it('measures the time-range window from scene time, not the wall clock', () => {
    useAppStore.setState({ timeRangeFilter: '6h' })
    const { result } = renderHook(() => useFilteredEvents())
    // Live: last 6h contains mid (4h) and fresh (0.5h).
    expect(result.current.map((e) => e.id).sort()).toEqual(['fresh', 'mid'])

    act(() => { useAppStore.getState().setSceneTime(T0 - 5 * HOUR) })
    // Rewound 5h: the window is now 11h..5h ago, which holds old (10h) only —
    // mid is 4h old and so still in the future at that instant.
    expect(result.current.map((e) => e.id)).toEqual(['old'])
  })

  it('restores the full view on returnToLive', () => {
    const { result } = renderHook(() => useFilteredEvents())
    act(() => { useAppStore.getState().setSceneTime(T0 - 8 * HOUR) })
    expect(result.current.map((e) => e.id)).toEqual(['old'])

    act(() => { useAppStore.getState().returnToLive() })
    expect(result.current.map((e) => e.id).sort()).toEqual(['fresh', 'mid', 'old'])
  })
})
