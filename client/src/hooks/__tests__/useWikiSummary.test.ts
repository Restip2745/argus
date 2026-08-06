/**
 * Entity names here are the model's answer to "key parties involved" — free
 * text, not article titles. Three quarters of the distinct names appear exactly
 * once, and that tail is full of things like "Security Officials" that no
 * encyclopedia covers. Looking the string up as an exact title in the interface
 * language and stopping there missed real articles and, worse, sometimes
 * returned a fluent summary of something else entirely.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWikiSummary } from '../useWikiSummary'
import i18next from 'i18next'

const summaryUrl = (lang: string, t: string) =>
  `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`

const page = (title: string, extra: Record<string, unknown> = {}) =>
  ({ ok: true, json: async () => ({ title, extract: 'Some prose about it.', ...extra }) }) as unknown as Response
const missing = () => ({ ok: false, status: 404 }) as unknown as Response
const searchHit = (title: string | null) =>
  ({ ok: true, json: async () => ({ query: { search: title ? [{ title }] : [] } }) }) as unknown as Response

/** Route each URL to a canned response so the ladder can be driven precisely. */
function route(map: (url: string) => Response) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => map(url)))
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals(); i18next.language = 'en' })

describe('useWikiSummary resolution', () => {
  it('uses the exact title when it resolves', async () => {
    route((u) => (u === summaryUrl('en', 'Elon Musk') ? page('Elon Musk') : missing()))
    const { result } = renderHook(() => useWikiSummary('Elon Musk'))
    await waitFor(() => expect(result.current.data?.title).toBe('Elon Musk'))
    expect(result.current.error).toBeNull()
  })

  // The case that produced most of the reported 404s: an English name looked up
  // against zh.wikipedia because the interface happened to be in Chinese.
  it('falls back to English when the interface language has no article', async () => {
    i18next.language = 'zh-TW'
    route((u) => {
      if (u === summaryUrl('zh', 'Jessica Pegula')) return missing()
      if (u === summaryUrl('en', 'Jessica Pegula')) return page('Jessica Pegula')
      return missing()
    })
    const { result } = renderHook(() => useWikiSummary('Jessica Pegula'))
    await waitFor(() => expect(result.current.data?.title).toBe('Jessica Pegula'))
  })

  it('prefers the interface language when it does have the article', async () => {
    i18next.language = 'zh-TW'
    route((u) => (u === summaryUrl('zh', 'Israel') ? page('以色列') : page('Israel')))
    const { result } = renderHook(() => useWikiSummary('Israel'))
    await waitFor(() => expect(result.current.data?.title).toBe('以色列'))
  })

  it('reaches the article through search when the name is not a title', async () => {
    route((u) => {
      if (u.includes('list=search')) return searchHit('Ben Roberts-Smith')
      if (u === summaryUrl('en', 'Ben Roberts-Smith')) return page('Ben Roberts-Smith')
      return missing()
    })
    const { result } = renderHook(() => useWikiSummary('Ben Roberts Smith'))
    await waitFor(() => expect(result.current.data?.title).toBe('Ben Roberts-Smith'))
  })

  // Without this the search fallback would turn honest misses into confident
  // wrong answers: every generic phrase in the sample had a plausible top hit.
  it('rejects a search hit that is about something else', async () => {
    route((u) => {
      if (u.includes('list=search')) return searchHit('Ministry of Interior')
      if (u === summaryUrl('en', 'Ministry of Interior')) return page('Ministry of Interior')
      return missing()
    })
    const { result } = renderHook(() => useWikiSummary('Security Officials'))
    await waitFor(() => expect(result.current.error).toBe('NO_ARTICLE'))
    expect(result.current.data).toBeNull()
  })

  // The trade-off, stated so it is a decision rather than an oversight: an
  // exact-title hit is trusted, because Wikipedia resolving the very string we
  // asked for is normally right — that is what carries "Israel" to 以色列. The
  // cost is that a redirect onto something unrelated is trusted too. Observed
  // live: "Jordan Salinas" reaching a shooting incident. Rejecting it would
  // mean rejecting every cross-language redirect, which is the commoner case
  // and the one users notice.
  it('trusts a redirect from an exact title, including a misleading one', async () => {
    route((u) => (u === summaryUrl('en', 'Jordan Salinas')
      ? page('2026 Twin Falls shooting')
      : missing()))
    const { result } = renderHook(() => useWikiSummary('Jordan Salinas'))
    await waitFor(() => expect(result.current.data?.title).toBe('2026 Twin Falls shooting'))
  })

  it('rejects a disambiguation page', async () => {
    route((u) => (u === summaryUrl('en', 'Meta')
      ? page('Meta', { type: 'disambiguation' })
      : (u.includes('list=search') ? searchHit(null) : missing())))
    const { result } = renderHook(() => useWikiSummary('Meta'))
    await waitFor(() => expect(result.current.error).toBe('NO_ARTICLE'))
  })

  it('reports a missing article as NO_ARTICLE rather than an HTTP status', async () => {
    route((u) => (u.includes('list=search') ? searchHit(null) : missing()))
    const { result } = renderHook(() => useWikiSummary('Chinese Companies'))
    await waitFor(() => expect(result.current.error).toBe('NO_ARTICLE'))
    expect(result.current.error).not.toMatch(/40\d/)
  })

  it('does nothing without a title', () => {
    const { result } = renderHook(() => useWikiSummary(null))
    expect(result.current.loading).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
