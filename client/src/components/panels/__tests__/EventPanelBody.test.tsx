import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { EventPanelBody } from '../EventPanelBody'
import type { ArgusEvent } from '../../../types'

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
    location_type: 'geo', location_label: 'Taiwan', lat: 25, lng: 121, body: null,
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
