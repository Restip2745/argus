# ARGUS Roadmap

Strategic goals and milestone tracking for the ARGUS satellite/event tracker project.

---

## Phase A — Data Layer Completion

> Tracking layers and data quality; wire up existing architecture gaps.

- [x] **AIS Ship Tracking** — server proxy at `/api/tracking/ships` (aisstream.io, requires `AISSTREAM_API_KEY`); `useShipsLayer` hook; TrackingLayer renders ships; FloatDock button wired
- [x] **Heat Score UI Visualization** — EventPanelBody shows colored heat bar + score + expiry label; EventStack tooltip shows heat score badge
- [x] **Event Source Reliability** — `reliability` field (HIGH/MEDIUM/LOW/UNVERIFIED) added to DB schema, Ollama prompt, client types, and EventPanelBody badge

---

## Phase B — User Experience

> Improve interaction detail and operational efficiency.

- [x] **Timeline Filter Slider** — `timeRangeFilter` ('6h'|'12h'|'24h'|'all') in Zustand store; segmented button group in CategoryFilterBar; EventStack filters by published_at
- [x] **Event Density Clustering** — 3-tier zoom system; greedy haversine clustering; ClusterMarker component with count badge; clicking opens highest-intensity event
- [x] **High-Intensity Toast Notifications** — ToastContainer detects new CRITICAL/HIGH events; auto-dismiss 3s; stacking bottom-right; slide-out animation
- [x] **Region Comparison Panel** — compare toggle in RegionPanel header; dual-column CompareCard with category breakdown and recent events; exits on ✕
- [x] **i18n Complete Coverage** — 40+ keys in en.json / zh-TW.json; all major UI strings keyed; language switch updates panel and toolbar labels

---

## Phase C — Advanced Analysis

> Deeper intelligence reasoning on top of existing Agent capabilities.

- [ ] **Dynamic Conflict Front Layer** — ISW daily GeoJSON overlay for Ukraine etc., separate from static borders
- [x] **Event Relationship Graph** — SVG force-directed graph in EventPanelBody; color-coded nodes by category; clicking node navigates to related event
- [x] **Periodic Intelligence Summary** — 30-min server cron; top-5 heat-score events → Ollama → `intel_brief` Socket.io event; FloatDock BRIEF badge + modal
- [x] **Event Export / Share** — Export button in EventPanel header; Markdown + JSON modes; copy to clipboard with "Copied!" confirmation

---

## Completed

> Features fully implemented and stable.

- [x] Solar system 3D scene (30+ bodies, real orbital elements, textures)
- [x] Camera control system (scroll zoom, right-drag orbit, WASD pan, click-focus tween)
- [x] Real-time astronomical sync (revolution / rotation / GAST / day-night terminator)
- [x] Distance-aware interaction levels (solar → orbital → surface)
- [x] Celestial nav list (dynamic filter, satellite / asteroid / comet groups)
- [x] Earth LOD textures (8K / 2K auto-switch with hysteresis)
- [x] SQLite schema + 4 indexes + WAL mode
- [x] RSS scraper (URL-hash dedup, 15-min cron)
- [x] Ollama worker (JSON classification + heat_score init + expires_at tiering)
- [x] Heat score system (Retention Worker 15-min scan / three-condition delete)
- [x] WebSocket real-time push (Socket.io `new_event`)
- [x] Political GeoJSON layer (110m / 50m auto-switch by distance)
- [x] Event radar markers (category icon + color + pulse animation)
- [x] Aircraft tracking layer (ADS-B OpenSky + server cache)
- [x] Satellite tracking layer (TLE Celestrak + server cache)
- [x] Focus camera tween (smooth zoom, back-to-previous-view)
- [x] Region intel panel (flag / overview / stats / recent events / Wikipedia summary)
- [x] Event intel panel (type / summary / timeline / source list / intensity)
- [x] Agent chat (Ollama SSE stream + HTML whitelist render)
- [x] Agent Vision (AnnotationCanvas screenshot → multimodal Ollama analysis)
- [x] Suggested Queries auto-generation
- [x] Lite Mode (icon-dock sidebar collapse)
- [x] Immersive Mode (full-screen scene + FloatDock quick access)
- [x] CategoryFilterBar (category toggle filter for EventStack)
- [x] Config Modal (Ollama model / scrape interval / UI scale slider)
- [x] Panel Popout (separate window + BroadcastChannel sync)
- [x] Drag boundary clamping (panels cannot exceed viewport)
- [x] Annotation canvas (free-draw + Socket.io multi-client sync)
- [x] i18n foundation (i18next, EN / zh-TW)
