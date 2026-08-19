import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { EventPanelBody } from '../EventPanelBody'
import type { ArgusEvent } from '../../../types'
import { useAppStore } from '../../../store'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

const IMG = 'https://example.com/lead.jpg'

function makeEvent(over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id: 'e1', title: 'Hundreds of thousands rally in Taipei',
    title_zh: null, content: 'Body copy.', summary_zh: null, summary_en: null,
    source: 'CNA Asia', url: 'https://example.com/article',
    published_at: new Date().toISOString(), fetched_at: new Date().toISOString(),
    category: 'SOCIAL', intensity: 'HIGH',
    location_type: 'geo', location_label: 'Taiwan', lat: 25, lng: 121, geo_precision: 'exact', body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: IMG, heat_score: 1, expires_at: null, last_referenced: null,
    ...over,
  }
}

function renderBody(event: ArgusEvent) {
  return render(
    <EventPanelBody
      event={event}
      accentColor="#ff9500"
      onFocus={() => {}}
      canFocus={false}
      setSelectedCountry={() => {}}
      agentHistory={[]}
      agentLoading={false}
      agentError={null}
      agentInput=""
      setAgentInput={() => {}}
      suggestedQueries={[]}
      agentContext=""
      agentAsk={() => {}}
      agentScrollRef={createRef<HTMLDivElement>()}
      hideAgent
    />,
  )
}

describe('EventPanelBody lead image', () => {
  beforeEach(() => cleanup())

  it('renders the article image exactly once', () => {
    // It was rendered twice — a 16:9 banner at the top and a second thumbnail
    // further down — so every article with artwork showed the same picture
    // twice in one panel.
    const { container } = renderBody(makeEvent())
    const imgs = [...container.querySelectorAll('img')].filter((i) => i.getAttribute('src') === IMG)
    expect(imgs).toHaveLength(1)
  })

  it('keeps the banner treatment rather than the inline thumbnail', () => {
    // The surviving copy is the one that carries the attributes that make it
    // load at all: many news CDNs reject hotlinks without a blank referrer.
    const { container } = renderBody(makeEvent())
    const img = container.querySelector(`img[src="${IMG}"]`)
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(img?.getAttribute('loading')).toBe('lazy')
  })

  it('renders no image at all when the event has none', () => {
    const { container } = renderBody(makeEvent({ image_url: null }))
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})

describe('EventPanelBody video embed', () => {
  beforeEach(() => cleanup())

  const video = () => makeEvent({
    source: 'Reuters',
    url: 'https://www.youtube.com/watch?v=ihHVOFqL_ew',
    image_url: 'https://i2.ytimg.com/vi/ihHVOFqL_ew/hqdefault.jpg',
  })

  it('shows a play control on a video event', () => {
    const { getByLabelText } = renderBody(video())
    expect(getByLabelText('Play video')).toBeTruthy()
  })

  it('contacts nobody until the user asks to play', () => {
    // The whole point of the facade: ARGUS promises nothing leaves the machine,
    // so merely opening a panel must not mount a Google-hosted iframe.
    const { container } = renderBody(video())
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('mounts the nocookie player once play is clicked', () => {
    const { getByLabelText, container } = renderBody(video())
    fireEvent.click(getByLabelText('Play video'))
    const frame = container.querySelector('iframe')
    expect(frame?.getAttribute('src')).toContain('youtube-nocookie.com/embed/ihHVOFqL_ew')
  })

  it('replaces the thumbnail rather than stacking below it', () => {
    const { getByLabelText, container } = renderBody(video())
    fireEvent.click(getByLabelText('Play video'))
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('leaves ordinary article events untouched', () => {
    const { queryByLabelText, container } = renderBody(makeEvent())
    expect(queryByLabelText('Play video')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })
})

// ── Agent section ─────────────────────────────────────────────────────────────

function renderWithAgent(over: Partial<Parameters<typeof EventPanelBody>[0]> = {}) {
  return render(
    <EventPanelBody
      event={makeEvent()}
      accentColor="#ff9500"
      onFocus={() => {}}
      canFocus={false}
      setSelectedCountry={() => {}}
      agentHistory={[]}
      agentLoading={false}
      agentError={null}
      agentInput=""
      setAgentInput={() => {}}
      suggestedQueries={[]}
      agentContext="ctx"
      agentAsk={() => {}}
      agentScrollRef={createRef<HTMLDivElement>()}
      {...over}
    />,
  )
}

// The i18n stub returns the inline default when one is given, so these are
// the literal strings the component falls back to.
const ASK_PLACEHOLDER = '詢問情報分析...'
const AGENT_HEADER    = '◈ INTELLIGENCE AGENT'

describe('EventPanelBody agent section', () => {
  beforeEach(() => {
    cleanup()
    useAppStore.setState({ agentSectionOpen: true })
  })

  it('follows the stored preference on open', () => {
    // The agent is the longest thing in the panel. Someone who put it away
    // meant it for every event, not just the one they were reading.
    useAppStore.setState({ agentSectionOpen: false })
    const { queryByPlaceholderText, getByText } = renderWithAgent()
    expect(queryByPlaceholderText(ASK_PLACEHOLDER)).toBeNull()
    expect(getByText(AGENT_HEADER)).toBeTruthy()   // header survives collapse
  })

  it('writes the preference through when toggled', () => {
    const { getByText, queryByPlaceholderText } = renderWithAgent()
    fireEvent.click(getByText(AGENT_HEADER))
    expect(queryByPlaceholderText(ASK_PLACEHOLDER)).toBeNull()
    expect(useAppStore.getState().agentSectionOpen).toBe(false)
  })

  it('counts the answers it is hiding', () => {
    useAppStore.setState({ agentSectionOpen: false })
    const { getByText } = renderWithAgent({
      agentHistory: [
        { kind: 'answer', id: '1', question: 'q1', html: 'a1', streaming: false },
        { kind: 'answer', id: '2', question: 'q2', html: 'a2', streaming: false },
      ],
    })
    expect(getByText('2')).toBeTruthy()
  })

  it('opens itself when a suggested query is asked from outside it', () => {
    // The suggested-query buttons sit above the section and can be pressed
    // while it is shut; an answer the reader cannot see is the one outcome
    // collapsing must not produce.
    useAppStore.setState({ agentSectionOpen: false })
    const asked: string[] = []
    const { getByText, queryByPlaceholderText } = renderWithAgent({
      suggestedQueries: ['What changed?'],
      agentAsk: (q: string) => asked.push(q),
    })
    expect(queryByPlaceholderText(ASK_PLACEHOLDER)).toBeNull()
    fireEvent.click(getByText('What changed?'))
    expect(asked).toEqual(['What changed?'])
    expect(queryByPlaceholderText(ASK_PLACEHOLDER)).toBeTruthy()
    // …without overriding the preference, which was about the section, not
    // about this one question.
    expect(useAppStore.getState().agentSectionOpen).toBe(false)
  })
})
