/**
 * Closing prices for listed companies.
 *
 * Scope is deliberately one line of a panel: last close, and how far that close
 * moved from the one before it. No intraday, no candles, no streaming — the
 * question this answers is "did the market move on this", not "how should I
 * trade it".
 *
 * Fetched here rather than in the browser for the usual proxy reasons — one
 * cache shared by every open panel instead of one request per reader, and the
 * upstream's rate limit spent on the server's terms rather than the reader's.
 *
 * Upstream is Yahoo's chart endpoint. It needs no key, which is what makes a
 * keyless first version possible at all, but it is undocumented and unversioned
 * and should be assumed to break without notice: everything below is written so
 * that when it does, the panel loses a row rather than showing a wrong number.
 * `parseChart` is separated from the fetch so that judgement can be tested
 * without the network.
 */

import { logger } from '../utils/logger'

export interface Quote {
  /** Symbol as requested, e.g. "2330.TW". */
  symbol:     string
  /** Most recent close (or last trade, if asked mid-session). */
  price:      number
  /** The close before it — the baseline the change is measured against. */
  prevClose:  number
  /** Percent change from `prevClose`, one decimal place of meaning. */
  changePct:  number
  currency:   string
  /** Exchange as the upstream names it, for display next to the price. */
  exchange:   string
  /** When `price` was set, ISO 8601. The reader must be told this, because
   *  outside market hours it is not "now" and may not even be today. */
  asOf:       string
}

const CHART_API = 'https://query1.finance.yahoo.com/v8/finance/chart'

/**
 * A browser-shaped User-Agent.
 *
 * Not evasion — the endpoint simply rejects requests without one, and there is
 * no documented client string to send instead.
 */
const UA = 'Mozilla/5.0 (compatible; ARGUS/1.0)'

/** Requests per call, so one panel cannot fan out into a batch job. */
export const MAX_SYMBOLS = 8

/**
 * How long a quote stays fresh.
 *
 * Ten minutes suits a close-only feed: most of the time the market is shut and
 * the number cannot change at all, and when it is open, this panel is reporting
 * context rather than a tape.
 */
const QUOTE_TTL = 10 * 60 * 1000

const cache = new Map<string, { quote: Quote | null; ts: number }>()

// ── Parsing ──────────────────────────────────────────────────────────────────

interface ChartMeta {
  currency?:            unknown
  symbol?:              unknown
  fullExchangeName?:    unknown
  exchangeName?:        unknown
  regularMarketPrice?:  unknown
  chartPreviousClose?:  unknown
  previousClose?:       unknown
  regularMarketTime?:   unknown
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/**
 * How old a close may be and still be reported.
 *
 * Wide enough to clear any real market holiday — Lunar New Year shuts Taipei,
 * Seoul and Shanghai for the better part of a week — and narrow enough that a
 * security which has stopped trading falls out.
 *
 * This exists because of a dormant depositary receipt. Samsung's London GDR
 * answered with a price from July 2022 and a change of −71%, and nothing about
 * that row looked wrong: a number, a currency, a percentage, rendered exactly
 * like a live quote. Reaching a dead listing is not a bug that can be fixed
 * once — the exchange table will always be missing someone's home market — so
 * the age of the print is checked rather than trusted.
 */
const MAX_QUOTE_AGE_MS = 10 * 24 * 60 * 60 * 1000

/**
 * A quote from one chart response, or null if the shape is not what it claims.
 *
 * Three of the guards matter more than they look. A zero previous close would
 * make the percentage infinite, and it does occur — newly listed and suspended
 * securities both produce it. A price of zero is never a real quote, only an
 * empty field the upstream filled in. And a stale print is the dangerous one,
 * because unlike the other two it renders perfectly.
 *
 * `now` is injectable so the staleness rule can be tested against a fixed date
 * rather than whenever the suite happens to run.
 */
export function parseChart(body: unknown, symbol: string, now: number = Date.now()): Quote | null {
  const meta = (body as { chart?: { result?: Array<{ meta?: ChartMeta }> } })
    ?.chart?.result?.[0]?.meta
  if (!meta) return null

  const price = num(meta.regularMarketPrice)
  const prevClose = num(meta.chartPreviousClose) ?? num(meta.previousClose)
  if (price === null || prevClose === null) return null
  if (price <= 0 || prevClose <= 0) return null

  const seconds = num(meta.regularMarketTime)
  const asOfMs = seconds !== null ? seconds * 1000 : now
  if (now - asOfMs > MAX_QUOTE_AGE_MS) return null

  return {
    symbol,
    price,
    prevClose,
    changePct: ((price - prevClose) / prevClose) * 100,
    currency:  typeof meta.currency === 'string' ? meta.currency : '',
    exchange:  typeof meta.fullExchangeName === 'string' ? meta.fullExchangeName
             : typeof meta.exchangeName === 'string'     ? meta.exchangeName
             : '',
    asOf:      new Date(asOfMs).toISOString(),
  }
}

/**
 * Symbols this proxy is willing to forward.
 *
 * The symbol arrives from the client, which derived it from Wikidata or from
 * the fixed commodity table, so it is not attacker-controlled in any
 * interesting way — but it is still interpolated into an outbound URL, and a
 * whitelist is cheaper than reasoning about that.
 *
 * `=` is here for futures: the continuous front-month contracts are written
 * `CL=F`, `GC=F`. Without it every commodity request was dropped silently, the
 * proxy being unable to tell a malformed symbol from one it simply had no rule
 * for.
 */
export function isValidSymbol(s: string): boolean {
  return /^[A-Z0-9][A-Z0-9.\-=]{0,11}$/.test(s)
}

// ── History ──────────────────────────────────────────────────────────────────

/**
 * A daily close series, for questions a spot price cannot answer.
 *
 * Two callers want this and neither wants a level. The event panel shows what
 * a market is doing beside a story it bears on, but the reading a strait
 * closure actually invites is "what has crude done *since*" — a comparison
 * against the day of the event, not today's number. Freight is the same shape
 * stretched further: it moves over weeks, and its value is confirming that a
 * disruption held rather than announcing it.
 *
 * Deliberately a series and not a computed change. The server does not know
 * which instant a caller is measuring from — one is anchored to an event's
 * publication, the other to a rolling window — and a "changeSince" parameter
 * would have to guess at trading days, holidays and the caller's timezone.
 * Handing over the closes and letting the caller pick its own baseline keeps
 * that judgement where the context is.
 */
export interface HistoryPoint {
  /** Close timestamp, ISO 8601. */
  t:     string
  close: number
}

export interface History {
  symbol:   string
  currency: string
  points:   HistoryPoint[]
}

/**
 * Ranges this proxy will forward, as an allowlist.
 *
 * The value is interpolated into an outbound URL, and the upstream rejects
 * anything it does not recognise anyway. Kept short on purpose: a series long
 * enough to need pagination is not a thing either caller has asked for.
 */
export const VALID_RANGES = ['5d', '1mo', '3mo', '6mo', '1y'] as const
export type HistoryRange = typeof VALID_RANGES[number]

export function isValidRange(r: string): r is HistoryRange {
  return (VALID_RANGES as readonly string[]).includes(r)
}

/**
 * The closes from one chart response, or null if the shape is not what it claims.
 *
 * Gaps are dropped rather than carried as nulls or filled. The upstream returns
 * a null close for a day a market was shut, and a consumer computing a change
 * between two dates wants the trading days it actually has — an interpolated
 * price would be a number nobody ever paid.
 */
export function parseChartSeries(body: unknown, symbol: string): History | null {
  const result = (body as {
    chart?: { result?: Array<{
      meta?: { currency?: unknown }
      timestamp?: unknown
      indicators?: { quote?: Array<{ close?: unknown }> }
    }> }
  })?.chart?.result?.[0]
  if (!result) return null

  const stamps = result.timestamp
  const closes = result.indicators?.quote?.[0]?.close
  if (!Array.isArray(stamps) || !Array.isArray(closes)) return null

  const points: HistoryPoint[] = []
  for (let i = 0; i < stamps.length; i++) {
    const t = num(stamps[i])
    const close = num(closes[i])
    // A zero or negative close is an empty field, the same as in a spot quote.
    if (t === null || close === null || close <= 0) continue
    points.push({ t: new Date(t * 1000).toISOString(), close })
  }

  if (points.length === 0) return null

  return {
    symbol,
    currency: typeof result.meta?.currency === 'string' ? result.meta.currency : '',
    points,
  }
}

/**
 * How long a daily series stays fresh.
 *
 * An hour, against ten minutes for a spot quote. The last point only changes
 * when a market closes, and the payload is a hundred times the size — the
 * trade-off runs the other way from the quote cache.
 */
const HISTORY_TTL = 60 * 60 * 1000

const historyCache = new Map<string, { history: History | null; ts: number }>()

async function fetchOneHistory(symbol: string, range: HistoryRange): Promise<History | null> {
  const url = `${CHART_API}/${encodeURIComponent(symbol)}?range=${range}&interval=1d`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal:  AbortSignal.timeout(10_000),
  })
  if (!res.ok) return null
  return parseChartSeries(await res.json(), symbol)
}

/**
 * Daily closes for `symbols`, cached, with unresolvable ones simply absent.
 *
 * Same contract as `fetchQuotes`: a symbol the upstream cannot serve is missing
 * from the reply rather than reported, because on the panel an unavailable
 * series and a market with nothing to show are the same absence.
 */
export async function fetchHistories(symbols: string[], range: HistoryRange): Promise<History[]> {
  const wanted = [...new Set(symbols.filter(isValidSymbol))].slice(0, MAX_SYMBOLS)
  const now = Date.now()

  const results = await Promise.all(wanted.map(async (symbol) => {
    const key = `${symbol}|${range}`
    const hit = historyCache.get(key)
    if (hit && now - hit.ts < HISTORY_TTL) return hit.history

    try {
      const history = await fetchOneHistory(symbol, range)
      historyCache.set(key, { history, ts: now })
      return history
    } catch (err) {
      logger.warn('[market]', `${symbol} history fetch failed:`, (err as Error).message)
      // Not cached: a timeout says nothing about whether the series exists.
      return null
    }
  }))

  return results.filter((h): h is History => h !== null)
}

// ── Fetching ─────────────────────────────────────────────────────────────────

async function fetchQuote(symbol: string): Promise<Quote | null> {
  const url = `${CHART_API}/${encodeURIComponent(symbol)}?range=5d&interval=1d`
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal:  AbortSignal.timeout(8000),
  })
  // An unknown symbol answers 404, which is an ordinary outcome here: Wikidata
  // holds tickers this upstream has never heard of.
  if (!res.ok) return null
  return parseChart(await res.json(), symbol)
}

/**
 * Quotes for `symbols`, cached, with unresolvable ones simply absent.
 *
 * Failures are cached alongside successes. A ticker the upstream does not know
 * will not start existing within the window, and retrying it on every panel
 * open is how a quiet miss turns into a loud one.
 */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const wanted = [...new Set(symbols.filter(isValidSymbol))].slice(0, MAX_SYMBOLS)
  const now = Date.now()

  const results = await Promise.all(wanted.map(async (symbol) => {
    const hit = cache.get(symbol)
    if (hit && now - hit.ts < QUOTE_TTL) return hit.quote

    try {
      const quote = await fetchQuote(symbol)
      cache.set(symbol, { quote, ts: now })
      return quote
    } catch (err) {
      logger.warn('[market]', `${symbol} fetch failed:`, (err as Error).message)
      // Not cached: a timeout says nothing about whether the symbol exists.
      return null
    }
  }))

  return results.filter((q): q is Quote => q !== null)
}
