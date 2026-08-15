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

[TODO][LOW] i18n: Chinese entity names arrive Simplified
  Description: The entity panel and the new company rows render Chinese names in Simplified —
    洛克希德·马丁 rather than 洛克希德·馬丁 — while the app is zh-TW throughout and the
    analysis prompt explicitly asks for Taiwanese conventions. The cause is
    `useWikiSummary`, which reads zh.wikipedia's REST summary; that endpoint serves the
    Simplified variant and ignores `Accept-Language`, verified against `zh-tw` and
    `zh-Hant-TW`. Fixing it means either moving the Chinese path to the action API, which
    takes a `variant=zh-tw` parameter, or converting on the client, which is a dependency for
    a display concern. Pre-existing and everywhere the panel shows a Chinese title, not
    specific to the company rows.
  Success Criteria: Chinese entity titles render in Traditional characters, with no extra
    request per lookup.
  Retry Count: 0
  Source: USER REQUEST

---

## Completed Tasks

---

[DONE][MEDIUM] Feature: Company rows from an event's actors
  Description: Listed companies named among an event's actors now price on the panel. Derived
    from `actors` rather than from a new model field: "which company is this about" is open
    vocabulary, and the model had already proved it cannot hold a finer distinction when the
    commodity link's `relation` field had to be removed. The actors are extracted anyway, and
    putting them through the same deterministic Wikidata path the entity panel uses costs no
    model accuracy and needed no replay.
    Measured before building, on fifteen real actor names from the corpus: three resolved —
    Nvidia, Lockheed Martin, Northrop Grumman — and none resolved wrongly. "ICE" is the case
    worth knowing: it shares a ticker with Intercontinental Exchange, and the language ladder
    took it to the US law enforcement agency, which has no listing. Wikidata's own gaps are the
    limit, not false positives; Rocket Lab and CoreWeave are public and carry no exchange claim.
    Roughly 3-4% of events should show a row, against 6% for commodity links.
    People are deliberately not filtered out of the candidates. `extractPersonNames` looks like
    the tool for it and is its opposite — a residue after removing countries, descriptors and
    names carrying an organisation word — so "Nvidia" and "Lockheed Martin" both come back as
    people for want of a "corp". Nothing local separates a one-word company from a one-word
    surname; a person costs one cached summary and then `useListing` sees the kind and never
    calls Wikidata. Countries are filtered, being the largest group in the vocabulary.
  Success Criteria: Met - verified in the running app on "U.S. expands missile production",
    whose actors are United States, Northrop Grumman, Lockheed Martin and L3Harris: the
    country is dropped and the other three render NOC 585.87, LMT 608.68 and LHX 291.82 with
    exchange and ticker on the tooltip, unclipped. client 422 tests pass; typecheck clean.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][LOW] Data: Toyota's London line no longer duplicates Tokyo
  Description: `TYT.L` is a London listing of Toyota quoted in yen. It is not a second market:
    it prints the same 3020 JPY as Tokyo, so the row was the same price twice - and the two
    disagreed whenever London's previous close went stale, once showing -2.80% against Tokyo's
    +2.14% on the same day. Both symptoms, the duplicate and the contradiction, come from that
    one fact.
    `dropDuplicateCurrencies` keeps the best-ranked quote per currency. Currency is the signal
    because it is what makes a listing a separate market: HSBC in London, New York and Hong
    Kong is three currencies and three real prices, and every multi-listed company in the
    sample worth showing has one currency per venue. It needs no per-exchange data, which
    matters - an expected-currency column would be forty entries whose mistakes would drop
    *legitimate* listings, a worse failure than the one being fixed. The input is already
    ranked home-market first, so keeping the first of each currency keeps Tokyo.
  Success Criteria: Met - Toyota renders TSE 7203 in JPY and NYSE TM in USD, with TYT.L gone;
    HSBC, TSMC, Shell and AstraZeneca keep every row. Two ListingChip fixtures had quoted an
    ADR in its home currency and were corrected to USD, which is what the real one pays in.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][LOW] Data: Gulf exchanges added to the QID table
  Description: `EXCHANGE_BY_QID` had no Gulf venue, so Saudi Aramco - among the largest listed
    companies on Earth - resolved to nothing. Added Tadawul (Q2006583, `.SR`, four-digit codes
    zero-padded), Abu Dhabi (Q4119825, `.AD`), Dubai (Q1973019, `.DU`) and Qatar (Q1648198,
    `.QA`). The QIDs were missed originally because the lookup loop was rate-limited; resolved
    this time at four seconds' spacing, as the earlier note advised.
  Success Criteria: Met - the entity panel renders Tadawul 2222 at 26.48 SAR for Saudi Aramco,
    and `check-listings.ts` quotes it. Emaar resolves to a Dubai symbol the upstream will not
    price, which renders as nothing, the same as before.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][MEDIUM] Feature: Freight as post-event confirmation
  Description: A freight row now sits under the commodity rows on maritime events, measured
    since the story published like the rows above it. It earns its place only where the story
    is actually about the sea — freight is the price of routes, and a commodity link alone
    does not make a story maritime.
    The recorded plan named `BDRY` as the only free daily proxy. That was wrong twice over.
    `BWET`, a tanker freight ETF, exists and quotes daily through the same path — and BDRY
    covers dry bulk only, so building on it would have priced the Hormuz tanker disruptions
    that motivated this feature off iron ore and coal. `client/src/data/freight.ts` now routes
    crude and gas to tankers, wheat and copper to dry bulk, and metals to nothing at all, since
    no shipping market prices bullion. Commodities that disagree about segment yield no row:
    picking one would assert a focus the link does not have.
    Both instruments are ETFs holding freight futures, and the row says so — fund roll and
    tracking error drift them from the rate they stand in for. That caveat is the difference
    between a proxy and a claim, and it is only rendered when a freight quote actually arrived.
    PREREQUISITE FIXED: `isMaritimeEvent` matched keywords with `includes()`, so "port" fired
    on report, support, export and important, and "ship" on relationship and championship.
    Across 605 stored articles that classified 26.4% as maritime where 8.4% actually are — 109
    false positives, and the ships layer auto-activating on roughly three times as many events
    as it should. Now matched on word boundaries, the same guard `data/entityKind.ts` already
    carries for "president" against "presidential". The `'leo '` and `'geo '` keywords lost
    their trailing-space hack, which had also stopped them matching at the end of a sentence.
  Success Criteria: Met — verified in the running app on the Strait of Hormuz event: Brent
    -0.52% and gas -2.53% since publication while tanker freight reads +11.89%, which is the
    reading the feature exists for — the commodity says little happened, the freight says
    shipping repriced. Three rows, none clipped at 271px, each measured from its own market's
    last close before the event. Unit tests cover segment routing, the metals and mixed-segment
    refusals, the maritime gate and the ETF caveat appearing only with a quote. client 411
    tests pass; typecheck clean.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][MEDIUM] Feature: "Since this event" on the commodity rows
  Description: A commodity row on the event panel now reports how far the market has moved
    since the story published, rather than only what it is doing today. `changeSince` in
    `client/src/utils/quote.ts` picks the baseline, `useHistories` fetches the series from
    `/api/market/history`, and the row shows "since 08-06" where a measured change is possible
    and a bare date where it is not, so the reader can tell which question is being answered
    without reading the footnote. The baseline close and its full timestamp sit on the tooltip.
    Two rules decide when there is no answer, and both return nothing rather than a number.
    An event older than the fetched month has no baseline in the window, and anchoring to the
    start of the range would silently answer a different question. An event with no trading
    since it published has not moved anything yet, and 0.00% would read as a finding. Both fall
    back to the day's change, which is a weaker answer rather than a wrong one.
    The baseline is the last close *at or before* publication, never a lookup of that date: a
    story filed on a Saturday, during a holiday, or after the session closed has no print of
    its own, and reaching forward to the next one would measure from a price that did not exist
    when it broke.
    WORTH KNOWING: futures stamp their daily bar around 04:00 UTC, so an event published after
    that waits until the next stamp before a "since" reading exists. At the time of writing all
    six linked events in the database were published after the most recent close and every one
    of them fell back. The fallback is the common case in an event's first hours, not the edge.
  Success Criteria: Met — verified in the running app: a linked Hormuz event back-dated to
    08-06 renders "自 08-06" with Brent +7.36% against a baseline of 82.49, which matches the
    arithmetic, and the unmodified event correctly falls back to the day's change. Unit tests
    cover the weekend reach-back, the after-close reach-back, the out-of-window and
    nothing-traded-since refusals, unordered input and a zero baseline; a component test
    asserts no string in the section claims causation. client 372 and server 143 tests pass.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][MEDIUM] Feature: Daily close series endpoint
  Description: `GET /api/market/history?symbols=…&range=…` serves daily closes, for the two
    questions a spot price cannot answer: what a market has done *since* an event, and whether
    a disruption held over weeks. Same upstream and cache pattern as the quote proxy, with an
    hour's TTL rather than ten minutes — the last point only changes when a market closes, and
    the payload is a hundred times the size, so the trade-off runs the other way.
    Serves the series, not a computed change. The server does not know which instant a caller
    measures from — one anchors to an event's publication, the other to a rolling window — and
    a `changeSince` parameter would have to guess at trading days, holidays and the caller's
    timezone. Handing over the closes keeps that judgement where the context is.
    Gaps are dropped rather than filled: the upstream returns a null close for a day a market
    was shut, and a caller computing a change between two dates wants the days that actually
    traded — an interpolated price is a number nobody ever paid. `range` is an allowlist
    because the value reaches an outbound URL.
  Success Criteria: Met — verified against the running server: two symbols over `1mo` return
    23 dated points each with currency; `5d` returns 4. All four guards return `[]` rather
    than an error or an upstream call: an unlisted range, a path-traversal range, no symbols,
    and a symbol the upstream does not know. server 143 tests pass; typecheck clean.
    No consumer yet — the two that want it are open tasks above.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][MEDIUM] Feature: Commodity exposure on the event panel
  Description: The commodity classes recorded on an event now surface, one row per market with
    its last close, and nothing at all for the great majority of events that have no link.
    `market_link` was carried through `ClientEvent` and `articleToClientEvent` to reach the
    client; `EventCommodities` renders it; `COMMODITY_INSTRUMENT` in
    `client/src/data/commodities.ts` decides which contract stands for each class, which is
    where that decision belongs since the analysis pass records classes rather than tickers.
    The section says "this story bears on crude" and shows what crude is doing. It does not
    say the story moved the price, and the wording is built to keep it that way — the link is
    a judgement about subject matter, the price is a fact about the market, and welding them
    would assert a cause the data cannot support. Every row carries its own date because the
    close shown may predate the event, and the footnote says as much outright. That restraint
    is not decoration: two of the four links in the database are wrong (a midterm-elections
    piece and a Fed inflation piece, both linked to crude, both written before the prompt was
    tightened), and a wrong row should cost a reader a moment rather than mislead them.
    One instrument per class, unlike the status bar which carries both crude benchmarks. The
    bar compares them; the panel answers which market a story touches, and two crude rows on
    one event would invite a comparison the event does not support. Silver and wheat are in
    the table although the bar omits them — the model can name them, and a class with no
    visible price is worse than one row more.
    `market_link` is optional on the client's `ArgusEvent`: required would have put the field
    into six fixtures with no interest in it, and consumers should read absent and empty alike.
  Success Criteria: Met — verified in the running app on the Strait of Hormuz event, which
    renders Brent and natural gas with prices, changes and dates, unclipped, coloured by the
    reader's up-colour setting; an event with no link renders no section at all. client 358
    and server 135 tests pass; both typecheck clean.
  Retry Count: 0
  Source: USER REQUEST

---

[DONE][HIGH] Feature: Commodity market links on analysed events
  Description: Articles are now tagged with the commodities they bear on. `market_link` is a
    nullable JSON array on `articles` — `["CRUDE_OIL"]` — written by the existing Ollama pass
    rather than a second call, validated by `validateMarketLink` in
    `server/src/services/ollama.ts`, which fails closed on every shape the model can produce
    instead of the documented one. Six classes are offered (crude, gas, gold, silver, copper,
    wheat) although the status bar draws only four: an unused option is an escape hatch, and
    without one a gas story gets pushed into CRUDE_OIL for want of anywhere better. Classes,
    not tickers — which contract stands for CRUDE_OIL is a display decision. No UI in this
    task, by its own terms; the panel that reads the column shipped separately, in the DONE
    entry above.
    A `relation` field (SUBJECT / AFFECTED / NONE) was specified and then removed. Across
    three replays it answered AFFECTED essentially always — 1 SUBJECT in 18 links, then 1 in
    12, then 0 in 12, including for headlines plainly about the commodity itself. A field with
    one possible value is not information.
    A category boundary was added in the same pass, after the replays kept showing military
    policy landing in ARMED_CONFLICT: "ARMED_CONFLICT is fighting itself — strikes, attacks,
    casualties. Military policy, appointments, procurement and capability analysis are
    POLITICAL." Renaming the category to MILITARY was considered and rejected: it would have
    fitted the four policy pieces at the cost of admitting budgets, parades and procurement
    into the bucket that answers "where is there fighting", along with the +0.2 heat bonus and
    7-day retention that bucket carries.
  Success Criteria: Met. Re-running all 91 stored ARMED_CONFLICT articles under the new prompt
    moved 10 out (88.9% kept) and the visible ones are exactly the intended cases — Iran's
    military appointments, China's PLA leadership, the Saudi/Türkiye/Pakistan defence pact, US
    war spending, a Gaza commemoration to SOCIAL — with no over-correction: Houthi ship
    attacks, Libyan refinery strikes and Ukraine strikes all stayed. Link rate 6.0% across 200
    mixed articles and 15.4% within ARMED_CONFLICT, which is the expected shape. Of the 14
    links in that run, 12 were clearly right and 2 weak (a "war can't go much longer" piece
    with no named facility; a Ukraine/Russia casualties piece linked to WHEAT by association).
    Earlier prompt wording produced a distinct and worse failure — Fed and Morning Bid columns
    linked to crude — which the "market wraps and economic commentary are empty" clause
    removed. 1 JSON parse failure in 91, inside the existing two-attempt retry. server 135 and
    client 347 tests pass; both typecheck clean.
    METHOD NOTE, the expensive lesson: an A/B of two prompts on the same articles showed 93.0%
    category agreement, which was reported here as the new field damaging classification by
    ~6 points. It was not. Running the *same* prompt twice — the only way to measure the
    model's own non-determinism — gave 98.8% on one 80-article sample and 93.8% on another.
    The noise floor moves further than the effect being hunted, so at n=80–200 this measurement
    cannot resolve a 5-point difference, and the A/B figures sat inside the control's own
    range the whole time. Intensity behaved the same way: 85.0% control against 88.0% A/B, the
    A/B higher. Before drawing a conclusion from an agreement rate here, measure the floor
    twice.
  Retry Count: 0
  Source: USER REQUEST

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
