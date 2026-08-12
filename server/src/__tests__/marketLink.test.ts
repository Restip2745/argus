import { describe, it, expect } from 'vitest'
import { validateMarketLink, validateClassification } from '../services/ollama'

describe('validateMarketLink', () => {
  it('accepts a well-formed list', () => {
    expect(validateMarketLink(['CRUDE_OIL'])).toEqual(['CRUDE_OIL'])
    expect(validateMarketLink(['GOLD', 'SILVER'])).toEqual(['GOLD', 'SILVER'])
  })

  it('turns an empty answer into no link at all', () => {
    // Once the row is written there is no difference between the model
    // considering it and finding nothing, and there being nothing to find.
    expect(validateMarketLink([])).toBeNull()
  })

  it('drops commodity names outside the schema rather than the whole list', () => {
    expect(validateMarketLink(['CRUDE_OIL', 'URANIUM', 'BITCOIN'])).toEqual(['CRUDE_OIL'])
  })

  it('returns null when every name was invented', () => {
    expect(validateMarketLink(['URANIUM'])).toBeNull()
  })

  it('normalises case and whitespace, which small models produce freely', () => {
    expect(validateMarketLink([' crude_oil ', 'Gold'])).toEqual(['CRUDE_OIL', 'GOLD'])
  })

  it('collapses a repeated commodity', () => {
    expect(validateMarketLink(['GOLD', 'GOLD'])).toEqual(['GOLD'])
  })

  it('caps the list at three', () => {
    const out = validateMarketLink(['CRUDE_OIL', 'NATURAL_GAS', 'GOLD', 'SILVER', 'COPPER'])
    expect(out).toHaveLength(3)
  })

  it('survives every shape a model can produce instead of the documented one', () => {
    expect(validateMarketLink(null)).toBeNull()
    expect(validateMarketLink(undefined)).toBeNull()
    expect(validateMarketLink('CRUDE_OIL')).toBeNull()
    expect(validateMarketLink({})).toBeNull()
    expect(validateMarketLink([1, 2])).toBeNull()
    // The shape the field used to have, which older rows and a stale prompt
    // can still produce.
    expect(validateMarketLink({ commodities: ['GOLD'], relation: 'SUBJECT' })).toBeNull()
  })
})

describe('validateClassification with market_link', () => {
  /** A reply with everything the pipeline has always depended on. */
  const sound = {
    category: 'ARMED_CONFLICT',
    intensity: 'HIGH',
    title_zh: '荷姆茲海峽遇襲',
    summary_en: 'A tanker was struck in the Strait of Hormuz.',
    summary_zh: '一艘油輪在荷姆茲海峽遭擊中。',
    location: { type: 'geo', label: 'Strait of Hormuz', lat: 26.6, lng: 56.3, body: null },
    actors: ['Iran'],
    sources_count: 2,
    tags: ['tanker', 'shipping'],
    reliability: 'MEDIUM',
  }

  it('carries the link through when the model supplies one', () => {
    const out = validateClassification({ ...sound, market_link: ['CRUDE_OIL'] })
    expect(out.market_link).toEqual(['CRUDE_OIL'])
  })

  it('leaves the field null when the model omits it entirely', () => {
    // Which is what an older model, or a truncated reply, will do.
    expect(validateClassification(sound).market_link).toBeNull()
  })

  it('does not let a broken link cost the fields that already worked', () => {
    // The whole reason the field is nullable and parsed separately.
    const out = validateClassification({ ...sound, market_link: 'oil, probably' })
    expect(out.market_link).toBeNull()
    expect(out.category).toBe('ARMED_CONFLICT')
    expect(out.intensity).toBe('HIGH')
    expect(out.location.label).toBe('Strait of Hormuz')
    expect(out.actors).toEqual(['Iran'])
    expect(out.reliability).toBe('MEDIUM')
    expect(out.summary_en).toBe('A tanker was struck in the Strait of Hormuz.')
  })
})

// ── Persistence ──────────────────────────────────────────────────────────────

describe('market_link round-trip through the database', () => {
  it('stores the link and gives it back unchanged', async () => {
    // A real DB rather than a mock: the field has to survive schema, migration
    // and the UPDATE statement, and only the actual write path proves that.
    process.env.DB_PATH = ':memory:'
    const { initDb, insertRawArticle, markAnalyzed, getArticleById } = await import('../db/sqlite')
    const { validateClassification } = await import('../services/ollama')
    initDb()

    insertRawArticle({
      id: 'mk-1', source: 'test', title: 'Tanker struck in the Strait of Hormuz',
      content: null, url: 'https://example.com/mk-1', published_at: null, image_url: null,
    })

    const linked = validateClassification({
      category: 'ARMED_CONFLICT', intensity: 'HIGH',
      location: { type: 'geo', label: 'Strait of Hormuz', lat: 26.6, lng: 56.3 },
      actors: [], tags: [], sources_count: 1, reliability: 'MEDIUM',
      market_link: ['CRUDE_OIL'],
    })
    markAnalyzed('mk-1', linked, 0.9, '2026-12-31 00:00:00')

    const row = getArticleById('mk-1') as unknown as { market_link: string | null }
    expect(JSON.parse(row.market_link!)).toEqual(['CRUDE_OIL'])
  })

  it('leaves the column null when there is no link, which is most rows', async () => {
    process.env.DB_PATH = ':memory:'
    const { initDb, insertRawArticle, markAnalyzed, getArticleById } = await import('../db/sqlite')
    const { validateClassification } = await import('../services/ollama')
    initDb()

    insertRawArticle({
      id: 'mk-2', source: 'test', title: 'Local council approves new library',
      content: null, url: 'https://example.com/mk-2', published_at: null, image_url: null,
    })

    const plain = validateClassification({
      category: 'SOCIAL', intensity: 'LOW',
      location: { type: 'geo', label: 'Leeds' },
      actors: [], tags: [], sources_count: 1, reliability: 'MEDIUM',
      market_link: [],
    })
    markAnalyzed('mk-2', plain, 0.1, '2026-12-31 00:00:00')

    const row = getArticleById('mk-2') as unknown as { market_link: string | null }
    expect(row.market_link).toBeNull()
  })
})
