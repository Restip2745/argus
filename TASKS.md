# ARGUS Task Board

Managed by the autonomous development agent. Follow strict format below.

---

## Format

```
[STATUS][PRIORITY] Category: Task Title
  Description: <clear description>
  Success Criteria: <measurable completion condition>
  Retry Count: <number>
  Source: <ROADMAP | ISSUE #ID>
```

---

## Active Tasks

---

[DONE][HIGH] Feature: Dynamic Conflict Front Layer
  Description: Added toggleable GeoJSON overlay on the globe showing active conflict front lines
    and controlled-territory fills. Server endpoint GET /api/conflict/fronts fetches from
    CONFLICT_GEOJSON_URL (env var, 24h cache) and falls back to a static Ukraine demo dataset
    (conflict_fronts_demo.geojson). Client hook useConflictLayer polls the endpoint.
    ConflictLayer.tsx renders LineString/MultiLineString features as orange lines and
    Polygon/MultiPolygon features as semi-transparent fills color-coded by `control` property
    (russia=red, frontline=amber, ukraine=blue, contested=yellow). FloatDock ⚔ button toggles
    the layer. Layer hidden beyond DIST_CONFLICT_MAX=20 units from Earth (same as satellites).
  Success Criteria: Met — conflict layer toggle in FloatDock; demo data renders on globe;
    no crash without CONFLICT_GEOJSON_URL; zero TypeScript errors on client and server.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Bugfix: Fix pre-existing TypeScript errors in CelestialBody.tsx
  Description: CelestialBody.tsx has 2 pre-existing TS errors: (1) RefObject<Object3D> not
    assignable to Ref<Mesh> at line 216; (2) ForwardedRef<Object3D> not assignable to
    Ref<Group> at line 410. Fix by widening the ref types or using proper type assertions.
  Success Criteria: npx tsc --noEmit produces only the satellite.js import error, no others.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Periodic Intelligence Summary
  Description: Every 30 minutes, a server-side cron job picks the top-5 events by heat_score
    (is_analyzed=1), builds a short prompt, calls Ollama, and pushes the resulting summary as a
    new Socket.io event type `intel_brief` (JSON: {id, summary, generatedAt, topEventIds}).
    FloatDock receives the brief and shows a "BRIEF" badge + modal/tooltip with the text.
  Success Criteria: FloatDock shows BRIEF badge within 30 min of startup (or immediately if
    events exist). Clicking shows the summary text. No crash when Ollama is unavailable.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Event Relationship Graph
  Description: In EventPanelBody, below the heat score row, add a small relationship graph
    section showing related events as nodes connected by shared actors/tags. Use existing
    `getRelatedEvents` API endpoint. Render as a lightweight SVG force-directed-like layout
    (static positions, no physics). Each node: category icon + title snippet. Clicking a node
    navigates to that event.
  Success Criteria: Related events section appears in EventPanel for events with actor/tag overlap.
    Nodes are color-coded by category. Clicking node opens that event. Empty if no relations.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Event Export / Share
  Description: Add an "Export" button to EventPanel header that generates a Markdown or JSON
    summary of the current event (title, summary, category, intensity, actors, tags, heat score,
    URL). Copy to clipboard + optionally trigger a file download. Single event export only.
  Success Criteria: Export button appears in EventPanel. Clicking copies formatted Markdown to
    clipboard and shows a brief "Copied!" confirmation. JSON mode via a secondary option.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Region Comparison Panel
  Description: The Zustand store already has `compareMode`, `comparedCountries`, `addComparedCountry`,
    and `removeComparedCountry`. When compareMode is active, render a dual-column panel inside
    RegionPanel showing key stats (event count by category, heat score summary, recent events)
    side-by-side for up to 2 countries. Add a "Compare" toggle button to the RegionPanel header.
  Description: The compare UI structure (toggle button, CompareCard component, dual-column grid)
    was already in RegionPanel. Added the missing pieces: category event breakdown (24h, by count)
    and recent events list to CompareCard. CompareCard now reads events from Zustand store directly
    and computes country-filtered events via compareMatchesCountry helper. Imports CATEGORY_COLOR,
    CATEGORY_ICON, CATEGORY_LABEL from categoryConfig.
  Success Criteria: Met — compare mode shows side-by-side cards with stats, category breakdown,
    and recent events; exits cleanly on ✕ or compare toggle; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Event Density Clustering
  Description: Added 3-tier zoom system to EventMarkers (tier 0=solar/far >80 scene units,
    tier 1=orbital 12-80, tier 2=surface <12). useFrame reads camera-to-earth distance and
    updates zoomTier state via hysteresis. Greedy clustering algorithm (haversineKm) groups
    events within CLUSTER_KM (1500km tier0, 600km tier1, 0=disabled tier2). ClusterMarker
    component renders count badge with dominant-event color and pulse ring. Clicking cluster
    opens highest-intensity event.
  Success Criteria: Met — cluster markers at solar/orbital zoom; individual markers at surface;
    no new TS errors; orbital markers unaffected.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] UI: Timeline Filter Slider
  Description: Added `timeRangeFilter` ('6h'|'12h'|'24h'|'all') to Zustand store. Rendered a
    segmented button group in CategoryFilterBar (left of category chips). EventStack filters events
    by published_at cutoff before applying the category filter. No new TS errors.
  Success Criteria: Met — user switches 6h/12h/24h/All, EventStack updates accordingly. State in store.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: High-Intensity Toast Notifications
  Description: Created ToastContainer component that detects new CRITICAL/HIGH events via store
    event diffing (skips first load). Each toast shows category icon, intensity label, and title
    snippet. Auto-dismisses after 3s with slide-out animation; manually dismissible. Multiple
    toasts stack in bottom-right corner. Mounted in App.tsx outside HUD scale layer.
  Success Criteria: Met — CRITICAL/HIGH events trigger toast; auto-dismiss 3s; stacking; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Event Source Reliability Labels
  Description: Added `reliability` (HIGH|MEDIUM|LOW|UNVERIFIED) field end-to-end:
    - `schema.sql`: new column + runtime ALTER TABLE migration for existing DBs
    - `types.ts`: `SourceReliability` type added to Article, OllamaClassification, ClientEvent
    - `ollama.ts`: system prompt updated, validateClassification parses + defaults UNVERIFIED
    - `sqlite.ts`: markAnalyzed saves reliability; articleToClientEvent maps it
    - `retention.ts`: baseHeatScore dummy object includes reliability
    - Client types + EventPanelBody badge (color-coded: green/gold/orange/dim)
  Success Criteria: Met — new articles get reliability; badge in panel; UNVERIFIED for old rows; no TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Feature: i18n Complete Coverage
  Description: Expanded en.json / zh-TW.json from ~20 keys to 40+ keys covering all major UI areas:
    panel actions (focus, focus_region, region), event labels (heat, source, suggestedQueries, agent,
    analyzing, viewSource, askAgent), time range filter (6h/12h/24h/all), region section labels, and
    ui controls (liteMode, normalMode, immersive, aiAnalysis, config, compareMode, canvas.toggle,
    celestialNav.collapse/expand). Updated EventPanelBody and CategoryFilterBar to use t() for all
    visible labels.
  Success Criteria: Met — all major visible strings are keyed; switching language changes panel and
    toolbar labels; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

## Completed Tasks

---

[DONE][HIGH] UI: Heat Score Visualization
  Description: Added heat-score bar + numeric value + expiry label to EventPanelBody. Added
    heat score badge (value + HEAT label) to EventStack hover tooltip. Color-coded by intensity
    (red ≥1.5, amber ≥1.0, cyan ≥0.5, blue ≥0.3, dim <0.3). Expiry derived from `expires_at`
    timestamp if available, otherwise from heat_score tiers.
  Success Criteria: Met — bar and expiry visible in EventPanelBody; badge in tooltip; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: AIS Ship Tracking Layer
  Description: Added `/api/tracking/ships` server proxy using Node 22 native WebSocket to
    aisstream.io (requires `AISSTREAM_API_KEY` env var; returns [] gracefully if unset).
    Added `useShipsLayer` / `ShipState` to `useTrackingLayers.ts`. Wired `TrackingLayer.tsx`
    to render `ShipMarker` for each vessel. Enabled FloatDock ships button with green colour.
    Added `AISSTREAM_API_KEY` entry to `.env.example`.
  Success Criteria: Met — ships toggle button functional; server returns [] without key; TS clean.
  Retry Count: 0
  Source: ROADMAP
