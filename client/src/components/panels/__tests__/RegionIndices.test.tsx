import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { RegionIndices } from '../RegionIndices'
import { indicesFor, INDICES_BY_COUNTRY } from '../../../data/indices'
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
    symbol: '^TWII', price: 45224.29, prevClose: 44800, changePct: 0.95,
    currency: 'TWD', exchange: 'Taiwan', asOf: new Date().toISOString(),
    ...over,
  }
}

beforeEach(() => {
  cleanup()
  quotes.current = []
  asked.symbols = []
  useAppStore.setState({ upColor: 'green' })
})

describe('indicesFor', () => {
  it('maps a country to its own index', () => {
    expect(indicesFor('Taiwan').map((i) => i.symbol)).toEqual(['^TWII'])
    expect(indicesFor('South Korea').map((i) => i.symbol)).toEqual(['^KS11'])
  })

  it('gives several where a country genuinely has several headline indices', () => {
    expect(indicesFor('United States of America').map((i) => i.symbol))
      .toEqual(['^DJI', '^GSPC', '^IXIC'])
  })

  it('returns nothing for a country the table does not cover', () => {
    // Most of the world. A guessed symbol either fails silently or prices
    // something else, so the table holds only what was confirmed.
    expect(indicesFor('Somalia')).toEqual([])
    expect(indicesFor('Not A Country')).toEqual([])
  })

  it('keys on the names countryData resolves to', () => {
    // "United States of America", not "United States" or "USA" — a mismatch
    // here shows as a country silently having no index.
    expect(indicesFor('United States of America')).not.toEqual([])
    expect(indicesFor('United States')).toEqual([])
  })

  it('carries no sector index', () => {
    // The Philadelphia Semiconductor index is listed in the US but is not a
    // reading of the US, and belongs to a "related indices" idea that does not
    // exist yet.
    const all = Object.values(INDICES_BY_COUNTRY).flat().map((i) => i.symbol)
    expect(all).not.toContain('^SOX')
  })
})

describe('RegionIndices', () => {
  it('renders the index with its level, change and date', () => {
    quotes.current = [quote()]
    const { container } = render(<RegionIndices country="Taiwan" />)
    expect(asked.symbols).toEqual(['^TWII'])
    expect(container.textContent).toContain('TAIEX')
    expect(container.textContent).toContain('45,224')
    expect(container.textContent).toContain('+0.95%')
  })

  it('never prints a currency beside an index level', () => {
    // The upstream reports one — "TWD" here, "USD" for the S&P — but an index
    // is points, not money. Showing it would be wrong, not merely noisy.
    quotes.current = [quote({ currency: 'TWD' })]
    const { container } = render(<RegionIndices country="Taiwan" />)
    expect(container.textContent).not.toContain('TWD')
  })

  it('renders nothing for a country with no index', () => {
    quotes.current = [quote()]
    const { container } = render(<RegionIndices country="Somalia" />)
    expect(container).toBeEmptyDOMElement()
    expect(asked.symbols).toEqual([])
  })

  it('renders nothing when the quote could not be fetched', () => {
    const { container } = render(<RegionIndices country="Taiwan" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('follows the reader\'s up-colour convention', () => {
    quotes.current = [quote({ changePct: 0.95 })]
    const colourOf = (text: string) =>
      ([...document.querySelectorAll('span')].find((el) => el.textContent === text) as HTMLElement)
        ?.style.color

    render(<RegionIndices country="Taiwan" />)
    const green = colourOf('+0.95%')
    cleanup()

    useAppStore.setState({ upColor: 'red' })
    render(<RegionIndices country="Taiwan" />)
    expect(colourOf('+0.95%')).not.toBe(green)
  })
})
