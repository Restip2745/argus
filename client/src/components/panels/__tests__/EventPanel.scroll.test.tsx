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
vi.mock('../PanelTail', () => ({ PanelTail: () => null }))
vi.mock('../Panel', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function makeEvent(over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id: 'a', title: 'A', title_zh: null, content: 'Body copy.', summary_zh: null, summary_en: null,
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

beforeEach(() => cleanup())

/**
 * The panel's body scrolls only if a height reaches it.
 *
 * jsdom does no layout, so this cannot assert on a scrollbar. What it can
 * assert is the property chain that produces one — which is exactly what broke:
 * the slide-animation wrapper between the height-capped clip container and the
 * scrolling body was a plain `<div>`, so it sized itself to its content and
 * grew straight past the container. The body's `height: 100%` resolved against
 * that auto height, its `overflow-y` had nothing to overflow, and the clip
 * container's `overflow: hidden` cut the rest off with no scrollbar to say so.
 *
 * The rule, then: every element between the capped container and the scroll
 * root must be allowed to shrink below its content.
 */
describe('EventPanel body scroll chain', () => {
  it('lets a height reach the scrolling body instead of clipping it', () => {
    act(() => {
      useAppStore.setState({ events: [makeEvent()], activePanelId: 'a' })
    })
    const { container } = render(<EventPanel />)

    const clip = [...container.querySelectorAll<HTMLElement>('div')]
      .find((el) => el.style.height.startsWith('calc('))
    expect(clip, 'the height-capped clip container').toBeTruthy()
    expect(clip!.style.display).toBe('flex')
    expect(clip!.style.flexDirection).toBe('column')

    const scrollRoot = clip!.querySelector<HTMLElement>('div[style*="overflow-y: auto"]')
    expect(scrollRoot, 'the scrolling body').toBeTruthy()

    for (let el = scrollRoot!; el !== clip; el = el.parentElement as HTMLElement) {
      expect(
        el.style.minHeight,
        `${el.className || 'wrapper'} would grow past the clip container`,
      ).toBe('0px')
    }
  })
})
