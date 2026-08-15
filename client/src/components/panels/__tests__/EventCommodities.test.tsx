import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EventCommodities } from '../EventCommodities'
import { useAppStore } from '../../../store'
import type { Quote } from '../../../hooks/useQuotes'
import type { ArgusEvent } from '../../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

const quotes = vi.hoisted(() => ({ current: [] as Quote[] }))
const histories = vi.hoisted(() => ({ current: [] as Array<{ symbol: string; currency: string; points: Array<{ t: string; close: number }> }> }))
vi.mock('../../../hooks/useHistories', () => ({
  useHistories: () => ({ histories: histories.current, loading: false }),
}))
const asked = vi.hoisted(() => ({ symbols: [] as string[] }))
vi.mock('../../../hooks/useQuotes', () => ({
  useQuotes: (symbols: string[]) => {
    asked.symbols = symbols
    return { quotes: quotes.current, loading: false }
  },
}))

/** A land story: nothing here trips the maritime test that gates freight. */
function makeEvent(over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id: 'e1', title: 'Refinery fire in Zawiya', title_zh: '', content: null,
    summary_zh: '', summary_en: '', source: 'test', url: 'https://example.com',
    published_at: new Date().toISOString(), fetched_at: new Date().toISOString(),
    category: 'ARMED_CONFLICT', intensity: 'HIGH',
    location_type: 'geo', location_label: 'Libya', lat: 32, lng: 12,
    geo_precision: 'exact', body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: null, heat_score: 1, expires_at: null, last_referenced: null,
    ...over,
  }
}

const LAND = makeEvent()
/** Wording the maritime test recognises as a whole word, not inside another. */
const AT_SEA = makeEvent({ title: 'Tanker struck in the Strait of Hormuz' })

function quote(over: Partial<Quote> = {}): Quote {
  return {
    symbol: 'BZ=F', price: 87.92, prevClose: 79.45, changePct: 10.66,
    currency: 'USD', exchange: 'NY Mercantile', asOf: new Date().toISOString(),
    ...over,
  }
}

beforeEach(() => {
  cleanup()
  quotes.current = []
  histories.current = []
  asked.symbols = []
  useAppStore.setState({ upColor: 'green' })
})

describe('EventCommodities', () => {
  it('turns commodity classes into the instruments that price them', () => {
    // The analysis pass records CRUDE_OIL; choosing Brent to stand for it is a
    // display decision, and this is where it is made.
    quotes.current = [quote()]
    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    expect(asked.symbols).toEqual(['BZ=F'])
  })

  it('asks for one instrument per class, so an event never shows two crude rows', () => {
    quotes.current = [quote(), quote({ symbol: 'HG=F' })]
    render(<EventCommodities commodities={['CRUDE_OIL', 'COPPER']} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    expect(asked.symbols).toEqual(['BZ=F', 'HG=F'])
  })

  it('covers the classes the status bar does not draw', () => {
    // The model may name wheat; a class the reader cannot see a price for would
    // be worse than one more row.
    quotes.current = [quote({ symbol: 'ZW=F' })]
    render(<EventCommodities commodities={['WHEAT']} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    expect(asked.symbols).toEqual(['ZW=F'])
  })

  it('renders the price with its own date, never bare', () => {
    // The close shown can predate the event, so it must carry its date; without
    // one the row would read as this event's effect on the market.
    const friday = new Date(2026, 7, 7, 20, 0)
    quotes.current = [quote({ asOf: friday.toISOString() })]
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    expect(container.textContent).toContain('87.92')
    expect(container.textContent).toContain('+10.66%')
    expect(container.textContent).toContain('08-07')
  })

  it('renders nothing when no quote came back', () => {
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an event with no commodity link', () => {
    quotes.current = [quote()]
    const { container } = render(<EventCommodities commodities={[]} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('follows the reader\'s up-colour convention', () => {
    quotes.current = [quote({ changePct: 10.66 })]
    const colourOf = (text: string) =>
      ([...document.querySelectorAll('span')].find((el) => el.textContent === text) as HTMLElement)
        ?.style.color

    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    const green = colourOf('+10.66%')
    cleanup()

    useAppStore.setState({ upColor: 'red' })
    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={null} event={LAND} />)
    expect(colourOf('+10.66%')).not.toBe(green)
  })
})

// ── Change since the event ───────────────────────────────────────────────────

describe('EventCommodities measured from the event', () => {
  const day = (n: number) => new Date(2026, 7, n, 20, 0).toISOString()

  beforeEach(() => {
    histories.current = [{
      symbol: 'BZ=F', currency: 'USD',
      points: [
        { t: day(7),  close: 80 },
        { t: day(11), close: 88 },
        { t: day(12), close: 90 },
      ],
    }]
  })

  /** The row's trailing date cell — "since 08-11" or a bare "08-11". */
  const stampCell = () =>
    [...document.querySelectorAll('span')]
      .map((el) => el.textContent ?? '')
      .find((txt) => /^(since )?\d{2}-\d{2}$/.test(txt))

  it('shows the move since the story published, labelled with its baseline', () => {
    quotes.current = [quote({ changePct: 1.11 })]
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={day(11)} event={LAND} />)
    // 88 → 90, not the 1.11% day move the quote carries.
    expect(container.textContent).toContain('+2.27%')
    expect(stampCell()).toBe('since 08-11')
  })

  it('anchors a weekend story to the close before it, not the one after', () => {
    quotes.current = [quote()]
    const saturday = new Date(2026, 7, 8, 12, 0).toISOString()
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={saturday} event={LAND} />)
    expect(container.textContent).toContain('+12.50%')
    expect(stampCell()).toBe('since 08-07')
  })

  it('falls back to the day\'s change for an event older than the window', () => {
    // Anchoring to the start of the range would answer a different question.
    quotes.current = [quote({ changePct: 1.11 })]
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={day(1)} event={LAND} />)
    expect(container.textContent).toContain('+1.11%')
    expect(stampCell()).not.toMatch(/since/)
  })

  it('falls back when the series could not be fetched at all', () => {
    histories.current = []
    quotes.current = [quote({ changePct: 1.11 })]
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={day(11)} event={LAND} />)
    expect(container.textContent).toContain('+1.11%')
    expect(stampCell()).not.toMatch(/since/)
  })

  it('never states that the event caused the move', () => {
    quotes.current = [quote()]
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" publishedAt={day(11)} event={LAND} />)
    const text = container.textContent ?? ''
    for (const claim of ['caused', 'reaction', 'impact', 'due to', 'because']) {
      expect(text.toLowerCase()).not.toContain(claim)
    }
  })
})

// ── Freight ──────────────────────────────────────────────────────────────────

describe('EventCommodities freight row', () => {
  it('adds tanker freight to a crude story about the sea', () => {
    quotes.current = [quote(), quote({ symbol: 'BWET', price: 379.12 })]
    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff"
      publishedAt={null} event={AT_SEA} />)
    expect(asked.symbols).toEqual(['BZ=F', 'BWET'])
  })

  it('sends grain to dry bulk, not to tankers', () => {
    // BDRY covers iron ore, coal and grain; pricing a wheat story off a tanker
    // fund would be the wrong market wearing the right word.
    quotes.current = [quote({ symbol: 'ZW=F' })]
    render(<EventCommodities commodities={['WHEAT']} accentColor="#00d4ff"
      publishedAt={null} event={AT_SEA} />)
    expect(asked.symbols).toEqual(['ZW=F', 'BDRY'])
  })

  it('offers no freight for a story that is not about the sea', () => {
    // Freight is the price of routes; a refinery fire inland does not earn it.
    quotes.current = [quote()]
    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff"
      publishedAt={null} event={LAND} />)
    expect(asked.symbols).toEqual(['BZ=F'])
  })

  it('offers no freight for metals, which no shipping market prices', () => {
    quotes.current = [quote({ symbol: 'GC=F' })]
    render(<EventCommodities commodities={['GOLD']} accentColor="#00d4ff"
      publishedAt={null} event={AT_SEA} />)
    expect(asked.symbols).toEqual(['GC=F'])
  })

  it('offers no freight when the commodities disagree about segment', () => {
    // Crude rides tankers and wheat rides bulkers; choosing one would assert a
    // focus the link does not have.
    quotes.current = [quote(), quote({ symbol: 'ZW=F' })]
    render(<EventCommodities commodities={['CRUDE_OIL', 'WHEAT']} accentColor="#00d4ff"
      publishedAt={null} event={AT_SEA} />)
    expect(asked.symbols).toEqual(['BZ=F', 'ZW=F'])
  })

  it('says the freight figure is an ETF rather than the index', () => {
    quotes.current = [quote(), quote({ symbol: 'BWET', price: 379.12 })]
    const { container } = render(<EventCommodities commodities={['CRUDE_OIL']}
      accentColor="#00d4ff" publishedAt={null} event={AT_SEA} />)
    expect(container.textContent).toContain('ETF')
    expect(container.textContent).toContain('TANKER FREIGHT')
  })

  it('drops the ETF caveat when no freight quote came back', () => {
    quotes.current = [quote()]
    const { container } = render(<EventCommodities commodities={['CRUDE_OIL']}
      accentColor="#00d4ff" publishedAt={null} event={AT_SEA} />)
    expect(container.textContent).not.toContain('ETF')
  })
})
