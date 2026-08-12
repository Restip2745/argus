import { describe, it, expect } from 'vitest'
import { parseChart, parseChartSeries, isValidSymbol, isValidRange } from '../services/market'

/** The subset of the chart reply that is actually read, in its real shape. */
function chart(meta: Record<string, unknown>) {
  return { chart: { result: [{ meta }] } }
}

/** A chart whose print is current, for the cases not about staleness. */
function chartNow(meta: Record<string, unknown>) {
  return chart({ regularMarketTime: NOW / 1000, ...meta })
}

/** Close time of the TSMC fixture below. */
const TSMC_CLOSE = 1786339802

/**
 * A fixed "now", an hour after that close.
 *
 * Passed explicitly everywhere because `parseChart` rejects stale prints: left
 * to the real clock these tests would pass today and fail in a fortnight.
 */
const NOW = (TSMC_CLOSE + 3600) * 1000

/** Taiwan Semiconductor as the endpoint returned it. */
const TSMC = chart({
  currency:           'TWD',
  symbol:             '2330.TW',
  fullExchangeName:   'Taiwan',
  regularMarketPrice: 2380,
  chartPreviousClose: 2320,
  regularMarketTime:  TSMC_CLOSE,
})

describe('parseChart', () => {
  it('reads the close and measures it against the previous one', () => {
    const q = parseChart(TSMC, '2330.TW', NOW)
    expect(q).not.toBeNull()
    expect(q!.price).toBe(2380)
    expect(q!.prevClose).toBe(2320)
    expect(q!.changePct).toBeCloseTo(2.586, 3)
    expect(q!.currency).toBe('TWD')
    expect(q!.exchange).toBe('Taiwan')
  })

  it('reports the close time, not the time of the request', () => {
    const q = parseChart(TSMC, '2330.TW', NOW)
    expect(q!.asOf).toBe(new Date(TSMC_CLOSE * 1000).toISOString())
  })

  it('keeps the symbol that was asked for rather than the one echoed back', () => {
    // The upstream sometimes normalises the symbol; the caller keyed its
    // request on the original and has to be able to match the reply.
    expect(parseChart(TSMC, '2330.TW', NOW)!.symbol).toBe('2330.TW')
  })

  it('carries a fall through the sign of the change', () => {
    const q = parseChart(chartNow({ regularMarketPrice: 90, chartPreviousClose: 100 }), 'X', NOW)
    expect(q!.changePct).toBeCloseTo(-10, 6)
  })

  it('accepts previousClose when the chart-specific field is absent', () => {
    const q = parseChart(chartNow({ regularMarketPrice: 110, previousClose: 100 }), 'X', NOW)
    expect(q!.changePct).toBeCloseTo(10, 6)
  })

  it('refuses a zero previous close instead of returning an infinite change', () => {
    // Newly listed and suspended securities both produce this.
    expect(parseChart(chartNow({ regularMarketPrice: 10, chartPreviousClose: 0 }), 'X', NOW)).toBeNull()
  })

  it('refuses a zero or negative price, which is an empty field and not a quote', () => {
    expect(parseChart(chartNow({ regularMarketPrice: 0, chartPreviousClose: 100 }), 'X', NOW)).toBeNull()
    expect(parseChart(chartNow({ regularMarketPrice: -5, chartPreviousClose: 100 }), 'X', NOW)).toBeNull()
  })

  it('refuses a reply missing either side of the comparison', () => {
    expect(parseChart(chartNow({ chartPreviousClose: 100 }), 'X', NOW)).toBeNull()
    expect(parseChart(chartNow({ regularMarketPrice: 100 }), 'X', NOW)).toBeNull()
  })

  it('refuses non-numeric values dressed as numbers', () => {
    expect(parseChart(chartNow({ regularMarketPrice: '100', chartPreviousClose: 90 }), 'X', NOW)).toBeNull()
    expect(parseChart(chartNow({ regularMarketPrice: NaN, chartPreviousClose: 90 }), 'X', NOW)).toBeNull()
  })

  it('refuses a print old enough to belong to a security that stopped trading', () => {
    // Samsung's London GDR, which answered with a July 2022 close and a change
    // of -71% that rendered exactly like a live quote.
    const dormant = chart({
      regularMarketPrice: 1179.5,
      chartPreviousClose: 4113,
      regularMarketTime:  NOW / 1000 - 4 * 365 * 24 * 3600,
    })
    expect(parseChart(dormant, 'SMSN.L', NOW)).toBeNull()
  })

  it('keeps a print that is merely stale by a long market holiday', () => {
    // Lunar New Year shuts Taipei and Seoul the better part of a week.
    const holiday = chart({
      regularMarketPrice: 100,
      chartPreviousClose: 99,
      regularMarketTime:  NOW / 1000 - 8 * 24 * 3600,
    })
    expect(parseChart(holiday, '2330.TW', NOW)).not.toBeNull()
  })

  it('survives every shape that is not the one documented', () => {
    expect(parseChart(null, 'X', NOW)).toBeNull()
    expect(parseChart({}, 'X', NOW)).toBeNull()
    expect(parseChart({ chart: { result: [] } }, 'X', NOW)).toBeNull()
    expect(parseChart({ chart: { error: 'Not Found' } }, 'X', NOW)).toBeNull()
    expect(parseChart('<html>rate limited</html>', 'X', NOW)).toBeNull()
  })

  it('tolerates a missing close time rather than dropping the quote', () => {
    const q = parseChart(chart({ regularMarketPrice: 10, chartPreviousClose: 10 }), 'X', NOW)
    expect(q).not.toBeNull()
    expect(Date.parse(q!.asOf)).not.toBeNaN()
  })
})

describe('isValidSymbol', () => {
  it('accepts the forms Wikidata resolution produces', () => {
    expect(isValidSymbol('TSM')).toBe(true)
    expect(isValidSymbol('2330.TW')).toBe(true)
    expect(isValidSymbol('BRK-B')).toBe(true)
    expect(isValidSymbol('0700.HK')).toBe(true)
  })

  it('accepts the continuous front-month futures form', () => {
    // Dropped silently before `=` was allowed, which looked identical to the
    // upstream not knowing the symbol.
    expect(isValidSymbol('CL=F')).toBe(true)
    expect(isValidSymbol('BZ=F')).toBe(true)
    expect(isValidSymbol('GC=F')).toBe(true)
    expect(isValidSymbol('HG=F')).toBe(true)
  })

  it('rejects anything that could steer the outbound URL', () => {
    expect(isValidSymbol('../../quote')).toBe(false)
    expect(isValidSymbol('TSM?foo=1')).toBe(false)
    expect(isValidSymbol('TSM TW')).toBe(false)
    expect(isValidSymbol('')).toBe(false)
    expect(isValidSymbol('.TW')).toBe(false)
  })
})

// ── History ──────────────────────────────────────────────────────────────────

describe('parseChartSeries', () => {
  /** The chart reply's series half, in the shape the upstream really sends. */
  function series(stamps: unknown[], closes: unknown[], currency = 'USD') {
    return {
      chart: { result: [{
        meta: { currency },
        timestamp: stamps,
        indicators: { quote: [{ close: closes }] },
      }] },
    }
  }

  const DAY = 24 * 3600

  it('pairs each close with its own timestamp', () => {
    const t0 = 1786339802
    const out = parseChartSeries(series([t0, t0 + DAY], [83.3, 84.73]), 'BZ=F')
    expect(out).not.toBeNull()
    expect(out!.symbol).toBe('BZ=F')
    expect(out!.currency).toBe('USD')
    expect(out!.points).toEqual([
      { t: new Date(t0 * 1000).toISOString(),         close: 83.3 },
      { t: new Date((t0 + DAY) * 1000).toISOString(), close: 84.73 },
    ])
  })

  it('drops the days a market was shut rather than filling them', () => {
    // The upstream returns a null close for a holiday. A caller measuring a
    // change between two dates wants the days that actually traded; an
    // interpolated price would be a number nobody ever paid.
    const t0 = 1786339802
    const out = parseChartSeries(
      series([t0, t0 + DAY, t0 + 2 * DAY], [83.3, null, 84.9]), 'BZ=F')
    expect(out!.points.map((p) => p.close)).toEqual([83.3, 84.9])
  })

  it('drops a zero or negative close, which is an empty field', () => {
    const t0 = 1786339802
    const out = parseChartSeries(series([t0, t0 + DAY], [0, 84.9]), 'BZ=F')
    expect(out!.points.map((p) => p.close)).toEqual([84.9])
  })

  it('returns null when nothing survived, rather than an empty series', () => {
    expect(parseChartSeries(series([1, 2], [null, null]), 'X')).toBeNull()
    expect(parseChartSeries(series([], []), 'X')).toBeNull()
  })

  it('survives every shape that is not the one documented', () => {
    expect(parseChartSeries(null, 'X')).toBeNull()
    expect(parseChartSeries({}, 'X')).toBeNull()
    expect(parseChartSeries({ chart: { result: [] } }, 'X')).toBeNull()
    expect(parseChartSeries({ chart: { result: [{ meta: {} }] } }, 'X')).toBeNull()
    expect(parseChartSeries({ chart: { error: 'Not Found' } }, 'X')).toBeNull()
    expect(parseChartSeries('<html>rate limited</html>', 'X')).toBeNull()
    // Timestamps without closes, and closes without timestamps.
    expect(parseChartSeries(series([1, 2], undefined as unknown as unknown[]), 'X')).toBeNull()
  })

  it('tolerates a missing currency rather than dropping the series', () => {
    const out = parseChartSeries(
      { chart: { result: [{ timestamp: [1786339802], indicators: { quote: [{ close: [83.3] }] } }] } },
      'X')
    expect(out!.currency).toBe('')
    expect(out!.points).toHaveLength(1)
  })
})

describe('isValidRange', () => {
  it('accepts the ranges the callers ask for', () => {
    expect(isValidRange('5d')).toBe(true)
    expect(isValidRange('1mo')).toBe(true)
    expect(isValidRange('3mo')).toBe(true)
    expect(isValidRange('1y')).toBe(true)
  })

  it('rejects anything else, since the value reaches an outbound URL', () => {
    expect(isValidRange('10y')).toBe(false)
    expect(isValidRange('1mo&interval=1m')).toBe(false)
    expect(isValidRange('../../quote')).toBe(false)
    expect(isValidRange('')).toBe(false)
  })
})
