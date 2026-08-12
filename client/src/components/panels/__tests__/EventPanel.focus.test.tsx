import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { EventPanel } from '../EventPanel'
import { useAppStore } from '../../../store'
import type { ArgusEvent } from '../../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

// The panel's supporting cast, stubbed: this file is about which event the
// camera is sent to, and nothing else in the panel bears on that.
vi.mock('../../../hooks/usePopoutWindow', () => ({
  usePopoutWindow: () => ({ open: vi.fn(), isPopped: false }),
}))
vi.mock('../../../hooks/useAgentQuery', () => ({
  useAgentQuery: () => ({ history: [], loading: false, error: null, ask: vi.fn() }),
}))
vi.mock('../../../hooks/useRelatedEvents', () => ({
  useRelatedEvents: () => ({ events: [], loading: false }),
}))
vi.mock('../../../hooks/usePanelDrag', () => ({
  usePanelDrag: () => ({
    panelRef: { current: null }, pos: { x: 0, y: 0 }, dragging: false,
    onHeaderMouseDown: vi.fn(), zIndex: 1, handleBringToFront: vi.fn(), uiScale: 1,
  }),
}))
vi.mock('../EventTimeline', () => ({ EventTimeline: () => null }))
vi.mock('../EventPanelBody', () => ({ EventPanelBody: () => null }))
vi.mock('../PanelTail', () => ({ PanelTail: () => null }))
vi.mock('../Panel', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function makeEvent(over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id: 'a', title: 'A', title_zh: null, content: null, summary_zh: null, summary_en: null,
    source: 'test', url: 'https://example.com/a',
    published_at: new Date().toISOString(), fetched_at: new Date().toISOString(),
    category: 'POLITICAL', intensity: 'HIGH',
    location_type: 'geo', location_label: 'Taipei', lat: 25, lng: 121,
    geo_precision: 'exact', body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: null, heat_score: 1, expires_at: null, last_referenced: null,
    ...over,
  }
}

const TAIPEI = makeEvent({ id: 'a', title: 'Taipei event', lat: 25, lng: 121 })
const SYDNEY = makeEvent({ id: 'b', title: 'Sydney event', lat: -33, lng: 151 })

beforeEach(() => cleanup())

describe('EventPanel camera focus', () => {
  it('flies to the event just selected, not the one being slid out', () => {
    // The regression this file exists for. `displayedEventId` is animation
    // state, assigned from activePanelId inside an effect, so for one commit
    // after a selection it still names the outgoing event. Focusing on it sent
    // the camera to the previously selected event every time: the panel showed
    // one place while the globe flew to another.
    const focus = vi.fn()
    useAppStore.setState({
      events: [TAIPEI, SYDNEY], activePanelId: 'a', focusOnEarthSurface: focus,
    })
    render(<EventPanel />)
    expect(focus).toHaveBeenLastCalledWith(25, 121)

    act(() => { useAppStore.setState({ activePanelId: 'b' }) })
    expect(focus).toHaveBeenLastCalledWith(-33, 151)

    act(() => { useAppStore.setState({ activePanelId: 'a' }) })
    expect(focus).toHaveBeenLastCalledWith(25, 121)
  })

  it('focuses once per selection, not on every re-render', () => {
    const focus = vi.fn()
    useAppStore.setState({
      events: [TAIPEI, SYDNEY], activePanelId: 'a', focusOnEarthSurface: focus,
    })
    const { rerender } = render(<EventPanel />)
    expect(focus).toHaveBeenCalledTimes(1)

    // A store update that does not change which event is active — an arriving
    // article, say — must not yank the camera back.
    act(() => { useAppStore.setState({ events: [TAIPEI, SYDNEY, makeEvent({ id: 'c' })] }) })
    rerender(<EventPanel />)
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('sends an off-Earth event to its body instead of a lat/lng', () => {
    const focus = vi.fn()
    const focusOn = vi.fn()
    const mars = makeEvent({
      id: 'm', location_type: 'orbital', lat: null, lng: null, body: 'mars',
    })
    useAppStore.setState({
      events: [mars], activePanelId: 'm', focusOnEarthSurface: focus, focusOn,
    })
    render(<EventPanel />)
    expect(focus).not.toHaveBeenCalled()
    expect(focusOn).toHaveBeenCalledWith('mars')
  })

  it('does nothing for an event that names no place at all', () => {
    const focus = vi.fn()
    const focusOn = vi.fn()
    const nowhere = makeEvent({ id: 'n', lat: null, lng: null, body: null })
    useAppStore.setState({
      events: [nowhere], activePanelId: 'n', focusOnEarthSurface: focus, focusOn,
    })
    render(<EventPanel />)
    expect(focus).not.toHaveBeenCalled()
    expect(focusOn).not.toHaveBeenCalled()
  })
})
