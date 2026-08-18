import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWikiSearch } from '../useWikiSearch'

const hit = (title: string) => ({ pageid: 1, title, snippet: '<span class="x">a</span> snippet' })

function respond(byLang: Record<string, string[]>) {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    const url  = String(input)
    const lang = url.slice(url.indexOf('//') + 2, url.indexOf('.wikipedia'))
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ query: { search: (byLang[lang] ?? []).map(hit) } }),
    } as unknown as Response)
  })
}

const langsOf = () => vi.mocked(fetch).mock.calls.map(c => {
  const url = String(c[0])
  return url.slice(url.indexOf('//') + 2, url.indexOf('.wikipedia'))
})

describe('useWikiSearch', () => {
  // Real timers: the hook debounces for 280 ms and `waitFor` polls on the same
  // clock, so faking it deadlocks the two against each other.
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => { vi.unstubAllGlobals() })

  const settle = () => new Promise(r => setTimeout(r, 400))

  it('asks nothing for a query too short to mean anything', async () => {
    renderHook(() => useWikiSearch('a', ['en']))
    await act(settle)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('waits for the typing to stop, then asks once', async () => {
    respond({ en: ['Jane Roe'] })
    const { rerender } = renderHook(({ q }) => useWikiSearch(q, ['en']), {
      initialProps: { q: 'Ja' },
    })
    rerender({ q: 'Jan' })
    rerender({ q: 'Jane' })
    await act(settle)

    // Three keystrokes, one round trip — the earlier timers were cleared.
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('srsearch=Jane')
  })

  it('strips the markup the API puts around matched terms', async () => {
    respond({ en: ['Jane Roe'] })
    const { result } = renderHook(() => useWikiSearch('Jane', ['en']))
    await act(settle)
    await waitFor(() => expect(result.current.results).toHaveLength(1))
    expect(result.current.results[0].snippet).toBe('a snippet')
  })

  it('asks the interface language first and stops when it answers', async () => {
    respond({ zh: ['中華民國'], en: ['Taiwan'] })
    const { result } = renderHook(() => useWikiSearch('台灣', ['zh', 'en']))
    await act(settle)

    await waitFor(() => expect(result.current.results).toHaveLength(1))
    expect(langsOf()).toEqual(['zh'])
  })

  it('falls through to en when the interface language has nothing', async () => {
    // zh.wikipedia has far fewer articles, and reading the English one beats
    // being told the name does not exist.
    respond({ zh: [], en: ['Jane Roe'] })
    const { result } = renderHook(() => useWikiSearch('Jane Roe', ['zh', 'en']))
    await act(settle)

    await waitFor(() => expect(result.current.results).toHaveLength(1))
    expect(langsOf()).toEqual(['zh', 'en'])
    expect(result.current.results[0].title).toBe('Jane Roe')
  })
})
