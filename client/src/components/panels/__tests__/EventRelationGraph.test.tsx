import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EventRelationGraph } from '../EventRelationGraph'
import { useAppStore } from '../../../store'
import type { ArgusEvent } from '../../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

const related = vi.hoisted(() => ({ events: [] as ArgusEvent[], loading: false }))

vi.mock('../../../hooks/useRelatedEvents', () => ({
  useRelatedEvents: () => related,
}))

function evt(id: string, title: string, over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id, title, title_zh: null, content: null, summary_zh: null,
    source: 'test', url: 'https://example.com',
    published_at: new Date(Date.now() - 3_600_000).toISOString(),
    fetched_at: new Date().toISOString(),
    category: 'ARMED_CONFLICT', intensity: 'HIGH',
    location_type: 'geo', location_label: null, lat: null, lng: null, body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: null, heat_score: 0, expires_at: null, last_referenced: null,
    ...over,
  }
}

/** Eight long titles — the case that produced the overlapping pile-up. */
const EIGHT = Array.from({ length: 8 }, (_, i) =>
  evt(`r${i}`, `Related event number ${i} with a deliberately long headline`),
)

function renderGraph() {
  return render(<EventRelationGraph eventId="main" accentColor="#ff9500" />)
}

describe('EventRelationGraph', () => {
  beforeEach(() => {
    cleanup()
    related.events = EIGHT
    related.loading = false
    useAppStore.setState({ activePanelId: null })
  })

  it('does not paint titles into the graph area', () => {
    // The titles used to be foreignObject labels pinned under each node. Eight
    // 60px labels cannot fit 276px of orbit circumference, so they overlapped
    // each other and spilled outside the SVG.
    //
    // <title> does not count: it is the native tooltip, never painted.
    const { container } = renderGraph()
    const svg = container.querySelector('svg')!
    expect(svg.querySelectorAll('foreignObject')).toHaveLength(0)

    const painted = [...svg.querySelectorAll('text')].map((n) => n.textContent).join(' ')
    expect(painted).not.toContain('Related event number 0')
  })

  it('clips to its own box instead of overflowing the panel', () => {
    const { container } = renderGraph()
    const svg = container.querySelector('svg')!
    expect(svg.style.overflow).toBe('hidden')
  })

  it('reveals a title on hover, in one shared slot', () => {
    const { container } = renderGraph()
    const caption = () => container.querySelector('[aria-live="polite"]')!.textContent ?? ''
    const nodes = container.querySelectorAll('g[role="button"]')
    expect(nodes).toHaveLength(8)

    fireEvent.mouseEnter(nodes[2])
    expect(caption()).toContain('Related event number 2')

    // Moving to another node replaces the caption rather than adding to it —
    // one slot is what makes collisions impossible.
    fireEvent.mouseLeave(nodes[2])
    fireEvent.mouseEnter(nodes[5])
    expect(caption()).not.toContain('Related event number 2')
    expect(caption()).toContain('Related event number 5')
  })

  it('holds the caption slot open so revealing a title cannot shift the layout', () => {
    const { container } = renderGraph()
    const caption = container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(caption.style.minHeight).toBeTruthy()
  })

  it('keeps every title reachable without hover, via a native tooltip', () => {
    const { container } = renderGraph()
    const titles = [...container.querySelectorAll('svg title')].map((n) => n.textContent)
    expect(titles).toHaveLength(8)
    expect(titles[0]).toContain('Related event number 0')
  })

  it('opens the event on click and on Enter', () => {
    const { container } = renderGraph()
    const nodes = container.querySelectorAll('g[role="button"]')

    fireEvent.click(nodes[1])
    expect(useAppStore.getState().activePanelId).toBe('r1')

    fireEvent.keyDown(nodes[3], { key: 'Enter' })
    expect(useAppStore.getState().activePanelId).toBe('r3')
  })

  it('reports the true total even when the graph caps the nodes drawn', () => {
    related.events = Array.from({ length: 12 }, (_, i) => evt(`x${i}`, `Event ${i}`))
    const { container } = renderGraph()
    expect(container.querySelectorAll('g[role="button"]')).toHaveLength(8)
    expect(screen.getByText(/\(12\)/)).toBeTruthy()
  })

  it('renders nothing when there is nothing related', () => {
    related.events = []
    const { container } = renderGraph()
    expect(container.firstChild).toBeNull()
  })
})
