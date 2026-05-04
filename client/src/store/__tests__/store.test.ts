import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../index'
import type { ArgusEvent } from '../../types'

// ── Fixture helpers ────────────────────────────────────────────────────────

function makeEvent(id: string, overrides: Partial<ArgusEvent> = {}): ArgusEvent {
  return {
    id,
    title: `Event ${id}`,
    title_zh: null,
    content: null,
    summary_zh: null,
    source: 'test',
    url: `https://example.com/${id}`,
    published_at: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
    category: 'POLITICAL',
    intensity: 'LOW',
    location_type: null,
    location_label: null,
    lat: null,
    lng: null,
    body: null,
    actors: [],
    tags: [],
    sources_count: 1,
    reliability: 'UNVERIFIED',
    heat_score: 0.5,
    expires_at: null,
    last_referenced: null,
    ...overrides,
  }
}

// ── Reset store slices before each test ────────────────────────────────────

beforeEach(() => {
  useAppStore.setState({
    events: [],
    hiddenCategories: [],
    bookmarkedIds: [],
    showWatchlistOnly: false,
    searchQuery: '',
    timeRangeFilter: 'all',
    panelZ: { event: 30, region: 31, body: 32, canvasAnalysis: 33 },
    activePanelId: null,
    comparedCountries: [],
    compareMode: false,
  })
  localStorage.clear()
})

// ── addEvent ───────────────────────────────────────────────────────────────

describe('addEvent', () => {
  it('adds a new event to the store', () => {
    const { addEvent } = useAppStore.getState()
    const ev = makeEvent('ev-1')
    addEvent(ev)
    expect(useAppStore.getState().events).toHaveLength(1)
    expect(useAppStore.getState().events[0].id).toBe('ev-1')
  })

  it('prepends the new event to the front of the list', () => {
    const { addEvent } = useAppStore.getState()
    addEvent(makeEvent('ev-1'))
    addEvent(makeEvent('ev-2'))
    expect(useAppStore.getState().events[0].id).toBe('ev-2')
    expect(useAppStore.getState().events[1].id).toBe('ev-1')
  })

  it('does not add a duplicate event (same id)', () => {
    const { addEvent } = useAppStore.getState()
    const ev = makeEvent('dup')
    addEvent(ev)
    addEvent(ev)
    expect(useAppStore.getState().events).toHaveLength(1)
  })

  it('preserves existing events when deduplicating', () => {
    const { addEvent } = useAppStore.getState()
    addEvent(makeEvent('ev-1'))
    addEvent(makeEvent('ev-2'))
    addEvent(makeEvent('ev-1')) // duplicate
    const ids = useAppStore.getState().events.map((e) => e.id)
    expect(ids).toEqual(['ev-2', 'ev-1'])
  })
})

// ── toggleHiddenCategory ───────────────────────────────────────────────────

describe('toggleHiddenCategory', () => {
  it('adds a category to hiddenCategories when it is not present', () => {
    const { toggleHiddenCategory } = useAppStore.getState()
    toggleHiddenCategory('POLITICAL')
    expect(useAppStore.getState().hiddenCategories).toContain('POLITICAL')
  })

  it('removes a category from hiddenCategories when it is already present', () => {
    useAppStore.setState({ hiddenCategories: ['POLITICAL', 'ECONOMIC'] })
    const { toggleHiddenCategory } = useAppStore.getState()
    toggleHiddenCategory('POLITICAL')
    expect(useAppStore.getState().hiddenCategories).not.toContain('POLITICAL')
    expect(useAppStore.getState().hiddenCategories).toContain('ECONOMIC')
  })

  it('can toggle multiple categories independently', () => {
    const { toggleHiddenCategory } = useAppStore.getState()
    toggleHiddenCategory('ARMED_CONFLICT')
    toggleHiddenCategory('HEALTH')
    expect(useAppStore.getState().hiddenCategories).toHaveLength(2)
    toggleHiddenCategory('ARMED_CONFLICT')
    expect(useAppStore.getState().hiddenCategories).toEqual(['HEALTH'])
  })
})

// ── toggleBookmark ─────────────────────────────────────────────────────────

describe('toggleBookmark', () => {
  it('adds an id to bookmarkedIds when not present', () => {
    const { toggleBookmark } = useAppStore.getState()
    toggleBookmark('ev-1')
    expect(useAppStore.getState().bookmarkedIds).toContain('ev-1')
  })

  it('removes an id from bookmarkedIds when already present', () => {
    useAppStore.setState({ bookmarkedIds: ['ev-1', 'ev-2'] })
    const { toggleBookmark } = useAppStore.getState()
    toggleBookmark('ev-1')
    expect(useAppStore.getState().bookmarkedIds).not.toContain('ev-1')
    expect(useAppStore.getState().bookmarkedIds).toContain('ev-2')
  })

  it('persists bookmarks to localStorage on add', () => {
    const { toggleBookmark } = useAppStore.getState()
    toggleBookmark('ev-42')
    const stored = JSON.parse(localStorage.getItem('argus-bookmarks') ?? '[]')
    expect(stored).toContain('ev-42')
  })

  it('persists bookmarks to localStorage on remove', () => {
    useAppStore.setState({ bookmarkedIds: ['ev-1', 'ev-2'] })
    const { toggleBookmark } = useAppStore.getState()
    toggleBookmark('ev-1')
    const stored = JSON.parse(localStorage.getItem('argus-bookmarks') ?? '[]')
    expect(stored).not.toContain('ev-1')
    expect(stored).toContain('ev-2')
  })
})

// ── bringToFront ───────────────────────────────────────────────────────────

describe('bringToFront', () => {
  it('gives the specified panel a z-index above the current maximum', () => {
    const { bringToFront } = useAppStore.getState()
    // initial max is canvasAnalysis=33
    bringToFront('event')
    expect(useAppStore.getState().panelZ.event).toBe(34)
  })

  it('successive bringToFront calls increment z correctly', () => {
    const { bringToFront } = useAppStore.getState()
    bringToFront('region')  // 34
    bringToFront('event')   // 35
    const z = useAppStore.getState().panelZ
    expect(z.event).toBeGreaterThan(z.region)
  })

  it('does not change other panel z-indices', () => {
    const { bringToFront } = useAppStore.getState()
    bringToFront('event')
    const z = useAppStore.getState().panelZ
    expect(z.region).toBe(31)
    expect(z.body).toBe(32)
  })
})

// ── setActivePanelId ───────────────────────────────────────────────────────

describe('setActivePanelId', () => {
  it('sets activePanelId', () => {
    const { setActivePanelId } = useAppStore.getState()
    setActivePanelId('ev-99')
    expect(useAppStore.getState().activePanelId).toBe('ev-99')
  })

  it('bumps the event panel z-index to the top when a panel is opened', () => {
    const { setActivePanelId } = useAppStore.getState()
    setActivePanelId('some-event')
    expect(useAppStore.getState().panelZ.event).toBeGreaterThan(33) // above initial max
  })

  it('clears activePanelId when passed null', () => {
    useAppStore.setState({ activePanelId: 'ev-1' })
    const { setActivePanelId } = useAppStore.getState()
    setActivePanelId(null)
    expect(useAppStore.getState().activePanelId).toBeNull()
  })
})

// ── filter state setters ───────────────────────────────────────────────────

describe('setSearchQuery', () => {
  it('updates searchQuery', () => {
    const { setSearchQuery } = useAppStore.getState()
    setSearchQuery('ukraine')
    expect(useAppStore.getState().searchQuery).toBe('ukraine')
  })

  it('can be cleared to empty string', () => {
    useAppStore.setState({ searchQuery: 'ukraine' })
    const { setSearchQuery } = useAppStore.getState()
    setSearchQuery('')
    expect(useAppStore.getState().searchQuery).toBe('')
  })
})

describe('setTimeRangeFilter', () => {
  it('updates timeRangeFilter to each valid value', () => {
    const { setTimeRangeFilter } = useAppStore.getState()
    for (const v of ['6h', '12h', '24h', 'all'] as const) {
      setTimeRangeFilter(v)
      expect(useAppStore.getState().timeRangeFilter).toBe(v)
    }
  })
})

describe('setShowWatchlistOnly', () => {
  it('sets showWatchlistOnly to true', () => {
    const { setShowWatchlistOnly } = useAppStore.getState()
    setShowWatchlistOnly(true)
    expect(useAppStore.getState().showWatchlistOnly).toBe(true)
  })

  it('sets showWatchlistOnly to false', () => {
    useAppStore.setState({ showWatchlistOnly: true })
    const { setShowWatchlistOnly } = useAppStore.getState()
    setShowWatchlistOnly(false)
    expect(useAppStore.getState().showWatchlistOnly).toBe(false)
  })
})

// ── compare mode ───────────────────────────────────────────────────────────

describe('addComparedCountry / removeComparedCountry', () => {
  const ua = { name: 'Ukraine', lat: 48.5, lng: 31.0 }
  const ru = { name: 'Russia', lat: 61.5, lng: 105.0 }

  it('addComparedCountry appends a new country', () => {
    const { addComparedCountry } = useAppStore.getState()
    addComparedCountry(ua)
    expect(useAppStore.getState().comparedCountries).toHaveLength(1)
    expect(useAppStore.getState().comparedCountries[0].name).toBe('Ukraine')
  })

  it('addComparedCountry does not add duplicate country', () => {
    const { addComparedCountry } = useAppStore.getState()
    addComparedCountry(ua)
    addComparedCountry(ua)
    expect(useAppStore.getState().comparedCountries).toHaveLength(1)
  })

  it('removeComparedCountry removes by name', () => {
    useAppStore.setState({ comparedCountries: [ua, ru] })
    const { removeComparedCountry } = useAppStore.getState()
    removeComparedCountry('Ukraine')
    const names = useAppStore.getState().comparedCountries.map((c) => c.name)
    expect(names).toEqual(['Russia'])
  })
})
