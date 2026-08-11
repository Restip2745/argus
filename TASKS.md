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

[TODO][HIGH] Feature: Market context on ECONOMIC events
  Description: The entity panel now prices listed companies (see the DONE entry below), but the
    event panel does not. Relevance there is a content judgement — "is this article about a
    company" cannot be derived from category, coordinates or actors — so it needs the Ollama
    pass. Add a `market_link` field to the analysis prompt in `server/src/services/ollama.ts`
    alongside the existing category/intensity/actors/reliability output:
    `{ entities: string[], relation: "SUBJECT" | "AFFECTED" | "NONE" }`. The model names
    companies only; symbol resolution stays with the deterministic Wikidata path in
    `client/src/utils/listing.ts`, because a hallucinated ticker renders as a perfectly normal
    price for the wrong company. Cap at 3 entities. Prompt must say "return NONE when unsure" —
    a false positive costs far more than a miss here. Nullable column; a failure to parse the
    field must not affect the fields that already work. Validate by replaying the modified
    prompt over existing DB articles and counting false positives BEFORE building any UI.
    NOTE: do commodities first. Since the status-bar strip landed there is a fixed set of four
    instruments with strong geographic and categorical cues — an ARMED_CONFLICT event in the
    Gulf implies crude without any inference about which company is involved — so an event's
    commodity link is far more tractable than its company link, and getting the prompt shape
    right on the easy case first de-risks the hard one.
    NOTE: freight belongs in this task rather than in the status bar, decided after checking
    what is obtainable. The indices themselves are not: BDI is licensed by the Baltic Exchange
    and absent from the quote upstream, while SCFI and Drewry's WCI are weekly and published
    only as web pages. More to the point, a weekly series in a bar whose unit is the daily
    change would read 0.00% six days in seven — freight moves on a scale of weeks and ARGUS's
    windows are 6h and 24h. What freight is actually good for is confirmation rather than
    alarm: crude and shipping equities react to a strait closing within hours, freight takes
    two or three weeks and answers the more valuable question of whether the disruption held.
    That form needs a series, not a spot quote — a `/api/market/history` endpoint and a
    multi-week window on the event panel — which is new infrastructure, not a table entry.
    `BDRY`, a dry bulk freight ETF, does quote daily through the existing path and is the only
    free daily proxy found; if it is ever used it must be labelled as the ETF it is, since fund
    roll and tracking error drift it away from the index it stands in for.
  Success Criteria: `market_link` present on newly analysed articles; false-positive rate
    measured on a replay of ≥200 stored articles and recorded here; existing analysis fields
    unchanged; no UI work in this task.
  Retry Count: 0
  Source: USER REQUEST

---

[TODO][LOW] Data: Thin foreign lines survive the one-per-country rule
  Description: Toyota resolves to `TYT.L`, a London line quoted in JPY whose daily change
    disagrees with Tokyo's (-2.80% against +2.14% on the same day). It is a real listing in a
    country no other listing occupies, so neither the one-per-country cap nor the
    `foreignSecondary` flag in `client/src/data/stockExchanges.ts` removes it. Frankfurt was
    handled with that flag because it lists foreign receipts in bulk; London cannot be, since
    it is the primary market for a great many companies. Possible approach: drop a listing
    whose currency is not one the exchange normally trades in. Low frequency — one row in a
    twelve-company sample — so weigh the added rule against leaving it.
  Success Criteria: Either `TYT.L` no longer appears for Toyota with no regression to the
    HSBC / TSMC / Shell / AstraZeneca cases, or a decision recorded here to accept it.
  Retry Count: 0
  Source: USER REQUEST

---

[TODO][LOW] Data: Missing exchanges in the QID table
  Description: `EXCHANGE_BY_QID` in `client/src/data/stockExchanges.ts` has no entry for
    Tadawul, so Saudi Aramco resolves to no listing at all. The QID was not captured during the
    original build because Wikidata's search API rate-limited the lookup loop. Same gap likely
    applies to other venues never sampled. Resolve the QIDs with a throttled
    `wbsearchentities` call (the earlier attempt failed at ~1 req/s; use 4s spacing) and add
    the rows. Each entry needs code, Yahoo suffix, country QID, and `pad` where the venue uses
    fixed-width numeric codes.
  Success Criteria: `npx tsx ../scripts/check-listings.ts "Saudi Aramco"` returns a quote;
    existing listing tests still pass.
  Retry Count: 0
  Source: USER REQUEST

## Completed Tasks

---

[DONE][MEDIUM] Feature: Commodity strip in the global status bar
  Description: Brent, WTI, gold and copper now render as a fifth status bar module, beside
    posture / trend / tempo / coverage. These sit in the global bar rather than in a panel
    because unlike a share price they belong to nobody — "Brent +10%" is a statement about the
    world, and the events that move it are already tracked under ARMED_CONFLICT, POLITICAL and
    ENVIRONMENT. Both crude benchmarks are carried on purpose: the spread between them
    separates a regional supply problem from a global one. Fixed table in
    `client/src/data/commodities.ts`; reuses `/api/market/quote` and `useQuotes`, which gained
    an optional `refreshMs` because the bar never unmounts and would otherwise hold whatever
    numbers it loaded with. No Wikidata resolution and no model involvement — the entire hard
    half of the equity work is absent here.
    Two things surfaced only on the running app. The proxy's `isValidSymbol` rejected `=`, so
    every front-month future (`CL=F`) was dropped with nothing logged, the proxy being unable
    to distinguish a malformed symbol from one it had no rule for; `commodities.test.ts` now
    checks each table entry against a copy of that pattern so a future addition cannot fail the
    same silent way. And the module is ~295px against 1574px already spent, so the bar
    overflowed at 1680 — it now hides below 1900 instead, honouring the bar's own rule that a
    module is dropped rather than squeezed.
    Change is shown, level is not: the bar asks what moved, and the price sits on the tooltip
    with its currency and the time it was priced.
  Success Criteria: Met — verified in the running app at 1920 (module visible, no overflow, in
    both locales) and at 1680 (hidden, no overflow); live values rendered with copper red
    against the others green under the default green-up convention. client 340 tests /
    server 103 tests pass; both typecheck clean.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][HIGH] Feature: Stock listings and closing prices on the entity panel
  Description: The entity panel now shows where a company's shares last closed, one row per
    market, and nothing at all for the entities that are not listed companies — which is almost
    all of them. Three parts. (1) Resolution: `client/src/utils/listing.ts` +
    `client/src/hooks/useListing.ts` read Wikidata `P414`/`P249` into quote symbols via the
    exchange table in `client/src/data/stockExchanges.ts` (38 venues). The QID comes free from
    `wikibase_item`, already in the Wikipedia summary the panel fetches. Uses `wbgetclaims` per
    property rather than a whole-entity fetch — TSMC's full claim set is 71 KB, its P414 alone
    is 2.6 KB, and a non-company answers with an empty object. No model is ever asked for a
    ticker. (2) Proxy: `server/src/services/market.ts` + `GET /api/market/quote?symbols=`,
    keyless via Yahoo's chart endpoint, 10-minute cache, ≤8 symbols, unresolvable symbols
    omitted rather than reported. (3) UI: `ListingChip` in the entity panel, plus an `upColor`
    setting ('green' | 'red', default green) so a reader can pick the US/EU or TW/JP colour
    convention.
    Four guards came out of running the real pipeline over sample entities rather than from
    design: a staleness cut (Samsung's dormant London GDR answered with a July 2022 close and
    a -71% change that rendered exactly like a live quote); one listing per country (Samsung's
    preferred share prices differently from its common, and Unilever's fourth listing is PT
    Unilever Indonesia, a different company); a `foreignSecondary` flag for Frankfurt, which
    lists foreign receipts in bulk whose daily change disagrees with the home market by six
    points; and zero-padding for fixed-width venues (Wikidata records Tencent as "700", which
    resolves nowhere — the exchange writes 0700).
    Rows carry the date, not the clock time. Time was tried first and the row overflowed the
    panel at three listings, clipping the date column — the one part that had to be legible.
    Full timestamp moved to hover. The date is the point: AstraZeneca showed +3.5% in London
    and -4.9% in New York simultaneously, both correct, one today and one the previous session.
  Success Criteria: Met — verified in the running app: HSBC renders LSE/NYSE/HKEX in three
    currencies with two different dates and no clipping (row scrollWidth 271 = clientWidth);
    a person entity renders no market section; the settings toggle flips fall colours from
    rgb(239,90,90) to rgb(47,207,143) live and persists. `scripts/check-listings.ts` reports
    2–3 listings per company with no dead or wrong-company rows across a 12-company sample.
    client 334 tests / server 102 tests pass; both typecheck clean.
  Retry Count: 0
  Source: USER REQUEST

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
