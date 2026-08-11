import { describe, it, expect } from 'vitest'
import { COMMODITIES, COMMODITY_SYMBOLS, COMMODITY_REFRESH_MS } from '../commodities'

/**
 * Mirrors `isValidSymbol` in `server/src/services/market.ts`.
 *
 * Duplicated rather than imported because the two packages do not share a
 * module. The proxy drops a symbol it will not forward silently, so a table
 * entry that fails this check would show up as a missing readout with nothing
 * logged anywhere — which is exactly what happened before `=` was allowed.
 */
const PROXY_ACCEPTS = /^[A-Z0-9][A-Z0-9.\-=]{0,11}$/

describe('COMMODITIES', () => {
  it('stays small enough to read at a glance', () => {
    // A status bar answers "what is the world doing"; a dozen readouts is a
    // terminal instead.
    expect(COMMODITIES.length).toBeLessThanOrEqual(6)
  })

  it('carries both crude benchmarks, whose spread is the actual signal', () => {
    expect(COMMODITY_SYMBOLS).toContain('BZ=F')   // Brent — global
    expect(COMMODITY_SYMBOLS).toContain('CL=F')   // WTI — North American
  })

  it('uses symbols the market proxy will forward', () => {
    for (const s of COMMODITY_SYMBOLS) {
      expect(PROXY_ACCEPTS.test(s), `${s} would be dropped by the proxy`).toBe(true)
    }
  })

  it('has no duplicate symbols or i18n keys', () => {
    expect(new Set(COMMODITY_SYMBOLS).size).toBe(COMMODITIES.length)
    expect(new Set(COMMODITIES.map((c) => c.key)).size).toBe(COMMODITIES.length)
  })

  it('gives every entry a fallback label, for a missing locale entry', () => {
    for (const c of COMMODITIES) expect(c.label.length).toBeGreaterThan(0)
  })

  it('refreshes on a period the server cache can actually serve', () => {
    // Faster than this re-serves the same cached numbers; much slower and the
    // bar stops being a live readout.
    expect(COMMODITY_REFRESH_MS).toBeGreaterThanOrEqual(60_000)
    expect(COMMODITY_REFRESH_MS).toBeLessThanOrEqual(15 * 60_000)
  })
})
