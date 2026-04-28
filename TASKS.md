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

[TODO][LOW] Feature: i18n Complete Coverage
  Description: `en.json` / `zh-TW.json` cover ~20 keys. Most UI strings are hardcoded English.
    Extract all panel / toolbar / agent prompt strings into both locale files.
  Success Criteria: Switching language changes all visible UI strings. No hardcoded English outside
    of locale files (except console logs and data-layer strings).
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
