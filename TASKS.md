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

[TODO][MEDIUM] UI: Timeline Filter Slider
  Description: EventStack only supports category filtering. Add a time-range quick-filter
    (Last 6h / 12h / 24h / All) in CategoryFilterBar or FloatDock. Filter should apply on top
    of the existing category filter.
  Success Criteria: User can switch between 6h / 12h / 24h / All and EventStack updates accordingly.
    Filter state lives in the Zustand store and persists while the panel is open.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] UI: Timeline Filter Slider
  Description: EventStack only supports category filtering. Add a time-range quick-filter
    (Last 6h / 12h / 24h / All) in CategoryFilterBar or FloatDock. Filter should apply on top
    of the existing category filter.
  Success Criteria: User can switch between 6h / 12h / 24h / All and EventStack updates accordingly.
    Filter state lives in the Zustand store and persists while the panel is open.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Feature: High-Intensity Toast Notifications
  Description: When a new CRITICAL or HIGH event arrives via WebSocket, display a non-blocking
    corner toast (2-3 seconds, dismissible) showing the event category icon, title snippet, and
    intensity label. Must not interrupt scene interaction.
  Success Criteria: CRITICAL/HIGH events trigger a toast in the bottom-right (or top-right) corner.
    Toast auto-dismisses after 3 s. Multiple toasts stack. Low/Moderate events do not toast.
  Retry Count: 0
  Source: ROADMAP

---

[TODO][MEDIUM] Feature: Event Source Reliability Labels
  Description: Ollama classification prompt currently outputs `sources_count` (integer) but no
    per-source reliability tier. Extend the prompt schema to include a `reliability` field
    (e.g., "HIGH" | "MEDIUM" | "LOW" | "UNVERIFIED"). Add the column to the SQLite schema,
    update `markAnalyzed`, and render a reliability badge in EventPanelBody.
  Success Criteria: New articles receive a `reliability` classification. EventPanelBody shows the
    badge. Existing articles without the field display "UNVERIFIED" gracefully.
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
