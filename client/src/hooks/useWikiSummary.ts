import { useState, useEffect, useRef } from 'react'

export interface WikiSummary {
  title:        string
  description?: string
  extract:      string
  thumbnail?:   { source: string; width: number; height: number }
  content_urls?: { desktop: { page: string } }
}

interface State {
  data:    WikiSummary | null
  loading: boolean
  error:   string | null
}

/**
 * Fetch the Wikipedia REST summary for `title`.
 * Uses AbortController to cancel stale requests.
 * Pass null to skip fetching.
 */
export function useWikiSummary(title: string | null): State {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null })
  const abortRef = useRef<AbortController | null>(null)
  const cacheRef = useRef<Map<string, WikiSummary>>(new Map())

  useEffect(() => {
    if (!title) {
      setState({ data: null, loading: false, error: null })
      return
    }

    // Return cached result instantly
    const cached = cacheRef.current.get(title)
    if (cached) {
      setState({ data: cached, loading: false, error: null })
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setState((s) => ({ ...s, loading: true, error: null }))

    const encoded = encodeURIComponent(title.replace(/ /g, '_'))
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`

    fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Wikipedia: ${r.status}`)
        return r.json() as Promise<WikiSummary>
      })
      .then((data) => {
        if (ctrl.signal.aborted) return
        cacheRef.current.set(title, data)
        setState({ data, loading: false, error: null })
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setState({ data: null, loading: false, error: (err as Error).message })
      })

    return () => ctrl.abort()
  }, [title])

  return state
}
