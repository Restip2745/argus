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

[DONE][HIGH] Bugfix: Fix null/invalid date handling in EventStack
  Description: EventStack.tsx had two silent failure modes in date handling:
    (1) Sort used localeCompare on published_at strings — malformed/null dates silently
        produced wrong order.
    (2) Time-range filter called new Date(e.published_at).getTime() without NaN guard.
    Fix: added safeTs(iso) helper (returns 0 for null/invalid); used for both sort
    (numeric timestamp diff) and filter (only applies cutoff when ts > 0).
  Success Criteria: Met — sort and filter are NaN-safe; TS clean; 9/9 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Perf: Memoize category filter counts in CategoryFilterBar
  Description: Replaced nine per-render events.filter(…).length calls with a single
    useMemo that builds a Record<string, number> count map via one pass over events.
    categoryCounts[cat] ?? 0 used in FilterButton props.
  Success Criteria: Met — count map computed once per events reference; no visual change;
    TS clean; 9/9 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Full-Text Event Search
  Description: Added searchQuery: string + setSearchQuery() to Zustand store. EventStack
    filters events by title, content, actors[], and tags[] (case-insensitive) after the
    existing time-range and category filters. CategoryFilterBar renders a compact ⌕ search
    input between the time-range buttons and category chips; shows a ✕ clear button when
    query is non-empty; input expands from 70px to 90px when active. i18n keys added to
    en.json (Search events…) and zh-TW.json (搜尋事件…).
  Success Criteria: Met — search input renders in CategoryFilterBar; filters events in real
    time; clear button resets; empty query shows all events; TS clean; 9/9 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Actor and Tag Click-to-Filter
  Description: EventPanelBody now reads setSearchQuery from Zustand store directly.
    Actor chips converted from <span> to <button> elements with onClick → setSearchQuery(actor)
    and hover highlight. Tags section added below actors (was not previously rendered);
    tag chips use # prefix and click → setSearchQuery(tag). Both chips show a tooltip
    "Filter events by …". The CategoryFilterBar search input immediately reflects the
    active query and provides the ✕ clear button.
  Success Criteria: Met — actor/tag chips are buttons; clicking sets searchQuery; EventStack
    filters accordingly; ✕ clears; TS clean; 9/9 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Remove 45-Event Hard Cap with Virtual Scroll
  Description: Removed .slice(0,45) cap. Replaced with window-based virtual scroll:
    ITEM_H=30 (26px icon + 4px gap), VSCROLL_BUFFER=8. A sentinel div sets total scroll
    height (total * ITEM_H). Visible slice positioned absolutely at startIdx * ITEM_H.
    Container stays pointer-events:none; scroll is driven by a window wheel listener that
    checks mouse bounds and programmatically sets el.scrollTop + state. ResizeObserver
    tracks container height for accurate visible-window calculation.
  Success Criteria: Met — all filtered events available via scroll; 45-cap removed;
    pointer-events behaviour unchanged; TS clean; 9/9 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Feature: Bookmark / Watchlist
  Description: bookmarkedIds: string[] + toggleBookmark + showWatchlistOnly +
    setShowWatchlistOnly added to Zustand store. bookmarkedIds persisted to
    localStorage ('argus-bookmarks') and restored on init. EventPanel header
    gains a ★/☆ toggle button (gold when bookmarked). CategoryFilterBar has a
    ☆ watchlist button (leftmost) that toggles showWatchlistOnly and shows
    bookmark count when > 0. EventStack useMemo filters to bookmarked-only when
    showWatchlistOnly is true.
  Success Criteria: Met — bookmarks persist across reload; ★ in EventPanel
    reflects state; ☆ in filter bar shows count and filters list; TS clean;
    9/9 tests pass.
  Retry Count: 0
  Source: ROADMAP

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

[DONE][HIGH] Feature: PersonPanel popout support
  Description: Extended usePopoutWindow to accept 'person' panel key. Added PersonPopoutContent
    component to PopoutPage.tsx that renders PersonPanelBody cards for all selectedPersons.
    Wired person agentContext and suggestedQueries (single/multi-person variants) to PopoutAIPanel.
    Added ⊡ popout button to PersonPanel headerControls (active color = ACCENT purple when popped).
    Left column header shows '◈ PERSON INTEL'. document.title set to 'ARGUS — Person Intel'.
  Success Criteria: PersonPanel header shows ⊡ button; clicking opens a full-screen 2-column window
    with person cards on the left and AI agent on the right; isPopped turns button purple; TS clean.
  Retry Count: 0
  Source: ROADMAP

---

---

[DONE][LOW] Bugfix: Remove unused PersonEntity import in store/index.ts
  Description: store/index.ts imported `PersonEntity` from '../types' but never referenced it,
    causing a TS6196 "declared but never used" error. Removed PersonEntity from the import list.
  Success Criteria: Met — `npx tsc --noEmit` in client/ produces zero errors; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Persist LLM and feed config across server restarts
  Description: `server/src/config/llmConfig.ts` and `feedsConfig.ts` stored user-configured settings
    in memory only. Any server restart silently reset them to env-var defaults, discarding changes
    the user made via the Config Modal. Added `server/src/config/configStore.ts` with atomic JSON
    persistence (write-then-rename) to `server/data/config.json`. Both llmConfig and feedsConfig
    now load persisted values over env-var defaults on startup and call `persistConfig` on every
    `set*` call. feedsConfig also merges any new default feeds not yet in the saved list.
  Success Criteria: Met — server TS clean; 17/17 client tests pass; no crash on missing file;
    persisted values override defaults after restart.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Refactor: Extract shared event utility functions
  Description: `relativeTime()` and `heatColor()` were defined identically in both
    `client/src/components/ui/EventStack.tsx` and `client/src/components/panels/EventPanelBody.tsx`.
    Moved both to new `client/src/utils/eventUtils.ts`; both files now import from there.
  Success Criteria: Met — single definition in eventUtils.ts; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Globe event heatmap overlay
  Description: Added toggleable choropleth layer inside GeoJsonLayer that fills countries with a
    heat-coded color based on their summed heat_score from events in the last 24h. Helper functions
    `buildHeatFillGeometry`, `heatmapColor` (blue→amber→red), `heatmapOpacity` added to
    GeoJsonLayer.tsx. Country matching uses case-insensitive NAME/ADMIN substring comparison
    against event `location_label`. `showHeatmapLayer` + setter added to Zustand store.
    FloatDock gets a ⬡ "EVENT HEATMAP (24H)" button wired to the toggle.
  Success Criteria: Met — heatmap toggles via FloatDock; zero-event countries have no fill;
    high-heat countries show red; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Feature: Keyboard shortcuts for panel actions
  Description: Added global keyboard shortcuts in App.tsx:
    `/` → dispatches `argus:focus-search` custom event; CategoryFilterBar listens and focuses
    the search input. `Escape` → closes EventPanel, then selectedCountry, then clearSelectedPersons
    in priority order. `b/B` → toggleBookmark on activePanelId. `[`/`]` → navigate prev/next event
    in the filtered list (uses new `useFilteredEvents` hook).
    Also extracted filter logic into `client/src/hooks/useFilteredEvents.ts`; EventStack now uses
    it too, removing ~30 lines of duplicate useMemo code.
  Success Criteria: Met — all shortcuts work; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Implement MultiEntityContextPanel (base workspace)
  Description: Created MultiEntityContextPanel.tsx as a dedicated floating workspace for
    aggregating multiple entities (Event, Person, Region, Celestial). Uses shared Panel base
    + usePanelDrag. Displays entity cards with type icons/colors, supports removal per entity
    or clear-all. Integrates AI chat via useAgentQuery with all entities as context.
  Success Criteria: Met — panel renders correctly; displays multiple entity types; entities
    can be added/removed; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Define unified Entity data structure
  Description: Added ContextEntityType ('event'|'person'|'region'|'celestial') and
    ContextEntity interface { id, type, name, summary } to client/src/types/index.ts.
    All four panels map their data to this format when adding to context.
  Success Criteria: Met — unified type defined; all panels convert data; no inconsistency.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Add "Add to Context" action in all panels
  Description: Added ⊕ button to headerControls in EventPanel, PersonPanel, RegionPanel,
    and CelestialBodyPanel. Button turns green (#00ffcc) and disables when entity is already
    in context. Each panel constructs a ContextEntity with appropriate id/type/name/summary.
  Success Criteria: Met — button in all 4 panel headers; clicking adds to context; duplicates
    prevented; TS clean.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Auto-open or focus MultiEntityContextPanel on first add
  Description: addContextEntity in Zustand store sets showContextPanel=true when adding
    the first entity (contextEntities was empty). Also brings context panel z-index to front.
  Success Criteria: Met — panel auto-opens on first add; no disruption to other panels.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Limit entity count in context panel
  Description: CONTEXT_ENTITY_LIMIT=8 enforced in store addContextEntity (silently ignores
    adds beyond limit). Panel shows "ENTITY LIMIT REACHED (8)" warning in amber when at cap.
  Success Criteria: Met — limit enforced; clear feedback shown.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Integrate AI chat into MultiEntityContextPanel
  Description: Full AI agent section with useAgentQuery, suggested queries (context-aware
    based on entity types and count), streaming chat history, and input. agentContext built
    from all entities as "[TYPE] Name: Summary" blocks.
  Success Criteria: Met — AI chat functional; receives all entities; multi-entity reasoning.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Display entity summaries in context panel
  Description: EntityCard component shows type icon (color-coded), entity name, 2-line
    summary, and type label. Cards are stacked in a scrollable list.
  Success Criteria: Met — each entity shows name/summary; layout clear and readable.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Allow removing and clearing context
  Description: Each EntityCard has ✕ button to remove individual entity. Panel header
    has "⊘ CLEAR" button to clear all entities (also hides panel). Both call store actions.
  Success Criteria: Met — individual remove and clear-all work; state updates correctly.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Feature: Prevent duplicate entities in context
  Description: addContextEntity checks s.contextEntities.some(e => e.id === entity.id)
    and returns unchanged state if duplicate found.
  Success Criteria: Met — duplicates silently ignored.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Test: Validate MultiEntityContextPanel behavior
  Description: Added MultiEntityContextPanel.test.tsx with 10 tests: store logic (add entity
    + auto-open, prevent duplicates, multiple types, entity limit, remove single, clear all,
    z-index bump) and rendering (empty state, entity cards, remove entity).
  Success Criteria: Met — 27/27 tests pass; no regression.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Refactor: Remove compare mode from RegionPanel
  Description: Removed CompareCard component, compareMode/comparedCountries/addComparedCountry/
    removeComparedCountry from Zustand store, RegionPanel, GeoJsonLayer click handler and highlight
    logic, usePopoutSync BroadcastChannel sync, and i18n keys. GeoJsonLayer now always uses
    setSelectedCountry on country click. RegionPanel is single-country only.
  Success Criteria: Met — no compareMode references remain; GeoJsonLayer click always sets
    selectedCountry; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][HIGH] Feature: Multi-column layout for MultiEntityContextPanel
  Description: Panel width now adapts dynamically: 1 entity = 340px single column, 2+ entities =
    responsive CSS grid with min card width 160px, gap 6px, columns capped at entity count and
    screen width. Panel width transition animated with cubic-bezier. Entity limit warning spans
    full grid width via gridColumn: '1 / -1'.
  Success Criteria: Met — 1 entity single column; 2+ entities multi-column grid; panel width
    adapts; scrollable; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][HIGH] Feature: Add popout support for MultiEntityContextPanel
  Description: Extended usePopoutWindow to accept 'context' panel key. Added ⊡ popout button to
    MultiEntityContextPanel headerControls (turns accent green when popped). Created
    ContextPopoutContent in PopoutPage.tsx with responsive grid (up to 3 columns) in left column
    and PopoutAIPanel in right column. Added contextEntities sync to usePopoutSync BroadcastChannel
    (host broadcasts changes, guest receives and applies). Document title set to 'ARGUS — Context
    Intel'. EntityCard exported from MultiEntityContextPanel for reuse in popout.
  Success Criteria: Met — ⊡ button in header; popout opens 2-column window; entities and AI sync
    correctly; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][LOW] Test: Validate compare mode removal and new context panel features
  Description: All 27 existing tests pass after changes. No compare mode references remain in
    test files or any client source. Grep confirms zero matches for compareMode/comparedCountries
    across client/src.
  Success Criteria: Met — 27/27 tests pass; no compare mode references remain.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][HIGH] Feature: Persist panel positions to localStorage
  Description: usePanelDrag now loads saved position from localStorage('argus-panel-pos-{panelKey}')
    on mount via lazy useState initializer. Positions are bounds-clamped (x ≤ innerWidth-100,
    y ≤ innerHeight-40) to keep panels visible after window resize. A useEffect persists pos on
    every change. Applies to all 5 panels: event, region, person, context, body.
  Success Criteria: Met — dragging a panel and reloading the page keeps the panel at the dragged
    position; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Tracking layer error feedback
  Description: usePoll now tracks error state: error=true on non-ok response or fetch exception,
    error=false on successful data receipt. useConflictLayer similarly exposes error. Public hooks
    return { data, error } instead of bare arrays/null. Zustand store gains layerErrors record +
    setLayerError action. TrackingLayer and ConflictLayer sync hook errors to the store via
    useEffect. FloatDock DockBtn gains optional error prop that renders an amber '!' badge
    (top-left corner) distinct from the red count badge. Aircraft/satellite/ships/conflict
    buttons pass error={layerActive && layerErrors[key]} so the badge only shows while the
    layer is toggled on and its last fetch failed. Clears automatically on next success.
  Success Criteria: Met — error badge appears on layer buttons when fetch fails; clears on
    success; badge only shows when layer is active; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Loading states for EventStack and tracking layers
  Description: (1) EventStack: eventsLoaded boolean added to Zustand store; useOllamaSocket
    sets it true in .finally() of the initial REST fetch. EventStack renders 4 pulsing
    skeleton placeholder boxes (skeletonPulse keyframe) when filtered.length===0 && !eventsLoaded.
    (2) Tracking layers: usePoll and useConflictLayer each gain a loading boolean state
    (true during fetch, false after). TrackingLayer and ConflictLayer sync loading to
    layerLoading store record via useEffect. DockBtn gains optional loading prop that applies
    a loadingRing pulsing box-shadow animation when active layer is fetching.
    Both keyframes added to index.css.
  Success Criteria: Met — EventStack shows skeleton on first load until data arrives;
    FloatDock layer buttons pulse while fetching; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Agent context size guard
  Description: Added MAX_CONTEXT_CHARS = 8000 constant in useAgentQuery. In ask(), context is
    truncated to 8000 chars before being sent; a local contextTruncated boolean tracks whether
    truncation occurred. When the stream completes, if truncated, a hardcoded HTML div with
    class="context-truncated-notice" is prepended to the sanitized response HTML — this avoids
    changes to any of the 5 rendering components since they all use dangerouslySetInnerHTML.
    CSS class .context-truncated-notice added to index.css with amber color and subtle border.
  Success Criteria: Met — contexts > 8000 chars are truncated before sending; notice appears in
    any agent chat panel that rendered the response; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Bugfix: Fix hardcoded Chinese strings in PopoutPage suggested queries
  Description: Removed the file-level CATEGORY_QUERIES constant with 36 hardcoded Chinese strings.
    Added `popout.catQ`, `popout.personQ`, and `popout.contextQ` key groups to both en.json and
    zh-TW.json (47 new keys total). Added useTranslation() to PopoutPage root component.
    eventQueries, personQueries, and contextQueries useMemos now call t() with interpolation
    ({{name}}, {{n0}}, {{n1}}) and include `t` in their dependency arrays so queries re-compute
    on language switch.
  Success Criteria: Met — language switch in Config Modal updates popout suggested query labels;
    TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Keyboard Accessibility
  Description: (1) Added handleChipArrowKey() on the chip group container (role="group"
    aria-label="Category filters") — ArrowLeft/ArrowRight move focus between
    [data-cat-chip] buttons, wrapping around at edges. (2) FilterButton gains data-cat-chip
    attribute, aria-pressed={!hidden}, and aria-label including count and hidden state.
    (3) Added global :focus-visible CSS rules (buttons/anchors: 2px cyan ring + 2px offset;
    inputs/selects: 1px offset) to index.css — provides visible ring for keyboard navigation
    across all interactive elements in the app.
  Success Criteria: Met — ArrowLeft/ArrowRight navigate filter chips; aria-pressed reflects
    toggle state; focus ring visible on all focused interactive elements; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

## Completed Tasks

---

[DONE][LOW] UX: Clamp panel initial position to viewport on open
  Description: All floating panels (EventPanel, RegionPanel, PersonPanel, CelestialBodyPanel,
    MultiEntityContextPanel) use hardcoded or window-size-based defaultPos values that do not
    account for the panel's actual rendered height. On typical screens this causes panels to open
    with content below (or outside) the visible viewport, requiring the user to drag the panel
    into view before they can interact. Fix: in usePanelDrag, add a useLayoutEffect that fires
    once after first mount, reads the panel's actual offsetWidth/offsetHeight, and clamps pos
    so the entire panel fits within the viewport. Applies to all panels without changing any
    individual defaultPos values.
  Success Criteria: Met — useLayoutEffect in usePanelDrag clamps initial pos to viewport bounds
    using actual offsetWidth/offsetHeight; applies to all 5 panels with no per-panel changes;
    TS clean; no regressions.
  Retry Count: 0
  Source: USER REQUEST

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

---

[DONE][HIGH] Feature: Implement PersonPanel component
  Description: Created PersonPanel.tsx + PersonPanelBody.tsx using shared Panel base. Displays
    Wikipedia biography, thumbnail, and link via useWikiSummary hook. Uses usePanelDrag for
    floating position. Added selectedPersons[], addSelectedPerson, removeSelectedPerson,
    clearSelectedPersons to Zustand store with SelectedPerson interface.
  Success Criteria: Met — PersonPanel renders correctly with Wikipedia data; uses shared Panel
    architecture; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Support multi-person selection in PersonPanel
  Description: PersonPanel supports multiple selected persons displayed as stacked cards. Search
    via Wikipedia API (useWikiSearch hook) with real-time results. Users can add/remove persons
    individually. Search bar toggleable via ⌕ button in header.
  Success Criteria: Met — users can search and select multiple people; UI updates correctly;
    TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Integrate AI chat into PersonPanel
  Description: PersonPanel includes full AI agent section with suggested queries (context-aware
    for single/multi person), streaming chat via useAgentQuery, and agentContext built from
    selected persons list. Follows same pattern as RegionPanelAgent.
  Success Criteria: Met — AI chat UI renders in PersonPanel; responses are context-aware;
    no performance regression; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Link person entities in EventPanel using LLM
  Description: EventPanelBody uses extractPersonNames() to detect person-like actors (filtering
    out organizations via regex patterns). Person names in summary text are rendered as clickable
    LinkedText buttons. Actor chips for detected persons show a 👤 button that opens PersonPanel.
  Success Criteria: Met — person names identified and linked in EventPanel; clicking opens
    PersonPanel; minimal false positives via org filtering; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Enrich RegionPanel with related persons
  Description: RegionPanelOverview now includes a KEY FIGURES section that extracts person
    names from recent events' actors using extractPersonNames(). Shows clickable 👤 buttons
    with occurrence counts. Clicking opens PersonPanel.
  Success Criteria: Met — RegionPanel shows related persons; links open PersonPanel;
    data derived from region events; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Link person entities in CelestialBodyPanel
  Description: CelestialBodyPanel WikiSection renders Wikipedia extract via LinkedText with
    CELESTIAL_PERSONS list (17 notable astronomers/scientists). Matching names become clickable
    links that open PersonPanel.
  Success Criteria: Met — person names identified and linked in Wikipedia text; clicking opens
    PersonPanel; no excessive linking; TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Refactor: Centralize entity linking system (Person links)
  Description: Created client/src/utils/entityLinker.tsx with: LinkedText component (renders
    text with matched person names as clickable buttons, case-insensitive regex split),
    extractPersonNames() (filters actors using org/acronym regex patterns). Used by EventPanelBody,
    RegionPanelOverview, and CelestialBodyPanel.
  Success Criteria: Met — shared utility used by all three panels; consistent linking behavior;
    TS clean; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Test: Validate PersonPanel and entity linking behavior
  Description: Added PersonPanel.test.tsx with 8 tests: extractPersonNames filters orgs/short
    names correctly (3 tests), LinkedText renders plain text / buttons / handles click / multi-
    person / case-insensitive matching (5 tests). All 17 tests pass (9 Panel + 8 PersonPanel).
  Success Criteria: Met — core flows covered; no regression; 17/17 tests pass.
  Retry Count: 0
  Source: ROADMAP
