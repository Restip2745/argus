import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseConflictSources, resolveConflictSources, normalizeFeatures,
  loadConflictFronts, resetConflictCache, ISW_PRESET,
  type ConflictSource,
} from '../services/conflictSources'

const SOURCE: ConflictSource = {
  id: 'test', url: 'https://example.test/a.geojson',
  control: 'russia', conflict: 'ukraine', label: 'Test layer',
}

function fc(features: unknown[]) {
  return { type: 'FeatureCollection', features }
}

function polygon(props: Record<string, unknown> = {}) {
  return {
    type: 'Feature',
    properties: props,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  resetConflictCache()
})

describe('parseConflictSources', () => {
  it('resolves the isw preset by name, case-insensitively', () => {
    expect(parseConflictSources('isw')).toBe(ISW_PRESET)
    expect(parseConflictSources('  ISW  ')).toBe(ISW_PRESET)
  })

  it('parses a JSON array of sources', () => {
    const sources = parseConflictSources('[{"id":"a","url":"https://a.test","control":"frontline"}]')
    expect(sources).toEqual([{ id: 'a', url: 'https://a.test', control: 'frontline' }])
  })

  it('drops entries missing id or url', () => {
    const sources = parseConflictSources('[{"id":"a","url":"https://a.test"},{"id":"b"},{"url":"https://c.test"}]')
    expect(sources).toHaveLength(1)
    expect(sources[0].id).toBe('a')
  })

  it('returns empty for malformed JSON, a non-array, or blank input', () => {
    expect(parseConflictSources('{not json')).toEqual([])
    expect(parseConflictSources('{"id":"a","url":"https://a.test"}')).toEqual([])
    expect(parseConflictSources('   ')).toEqual([])
  })
})

describe('resolveConflictSources', () => {
  it('prefers CONFLICT_SOURCES over the legacy URL', () => {
    const sources = resolveConflictSources({
      CONFLICT_SOURCES: '[{"id":"a","url":"https://a.test"}]',
      CONFLICT_GEOJSON_URL: 'https://legacy.test/x.geojson',
    } as NodeJS.ProcessEnv)
    expect(sources.map(s => s.id)).toEqual(['a'])
  })

  it('falls back to CONFLICT_GEOJSON_URL as a single untagged source', () => {
    const sources = resolveConflictSources({
      CONFLICT_GEOJSON_URL: 'https://legacy.test/x.geojson',
    } as NodeJS.ProcessEnv)
    expect(sources).toEqual([{ id: 'conflict-geojson-url', url: 'https://legacy.test/x.geojson' }])
  })

  it('returns empty when neither is set', () => {
    expect(resolveConflictSources({} as NodeJS.ProcessEnv)).toEqual([])
  })
})

describe('normalizeFeatures', () => {
  it('stamps control, conflict, name and source onto each feature', () => {
    const [f] = normalizeFeatures(fc([polygon()]), SOURCE)
    expect(f.properties).toMatchObject({
      control: 'russia', conflict: 'ukraine', name: 'Test layer', source: 'test',
    })
  })

  it('does not overwrite properties the feed already carries', () => {
    const [f] = normalizeFeatures(fc([polygon({ control: 'ukraine', name: 'Own name' })]), SOURCE)
    expect(f.properties.control).toBe('ukraine')
    expect(f.properties.name).toBe('Own name')
    expect(f.properties.conflict).toBe('ukraine')
  })

  it('keeps point geometry', () => {
    const point = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [30, 50] } }
    expect(normalizeFeatures(fc([point]), SOURCE)).toHaveLength(1)
  })

  it('drops features with unrenderable or missing geometry', () => {
    const bad = [
      { type: 'Feature', properties: {}, geometry: { type: 'GeometryCollection', coordinates: [] } },
      { type: 'Feature', properties: {} },
      { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: null } },
      null,
    ]
    expect(normalizeFeatures(fc(bad), SOURCE)).toEqual([])
  })

  it('rejects payloads that are not a FeatureCollection', () => {
    expect(normalizeFeatures({ type: 'Feature' }, SOURCE)).toEqual([])
    expect(normalizeFeatures('<html>404</html>', SOURCE)).toEqual([])
    expect(normalizeFeatures(null, SOURCE)).toEqual([])
  })
})

describe('loadConflictFronts', () => {
  it('returns null when there are no sources', async () => {
    expect(await loadConflictFronts([], { fetchImpl: vi.fn() as unknown as typeof fetch })).toBeNull()
  })

  it('merges features from every source and reports them in metadata', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      jsonResponse(fc(url.includes('a.test') ? [polygon()] : [polygon(), polygon()])))

    const merged = await loadConflictFronts([
      { id: 'a', url: 'https://a.test', control: 'russia' },
      { id: 'b', url: 'https://b.test', control: 'contested' },
    ], { fetchImpl: fetchImpl as unknown as typeof fetch })

    expect(merged?.features).toHaveLength(3)
    expect(merged?.features.map(f => f.properties.control)).toEqual(['russia', 'contested', 'contested'])
    expect(merged?.metadata?.sources).toMatchObject([
      { id: 'a', features: 1, ok: true },
      { id: 'b', features: 2, ok: true },
    ])
  })

  it('keeps the healthy sources when one fails', async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes('bad.test') ? jsonResponse(null, 503) : jsonResponse(fc([polygon()])))

    const merged = await loadConflictFronts([
      { id: 'good', url: 'https://good.test' },
      { id: 'bad',  url: 'https://bad.test' },
    ], { fetchImpl: fetchImpl as unknown as typeof fetch, attempts: 1 })

    expect(merged?.features).toHaveLength(1)
    expect(merged?.metadata?.sources).toMatchObject([{ id: 'good', ok: true }, { id: 'bad', ok: false }])
  })

  it('returns null when every source yields nothing', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(null, 500))
    const merged = await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], {
      fetchImpl: fetchImpl as unknown as typeof fetch, attempts: 1,
    })
    expect(merged).toBeNull()
  })

  it('retries a source that fails on the first attempt', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(jsonResponse(fc([polygon()])))

    const merged = await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], {
      fetchImpl: fetchImpl as unknown as typeof fetch, attempts: 2, retryMs: 0,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(merged?.features).toHaveLength(1)
    expect(merged?.metadata?.sources).toMatchObject([{ id: 'a', ok: true }])
  })

  it('gives up after the configured number of attempts', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('fetch failed') })
    const merged = await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], {
      fetchImpl: fetchImpl as unknown as typeof fetch, attempts: 3, retryMs: 0,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(merged).toBeNull()
  })

  it('serves cached features within the TTL without refetching', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(fc([polygon()])))
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch, ttlMs: 60_000 }

    await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], opts)
    const second = await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], opts)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(second?.features).toHaveLength(1)
    expect(second?.metadata?.sources).toMatchObject([{ cached: true }])
  })

  it('refetches once the TTL has elapsed', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(fc([polygon()])))
    let clock = 0
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch, ttlMs: 1000, now: () => clock }

    await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], opts)
    clock = 1001
    await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], opts)

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('falls back to stale cached features when a refresh fails', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(fc([polygon()])))
      .mockRejectedValueOnce(new Error('network down'))
    let clock = 0
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch, ttlMs: 1000, now: () => clock, attempts: 1 }

    await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], opts)
    clock = 5000
    const stale = await loadConflictFronts([{ id: 'a', url: 'https://a.test' }], opts)

    expect(stale?.features).toHaveLength(1)
    expect(stale?.metadata?.sources).toMatchObject([{ ok: false, cached: true }])
  })
})

describe('ISW_PRESET', () => {
  it('declares unique ids and a control tag on every source', () => {
    const ids = ISW_PRESET.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of ISW_PRESET) {
      expect(s.control).toBeTruthy()
      expect(s.conflict).toBeTruthy()
      expect(s.url).toMatch(/^https:\/\/services5\.arcgis\.com\/.+f=geojson/)
    }
  })
})
