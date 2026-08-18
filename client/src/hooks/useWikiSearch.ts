import { useState, useEffect, useRef } from 'react'

export interface WikiSearchHit {
  pageid:  number
  title:   string
  /** Plain text: the API answers in HTML with the matched terms marked up. */
  snippet: string
}

interface WikiSearchResponse {
  query?: { search?: Array<{ pageid: number; title: string; snippet: string }> }
}

const MIN_QUERY = 2
const DEBOUNCE_MS = 280

async function searchOne(lang: string, query: string, limit: number, signal: AbortSignal): Promise<WikiSearchHit[]> {
  const params = new URLSearchParams({
    action:      'query',
    list:        'search',
    srsearch:    query,
    srnamespace: '0',
    srlimit:     String(limit),
    format:      'json',
    origin:      '*',
  })
  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, { signal })
  if (!res.ok) return []
  const data = await res.json() as WikiSearchResponse
  return (data.query?.search ?? []).map(s => ({
    pageid:  s.pageid,
    title:   s.title,
    snippet: s.snippet.replace(/<[^>]*>/g, '').trim(),
  }))
}

/**
 * Debounced Wikipedia title search.
 *
 * `langs` is a ladder rather than a language: a Chinese interface asks
 * zh.wikipedia first, because that is the language the query was typed in, and
 * falls through to en only when zh has nothing — en having far more articles,
 * and reading the English article beating finding nothing. The same order the
 * summary fetch uses, for the same reason.
 *
 * Fires DEBOUNCE_MS after the last keystroke and cancels in-flight requests, so
 * a query typed at speed costs one round trip rather than one per character.
 */
export function useWikiSearch(
  query: string,
  langs: readonly string[] = ['en'],
  limit = 6,
): { results: WikiSearchHit[]; loading: boolean } {
  const [results, setResults] = useState<WikiSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Read inside the effect: a caller writing the ladder inline would otherwise
  // hand it a new array every render and retrigger the search forever.
  const langKey  = langs.join(',')
  const langsRef = useRef(langs)
  langsRef.current = langs

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()

    if (query.trim().length < MIN_QUERY) { setResults([]); setLoading(false); return }

    timerRef.current = setTimeout(() => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)

      void (async () => {
        try {
          for (const lang of langsRef.current) {
            const hits = await searchOne(lang, query, limit, ctrl.signal)
            if (ctrl.signal.aborted) return
            if (hits.length > 0) { setResults(hits); return }
          }
          setResults([])
        } catch (err) {
          if ((err as Error).name !== 'AbortError') setResults([])
        } finally {
          if (!ctrl.signal.aborted) setLoading(false)
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [query, langKey, limit])

  return { results, loading }
}
