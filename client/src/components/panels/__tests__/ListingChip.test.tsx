import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ListingChip } from '../ListingChip'
import { useAppStore } from '../../../store'
import type { Quote } from '../../../hooks/useQuotes'
import type { Listing } from '../../../utils/listing'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

const quotes = vi.hoisted(() => ({ current: [] as Quote[] }))
vi.mock('../../../hooks/useQuotes', () => ({
  useQuotes: () => ({ quotes: quotes.current, loading: false }),
}))

const TSMC: Listing[] = [
  { exchange: 'TWSE', ticker: '2330', symbol: '2330.TW' },
  { exchange: 'NYSE', ticker: 'TSM',  symbol: 'TSM' },
]

function quote(over: Partial<Quote> = {}): Quote {
  return {
    symbol: '2330.TW', price: 2380, prevClose: 2320, changePct: 2.586,
    currency: 'TWD', exchange: 'Taiwan', asOf: new Date().toISOString(),
    ...over,
  }
}

function renderChip(listings = TSMC) {
  return render(<ListingChip listings={listings} accentColor="#00d4ff" />)
}

beforeEach(() => {
  cleanup()
  quotes.current = []
  useAppStore.setState({ upColor: 'green' })
})

describe('ListingChip', () => {
  it('renders nothing when no quote came back', () => {
    // A company whose price cannot be reached must look like one that has no
    // price: no empty state, no error, no reserved space.
    const { container } = renderChip()
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a row per market, which is the whole point of the ADR case', () => {
    quotes.current = [
      quote(),
      quote({ symbol: 'TSM', price: 420.04, prevClose: 404.2, changePct: 3.91, currency: 'USD' }),
    ]
    const { getByText, container } = renderChip()
    expect(getByText('2330')).toBeTruthy()
    expect(getByText('TSM')).toBeTruthy()
    expect(getByText('TWSE')).toBeTruthy()
    expect(getByText('NYSE')).toBeTruthy()
    expect(container.textContent).toContain('2,380')
    expect(container.textContent).toContain('420.04')
  })

  it('dates every row, so two honest rows do not read as a contradiction', () => {
    // AstraZeneca: London up today, New York holding Friday's close.
    const today = new Date(2026, 7, 10, 12, 31)
    const friday = new Date(2026, 7, 7, 20, 0)
    quotes.current = [
      quote({ symbol: '2330.TW', changePct: 3.48, asOf: today.toISOString() }),
      quote({ symbol: 'TSM', changePct: -4.85, asOf: friday.toISOString() }),
    ]
    const { container } = renderChip()
    expect(container.textContent).toContain('08-10')
    expect(container.textContent).toContain('08-07')
  })

  /** The colour actually painted on the change cell. */
  function changeColour(text: string): string {
    const cell = [...document.querySelectorAll('span')].find((el) => el.textContent === text)
    if (!cell) throw new Error(`no cell reading ${text}`)
    return (cell as HTMLElement).style.color
  }

  it('follows the reader\'s up-colour convention in both directions', () => {
    quotes.current = [
      quote({ symbol: '2330.TW', changePct: 2.59 }),
      quote({ symbol: 'TSM', changePct: -4.85 }),
    ]

    renderChip()
    const greenUp   = changeColour('+2.59%')
    const greenDown = changeColour('-4.85%')
    expect(greenUp).not.toBe(greenDown)
    cleanup()

    useAppStore.setState({ upColor: 'red' })
    renderChip()
    // The same two numbers, with the colours exchanged.
    expect(changeColour('+2.59%')).toBe(greenDown)
    expect(changeColour('-4.85%')).toBe(greenUp)
  })

  it('leaves an unchanged price neutral rather than colouring it either way', () => {
    quotes.current = [quote({ changePct: 0 })]
    renderChip()
    const neutral = changeColour('0.00%')

    cleanup()
    quotes.current = [quote({ changePct: 2.59 })]
    renderChip()
    expect(changeColour('+2.59%')).not.toBe(neutral)
  })

  it('omits a listing the upstream could not price rather than showing a gap', () => {
    quotes.current = [quote()]   // only the Taipei line resolved
    const { queryByText, getByText } = renderChip()
    expect(getByText('2330')).toBeTruthy()
    expect(queryByText('TSM')).toBeNull()
  })
})
