import { useState, useEffect, useRef } from 'react'

/** Mirrors the server's `Quote`; kept local so the client owns its own shape. */
export interface Quote {
  symbol:    string
  price:     number
  prevClose: number
  changePct: number
  currency:  string
  exchange:  string
  /** ISO 8601. Always rendered — see `formatAsOf`. */
  asOf:      string
}

interface State {
  quotes:  Quote[]
  loading: boolean
}

const EMPTY: State = { quotes: [], loading: false }

/**
 * Quotes already fetched, by symbol.
 *
 * The server caches these too, and for longer. This one exists so that
 * re-opening a panel, or showing the same company in two places at once,
 * does not go back over the wire at all.
 */
const quoteCache = new Map<string, { quote: Quote; ts: number }>()

/** Shorter than the server's window, so the panel never serves the staler copy. */
const TTL = 5 * 60 * 1000

/**
 * Closing prices for `symbols`.
 *
 * Symbols the upstream cannot price are simply absent from the result, so a
 * company with three listings and two resolvable quotes renders two rows. The
 * caller is expected to render nothing at all when the result is empty.
 *
 * `refreshMs` re-reads on an interval. A panel does not need it — it is opened,
 * read and closed — but the status bar is mounted for as long as the app is,
 * and without this its numbers would be whatever they were at page load.
 */
export function useQuotes(symbols: string[], refreshMs?: number): State {
  const [state, setState] = useState<State>(EMPTY)
  const [tick, setTick] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  // Effects cannot depend on an array identity that changes every render.
  const key = symbols.join(',')

  useEffect(() => {
    if (!refreshMs) return
    const id = setInterval(() => setTick((t) => t + 1), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs])

  useEffect(() => {
    if (!key) {
      setState(EMPTY)
      return
    }

    const wanted = key.split(',')
    // A tick is a request for current numbers, so the cached ones do not count
    // as fresh however recently they arrived.
    if (tick > 0) for (const s of wanted) quoteCache.delete(s)

    const now = Date.now()
    const fresh = (s: string) => {
      const hit = quoteCache.get(s)
      return hit && now - hit.ts < TTL ? hit.quote : null
    }

    const cached = wanted.map(fresh).filter((q): q is Quote => q !== null)
    const missing = wanted.filter((s) => !fresh(s))

    if (missing.length === 0) {
      setState({ quotes: cached, loading: false })
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState({ quotes: cached, loading: true })

    fetch(`/api/market/quote?symbols=${encodeURIComponent(missing.join(','))}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() as Promise<Quote[]> : []))
      .then((fetched) => {
        if (ctrl.signal.aborted) return
        for (const q of fetched) quoteCache.set(q.symbol, { quote: q, ts: Date.now() })
        // Re-read in the requested order: the reply is unordered, and the
        // listings were ranked before they got here.
        const bySymbol = new Map([...cached, ...fetched].map((q) => [q.symbol, q]))
        setState({
          quotes:  wanted.map((s) => bySymbol.get(s)).filter((q): q is Quote => q !== undefined),
          loading: false,
        })
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        // No error state: a company whose price cannot be reached and one that
        // has no price are the same absence as far as the panel is concerned.
        setState({ quotes: cached, loading: false })
      })

    return () => ctrl.abort()
  }, [key, tick])

  return state
}
