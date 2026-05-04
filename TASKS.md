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

---

[DONE][HIGH] Test: Zustand store unit tests
  Description: Add comprehensive unit tests for the Zustand store's core business logic:
    addEvent deduplication (same id should not be added twice), toggleHiddenCategory
    (add when absent, remove when present), toggleBookmark (add/remove + localStorage write),
    bringToFront z-order (clicked panel gets max+1), setSearchQuery and setTimeRangeFilter
    simple setters, setActivePanelId z-bump for event panel.
  Success Criteria: Met — store.test.ts created with 25 tests; total suite 34/34 pass;
    vitest exits 0.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][HIGH] Bugfix: Events-load error state and retry banner
  Description: Silent fetch failure in useOllamaSocket leaves EventStack showing an empty
    list with no user feedback. Add eventsLoadFailed: boolean + setEventsLoadFailed to
    Zustand store. In useOllamaSocket catch block, call setEventsLoadFailed(true). In
    EventStack, when events.length === 0 && eventsLoadFailed, show a small amber banner
    "Connection error — retrying…" at the top of the stack. Reset on successful setEvents().
  Success Criteria: Banner appears in EventStack when initial fetch fails; disappears when
    events arrive; no new TS errors; existing 9 tests still pass.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Refactor: Consolidate duplicate CATEGORY_COLOR / CATEGORY_ICON definitions
  Description: EventPanelBody.tsx and PopoutPage.tsx each define their own inline
    CATEGORY_COLOR and CATEGORY_ICON maps instead of importing from categoryConfig.ts.
    Remove the inline copies and import the shared constants instead.
  Success Criteria: No inline CATEGORY_COLOR / CATEGORY_ICON objects in EventPanelBody.tsx
    or PopoutPage.tsx; all references use categoryConfig.ts; no visual change; TS clean;
    existing tests pass.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][LOW] Refactor: Decompose RegionPanel.tsx (592 lines)
  Description: RegionPanel.tsx is 592 lines with too many responsibilities. RegionPanelAgent
    and RegionPanelOverview already exist as separate files. Extract the compare-mode section
    (CompareCard + dual-column grid) into a dedicated RegionPanelCompare.tsx. This will reduce
    RegionPanel.tsx to below 400 lines with clearer boundaries.
  Success Criteria: RegionPanelCompare.tsx created; RegionPanel.tsx imports it; region panel
    renders identically; TS clean; existing tests pass.
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
