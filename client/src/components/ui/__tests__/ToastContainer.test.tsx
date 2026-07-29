import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { useAppStore } from '../../../store'
import { ToastContainer } from '../ToastContainer'
import type { ArgusEvent } from '../../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

function evt(id: string, over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id, title: `Title ${id}`, title_zh: null, content: null, summary_zh: null,
    source: 'test', url: 'https://example.com',
    published_at: new Date().toISOString(), fetched_at: new Date().toISOString(),
    category: 'ARMED_CONFLICT', intensity: 'HIGH',
    location_type: 'geo', location_label: null, lat: null, lng: null, body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: null, heat_score: 0, expires_at: null, last_referenced: null,
    ...over,
  }
}

/** Hydrate the store the way the REST load does, so arrivals are detectable. */
function hydrate(events: ArgusEvent[] = [evt('seed', { intensity: 'LOW' })]) {
  act(() => { useAppStore.setState({ events }) })
}

function arrive(...events: ArgusEvent[]) {
  act(() => {
    useAppStore.setState((s) => ({ events: [...events, ...s.events] }))
  })
}

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    useAppStore.setState({ events: [], activePanelId: null })
  })
  afterEach(() => { vi.useRealTimers() })

  it('stays silent through the initial bulk load', () => {
    render(<ToastContainer />)
    hydrate([evt('a', { intensity: 'CRITICAL' }), evt('b')])
    expect(screen.queryByRole('button', { name: /Title/ })).toBeNull()
  })

  it('raises a toast for a CRITICAL arrival', () => {
    render(<ToastContainer />)
    hydrate()
    arrive(evt('new1', { intensity: 'CRITICAL' }))
    expect(screen.getByRole('button', { name: /Title new1/ })).toBeTruthy()
  })

  it('ignores arrivals below HIGH', () => {
    render(<ToastContainer />)
    hydrate()
    arrive(evt('quiet', { intensity: 'MODERATE' }))
    expect(screen.queryByRole('button', { name: /Title quiet/ })).toBeNull()
  })

  it('opens the event when the card is clicked, and clears itself', () => {
    render(<ToastContainer />)
    hydrate()
    arrive(evt('open-me', { intensity: 'CRITICAL' }))

    fireEvent.click(screen.getByRole('button', { name: /Title open-me/ }))

    expect(useAppStore.getState().activePanelId).toBe('open-me')
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.queryByRole('button', { name: /Title open-me/ })).toBeNull()
  })

  it('opens on Enter as well as click', () => {
    render(<ToastContainer />)
    hydrate()
    arrive(evt('key-me', { intensity: 'CRITICAL' }))

    fireEvent.keyDown(screen.getByRole('button', { name: /Title key-me/ }), { key: 'Enter' })
    expect(useAppStore.getState().activePanelId).toBe('key-me')
  })

  it('dismisses without opening when the ✕ is used', () => {
    render(<ToastContainer />)
    hydrate()
    arrive(evt('dismiss-me', { intensity: 'CRITICAL' }))

    fireEvent.click(screen.getByLabelText('Dismiss'))

    // The close control must not fall through to the card underneath it.
    expect(useAppStore.getState().activePanelId).toBeNull()
    act(() => { vi.advanceTimersByTime(400) })
    expect(screen.queryByRole('button', { name: /Title dismiss-me/ })).toBeNull()
  })

  it('auto-dismisses on its own', () => {
    render(<ToastContainer />)
    hydrate()
    arrive(evt('fleeting', { intensity: 'CRITICAL' }))
    expect(screen.getByRole('button', { name: /Title fleeting/ })).toBeTruthy()

    act(() => { vi.advanceTimersByTime(3400) })
    expect(screen.queryByRole('button', { name: /Title fleeting/ })).toBeNull()
  })

  it('holds while hovered, so it cannot vanish on the way to being clicked', () => {
    render(<ToastContainer />)
    hydrate()
    arrive(evt('hold-me', { intensity: 'CRITICAL' }))

    const card = screen.getByRole('button', { name: /Title hold-me/ })
    fireEvent.mouseEnter(card)
    act(() => { vi.advanceTimersByTime(10_000) })   // well past the 3s life
    expect(screen.getByRole('button', { name: /Title hold-me/ })).toBeTruthy()

    fireEvent.mouseLeave(card)
    act(() => { vi.advanceTimersByTime(3400) })
    expect(screen.queryByRole('button', { name: /Title hold-me/ })).toBeNull()
  })

  it('makes a merged toast represent the worst of its group', () => {
    render(<ToastContainer />)
    hydrate()

    arrive(evt('high-one', { intensity: 'HIGH' }))
    arrive(evt('crit-one', { intensity: 'CRITICAL' }))

    // Same category, so they merge. The card must stand for the CRITICAL.
    const card = screen.getByRole('button', { name: /CRITICAL/ })
    fireEvent.click(card)
    expect(useAppStore.getState().activePanelId).toBe('crit-one')
  })

  it('does not downgrade a merged toast when a milder event follows', () => {
    render(<ToastContainer />)
    hydrate()

    arrive(evt('crit-first', { intensity: 'CRITICAL' }))
    arrive(evt('high-after', { intensity: 'HIGH' }))

    fireEvent.click(screen.getByRole('button', { name: /CRITICAL/ }))
    expect(useAppStore.getState().activePanelId).toBe('crit-first')
  })
})
