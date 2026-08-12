import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EventCommodities } from '../EventCommodities'
import { useAppStore } from '../../../store'
import type { Quote } from '../../../hooks/useQuotes'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

const quotes = vi.hoisted(() => ({ current: [] as Quote[] }))
const asked = vi.hoisted(() => ({ symbols: [] as string[] }))
vi.mock('../../../hooks/useQuotes', () => ({
  useQuotes: (symbols: string[]) => {
    asked.symbols = symbols
    return { quotes: quotes.current, loading: false }
  },
}))

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
  asked.symbols = []
  useAppStore.setState({ upColor: 'green' })
})

describe('EventCommodities', () => {
  it('turns commodity classes into the instruments that price them', () => {
    // The analysis pass records CRUDE_OIL; choosing Brent to stand for it is a
    // display decision, and this is where it is made.
    quotes.current = [quote()]
    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" />)
    expect(asked.symbols).toEqual(['BZ=F'])
  })

  it('asks for one instrument per class, so an event never shows two crude rows', () => {
    quotes.current = [quote(), quote({ symbol: 'HG=F' })]
    render(<EventCommodities commodities={['CRUDE_OIL', 'COPPER']} accentColor="#00d4ff" />)
    expect(asked.symbols).toEqual(['BZ=F', 'HG=F'])
  })

  it('covers the classes the status bar does not draw', () => {
    // The model may name wheat; a class the reader cannot see a price for would
    // be worse than one more row.
    quotes.current = [quote({ symbol: 'ZW=F' })]
    render(<EventCommodities commodities={['WHEAT']} accentColor="#00d4ff" />)
    expect(asked.symbols).toEqual(['ZW=F'])
  })

  it('renders the price with its own date, never bare', () => {
    // The close shown can predate the event, so it must carry its date; without
    // one the row would read as this event's effect on the market.
    const friday = new Date(2026, 7, 7, 20, 0)
    quotes.current = [quote({ asOf: friday.toISOString() })]
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" />)
    expect(container.textContent).toContain('87.92')
    expect(container.textContent).toContain('+10.66%')
    expect(container.textContent).toContain('08-07')
  })

  it('renders nothing when no quote came back', () => {
    const { container } = render(
      <EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for an event with no commodity link', () => {
    quotes.current = [quote()]
    const { container } = render(<EventCommodities commodities={[]} accentColor="#00d4ff" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('follows the reader\'s up-colour convention', () => {
    quotes.current = [quote({ changePct: 10.66 })]
    const colourOf = (text: string) =>
      ([...document.querySelectorAll('span')].find((el) => el.textContent === text) as HTMLElement)
        ?.style.color

    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" />)
    const green = colourOf('+10.66%')
    cleanup()

    useAppStore.setState({ upColor: 'red' })
    render(<EventCommodities commodities={['CRUDE_OIL']} accentColor="#00d4ff" />)
    expect(colourOf('+10.66%')).not.toBe(green)
  })
})
