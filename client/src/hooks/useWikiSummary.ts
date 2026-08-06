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

/** i18next.language is undefined until init resolves, and this hook can run first. */
const uiLang = (): 'zh' | 'en' =>
  (i18next.language ?? '').startsWith('zh') ? 'zh' : 'en'

const cacheKey = (title: string) => `${uiLang()}:${title}`

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

// ── Resolution ───────────────────────────────────────────────────────────────
//
// The names arriving here are the model's answer to "key parties involved" —
// free text, not article titles. Most of the frequent ones ("Israel", "SpaceX")
// happen to be articles; the long tail, which is three quarters of all distinct
// names, is full of things like "Security Officials" and "Palestinian students"
// that no encyclopedia has an entry for. Looking the string up as an exact
// title and stopping there fails often, and fails silently in the worst way.

/** Titles Wikipedia answers with but which are not an article about anything. */
function isUsefulPage(data: WikiSummary): boolean {
  // A disambiguation page renders as a confident summary of nothing.
  if ((data as { type?: string }).type === 'disambiguation') return false
  return Boolean(data.extract && data.extract.trim())
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '')

/**
 * Is the returned article plausibly the thing that was asked for?
 *
 * Applied to *search* results only. Search always returns its best guess, so
 * for a name with no real subject behind it — "Security Officials",
 * "Technology Providers" — it hands back something confident and unrelated.
 * Every generic phrase in a sample of the tail produced exactly that, so
 * without this check the fallback would convert honest misses into wrong
 * answers, which is the worse failure.
 *
 * Deliberately not applied to exact-title lookups. Wikipedia resolves those
 * through redirects, and a redirect is normally the right answer — including
 * across languages, where asking zh for "Israel" correctly yields 以色列, a
 * title that shares no characters with the query and would fail any string
 * comparison.
 */
function isPlausibleMatch(requested: string, returned: string): boolean {
  const a = normalise(requested)
  const b = normalise(returned)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

async function fetchSummary(lang: string, title: string, signal: AbortSignal): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'))
  const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`, {
    signal, headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = await res.json() as WikiSummary
  return isUsefulPage(data) ? data : null
}

/** Nearest article by full-text search, for names that are not titles. */
async function searchTitle(lang: string, query: string, signal: AbortSignal): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search` +
              `&srsearch=${encodeURIComponent(query)}&srnamespace=0&srlimit=1&format=json&origin=*`
  const res = await fetch(url, { signal })
  if (!res.ok) return null
  const data = await res.json() as { query?: { search?: Array<{ title: string }> } }
  return data.query?.search?.[0]?.title ?? null
}

/**
 * Preferred language, then English, then search.
 *
 * The language ladder exists because the summary used to follow the *interface*
 * language while the names are almost always English: a Chinese UI sent English
 * names to zh.wikipedia, which has far fewer articles, so "Palestinians" missed
 * there and resolved on en. Reading the English article beats reading nothing.
 */
async function resolveSummary(title: string, signal: AbortSignal): Promise<WikiSummary | null> {
  const ui = uiLang()
  const langs = ui === 'en' ? ['en'] : [ui, 'en']

  // An exact title is taken at its word: Wikipedia resolved the very string we
  // asked about, redirects included.
  for (const lang of langs) {
    const direct = await fetchSummary(lang, title, signal)
    if (direct) return direct
  }

  // Nothing under that exact title: ask what the encyclopedia thinks it is.
  // Searched in English because that is the language the names arrive in.
  const found = await searchTitle('en', title, signal)
  if (!found) return null
  const viaSearch = await fetchSummary('en', found, signal)
  // A guess, so it has to look like the thing that was requested.
  return viaSearch && isPlausibleMatch(title, viaSearch.title) ? viaSearch : null
}

/**
 * Fetch the Wikipedia summary for `title`, resolving loosely-worded names.
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

    resolveSummary(title, ctrl.signal)
      .then((data) => {
        if (ctrl.signal.aborted) return
        if (!data) {
          // A name with no article behind it is an ordinary outcome here, not a
          // fault: the model names participants, and "Security Officials" is a
          // fair answer that no encyclopedia covers. Say so plainly rather than
          // showing an HTTP status the reader can do nothing with.
          setState({ data: null, loading: false, error: 'NO_ARTICLE' })
          return
        }
        summaryCache.set(cacheKey(title), data)
        publishCacheChange()
        setState({ data, loading: false, error: null })
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        setState({ data: null, loading: false, error: (err as Error).message })
      })

    return () => ctrl.abort()
  }, [title])

  return state
}
