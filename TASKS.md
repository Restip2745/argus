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

[DONE][HIGH] Refactor: Introduce base Panel component
  Description: Created Panel.tsx as the shared base visual shell. Provides outer container
    (background, border, corner accents, left accent bar), draggable header (title + controls
    + close button), and a body children slot. Accepts all HTML div props via spread for
    animation events, className, style overrides, etc.
  Success Criteria: Met — Panel.tsx exists with clear PanelProps interface; usePanelDrag
    hook extracts position/drag/z-index logic; PanelTail.tsx extracts the SVG tail rAF loop.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Refactor: Extract shared panel logic into base Panel
  Description: Extracted into shared modules: (1) usePanelDrag — unified drag hook
    with uiScale-aware boundary clamping, replaces independent drag handlers in all 3 panels;
    (2) Panel — visual shell replacing 40+ lines of duplicated accent/corner/header markup;
    (3) PanelTail — rAF SVG tail loop replacing identical useEffect blocks in EventPanel
    and RegionPanel.
  Success Criteria: Met — drag code, SVG tail, and panel chrome are now single-source.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Refactor: Migrate EventPanel and RegionPanel to extend Panel
  Description: All three panels migrated to use Panel + usePanelDrag: EventPanel (wraps
    only the card, Timeline sidebar stays outside), RegionPanel (Panel is the root element,
    receives animation + className props), CelestialBodyPanel (fully migrated). Duplicate
    drag handlers, accent bars, corner accents, and header markup removed from all three.
  Success Criteria: Met — all panels use Panel; UI and behavior consistent; zero new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Refactor: Standardize Panel API and extension pattern
  Description: Panel extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> so any div prop
    (onAnimationEnd, onMouseDown, className, style, etc.) passes through to the outer element.
    Extension pattern documented in Panel.tsx header comment. usePanelDrag returns panelRef,
    pos, setPos, dragging, onHeaderMouseDown, zIndex, handleBringToFront, uiScale.
  Success Criteria: Met — all panels follow the same PanelProps + usePanelDrag pattern.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Improve Panel popout behavior
  Description: usePopoutWindow now opens at window.screen.availWidth × window.screen.availHeight
    with left=0,top=0 instead of the previous fixed 420×700.
  Success Criteria: Met — popout windows open at full screen size.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Implement 2-column layout for popout panels
  Description: PopoutPage.tsx completely rewritten with a 2-column layout (60/40 split).
    Left column: panel content (EventPanelBody or RegionPanelOverview rendered without
    floating position). Right column: PopoutAIPanel dedicated AI agent column.
  Success Criteria: Met — two-column popout renders for both event and region panels.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Integrate AI interaction panel into popout layout
  Description: Created PopoutAIPanel.tsx — standalone AI chat with suggested queries,
    streaming history, clear button, and context-aware agent (receives agentContext from
    parent). EventPanelBody gains hideAgent prop to suppress the embedded agent section
    when AI is handled by the right column. agentContext and suggestedQueries computed
    in PopoutPage root and passed down.
  Success Criteria: Met — AI panel renders in popout right column with correct context.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Test: Add UI validation for panel refactor and popout layout
  Description: Added Vitest + @testing-library/react setup (vite.config.ts, src/test/setup.ts,
    package.json test script). Panel.test.tsx covers: renders title/children, onClose callback,
    headerLeft/headerControls slots, width style, onHeaderMouseDown, dragging userSelect,
    HTML div prop forwarding, and custom style merging. All 9 tests pass.
  Success Criteria: Met — 9/9 tests pass; vitest run exits 0.
  Retry Count: 0
  Source: ROADMAP

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

---

## Phase D Tasks

---

[DONE][HIGH] Feature: Context-aware layer activation in EventPanel
  Description:
  Enhance EventPanel so that when displaying an event, it automatically enables relevant
  visualization layers based on event metadata.

  Rules:
  * If event is related to aviation → enable ADS-B layer
  * If event is related to maritime → enable AIS layer
  * If event is related to satellites/space → enable satellite layer

  Detection uses keyword matching across title, tags, actors, and content fields.
  Aviation keywords: aircraft, airline, airport, airspace, flight, helicopter, drone, uav, etc.
  Maritime keywords: maritime, naval, navy, ship, vessel, port, fleet, submarine, coast guard, etc.
  Satellite keywords: category=SPACE, location_type=orbital, satellite, spacecraft, orbit, etc.

  Layer activation is non-destructive (only turns ON, never OFF) and fires once per event ID.
  Users can still manually toggle layers after auto-activation.

  Success Criteria:
  * Aviation-related events trigger ADS-B layer activation
  * Maritime-related events trigger AIS layer activation
  * Satellite/SPACE-category events trigger satellite layer activation
  * No incorrect layer activation occurs for unrelated events
  * Users can manually toggle layers after auto-activation (idempotent setter)
  * No regression in EventPanel rendering or performance
  Implementation: Created useLayerAutoActivation.ts hook. Keyword matching runs across
    title, tags, actors, and content. Hook called in EventPanel with displayedEvent so
    timeline navigation also triggers it. Effect gated by event.id — fires once per event.
  Success Criteria: Met — layers auto-activate on matched events; idempotent; TS clean.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Implement PersonPanel component
  Description: Create a new PersonPanel component to display information about individuals
    (e.g., historical figures, politicians, notable people). Follows the same architecture as
    other panels using the shared Panel base component. Data sourced from Wikipedia REST API
    (reusing useWikiSummary). Accessible via FloatDock ◎ button or future entity links.
  Success Criteria: PersonPanel renders correctly; displays name, description, extract, thumbnail,
    and Wikipedia link; uses shared Panel + usePanelDrag architecture; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Support multi-person selection in PersonPanel
  Description: Extend PersonPanel to support selecting multiple people. Users can search by
    keyword using the Wikipedia search API; selecting a result adds the person to a
    selectedPersons list. A sidebar shows all selected persons as thumbnail chips; clicking
    one switches the main view. Each person has a ✕ remove button.
  Success Criteria: Search input with debounced Wikipedia results; multi-person sidebar;
    switching between people; removing individuals; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Integrate AI chat into PersonPanel
  Description: Add AI interaction capability to PersonPanel using the existing useAgentQuery hook.
    Agent receives contextual data (name, description, extract) from the active person. UI mirrors
    the agent chat in EventPanelBody. Suggested queries based on person type.
  Success Criteria: AI chat UI present in PersonPanel; responses are context-aware (person name
    + description + extract in prompt); no regression to panel performance or layout.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][HIGH] Feature: Link person entities in EventPanel using LLM
  Description: Add a server endpoint POST /api/events/:id/persons that extracts person names
    from event title + content using Ollama (JSON array of names). Client calls this lazily
    when EventPanel opens. Detected names are rendered as clickable ◎ chips in a "PERSONS"
    row in EventPanelBody. Clicking a chip opens PersonPanel for that person.
  Success Criteria: Person names extracted via Ollama; rendered as chips in EventPanelBody;
    clicking opens PersonPanel; minimal false positives; no regression.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Feature: Enrich RegionPanel with related persons
  Description: Extend RegionPanel to include a list of relevant people associated with the
    region (head of state, notable figures). Use a server endpoint or Wikipedia category query.
    Displayed as clickable ◎ chips in a "KEY PERSONS" section of RegionPanelOverview.
    Clicking opens PersonPanel.
  Success Criteria: RegionPanel shows key persons section; chips open PersonPanel correctly;
    data is relevant to the region; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Feature: Link person entities in CelestialBodyPanel
  Description: Detect and link person names in CelestialBodyPanel content (discoverers,
    mission scientists). Convert them into clickable ◎ chips that open PersonPanel. Reuse
    the centralized entity-linking mechanism from the refactor task.
  Success Criteria: Person names identified and linked; links correctly open PersonPanel;
    no incorrect or excessive linking; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Refactor: Centralize entity linking system (Person links)
  Description: Create a reusable PersonChip component that renders a clickable person badge
    and sets activePersonName in the store. Shared by EventPanelBody, RegionPanelOverview,
    and CelestialBodyPanel. Avoids duplicating the chip UI and click handler in each panel.
  Success Criteria: PersonChip component exists; all panels import and use it; consistent
    appearance and behavior; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][LOW] Test: Validate PersonPanel and entity linking behavior
  Description: Add Vitest tests covering: PersonPanel renders with mocked wiki data; multi-
    person selection adds/removes correctly from store; entity chip click sets activePersonName;
    PersonPanel closes on ✕ and clears store.
  Success Criteria: Core flows covered by tests; vitest run exits 0; no regression.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][HIGH] Feature: Event Heatmap Layer
  Description: Add a toggleable geographic heatmap overlay on the globe showing event density.
    Group events by lat/lng (haversine bucketing ~200km cells), compute cell intensity from
    heat_score sum. Render as colored sphere points (red=dense, amber=moderate, blue=sparse)
    at HEATMAP_RADIUS (1.003). FloatDock button toggles; layer hidden beyond DIST_HEATMAP_MAX=20.
    Reuses the existing `showEventMarkers` toggle pattern.
  Success Criteria: Heatmap toggle button in FloatDock; colored density points on globe; intensity
    reflects event heat_score; no crash when events array is empty; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Feature: Actor / Tag Watchlist
  Description: Allow users to pin specific actor names or tags as a watchlist. Watched events
    are highlighted in EventStack with a ★ indicator. Watchlist stored in Zustand as
    `watchedActors: string[]` and `watchedTags: string[]` with add/remove actions. UI: a small
    "WATCH" toggle button appears in EventPanelBody actor chips. Watched events float to the top
    of the EventStack regardless of time-range filter.
  Success Criteria: Actor chips in panel have toggle; watched events show ★; float to top;
    persists across panel close/open; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][LOW] Feature: Event History Timeline Chart
  Description: A collapsible horizontal timeline widget (replaces or augments the per-event
    EventTimeline) showing all events plotted over the last 7 days by published_at. Render as
    an SVG bar chart (grouped by day, colored by category). Clicking a bar opens the highest
    heat_score event for that day+category. Mount as a fixed bottom bar above FloatDock (hidden
    in immersive mode).
  Success Criteria: Timeline chart visible above FloatDock; bars colored by category; clicking
    opens event panel; collapses on click; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Bugfix: Remove duplicate annotation canvas button and fix double divider
  Description: Removed the redundant hardcoded Chinese-label "標記畫布" annotation toggle button
    from App.tsx bottom-left (FloatDock already provides this toggle). Removed unused
    `setShowAnnotationCanvas` selector from App.tsx. Fixed double consecutive divider in
    FloatDock.tsx (two <div> dividers between earth texture button and tracking layer buttons).
  Success Criteria: Met — no duplicate annotation button; single divider; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Bugfix: Fix ConflictLayer Three.js geometry memory leak
  Description: ConflictLayer.tsx built THREE.BufferGeometry objects inside useMemo with no
    disposal path. Replaced with useEffect + useState so the cleanup function calls
    geometry.dispose() on every data change and on unmount, preventing GPU memory accumulation
    when the GeoJSON is re-fetched. Removed now-unused useMemo import.
  Success Criteria: Met — geometries disposed on cleanup; no new TS errors.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Event Keyword Search
  Description: Added full-text search across the EventStack feed. `searchQuery` / `setSearchQuery`
    added to Zustand store. CategoryFilterBar gains a compact search input (⌕ icon, animated
    width expansion, ✕ clear button, border highlights when active). EventStack.tsx filters events
    matching the query against title, content, summary_zh, actors[], tags[], location_label, and
    source (case-insensitive substring). i18n keys `event.search.placeholder` added to en.json
    (SEARCH) and zh-TW.json (搜尋).
  Success Criteria: Met — search input visible in filter bar; typing filters EventStack in real time;
    clear button resets; no new TS errors; i18n keys present in both locales.
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
