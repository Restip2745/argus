import { describe, it, expect } from 'vitest'
import {
  quoteColor, formatChange, formatPrice, formatAsOf, isPriorSession,
  changeSince,
} from '../quote'

/** Distinct colours are all the assertions need; the values themselves are taste. */
const rise = quoteColor(1, 'green')
const fall = quoteColor(-1, 'green')
const flat = quoteColor(0, 'green')

describe('quoteColor', () => {
  it('gives the reader the convention they picked', () => {
    // Green-up: New York and London.
    expect(quoteColor(2.5, 'green')).toBe(rise)
    expect(quoteColor(-2.5, 'green')).toBe(fall)
    // Red-up: Taipei and Tokyo. The same numbers, the opposite colours.
    expect(quoteColor(2.5, 'red')).toBe(fall)
    expect(quoteColor(-2.5, 'red')).toBe(rise)
  })

  it('uses three distinct colours', () => {
    expect(new Set([rise, fall, flat]).size).toBe(3)
  })

  it('stays neutral on a move that rounds to nothing', () => {
    // Colouring a row that reads "0.00%" claims a direction the number does not.
    expect(quoteColor(0, 'green')).toBe(flat)
    expect(quoteColor(0.001, 'green')).toBe(flat)
    expect(quoteColor(-0.001, 'red')).toBe(flat)
  })

  it('stays neutral rather than guessing at a broken number', () => {
    expect(quoteColor(NaN, 'green')).toBe(flat)
    expect(quoteColor(Infinity, 'green')).toBe(flat)
  })
})

describe('formatChange', () => {
  it('always carries the sign, so direction survives a glance', () => {
    expect(formatChange(2.586)).toBe('+2.59%')
    expect(formatChange(-4.85)).toBe('-4.85%')
  })

  it('prints an unsigned zero rather than a minus sign on nothing', () => {
    expect(formatChange(0)).toBe('0.00%')
    expect(formatChange(-0.0001)).toBe('0.00%')
  })

  it('degrades to a dash instead of NaN%', () => {
    expect(formatChange(NaN)).toBe('—')
  })
})

describe('formatPrice', () => {
  it('scales precision to magnitude, because quotes span five orders of it', () => {
    expect(formatPrice(230000)).toBe('230,000')   // Samsung, KRW
    expect(formatPrice(2380)).toBe('2,380')       // TSMC, TWD
    expect(formatPrice(12.72)).toBe('12.72')      // Nintendo ADR, USD
    expect(formatPrice(0.4231)).toBe('0.4231')    // a penny stock
  })

  it('degrades to a dash instead of NaN', () => {
    expect(formatPrice(NaN)).toBe('—')
  })
})

describe('formatAsOf', () => {
  // Constructed from local parts: the formatter renders in local time, and the
  // suite has to pass wherever it runs.
  const localIso = (y: number, m: number, d: number, h: number, min: number) =>
    new Date(y, m - 1, d, h, min).toISOString()

  it('shows month and day for a print from this year', () => {
    const now = new Date(2026, 7, 10, 14, 0).getTime()
    expect(formatAsOf(localIso(2026, 8, 7, 20, 0), now)).toBe('08-07')
  })

  it('adds the year when the print is not from this one', () => {
    const now = new Date(2026, 7, 10, 14, 0).getTime()
    expect(formatAsOf(localIso(2022, 7, 21, 15, 7), now)).toBe('2022-07-21')
  })

  it('returns empty for an unparseable timestamp rather than "Invalid Date"', () => {
    expect(formatAsOf('not a date')).toBe('')
  })
})

describe('isPriorSession', () => {
  const now = new Date(2026, 7, 10, 9, 30).getTime()
  const at = (m: number, d: number, h: number) => new Date(2026, m - 1, d, h, 0).toISOString()

  it('marks a close from an earlier day, which is the Monday-morning ADR case', () => {
    expect(isPriorSession(at(8, 7, 20), now)).toBe(true)
  })

  it('does not mark a print from today', () => {
    expect(isPriorSession(at(8, 10, 8), now)).toBe(false)
  })

  it('treats a garbled timestamp as current rather than flagging it', () => {
    expect(isPriorSession('not a date', now)).toBe(false)
  })
})

describe('changeSince', () => {
  const day = (n: number) => new Date(2026, 7, n, 20, 0).toISOString()

  /** Four trading days: the 7th, 10th, 11th and 12th. The 8th and 9th are a
   *  weekend, which is exactly the gap the baseline rule has to survive. */
  const week = [
    { t: day(7),  close: 80 },
    { t: day(10), close: 84 },
    { t: day(11), close: 88 },
    { t: day(12), close: 90 },
  ]

  it('measures from the last close at or before the event', () => {
    const out = changeSince(week, day(11))
    expect(out!.baseline).toBe(88)
    expect(out!.baselineDate).toBe(day(11))
    expect(out!.latest).toBe(90)
    expect(out!.changePct).toBeCloseTo(2.273, 3)
  })

  it('reaches back over a weekend rather than forward to the next print', () => {
    // A story published on Saturday the 8th has no close of its own. Anchoring
    // to Monday's would measure from a price that did not exist when it broke.
    const out = changeSince(week, new Date(2026, 7, 8, 12, 0).toISOString())
    expect(out!.baselineDate).toBe(day(7))
    expect(out!.baseline).toBe(80)
    expect(out!.changePct).toBeCloseTo(12.5, 6)
  })

  it('reaches back over the same day, for a story filed after the close', () => {
    const out = changeSince(week, new Date(2026, 7, 11, 23, 0).toISOString())
    expect(out!.baselineDate).toBe(day(11))
  })

  it('refuses an event older than the window rather than anchoring to its start', () => {
    // Answering from the first point in the range would silently answer a
    // different question than the one asked.
    expect(changeSince(week, day(1))).toBeNull()
  })

  it('refuses when nothing has traded since, rather than reporting 0.00%', () => {
    expect(changeSince(week, day(12))).toBeNull()
    expect(changeSince(week, day(13))).toBeNull()
  })

  it('carries a fall through the sign', () => {
    const falling = [{ t: day(7), close: 100 }, { t: day(12), close: 90 }]
    expect(changeSince(falling, day(7))!.changePct).toBeCloseTo(-10, 6)
  })

  it('does not depend on the upstream returning points in order', () => {
    const shuffled = [week[2], week[0], week[3], week[1]]
    const out = changeSince(shuffled, day(10))
    expect(out!.baselineDate).toBe(day(10))
    expect(out!.latest).toBe(90)
  })

  it('returns null for an empty series or an unparseable instant', () => {
    expect(changeSince([], day(10))).toBeNull()
    expect(changeSince(week, 'not a date')).toBeNull()
  })

  it('refuses a zero baseline instead of returning an infinite change', () => {
    expect(changeSince([{ t: day(7), close: 0 }, { t: day(12), close: 90 }], day(7))).toBeNull()
  })
})
