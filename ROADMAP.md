# ARGUS Roadmap

Strategic goals and milestone tracking for the ARGUS satellite/event tracker project.

---

## Phase A — Data Layer Completion

> Tracking layers and data quality; wire up existing architecture gaps.

- [x] **AIS Ship Tracking** — server proxy at `/api/tracking/ships` (aisstream.io, requires `AISSTREAM_API_KEY`); `useShipsLayer` hook; TrackingLayer renders ships; FloatDock button wired
- [x] **Heat Score UI Visualization** — EventPanelBody shows colored heat bar + score + expiry label; EventStack tooltip shows heat score badge
- [ ] **Event Source Reliability** — `sources_count` stored in DB; Ollama prompt lacks per-source `reliability` field; add to prompt schema + DB + UI

---

## Phase B — User Experience

> Improve interaction detail and operational efficiency.

- [ ] **Timeline Filter Slider** — add time range selector (6h / 12h / 24h) in CategoryFilterBar or FloatDock
- [ ] **Event Density Clustering** — auto-merge overlapping markers by zoom level; expand on approach
- [ ] **High-Intensity Toast Notifications** — corner toast for new CRITICAL / HIGH events without interrupting scene
- [ ] **Region Comparison Panel** — `compareMode` + `comparedCountries` state already in store; implement dual-column compare UI
- [ ] **i18n Complete Coverage** — extract all hardcoded strings to `en.json` / `zh-TW.json`

---

## Phase C — Advanced Analysis

> Deeper intelligence reasoning on top of existing Agent capabilities.

- [ ] **Dynamic Conflict Front Layer** — ISW daily GeoJSON overlay for Ukraine etc., separate from static borders
- [ ] **Event Relationship Graph** — node/edge diagram in event panel based on `actors` / `tags` intersection
- [ ] **Periodic Intelligence Summary** — timed Ollama summary of high heat-score events, pushed to FloatDock
- [ ] **Event Export / Share** — select events → export Markdown / JSON report or copy share link

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
