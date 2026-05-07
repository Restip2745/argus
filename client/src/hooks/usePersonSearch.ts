import { useState, useEffect, useRef } from 'react'

export interface PersonSearchResult {
  pageid:  number
  title:   string
  snippet: string  // HTML fragment from Wikipedia
}

interface WikiSearchResponse {
  query?: { search?: PersonSearchResult[] }
}

/**
 * Debounced Wikipedia full-text search.
 * Returns up to 6 results matching `query`.
 * Fires 280 ms after the last keystroke; cancels in-flight requests on change.
 */
export function usePersonSearch(query: string): {
  results: PersonSearchResult[]
  loading: boolean
} {
  const [results, setResults] = useState<PersonSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef  = useRef<AbortController | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()

    if (!query.trim()) { setResults([]); setLoading(false); return }

    timerRef.current = setTimeout(() => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)

      const params = new URLSearchParams({
        action:      'query',
        list:        'search',
        srsearch:    query,
        srnamespace: '0',
        srlimit:     '6',
        format:      'json',
        origin:      '*',
      })

      fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<WikiSearchResponse>)
        .then((data) => {
          if (ctrl.signal.aborted) return
          setResults(data.query?.search ?? [])
        })
        .catch((err) => { if (err.name !== 'AbortError') setResults([]) })
        .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    }, 280)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [query])

  return { results, loading }
}
