import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAppStore } from '../../store'
import { useFilteredEvents } from '../useFilteredEvents'
import type { ArgusEvent } from '../../types'

function makeEvent(overrides: Partial<ArgusEvent> & Pick<ArgusEvent, 'id'>): ArgusEvent {
  return {
    id:             overrides.id,
    title:          overrides.title ?? `Event ${overrides.id}`,
    title_zh:       null,
    content:        overrides.content ?? null,
    summary_zh:     null,
    source:         'test',
    url:            'https://example.com',
    published_at:   overrides.published_at ?? new Date().toISOString(),
    fetched_at:     new Date().toISOString(),
    category:       overrides.category ?? 'POLITICAL',
    intensity:      overrides.intensity ?? 'MODERATE',
    location_type:  'geo',
    location_label: null,
    lat:            null,
    lng:            null,
    body:           null,
    actors:         overrides.actors ?? [],
    tags:           overrides.tags ?? [],
    sources_count:  1,
    reliability:    'MEDIUM',
    heat_score:     overrides.heat_score ?? 1.0,
    expires_at:     null,
    last_referenced: null,
  }
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString()
}

function resetStore(partial: {
  events?: ArgusEvent[]
  hiddenCategories?: string[]
  timeRangeFilter?: '6h' | '12h' | '24h' | 'all'
  searchQuery?: string
  bookmarkedIds?: string[]
  showWatchlistOnly?: boolean
}) {
  useAppStore.setState((s) => ({
    ...s,
    events: [],
    hiddenCategories: [],
    timeRangeFilter: 'all' as const,
    searchQuery: '',
    bookmarkedIds: [],
    showWatchlistOnly: false,
    ...partial,
  }))
}

describe('useFilteredEvents', () => {
  beforeEach(() => resetStore({}))

  it('returns all events when no filters are active', () => {
    const evts = [makeEvent({ id: '1' }), makeEvent({ id: '2' })]
    resetStore({ events: evts })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(2)
  })

  it('excludes events in hidden categories', () => {
    const evts = [
      makeEvent({ id: '1', category: 'POLITICAL' }),
      makeEvent({ id: '2', category: 'ECONOMIC' }),
    ]
    resetStore({ events: evts, hiddenCategories: ['POLITICAL'] })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe('2')
  })

  it('filters by 6h time range', () => {
    const evts = [
      makeEvent({ id: 'recent', published_at: hoursAgo(1) }),
      makeEvent({ id: 'old',    published_at: hoursAgo(10) }),
    ]
    resetStore({ events: evts, timeRangeFilter: '6h' })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current.map((e) => e.id)).toContain('recent')
    expect(result.current.map((e) => e.id)).not.toContain('old')
  })

  it('returns all events for "all" time range', () => {
    const evts = [
      makeEvent({ id: 'recent', published_at: hoursAgo(1) }),
      makeEvent({ id: 'old',    published_at: hoursAgo(100) }),
    ]
    resetStore({ events: evts, timeRangeFilter: 'all' })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(2)
  })

  it('filters by search query in title', () => {
    const evts = [
      makeEvent({ id: '1', title: 'Ukraine conflict update' }),
      makeEvent({ id: '2', title: 'Economic summit in Tokyo' }),
    ]
    resetStore({ events: evts, searchQuery: 'ukraine' })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe('1')
  })

  it('filters by search query in actors', () => {
    const evts = [
      makeEvent({ id: '1', actors: ['Putin', 'Zelensky'] }),
      makeEvent({ id: '2', actors: ['Biden'] }),
    ]
    resetStore({ events: evts, searchQuery: 'putin' })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe('1')
  })

  it('filters by search query in tags', () => {
    const evts = [
      makeEvent({ id: '1', tags: ['nato', 'military'] }),
      makeEvent({ id: '2', tags: ['economy'] }),
    ]
    resetStore({ events: evts, searchQuery: 'nato' })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe('1')
  })

  it('returns only bookmarked events when watchlist is active', () => {
    const evts = [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })]
    resetStore({ events: evts, bookmarkedIds: ['a'], showWatchlistOnly: true })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe('a')
  })

  it('sorts events by published_at descending', () => {
    const evts = [
      makeEvent({ id: 'old',    published_at: hoursAgo(5) }),
      makeEvent({ id: 'recent', published_at: hoursAgo(1) }),
    ]
    resetStore({ events: evts })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current[0].id).toBe('recent')
    expect(result.current[1].id).toBe('old')
  })

  it('combined: category + search filters both apply', () => {
    const evts = [
      makeEvent({ id: '1', category: 'POLITICAL', title: 'Election news' }),
      makeEvent({ id: '2', category: 'ECONOMIC',  title: 'Election impact on markets' }),
      makeEvent({ id: '3', category: 'POLITICAL', title: 'Summit meeting' }),
    ]
    resetStore({ events: evts, hiddenCategories: ['ECONOMIC'], searchQuery: 'election' })
    const { result } = renderHook(() => useFilteredEvents())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].id).toBe('1')
  })
})
