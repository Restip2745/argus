import { create } from 'zustand'
import type { ArgusEvent, CelestialBodyName, AnnotationStroke } from '../types'
import type { NavLevelId } from '../config/navLevels'
import { NAV_LEVELS } from '../config/navLevels'
import type { BodyDef } from '../data/celestialBodies'

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

  // ── Region selection (GeoJSON country click) ──────────────
  selectedCountry: SelectedCountry | null
  setSelectedCountry: (c: SelectedCountry | null) => void
  // ── Compare mode ──────────────────────────────────────────
  compareMode: boolean
  setCompareMode: (v: boolean) => void
  comparedCountries: SelectedCountry[]
  addComparedCountry: (c: SelectedCountry) => void
  removeComparedCountry: (name: string) => void
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

  // ── Intel brief (Periodic Intelligence Summary) ──────────
  intelBrief: { id: string; summary: string; generatedAt: string; topEventIds: string[] } | null
  setIntelBrief: (b: { id: string; summary: string; generatedAt: string; topEventIds: string[] }) => void
  briefRead: boolean
  setBriefRead: (v: boolean) => void

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
  setActivePanelId: (activePanelId) => set({ activePanelId }),

  // Selected celestial body
  selectedBody:    null,
  setSelectedBody: (selectedBody) => set({ selectedBody }),

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

  // Region selection
  selectedCountry:    null,
  setSelectedCountry: (selectedCountry) => set({ selectedCountry }),
  // Compare mode
  compareMode: false,
  setCompareMode: (compareMode) => set((s) => ({
    compareMode,
    comparedCountries: compareMode
      ? (s.selectedCountry && !s.comparedCountries.some(c => c.name === s.selectedCountry!.name)
          ? [s.selectedCountry]
          : s.comparedCountries)
      : [],
  })),
  comparedCountries: [],
  addComparedCountry: (c) => set((s) =>
    s.comparedCountries.some(e => e.name === c.name) ? s : { comparedCountries: [...s.comparedCountries, c] }
  ),
  removeComparedCountry: (name) => set((s) => ({
    comparedCountries: s.comparedCountries.filter(c => c.name !== name),
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

  // Intel brief
  intelBrief:    null,
  setIntelBrief: (b) => set({ intelBrief: b, briefRead: false }),
  briefRead:     false,
  setBriefRead:  (briefRead) => set({ briefRead }),

  // Panel z-order — each call gives the clicked panel the current highest z
  panelZ:       { event: 30, region: 31, body: 32, canvasAnalysis: 33 },
  bringToFront: (key) => set((s) => {
    const max = Math.max(...Object.values(s.panelZ), 29)
    return { panelZ: { ...s.panelZ, [key]: max + 1 } }
  }),
}))
