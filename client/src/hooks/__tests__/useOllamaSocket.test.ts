import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppStore } from '../../store'
import type { ArgusEvent } from '../../types'

// ── Mock socket.io-client ─────────────────────────────────────────────────────

type Handler = (...args: unknown[]) => void

function makeMockSocket() {
  const _handlers: Record<string, Handler> = {}
  const socket = {
    on:         vi.fn((event: string, handler: Handler) => { _handlers[event] = handler; return socket }),
    disconnect: vi.fn(),
    id:         'mock-socket-id',
    // Helper to simulate an inbound socket event from the server
    _trigger:   (event: string, ...args: unknown[]) => _handlers[event]?.(...args),
  }
  return socket
}

let currentMockSocket = makeMockSocket()
const ioMock = vi.fn(() => currentMockSocket)

vi.mock('socket.io-client', () => ({ io: ioMock }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(id: string): ArgusEvent {
  return {
    id,
    title: `Event ${id}`,
    title_zh: null,
    content: null,
    summary_zh: null,
    source: 'test',
    url: 'https://example.com',
    published_at: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
    category: 'POLITICAL',
    intensity: 'MODERATE',
    location_type: 'geo',
    location_label: null,
    lat: null,
    lng: null,
    body: null,
    actors: [],
    tags: [],
    sources_count: 1,
    reliability: 'MEDIUM',
    heat_score: 1.0,
    expires_at: null,
    last_referenced: null,
  }
}

function mockFetch(data: unknown, ok = true) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

function resetStore() {
  useAppStore.setState((s) => ({
    ...s,
    events: [],
    eventsLoaded: false,
    socketConnected: false,
    intelBrief: null,
  }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  currentMockSocket = makeMockSocket()
  ioMock.mockReturnValue(currentMockSocket)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  resetStore()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Lazy import so the vi.mock above is in scope when the module is evaluated
async function renderSocket() {
  const { useOllamaSocket } = await import('../useOllamaSocket')
  return renderHook(() => useOllamaSocket())
}

describe('useOllamaSocket', () => {
  it('fetches events on mount and sets eventsLoaded', async () => {
    const events = [makeEvent('evt-1'), makeEvent('evt-2')]
    mockFetch(events)

    await act(async () => { await renderSocket() })

    await waitFor(() => expect(useAppStore.getState().eventsLoaded).toBe(true))
    expect(useAppStore.getState().events).toHaveLength(2)
    expect(useAppStore.getState().events[0].id).toBe('evt-1')
  })

  it('sets eventsLoaded even when the initial fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    await act(async () => { await renderSocket() })

    await waitFor(() => expect(useAppStore.getState().eventsLoaded).toBe(true))
  })

  it('sets socketConnected=true on connect event', async () => {
    mockFetch([])

    await act(async () => { await renderSocket() })
    await act(async () => { currentMockSocket._trigger('connect') })

    expect(useAppStore.getState().socketConnected).toBe(true)
  })

  it('sets socketConnected=false on disconnect event', async () => {
    mockFetch([])

    await act(async () => { await renderSocket() })
    await act(async () => {
      currentMockSocket._trigger('connect')
      currentMockSocket._trigger('disconnect')
    })

    expect(useAppStore.getState().socketConnected).toBe(false)
  })

  it('adds a new event on new_event socket message', async () => {
    mockFetch([])

    await act(async () => { await renderSocket() })
    await waitFor(() => expect(useAppStore.getState().eventsLoaded).toBe(true))

    const newEvent = makeEvent('evt-new')
    await act(async () => { currentMockSocket._trigger('new_event', newEvent) })

    expect(useAppStore.getState().events.some(e => e.id === 'evt-new')).toBe(true)
  })

  it('deduplicates events — adding the same id twice does not grow the list', async () => {
    mockFetch([])

    await act(async () => { await renderSocket() })
    await waitFor(() => expect(useAppStore.getState().eventsLoaded).toBe(true))

    const event = makeEvent('evt-dup')
    await act(async () => {
      currentMockSocket._trigger('new_event', event)
      currentMockSocket._trigger('new_event', event)
    })

    const ids = useAppStore.getState().events.map(e => e.id).filter(id => id === 'evt-dup')
    expect(ids).toHaveLength(1)
  })

  it('updates intelBrief on intel_brief socket message', async () => {
    mockFetch([])

    await act(async () => { await renderSocket() })

    const brief = { id: 'brief-1', summary: 'Test brief', generatedAt: new Date().toISOString(), topEventIds: [] }
    await act(async () => { currentMockSocket._trigger('intel_brief', brief) })

    expect(useAppStore.getState().intelBrief?.id).toBe('brief-1')
  })

  it('re-fetches events on reconnect', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    )

    await act(async () => { await renderSocket() })
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    await act(async () => { currentMockSocket._trigger('reconnect') })
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
  })

  it('disconnects the socket on unmount', async () => {
    mockFetch([])

    const { unmount } = await act(async () => renderSocket())
    await waitFor(() => expect(useAppStore.getState().eventsLoaded).toBe(true))

    unmount()
    expect(currentMockSocket.disconnect).toHaveBeenCalledOnce()
  })
})
