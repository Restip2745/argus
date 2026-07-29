import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppStore } from '../../store'
import { useEventArrivals } from '../useEventArrivals'
import type { ArgusEvent } from '../../types'

function makeEvent(id: string, intensity: ArgusEvent['intensity'] = 'LOW'): ArgusEvent {
  return {
    id, title: `Event ${id}`, title_zh: null, content: null, summary_zh: null,
    source: 'test', url: 'https://example.com',
    published_at: new Date().toISOString(), fetched_at: new Date().toISOString(),
    category: 'POLITICAL', intensity,
    location_type: 'geo', location_label: null, lat: null, lng: null, body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: null, heat_score: 0, expires_at: null, last_referenced: null,
  }
}

describe('useEventArrivals', () => {
  beforeEach(() => {
    useAppStore.setState({ events: [] })
  })

  it('does not report the initial bulk load as arrivals', () => {
    const { result } = renderHook(() => useEventArrivals())

    act(() => {
      // The REST hydration replaces the whole array in one go.
      useAppStore.setState({ events: [makeEvent('a', 'CRITICAL'), makeEvent('b', 'HIGH')] })
    })

    expect(result.current.gen).toBe(0)
    expect(result.current.events).toEqual([])
  })

  it('reports events that appear after hydration', () => {
    const { result } = renderHook(() => useEventArrivals())

    act(() => { useAppStore.setState({ events: [makeEvent('a')] }) })
    expect(result.current.gen).toBe(0)

    act(() => {
      useAppStore.setState({ events: [makeEvent('b', 'HIGH'), makeEvent('a')] })
    })

    expect(result.current.gen).toBe(1)
    expect(result.current.events.map((e) => e.id)).toEqual(['b'])
    expect(result.current.peak).toBe('HIGH')
  })

  it('reports the batch peak severity, not the first arrival', () => {
    const { result } = renderHook(() => useEventArrivals())

    act(() => { useAppStore.setState({ events: [makeEvent('a')] }) })
    act(() => {
      useAppStore.setState({
        events: [makeEvent('low', 'LOW'), makeEvent('crit', 'CRITICAL'), makeEvent('a')],
      })
    })

    expect(result.current.events).toHaveLength(2)
    expect(result.current.peak).toBe('CRITICAL')
  })

  it('advances gen on each batch so consumers can fire once per arrival', () => {
    const { result } = renderHook(() => useEventArrivals())

    act(() => { useAppStore.setState({ events: [makeEvent('a')] }) })
    act(() => { useAppStore.setState({ events: [makeEvent('b'), makeEvent('a')] }) })
    const first = result.current.gen
    act(() => { useAppStore.setState({ events: [makeEvent('c'), makeEvent('b'), makeEvent('a')] }) })

    expect(result.current.gen).toBe(first + 1)
    expect(result.current.events.map((e) => e.id)).toEqual(['c'])
  })

  it('ignores re-renders that add no new ids', () => {
    const { result } = renderHook(() => useEventArrivals())

    act(() => { useAppStore.setState({ events: [makeEvent('a')] }) })
    act(() => { useAppStore.setState({ events: [makeEvent('b'), makeEvent('a')] }) })
    const gen = result.current.gen

    act(() => {
      // Same ids, new array identity — e.g. a sort or an unrelated store write.
      useAppStore.setState({ events: [makeEvent('a'), makeEvent('b')] })
    })

    expect(result.current.gen).toBe(gen)
  })

  it('treats removals as non-events', () => {
    const { result } = renderHook(() => useEventArrivals())

    act(() => { useAppStore.setState({ events: [makeEvent('a'), makeEvent('b')] }) })
    act(() => { useAppStore.setState({ events: [makeEvent('a')] }) })

    expect(result.current.gen).toBe(0)
  })
})
