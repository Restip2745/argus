import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import i18next from 'i18next'

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
 * Shared across hook instances, and keyed by language because the API is.
 *
 * Per-instance caching meant the same entity refetched once per place it was
 * shown, and — more importantly — nothing outside the component could see the
 * text. The multi-entity context panel needs it: adding a person to the
 * context used to send the model nothing but the person's own name.
 */
const summaryCache = new Map<string, WikiSummary>()

const cacheKey = (title: string) =>
  `${i18next.language.startsWith('zh') ? 'zh' : 'en'}:${title}`

/** The extract for `title` if some component has already fetched it. */
export function getCachedWikiSummary(title: string | null | undefined): WikiSummary | null {
  if (!title) return null
  return summaryCache.get(cacheKey(title)) ?? null
}

// Readers of the cache need to know when it fills, because the fetch that
// populates it belongs to a different component. Without this, a panel that
// composes prompt text from the cache would keep the empty version it saw on
// its first render.
const cacheListeners = new Set<() => void>()
let cacheVersion = 0

function publishCacheChange(): void {
  cacheVersion++
  for (const fn of cacheListeners) fn()
}

/** Re-renders the caller whenever a summary is added to the shared cache. */
export function useWikiCacheVersion(): number {
  return useSyncExternalStore(
    (cb) => { cacheListeners.add(cb); return () => { cacheListeners.delete(cb) } },
    () => cacheVersion,
  )
}

/**
 * Fetch the Wikipedia REST summary for `title`.
 * Uses AbortController to cancel stale requests.
 * Pass null to skip fetching.
 */
export function useWikiSummary(title: string | null): State {
  const [state, setState] = useState<State>({ data: null, loading: false, error: null })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!title) {
      setState({ data: null, loading: false, error: null })
      return
    }

    // Return cached result instantly
    const cached = summaryCache.get(cacheKey(title))
    if (cached) {
      setState({ data: cached, loading: false, error: null })
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setState((s) => ({ ...s, loading: true, error: null }))

    const encoded = encodeURIComponent(title.replace(/ /g, '_'))
    const wikiLang = i18next.language.startsWith('zh') ? 'zh' : 'en'
    const url = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`

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
        summaryCache.set(cacheKey(title), data)
        publishCacheChange()
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
