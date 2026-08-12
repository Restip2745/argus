import { useState, useEffect, useRef } from 'react'
import type { HistoryPoint } from '../utils/quote'

export interface History {
  symbol:   string
  currency: string
  points:   HistoryPoint[]
}

interface State {
  histories: History[]
  loading:   boolean
}

const EMPTY: State = { histories: [], loading: false }

/**
 * Series already fetched, keyed by symbol and range.
 *
 * Longer-lived than the quote cache because the data is: a daily series only
 * gains a point when a market closes. The server caches for an hour and this
 * matches it, so stepping through a timeline of related events re-reads nothing.
 */
const historyCache = new Map<string, { history: History; ts: number }>()
const TTL = 60 * 60 * 1000

/**
 * Daily closes for `symbols`, for measuring against a moment in the past.
 *
 * Ranges are the ones the endpoint allows. A month covers every event the
 * retention pass keeps — the longest-lived expire after seven days — with room
 * for the timeline to reach further back than the panel usually does.
 *
 * Symbols the upstream cannot serve are absent from the result rather than
 * reported, the same contract as `useQuotes`: a series that cannot be fetched
 * and a market with nothing to show are the same absence on the panel.
 */
export function useHistories(symbols: string[], range = '1mo'): State {
  const [state, setState] = useState<State>(EMPTY)
  const abortRef = useRef<AbortController | null>(null)

  const key = symbols.join(',')

  useEffect(() => {
    if (!key) {
      setState(EMPTY)
      return
    }

    const wanted = key.split(',')
    const now = Date.now()
    const fresh = (s: string) => {
      const hit = historyCache.get(`${s}|${range}`)
      return hit && now - hit.ts < TTL ? hit.history : null
    }

    const cached = wanted.map(fresh).filter((h): h is History => h !== null)
    const missing = wanted.filter((s) => !fresh(s))

    if (missing.length === 0) {
      setState({ histories: cached, loading: false })
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState({ histories: cached, loading: true })

    const url = `/api/market/history?symbols=${encodeURIComponent(missing.join(','))}` +
                `&range=${encodeURIComponent(range)}`
    fetch(url, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() as Promise<History[]> : []))
      .then((fetched) => {
        if (ctrl.signal.aborted) return
        for (const h of fetched) historyCache.set(`${h.symbol}|${range}`, { history: h, ts: Date.now() })
        const bySymbol = new Map([...cached, ...fetched].map((h) => [h.symbol, h]))
        setState({
          histories: wanted.map((s) => bySymbol.get(s)).filter((h): h is History => h !== undefined),
          loading:   false,
        })
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        // No error state: the caller falls back to the plain quote, which is a
        // weaker answer rather than a broken one.
        setState({ histories: cached, loading: false })
      })

    return () => ctrl.abort()
  }, [key, range])

  return state
}
