import { create } from 'zustand'
import type { ArgusEvent, CelestialBodyName, AnnotationStroke, ContextEntity } from '../types'
import type { NavLevelId } from '../config/navLevels'
import { NAV_LEVELS } from '../config/navLevels'
import type { BodyDef } from '../data/celestialBodies'

const CONTEXT_ENTITY_LIMIT = 8

export interface SelectedPerson {
  name: string
  wikiTitle?: string
}

export interface SelectedCountry {
  name: string
  lat: number
  lng: number
}

interface AppState {
  // ── Events ────────────────────────────────────────────────
  events: ArgusEvent[]
  setEvents: (events: ArgusEvent[]) => void
  addEvent: (event: ArgusEvent) => void

  // ── Camera / Focus ────────────────────────────────────────
  focusedBody: CelestialBodyName | null
  setFocusedBody: (body: CelestialBodyName | null) => void
  goBack: (() => void) | null
  setGoBack: (fn: () => void) => void
  /** Exposed focusOn from SolarSystem for UI components (e.g. CelestialNavList) */
  focusOn: ((bodyId: CelestialBodyName) => void) | null
  setFocusOn: (fn: (bodyId: CelestialBodyName) => void) => void
  /** Reset camera to solar system overview */
  resetToSolarView: (() => void) | null
  setResetToSolarView: (fn: () => void) => void

  // ── Celestial Navigation ──────────────────────────────────
  navLevel: NavLevelId
  navCandidates: BodyDef[]
  navCollapsed: boolean
  setNavLevel: (level: NavLevelId) => void
  setNavCandidates: (candidates: BodyDef[]) => void
  setNavCollapsed: (v: boolean) => void

  // ── Panel ─────────────────────────────────────────────────
  activePanelId: string | null
  setActivePanelId: (id: string | null) => void

  // ── Selected celestial body (for info panel) ──────────────
  selectedBody: CelestialBodyName | null
  setSelectedBody: (body: CelestialBodyName | null) => void

  // ── Scene layers ──────────────────────────────────────────
  showEarthTexture: boolean
  setShowEarthTexture: (v: boolean) => void

  showGeoJsonLayer: boolean
  setShowGeoJsonLayer: (v: boolean) => void

  showEventMarkers: boolean
  setShowEventMarkers: (v: boolean) => void

  showAnnotationCanvas: boolean
  setShowAnnotationCanvas: (v: boolean) => void

  // ── Tracking layers ───────────────────────────────────────
  showAircraftLayer: boolean
  setShowAircraftLayer: (v: boolean) => void
  showSatellitesLayer: boolean
  setShowSatellitesLayer: (v: boolean) => void
  showShipsLayer: boolean
  setShowShipsLayer: (v: boolean) => void
  showConflictLayer: boolean
  setShowConflictLayer: (v: boolean) => void
  showHeatmapLayer: boolean
  setShowHeatmapLayer: (v: boolean) => void
  layerErrors: { aircraft: boolean; satellites: boolean; ships: boolean; conflict: boolean }
  setLayerError: (layer: 'aircraft' | 'satellites' | 'ships' | 'conflict', error: boolean) => void
  layerLoading: { aircraft: boolean; satellites: boolean; ships: boolean; conflict: boolean }
  setLayerLoading: (layer: 'aircraft' | 'satellites' | 'ships' | 'conflict', loading: boolean) => void

  // ── Events loaded state ───────────────────────────────────
  eventsLoaded: boolean
  setEventsLoaded: (v: boolean) => void

  // ── Region selection (GeoJSON country click) ──────────────
  selectedCountry: SelectedCountry | null
  setSelectedCountry: (c: SelectedCountry | null) => void
  /** Callback registered by GeoJsonLayer; called by Earth mesh onClick */
  onEarthSurfaceClick: ((worldPt: { x: number; y: number; z: number }) => void) | null
  setOnEarthSurfaceClick: (fn: ((worldPt: { x: number; y: number; z: number }) => void) | null) => void
  /** Tween camera to a specific lat/lng on Earth's surface (set by SolarSystem) */
  focusOnEarthSurface: ((lat: number, lng: number) => void) | null
  setFocusOnEarthSurface: (fn: (lat: number, lng: number) => void) => void

  // ── Annotations ───────────────────────────────────────────
  strokes: AnnotationStroke[]
  addStroke: (stroke: AnnotationStroke) => void
  clearStrokes: () => void

  // ── i18n ──────────────────────────────────────────────────
  language: string
  setLanguage: (lang: string) => void

  // ── Config modal ──────────────────────────────────────────
  showConfig: boolean
  setShowConfig: (v: boolean) => void

  // ── Display ───────────────────────────────────────────────
  uiScale: number
  setUiScale: (v: number) => void

  // ── Lite mode ─────────────────────────────────────────────
  liteMode: boolean
  setLiteMode: (v: boolean) => void

  // ── Immersive mode (hide all HUD) ─────────────────────────
  immersiveMode: boolean
  setImmersiveMode: (v: boolean) => void

  // ── Popout windows ────────────────────────────────────────
  poppedOut: Record<string, boolean>   // key: 'event' | 'region'
  setPoppedOut: (key: string, v: boolean) => void

  // ── Event category filter (for EventStack) ────────────────
  hiddenCategories: string[]
  toggleHiddenCategory: (cat: string) => void

  // ── Event time-range filter (for EventStack) ──────────────
  timeRangeFilter: '6h' | '12h' | '24h' | 'all'
  setTimeRangeFilter: (v: '6h' | '12h' | '24h' | 'all') => void

  // ── Event full-text search (for EventStack) ───────────────
  searchQuery: string
  setSearchQuery: (q: string) => void

  // ── Bookmark / Watchlist ──────────────────────────────────
  bookmarkedIds: string[]
  toggleBookmark: (id: string) => void
  showWatchlistOnly: boolean
  setShowWatchlistOnly: (v: boolean) => void

  // ── Intel brief (Periodic Intelligence Summary) ──────────
  intelBrief: { id: string; summary: string; generatedAt: string; topEventIds: string[] } | null
  setIntelBrief: (b: { id: string; summary: string; generatedAt: string; topEventIds: string[] }) => void
  briefRead: boolean
  setBriefRead: (v: boolean) => void
  intelBriefHistory: Array<{ id: string; summary: string; generatedAt: string; topEventIds: string[] }>

  // ── Person panel ──────────────────────────────────────────
  selectedPersons: SelectedPerson[]
  addSelectedPerson: (p: SelectedPerson) => void
  removeSelectedPerson: (name: string) => void
  clearSelectedPersons: () => void

  // ── Multi-entity context panel ─────────────────────────────
  contextEntities: ContextEntity[]
  showContextPanel: boolean
  setShowContextPanel: (v: boolean) => void
  addContextEntity: (e: ContextEntity) => void
  removeContextEntity: (id: string) => void
  clearContextEntities: () => void

  // ── Panel z-order (click to bring to front) ───────────────
  panelZ: Record<string, number>
  bringToFront: (key: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Events
  events:     [],
  setEvents:  (events) => set({ events }),
  addEvent:   (event) => set((s) => s.events.some(e => e.id === event.id) ? s : { events: [event, ...s.events] }),

  // Camera
  focusedBody:    null,
  setFocusedBody: (focusedBody) => set({ focusedBody }),
  goBack:         null,
  setGoBack:      (fn) => set({ goBack: fn }),
  focusOn:        null,
  setFocusOn:     (fn) => set({ focusOn: fn }),
  resetToSolarView: null,
  setResetToSolarView: (fn) => set({ resetToSolarView: fn }),

  // Celestial Navigation
  navLevel:         'solar',
  navCandidates:    NAV_LEVELS[0].candidates(null),
  navCollapsed:     false,
  setNavLevel:      (navLevel) => set({ navLevel }),
  setNavCandidates: (navCandidates) => set({ navCandidates }),
  setNavCollapsed:  (navCollapsed) => set({ navCollapsed }),

  // Panel
  activePanelId:    null,
  setActivePanelId: (activePanelId) => set((s) => ({
    activePanelId,
    // Bring event panel to top whenever a new event is opened
    panelZ: activePanelId !== null
      ? { ...s.panelZ, event: Math.max(...Object.values(s.panelZ), 29) + 1 }
      : s.panelZ,
  })),

  // Selected celestial body
  selectedBody:    null,
  setSelectedBody: (selectedBody) => set((s) => ({
    selectedBody,
    // Bring celestial body panel to top whenever a body is selected
    panelZ: selectedBody !== null
      ? { ...s.panelZ, body: Math.max(...Object.values(s.panelZ), 29) + 1 }
      : s.panelZ,
  })),

  // Layers
  showEarthTexture:    true,
  setShowEarthTexture: (showEarthTexture) => set({ showEarthTexture }),

  showGeoJsonLayer:    false,
  setShowGeoJsonLayer: (showGeoJsonLayer) => set({ showGeoJsonLayer }),

  showEventMarkers:    false,
  setShowEventMarkers: (showEventMarkers) => set({ showEventMarkers }),

  showAnnotationCanvas:    false,
  setShowAnnotationCanvas: (showAnnotationCanvas) => set({ showAnnotationCanvas }),

  // Tracking layers
  showAircraftLayer:    false,
  setShowAircraftLayer: (showAircraftLayer) => set({ showAircraftLayer }),
  showSatellitesLayer:  false,
  setShowSatellitesLayer: (showSatellitesLayer) => set({ showSatellitesLayer }),
  showShipsLayer:       false,
  setShowShipsLayer:    (showShipsLayer) => set({ showShipsLayer }),
  showConflictLayer:    false,
  setShowConflictLayer: (showConflictLayer) => set({ showConflictLayer }),
  showHeatmapLayer:     false,
  setShowHeatmapLayer:  (showHeatmapLayer) => set({ showHeatmapLayer }),
  layerErrors: { aircraft: false, satellites: false, ships: false, conflict: false },
  setLayerError: (layer, error) => set((s) => ({ layerErrors: { ...s.layerErrors, [layer]: error } })),
  layerLoading: { aircraft: false, satellites: false, ships: false, conflict: false },
  setLayerLoading: (layer, loading) => set((s) => ({ layerLoading: { ...s.layerLoading, [layer]: loading } })),

  // Events loaded
  eventsLoaded: false,
  setEventsLoaded: (eventsLoaded) => set({ eventsLoaded }),

  // Region selection
  selectedCountry:    null,
  setSelectedCountry: (selectedCountry) => set((s) => ({
    selectedCountry,
    // Bring region panel to top whenever a country is selected
    panelZ: selectedCountry !== null
      ? { ...s.panelZ, region: Math.max(...Object.values(s.panelZ), 29) + 1 }
      : s.panelZ,
  })),
  onEarthSurfaceClick:    null,
  setOnEarthSurfaceClick: (fn) => set({ onEarthSurfaceClick: fn }),
  focusOnEarthSurface:    null,
  setFocusOnEarthSurface: (fn) => set({ focusOnEarthSurface: fn }),

  // Annotations
  strokes:      [],
  addStroke:    (stroke) => set((s) => ({ strokes: [...s.strokes, stroke] })),
  clearStrokes: () => set({ strokes: [] }),

  // i18n
  language:    'zh-TW',
  setLanguage: (language) => set({ language }),

  // Config modal
  showConfig:    false,
  setShowConfig: (showConfig) => set({ showConfig }),

  // Display
  uiScale:    1.0,
  setUiScale: (uiScale) => set({ uiScale }),

  // Lite mode
  liteMode:    false,
  setLiteMode: (liteMode) => set({ liteMode }),

  // Immersive mode
  immersiveMode:    false,
  setImmersiveMode: (immersiveMode) => set({ immersiveMode }),

  // Popout
  poppedOut:    {},
  setPoppedOut: (key, v) => set((s) => ({ poppedOut: { ...s.poppedOut, [key]: v } })),

  // Category filter
  hiddenCategories: [],
  toggleHiddenCategory: (cat) => set((s) => ({
    hiddenCategories: s.hiddenCategories.includes(cat)
      ? s.hiddenCategories.filter((c) => c !== cat)
      : [...s.hiddenCategories, cat],
  })),

  // Time-range filter
  timeRangeFilter: 'all',
  setTimeRangeFilter: (timeRangeFilter) => set({ timeRangeFilter }),

  // Full-text search
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  // Bookmarks — persisted in localStorage
  bookmarkedIds: (() => {
    try { return JSON.parse(localStorage.getItem('argus-bookmarks') ?? '[]') as string[] }
    catch { return [] }
  })(),
  toggleBookmark: (id) => set((s) => {
    const next = s.bookmarkedIds.includes(id)
      ? s.bookmarkedIds.filter((b) => b !== id)
      : [...s.bookmarkedIds, id]
    localStorage.setItem('argus-bookmarks', JSON.stringify(next))
    return { bookmarkedIds: next }
  }),
  showWatchlistOnly: false,
  setShowWatchlistOnly: (showWatchlistOnly) => set({ showWatchlistOnly }),

  // Intel brief
  intelBrief:    null,
  setIntelBrief: (b) => set((s) => ({
    intelBrief: b,
    briefRead: false,
    intelBriefHistory: [b, ...s.intelBriefHistory.filter(h => h.id !== b.id)].slice(0, 5),
  })),
  briefRead:     false,
  setBriefRead:  (briefRead) => set({ briefRead }),
  intelBriefHistory: [],

  // Person panel
  selectedPersons: [],
  addSelectedPerson: (p) => set((s) => {
    if (s.selectedPersons.some(e => e.name === p.name)) return s
    const panelZ = { ...s.panelZ, person: Math.max(...Object.values(s.panelZ), 29) + 1 }
    return { selectedPersons: [...s.selectedPersons, p], panelZ }
  }),
  removeSelectedPerson: (name) => set((s) => ({
    selectedPersons: s.selectedPersons.filter(p => p.name !== name),
  })),
  clearSelectedPersons: () => set({ selectedPersons: [] }),

  // Multi-entity context panel
  contextEntities: [],
  showContextPanel: false,
  setShowContextPanel: (showContextPanel) => set({ showContextPanel }),
  addContextEntity: (entity) => set((s) => {
    if (s.contextEntities.some(e => e.id === entity.id)) return s
    if (s.contextEntities.length >= CONTEXT_ENTITY_LIMIT) return s
    const wasEmpty = s.contextEntities.length === 0
    return {
      contextEntities: [...s.contextEntities, entity],
      showContextPanel: wasEmpty ? true : s.showContextPanel,
      panelZ: { ...s.panelZ, context: Math.max(...Object.values(s.panelZ), 29) + 1 },
    }
  }),
  removeContextEntity: (id) => set((s) => ({
    contextEntities: s.contextEntities.filter(e => e.id !== id),
  })),
  clearContextEntities: () => set({ contextEntities: [], showContextPanel: false }),

  // Panel z-order — each call gives the clicked panel the current highest z
  panelZ:       { event: 30, region: 31, body: 32, canvasAnalysis: 33, person: 34, context: 35 },
  bringToFront: (key) => set((s) => {
    const max = Math.max(...Object.values(s.panelZ), 29)
    return { panelZ: { ...s.panelZ, [key]: max + 1 } }
  }),
}))
