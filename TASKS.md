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

[DONE][HIGH] Security: API Input Validation
  Description: Extracted all route validation into server/src/utils/validation.ts:
    validateExportParams() — enum-checks format ('json'|'csv'), length-checks ids (≤10KB);
    validateEventId() — regex-guards :id against path traversal (/^[a-zA-Z0-9_-]{1,120}$/);
    validateLlmConfigBody() — type-checks object shape (host/model=string, temperature/contextSize=number);
    validateFeedsBody() — validates array of {url:string, enabled:boolean} objects.
    All 5 routes updated to call the relevant validator and return 400 on failure.
    Added 34 unit tests in validation.test.ts covering valid and invalid inputs for all four validators.
  Success Criteria: Met — invalid format/id/body return 400; valid requests unaffected;
    server TS clean; 53 server tests pass (was 19).
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Security: Config Endpoint Auth Guard
  Description: Added validateConfigAuth(headerValue, secret) to validation.ts — returns null
    if auth passes, error string if it fails; no-op when secret is undefined/empty.
    checkConfigAuth() helper in index.ts reads req.headers['x-config-key'] and
    process.env.CONFIG_SECRET then calls validateConfigAuth; sends 401 on failure.
    Applied to POST /api/config/llm and POST /api/config/feeds. No breaking change when
    CONFIG_SECRET is unset (self-hosted default).
    Added 6 unit tests for validateConfigAuth covering: no secret (undefined/empty),
    correct key, wrong key, missing header, empty header.
  Success Criteria: Met — CONFIG_SECRET set: missing/wrong key returns 401, correct key
    passes; CONFIG_SECRET unset: all requests succeed; server TS clean; 59 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Refactor: Structured Server Logging
  Description: Created server/src/utils/logger.ts — env-gated logger with LOG_LEVEL
    (debug|info|warn|error|silent, default 'info'). Replaced all 28 console.* calls across
    index.ts, sqlite.ts, ollama.ts, scraper.ts, socket.ts, retention.ts, summary.ts,
    configStore.ts, and llmConfig.ts with logger.debug/info/warn/error.
    Per-connection socket.io events downgraded to logger.debug (high-frequency).
    Ollama per-article classification log downgraded to logger.debug.
    Added 7 tests in logger.test.ts: info suppresses debug, debug level emits debug,
    warn uses console.warn, error uses console.error, silent suppresses all, tag included.
  Success Criteria: Met — logger.ts created; 0 console.* in server src outside tests;
    LOG_LEVEL=silent suppresses all output; server TS clean; 66 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Accessibility: Button aria-labels
  Description: Added aria-label to 10 interactive elements across 5 files:
    EventPanelBody.tsx — note SAVE/CLEAR/ESC buttons (aria-label="Save note",
    "Clear note", "Cancel note"); CategoryFilterBar.tsx — sort <select> (aria-label
    mirrors title="Sort order") and ✕ clear-search button (aria-label="Clear search");
    PersonPanel.tsx — ⊕ add-context, ⌕ search toggle, ⊡ popout buttons (aria-label
    mirrors dynamic title text); RegionPanel.tsx — ⊕ add-context and ⊡ popout (same
    pattern); CelestialBodyPanel.tsx — ⊕ add-context button.
  Success Criteria: Met — all icon-only/symbol buttons have aria-label; no existing
    functionality changed; TS clean; 58 client tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Test: useOllamaSocket hook unit tests
  Description: Added client/src/hooks/__tests__/useOllamaSocket.test.ts with 8 tests:
    (1) initial fetch populates events + sets eventsLoaded; (2) eventsLoaded=true even on
    fetch failure; (3) connect event sets socketConnected=true; (4) disconnect sets false;
    (5) new_event appends to store; (6) duplicate new_event is deduplicated; (7) intel_brief
    updates store; (8) reconnect triggers second fetch; (9) unmount disconnects socket.
    Mocks socket.io-client via vi.mock() with a factory returning per-test mock sockets.
    Also removed 4 console.log/warn calls from useOllamaSocket.ts.
  Success Criteria: Met — 8 new tests; 67 client tests pass total; TS clean.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Perf: Lazy-load i18n locale files
  Description: Installed i18next-http-backend. Copied locale JSON files from
    client/src/i18n/locales/ to client/public/locales/{lng}/translation.json so they are
    served as static assets. Removed static import of both locale files from i18n/index.ts;
    added HttpBackend plugin with loadPath='/locales/{{lng}}/translation.json' and
    initImmediate=false (waits for active locale before ready). Only the active locale
    (zh-TW at startup) is fetched; en.json loaded only if user switches language.
    Tests unaffected — they mock react-i18next directly.
  Success Criteria: Met — static JSON imports removed; locale files in public/; TS clean;
    67 client tests pass.
  Retry Count: 0
  Source: ROADMAP

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

[DONE][HIGH] Feature: Service health status indicator
  Description: Created server/src/services/healthTracker.ts — tracks ollamaOnline (30s poll
    via Ollama.list()), lastScraperRun (set by scraper on each run), and analyzedCount
    (from DB). /api/health endpoint now returns this full snapshot. scraper.ts calls
    setLastScraperRun() after each fetchAllFeeds() run. startOllamaHealthPoll() called in
    server main(). Client: useServiceHealth hook polls /api/health every 60s, computes
    healthy = ollamaOnline && !scraperStale (stale = >45min since last run). FloatDock shows
    amber ⚙ badge with "OLLAMA OFFLINE" or "SCRAPER STALLED" label when unhealthy.
  Success Criteria: Met — badge visible when services degraded; absent when healthy;
    server+client TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Intel Brief History
  Description: Added intelBriefHistory array to Zustand store (max 5, deduped by id).
    setIntelBrief now pushes new brief to the front of history and trims to last 5.
    FloatDock brief modal renders a "PREVIOUS BRIEFS" section below the current brief
    when history.length > 1. Each past entry is a <details> element with timestamp
    summary and full HTML body on expand, shown in a scrollable container.
  Success Criteria: Met — up to 5 past briefs browsable via collapsible rows in BRIEF
    modal; deduplication prevents duplicate entries; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Perf: Merge TrackingLayer error+loading useEffects
  Description: Reduced from 6 separate useEffect calls to 3 — each effect now updates both
    error and loading state for a single layer in one call, reducing the number of potential
    extra store update cycles per hook state change.
  Success Criteria: Met — 3 useEffects instead of 6; same observable behavior; TS clean;
    27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Rate limiting on /api/agent endpoint
  Description: Created server/src/services/rateLimiter.ts — in-memory per-key token-bucket
    (Map with count + resetAt). Self-cleaning via setInterval(5min) purges expired entries.
    /api/agent now extracts client IP from x-forwarded-for or socket.remoteAddress, checks
    checkRateLimit('agent:{ip}', 5, 30_000) and returns 429 + { error: '...' } if exceeded.
  Success Criteria: Met — 6th request within 30s returns 429; normal usage unaffected;
    server TS clean; 27/27 client tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Config Modal scraper status display
  Description: The Config Modal Feeds tab shows feed URLs and enable/disable toggles, but
    operators cannot see when feeds last ran or if any individual feed failed. Add feed health
    state to healthTracker (per-feed: lastSuccess, lastError, errorMessage). Show a colored
    status dot (green/red) and last-success timestamp next to each feed in the Config Modal.
  Success Criteria: Config Modal Feeds tab shows per-feed status. Green when last scrape OK,
    red with error snippet when last scrape failed. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Feature: Event archive export endpoint
  Description: Add GET /api/events/export?format=json|csv to the server. JSON returns full
    analyzed articles array. CSV maps to columns: id, title, category, intensity, location,
    heat_score, published_at, source, url. Client EventPanel or Config Modal exposes a
    "Download Archive" button that triggers the download.
  Success Criteria: /api/events/export?format=json downloads a JSON file; ?format=csv
    downloads a CSV file with correct headers. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Socket reconnection catch-up
  Description: useOllamaSocket now listens to socket.io 'reconnect' event and calls
    fetchEvents() to re-fetch all events from REST, recovering any events missed during
    the disconnect window. Added socketConnected: boolean + setSocketConnected to Zustand
    store; set true on 'connect', false on 'disconnect'. FloatDock status dot now reflects
    socket state: green (2s pulse) = connected, amber (0.8s pulse) = disconnected/reconnecting.
  Success Criteria: Met — reconnect triggers REST catch-up; dot reflects connection state;
    TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Toast notification deduplication
  Description: Toast interface gains count: number field. When a new HIGH/CRITICAL event
    arrives, arrival logic checks for an existing non-exiting toast with the same category.
    If found: increments count and resets dismiss timer (scheduleExit now always resets timer
    instead of skipping if one exists). If not found: creates new toast as before. ToastItem
    shows a count badge (×N) and generic "CATEGORY EVENTS" label when count > 1.
  Success Criteria: Met — rapid same-category arrivals merge into one toast with badge;
    timer resets; different categories still separate; TS clean; 27/27 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Feature: Streaming cut-off notice
  Description: If the Ollama SSE stream ends without sending 'data: [DONE]\n\n' (e.g.
    mid-response server crash or timeout), the agent response is left as partial HTML with
    a still-active cursor. Detect stream completion without [DONE] and append a visible
    "(response interrupted)" notice, mark streaming: false, and show an amber color on that
    entry.
  Success Criteria: Simulating early stream close (closing res before sending [DONE]) causes
    the notice to appear. Normal responses unaffected. TS clean; all tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: React error boundaries
  Description: No error boundaries exist in the app. A render error in any component silently
    blanks the entire app with no recovery path. Add an ErrorBoundary class component that
    catches errors, shows a minimal inline "Panel crashed — click to retry" message, and
    lets the user reset. Wrap: (1) the entire HUD layer in App.tsx as a top-level safety net;
    (2) individual floating panels (EventPanel, RegionPanel, PersonPanel, CelestialBodyPanel,
    MultiEntityContextPanel) with per-panel boundaries for finer granularity.
  Success Criteria: Throwing inside a panel shows a compact error card without crashing the
    rest of the UI. "Retry" button resets that panel's boundary. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Clipboard write fallback
  Description: EventPanel.tsx export button calls navigator.clipboard.writeText() with
    .catch(() => {}). In non-HTTPS contexts (e.g. local network deployments) the clipboard
    API is unavailable and the copy silently fails. Add a fallback: if clipboard throws,
    create a temporary <textarea> with the text, select it, and execCommand('copy') — or
    show a modal with the text pre-selected for manual copy.
  Success Criteria: Export button works in non-HTTPS context (simulate by stubbing clipboard).
    User sees either successful copy or a clear fallback prompt. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Test: Hook unit tests for useFilteredEvents and useAgentQuery
  Description: useFilteredEvents contains the core event filter logic (category, time-range,
    search, bookmarks) but has no dedicated tests. useAgentQuery has context truncation and
    streaming state but is untested. Add Vitest tests: (1) useFilteredEvents — test each
    filter in isolation and in combination; (2) useAgentQuery — test MAX_CONTEXT_CHARS
    truncation flag, error handling, clear() behavior.
  Success Criteria: ≥8 new tests for useFilteredEvents; ≥5 for useAgentQuery; all pass;
    no regression on existing 27 tests.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Page Visibility polling pause
  Description: useTrackingLayers.ts usePoll() and useConflictLayer.ts continue polling their
    respective endpoints while the browser tab is in the background. This wastes network
    bandwidth. Add a Page Visibility API listener: when document.hidden is true, skip the
    scheduled fetch and delay; resume when the tab becomes visible again.
  Success Criteria: Switching to a background tab stops fetch calls; returning to the tab
    resumes polling. TS clean; 43 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Webhook event ingestion endpoint
  Description: Add POST /api/events/webhook endpoint. Accepts { title, category, intensity,
    location_label, actors, tags, source, url, published_at } payload. Validates required
    fields, generates an id, and inserts directly into the analyzed articles table (bypassing
    Ollama classification). Requires X-Webhook-Key header matching WEBHOOK_SECRET env var.
    Returns 401 if key missing/wrong; 200 with the created event id on success.
  Success Criteria: Correctly keyed POST creates an event visible in ARGUS feed. Wrong key
    returns 401. Missing required fields return 400. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] UX: Event search term highlighting
  Description: When a searchQuery is active, the matched terms in EventStack tooltip titles
    and in EventPanelBody title + summary text should be visually highlighted. Wrap matched
    substrings in <mark class="search-highlight"> elements. Add .search-highlight CSS class.
  Success Criteria: Typing a query shows highlighted matches in tooltips and event panel
    title. Clears when query is cleared. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Test: Server-side unit tests setup
  Description: Server has no test suite. Add vitest as a dev dependency to server/package.json.
    Add test script. Write tests for: rateLimiter (token bucket logic, window reset, expiry
    cleanup), healthTracker (recordFeedSuccess/Error, getHealthSnapshot output), and
    useAgentQuery equivalent server validation (context slice).
  Success Criteria: npm test in server/ runs and ≥8 server tests pass. TS clean.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Security: Rate limit /api/agent-vision endpoint
  Description: /api/agent-vision has no rate limiting, unlike /api/agent. A vision request
    processes a base64 image through Ollama which is more expensive than text. Apply the same
    checkRateLimit('vision:{ip}', 5, 30_000) guard at the top of the agent-vision handler.
  Success Criteria: 6th vision request within 30s returns 429. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Custom filter presets
  Description: Let operators save their current active filter state (hiddenCategories +
    timeRangeFilter + searchQuery) as a named preset. Store up to 5 presets in Zustand
    (persisted to localStorage 'argus-filter-presets'). Show preset chips in CategoryFilterBar
    below the category chips; clicking applies all filter values at once. Add a "Save preset"
    button (appears when filters are non-default) and "×" to delete each preset.
  Success Criteria: Saving a preset and reloading the page preserves it. Clicking applies
    all three filter dimensions simultaneously. TS clean; 43+ tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] UX: Localize toast intensity labels
  Description: ToastContainer.tsx renders toast.event.intensity ('CRITICAL', 'HIGH') as a
    raw string label. These should use i18n keys (event.intensity.CRITICAL, etc.) so they
    localize when the user switches language. Add keys to en.json and zh-TW.json.
  Success Criteria: Language switch updates intensity labels in toasts. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Perf: Lightweight Ollama health ping
  Description: startOllamaHealthPoll() calls client.list() every 30s — this returns all
    models and can be slow on first load. Replace with a lightweight HEAD/GET request to
    the Ollama base URL (e.g. GET {host}/api/tags with a 3s timeout) to check connectivity
    without downloading the full model list.
  Success Criteria: Health check still accurately detects Ollama offline; faster response
    time. TS clean; server tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Feature: Export filtered events
  Description: GET /api/events/export currently ignores which events the user is actually
    viewing — it exports everything in the DB. Add an optional ?ids= query parameter:
    when provided (comma-separated list of event IDs), server filters the articles query to
    only those IDs. Client EventPanel (or Config Modal) can pass the currently-filtered IDs
    from the Zustand store's filtered events list.
  Success Criteria: Passing ?ids=id1,id2 returns only those events in JSON/CSV. Omitting
    ?ids still exports all. TS clean; server + client tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Personal event notes
  Description: Add a short personal note field (max 500 chars) to each event, persisted to
    localStorage as 'argus-event-notes' Record<id, string>. Zustand store gains setEventNote
    action. EventPanelBody shows a small ✏ note section below the title: collapsed by default,
    expands to a textarea on click, auto-saves on blur.
  Success Criteria: Notes persist across reload. Note icon appears when a note exists.
    TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Webhook curl helper in Config Modal
  Description: When the server reports webhookEnabled: true in the health snapshot, Config
    Modal shows a "WEBHOOK" section with the endpoint URL and a "Copy curl" button that
    copies a sample curl command (with placeholder key) to the clipboard.
    Requires adding webhookEnabled boolean to healthTracker getHealthSnapshot().
  Success Criteria: Webhook section appears in Config Modal when WEBHOOK_SECRET is set.
    Copy curl puts a usable curl command in clipboard. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Feature: Event arrival rate sparkline
  Description: Compute a 12-bar hourly histogram from the events array timestamps (current
    hour and 11 previous hours). Render as a tiny SVG bar chart (12 × ~4px bars) next to
    the event count badge in FloatDock's event feed button. Color gradient: dim when 0,
    brighter with more events.
  Success Criteria: FloatDock event count button shows sparkline bars reflecting actual
    event distribution. Updates when new events arrive. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Security: Add Helmet.js security headers
  Description: The Express server currently sends no security headers. This leaves the app
    vulnerable to clickjacking, MIME-sniffing, and other browser attacks. Add `helmet` as
    a dependency and apply it as middleware. Customize CSP to allow the client origin and
    any self-hosted Ollama endpoint.
  Success Criteria: Server responses include X-Frame-Options, X-Content-Type-Options,
    and Referrer-Policy headers. TS clean; server tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: Keyboard shortcuts help overlay
  Description: Currently the only way to know about keyboard shortcuts (/, Escape, b, [, ],
    i) is to read the source code. Add a keyboard shortcut help overlay triggered by pressing
    '?' when not in an input. Show as a floating modal with all shortcuts listed. Also add a
    '?' DockBtn in FloatDock that opens it.
  Success Criteria: Pressing '?' opens the shortcuts overlay. All current shortcuts listed.
    Closes on Escape or clicking outside. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Feature: User-configurable event sort order
  Description: EventStack currently always sorts by published_at DESC. Add a sort dropdown
    to CategoryFilterBar (options: NEWEST, HEAT ↓, INTENSITY ↓). Store in Zustand
    `eventSortOrder`. useFilteredEvents applies the chosen sort before returning.
  Success Criteria: Selecting HEAT shows highest heat_score events first; INTENSITY shows
    CRITICAL first. Selection persists in store. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Perf: Memoize EventStack IconItem
  Description: EventStack renders all visible icon items on every filtered-events update.
    Wrap IconItem in React.memo with a comparator that only re-renders when event.id,
    isNew, nudgeGen, or searchQuery changes. This prevents all visible items from re-rendering
    when a single new event arrives.
  Success Criteria: React DevTools profiler shows fewer re-renders per new event. No visual
    regression. TS clean; tests pass.
  Retry Count: 0
  Source: ROADMAP

---

---

[DONE][HIGH] Deployment: Dockerfile and docker-compose
  Description: Created multi-stage Dockerfile (node:22-alpine deps → client Vite build →
    server tsc build → lean production image with npm ci --omit=dev). docker-compose.yml
    uses argus_data named volume at /app/data for both SQLite (DB_PATH env var) and
    config.json. .dockerignore excludes node_modules, dist, .env, *.db. Added DB_PATH env
    var support to server/src/db/sqlite.ts (defaults to process.cwd()/intelligence.db).
    Added production static file serving to server/src/index.ts (express.static +
    catch-all for React router; API routes take precedence). Updated .env.example with
    OLLAMA_TEMPERATURE, OLLAMA_CTX, LOG_LEVEL, CONFIG_SECRET, DB_PATH.
  Success Criteria: Met — Dockerfile/docker-compose.yml/.dockerignore present; DB_PATH
    env var honoured; static serving in production mode; .env.example complete; TS clean;
    66 server tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] CI: GitHub Actions test and build workflow
  Description: Created .github/workflows/ci.yml with two parallel jobs: (1) client — installs
    deps from workspace root, runs Vitest + Vite build; (2) server — installs deps from
    workspace root, runs Vitest + tsc build. Both use node:22, npm cache keyed on
    package-lock.json. Triggers on push to main and pull_request targeting main.
  Success Criteria: Met — .github/workflows/ci.yml present; jobs defined; Node 22; npm cache.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][HIGH] Security: Rate limit /api/events/webhook and /api/events/export
  Description: Applied checkRateLimit to POST /api/events/webhook (10 req / 60s per IP —
    rate check placed before auth check to prevent key-enumeration timing) and GET
    /api/events/export (5 req / 60s per IP). IP extracted from x-forwarded-for or
    socket.remoteAddress, consistent with existing agent/vision guards.
  Success Criteria: Met — rate limits applied to both endpoints; TS clean; 66 server tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Test: Server worker unit tests
  Description: scraper.ts, ollama.ts, summary.ts, and retention.ts have no test coverage.
    Add server/src/__tests__/scraper.test.ts (feed URL dedup via hash, malformed item skipping)
    and server/src/__tests__/summary.test.ts (prompt building, truncation, Ollama-offline
    no-op). Use vi.mock() for Ollama client and node-fetch.
  Success Criteria: ≥8 new server tests pass; total server test count ≥27; TS clean.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][LOW] Perf: Paginate /api/events endpoint
  Description: GET /api/events returns every analyzed article on each call — unbounded as the
    DB grows. Add optional ?limit=N&offset=M query params (defaults: limit=500, offset=0).
    Client useOllamaSocket initial fetch requests limit=500 (no observable change). Validate
    limit ≤ 1000 via validateExportParams-style check.
  Success Criteria: ?limit=10&offset=0 returns 10 events; ?limit=10&offset=10 returns next 10;
    omitting params returns up to 500 (default); server TS clean; server tests updated.
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

---

[DONE][HIGH] Accessibility: Modal focus trapping
  Description: Created client/src/hooks/useFocusTrap.ts — accepts containerRef + enabled boolean,
    traps Tab/Shift+Tab within focusable elements, restores focus on unmount/disable.
    Applied to ConfigModal.tsx (existing cardRef), KeyboardShortcutsModal.tsx (new modalRef),
    and FloatDock.tsx Intel Brief modal (new briefModalRef + useFocusTrap(briefModalRef, showBrief)).
    All three receive role="dialog" aria-modal="true" ARIA attributes.
  Success Criteria: Met — Tab cycles within modals; Escape/close restores focus; TS clean; 58 client tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Accessibility: Panel ARIA roles
  Description: Panel.tsx base component now uses useId() to generate a stable titleId, passes
    id={titleId} to the title span, and renders role="dialog" aria-modal="true"
    aria-labelledby={titleId} on the outer container div. All 5 floating panels
    (EventPanel, RegionPanel, PersonPanel, CelestialBodyPanel, MultiEntityContextPanel)
    inherit ARIA roles automatically via Panel.tsx.
  Success Criteria: Met — all panels have dialog role; title spans have matching ids; TS clean; 58 tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][MEDIUM] Test: Hook integration tests for useServiceHealth and useConflictLayer
  Description: Added client/src/hooks/__tests__/useServiceHealth.test.ts (7 tests: default
    state, healthy response, unhealthy ollama, stale scraper, fetch error, hidden skip,
    visibility resume) and useConflictLayer.test.ts (8 tests: disabled state, loading flag,
    success, 503 error, network error, disable-after-load, hidden skip, visibility resume).
    Uses vi.spyOn(globalThis, 'fetch') + real timers + waitFor pattern.
  Success Criteria: Met — 15 new tests pass; 58 client tests pass total; TS clean.
  Retry Count: 0
  Source: ROADMAP

---

[DONE][LOW] Test: Server SQLite integration test
  Description: Added server/src/__tests__/sqlite.test.ts with 9 tests using in-memory
    better-sqlite3 DB (createTestDb() runs schema.sql against :memory:). Tests cover:
    insertWebhookEvent (row persisted, dedup via OR IGNORE, JSON arrays), getRelatedEvents
    (empty when no overlap, actor overlap scoring, location label scoring),
    deleteExpiredArticles (past-expiry delete, low-heat delete, non-expired preserved).
    Dates use SQLite native format (YYYY-MM-DD HH:MM:SS) via toSqliteDt() helper.
  Success Criteria: Met — 9 new server tests pass; 19 server tests pass total; TS clean.
  Retry Count: 0
  Source: ROADMAP
