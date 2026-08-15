import { describe, it, expect } from 'vitest'
import {
  matchesFilters, filterEvents, isCategoryVisible, safeTs, countByCategory,
  type FilterCriteria,
} from '../eventFilter'
import type { ArgusEvent } from '../../types'

const NOW = Date.UTC(2026, 6, 30, 12, 0, 0)
const HOUR = 3_600_000

function evt(id: string, over: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id, title: `Title ${id}`, title_zh: null, content: null, summary_zh: null, summary_en: null,
    source: 'test', url: 'https://example.com',
    published_at: new Date(NOW - HOUR).toISOString(),
    fetched_at: new Date(NOW - HOUR).toISOString(),
    category: 'POLITICAL', intensity: 'LOW',
    location_type: 'geo', location_label: null, lat: null, lng: null, geo_precision: 'none', body: null,
    actors: [], tags: [], sources_count: 1, reliability: 'HIGH',
    image_url: null, heat_score: 0, expires_at: null, last_referenced: null,
    ...over,
  }
}

const base: FilterCriteria = {
  hiddenCategories: [],
  timeRangeFilter: 'all',
  searchQuery: '',
  bookmarkedIds: [],
  showWatchlistOnly: false,
  now: NOW,
  isLive: true,
}

describe('matchesFilters', () => {
  it('passes everything when nothing is narrowing', () => {
    expect(matchesFilters(evt('a'), base)).toBe(true)
  })

  it('respects hidden categories', () => {
    const c = { ...base, hiddenCategories: ['POLITICAL'] }
    expect(matchesFilters(evt('a', { category: 'POLITICAL' }), c)).toBe(false)
    expect(matchesFilters(evt('b', { category: 'SPACE' }), c)).toBe(true)
  })

  it('respects the time range, measured from scene time', () => {
    const c = { ...base, timeRangeFilter: '6h' as const }
    expect(matchesFilters(evt('recent', { published_at: new Date(NOW - 2 * HOUR).toISOString() }), c)).toBe(true)
    expect(matchesFilters(evt('old', { published_at: new Date(NOW - 9 * HOUR).toISOString() }), c)).toBe(false)

    // Rewinding moves the window with it.
    const rewound = { ...c, now: NOW - 8 * HOUR, isLive: false }
    expect(matchesFilters(evt('old', { published_at: new Date(NOW - 9 * HOUR).toISOString() }), rewound)).toBe(true)
  })

  it('hides events that had not happened yet at a rewound instant', () => {
    const c = { ...base, now: NOW - 4 * HOUR, isLive: false }
    expect(matchesFilters(evt('future', { published_at: new Date(NOW - HOUR).toISOString() }), c)).toBe(false)
    expect(matchesFilters(evt('past', { published_at: new Date(NOW - 6 * HOUR).toISOString() }), c)).toBe(true)
  })

  it('does not apply the future rule while live', () => {
    // Clock skew can put a source's timestamp slightly ahead; live view should
    // not start hiding events because of it.
    const ahead = evt('ahead', { published_at: new Date(NOW + 60_000).toISOString() })
    expect(matchesFilters(ahead, base)).toBe(true)
  })

  it('respects the watchlist', () => {
    const c = { ...base, showWatchlistOnly: true, bookmarkedIds: ['keep'] }
    expect(matchesFilters(evt('keep'), c)).toBe(true)
    expect(matchesFilters(evt('drop'), c)).toBe(false)
  })

  it('searches title, content, actors and tags', () => {
    const c = { ...base, searchQuery: 'taiwan' }
    expect(matchesFilters(evt('t', { title: 'Taiwan strait tension' }), c)).toBe(true)
    expect(matchesFilters(evt('c', { content: 'near TAIWAN' }), c)).toBe(true)
    expect(matchesFilters(evt('a', { actors: ['Taiwan MOFA'] }), c)).toBe(true)
    expect(matchesFilters(evt('g', { tags: ['taiwan'] }), c)).toBe(true)
    expect(matchesFilters(evt('n', { title: 'Unrelated' }), c)).toBe(false)
  })

  it('treats a whitespace-only search as no search', () => {
    expect(matchesFilters(evt('a'), { ...base, searchQuery: '   ' })).toBe(true)
  })

  it('combines constraints', () => {
    const c: FilterCriteria = {
      ...base, hiddenCategories: ['SPACE'], timeRangeFilter: '6h', searchQuery: 'iran',
    }
    expect(matchesFilters(evt('x', { title: 'Iran talks', category: 'POLITICAL' }), c)).toBe(true)
    expect(matchesFilters(evt('y', { title: 'Iran probe', category: 'SPACE' }), c)).toBe(false)
  })
})

describe('filterEvents', () => {
  it('agrees exactly with matchesFilters', () => {
    // The array path exists only for speed; if the two ever disagree, the feed
    // and the globe start showing different things again.
    const events = [
      evt('a', { category: 'SPACE', title: 'Orbit note' }),
      evt('b', { category: 'POLITICAL', title: 'Iran talks' }),
      evt('c', { category: 'POLITICAL', published_at: new Date(NOW - 30 * HOUR).toISOString() }),
      evt('d', { category: 'HEALTH', tags: ['iran'] }),
    ]
    const criteriaSet: FilterCriteria[] = [
      base,
      { ...base, hiddenCategories: ['SPACE'] },
      { ...base, timeRangeFilter: '24h' },
      { ...base, searchQuery: 'iran' },
      { ...base, showWatchlistOnly: true, bookmarkedIds: ['b', 'd'] },
      { ...base, now: NOW - 10 * HOUR, isLive: false },
      { ...base, hiddenCategories: ['HEALTH'], timeRangeFilter: '24h', searchQuery: 'iran' },
    ]

    for (const c of criteriaSet) {
      expect(filterEvents(events, c).map((e) => e.id))
        .toEqual(events.filter((e) => matchesFilters(e, c)).map((e) => e.id))
    }
  })

  it('preserves input order', () => {
    const events = [evt('1'), evt('2'), evt('3')]
    expect(filterEvents(events, base).map((e) => e.id)).toEqual(['1', '2', '3'])
  })
})

describe('isCategoryVisible', () => {
  it('is the narrow check arrival cues use', () => {
    expect(isCategoryVisible(evt('a', { category: 'SPACE' }), [])).toBe(true)
    expect(isCategoryVisible(evt('a', { category: 'SPACE' }), ['SPACE'])).toBe(false)
  })

  it('ignores everything except category', () => {
    // A toast must still fire for an event outside the time window or search,
    // because it is announcing an arrival, not answering a query.
    const old = evt('a', { published_at: new Date(NOW - 99 * HOUR).toISOString() })
    expect(isCategoryVisible(old, [])).toBe(true)
  })
})

describe('safeTs', () => {
  it('returns 0 for missing or unparseable timestamps', () => {
    expect(safeTs(null)).toBe(0)
    expect(safeTs(undefined)).toBe(0)
    expect(safeTs('not a date')).toBe(0)
    expect(safeTs(new Date(NOW).toISOString())).toBe(NOW)
  })

  it('does not let an unparseable timestamp fall out of the time window', () => {
    // ts === 0 must not be treated as "very old" and silently dropped.
    expect(matchesFilters(evt('a', { published_at: 'garbage' }), { ...base, timeRangeFilter: '6h' })).toBe(true)
  })
})

/**
 * The chips sit beside the feed, so their numbers have to describe the same
 * set — they used to tally the raw store, which let POLITICAL read 163 next to
 * a six-hour feed showing a dozen, and left the numbers frozen while the
 * scrubber rewound everything else.
 *
 * The one exception is the category toggles themselves: a chip's number is what
 * the operator reads to decide whether to switch that category back on, so
 * counting a hidden category as zero would erase the only information it
 * carries.
 */
describe('countByCategory', () => {
  const spread = [
    evt('p1', { category: 'POLITICAL' }),
    evt('p2', { category: 'POLITICAL' }),
    evt('c1', { category: 'ARMED_CONFLICT' }),
    evt('s1', { category: 'SPACE' }),
  ]

  it('counts each category in the visible set', () => {
    expect(countByCategory(spread, base)).toEqual({ POLITICAL: 2, ARMED_CONFLICT: 1, SPACE: 1 })
  })

  it('narrows with the time range', () => {
    const events = [
      evt('recent', { category: 'POLITICAL', published_at: new Date(NOW - HOUR).toISOString() }),
      evt('old',    { category: 'POLITICAL', published_at: new Date(NOW - 20 * HOUR).toISOString() }),
    ]
    expect(countByCategory(events, { ...base, timeRangeFilter: 'all' }).POLITICAL).toBe(2)
    expect(countByCategory(events, { ...base, timeRangeFilter: '6h' }).POLITICAL).toBe(1)
  })

  // The exception, stated in both directions.
  it('leaves a hidden category counting its own events', () => {
    const counts = countByCategory(spread, { ...base, hiddenCategories: ['ARMED_CONFLICT'] })
    expect(counts.ARMED_CONFLICT).toBe(1)
  })

  it('does not let hiding one category change another', () => {
    const before = countByCategory(spread, base)
    const after  = countByCategory(spread, { ...base, hiddenCategories: ['ARMED_CONFLICT'] })
    expect(after).toEqual(before)
  })

  it('narrows with the search query', () => {
    const events = [
      evt('hit',  { category: 'SPACE', title: 'Starship launch' }),
      evt('miss', { category: 'SPACE', title: 'Something else' }),
    ]
    expect(countByCategory(events, { ...base, searchQuery: 'starship' }).SPACE).toBe(1)
  })

  it('narrows with the watchlist', () => {
    const events = [evt('a', { category: 'SPACE' }), evt('b', { category: 'SPACE' })]
    const counts = countByCategory(events, { ...base, showWatchlistOnly: true, bookmarkedIds: ['a'] })
    expect(counts.SPACE).toBe(1)
  })

  // The case that was entirely dead before: rewinding moved the feed, the
  // census and the map fills, and left these numbers untouched.
  it('follows the scrubber into the past', () => {
    const events = [
      evt('before', { category: 'SPACE', published_at: new Date(NOW - 3 * HOUR).toISOString() }),
      evt('after',  { category: 'SPACE', published_at: new Date(NOW + 3 * HOUR).toISOString() }),
    ]
    const live     = countByCategory(events, { ...base, isLive: true,  timeRangeFilter: 'all' })
    const rewound  = countByCategory(events, { ...base, isLive: false, timeRangeFilter: 'all' })
    expect(live.SPACE).toBe(2)
    expect(rewound.SPACE).toBe(1)      // the later event has not happened yet
  })

  it('omits categories with nothing in the visible set', () => {
    const counts = countByCategory(spread, { ...base, searchQuery: 'no such thing' })
    expect(counts).toEqual({})
  })
})
