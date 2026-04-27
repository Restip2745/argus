-- ─────────────────────────────────────────────────────────
-- ARGUS  —  SQLite Schema  (Heat-score-based retention)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS articles (
  id             TEXT PRIMARY KEY,      -- URL's SHA-256 hash (dedup key)
  source         TEXT NOT NULL,         -- Feed source name, e.g. "Reuters World"
  title          TEXT NOT NULL,         -- Original article title
  content        TEXT,                  -- First 800 chars of content
  url            TEXT NOT NULL,         -- Original article URL
  published_at   DATETIME,             -- Article publish time (RSS <pubDate>)
  fetched_at     DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Local fetch timestamp

  -- Ollama analysis state
  is_analyzed    INTEGER DEFAULT 0,     -- 0: pending / 1: completed / -1: failed

  -- Ollama output fields (NULL before analysis)
  category       TEXT,                  -- Event classification
  title_zh       TEXT,                  -- Chinese title (max 40 chars)
  summary_zh     TEXT,                  -- Chinese summary (max 120 chars)
  intensity      TEXT,                  -- LOW | MODERATE | HIGH | CRITICAL
  location_type  TEXT,                  -- "geo" | "orbital"
  location_label TEXT,                  -- Human-readable location name
  lat            REAL,                  -- Latitude (-90 to 90, NULL for orbital)
  lng            REAL,                  -- Longitude (-180 to 180, NULL for orbital)
  body           TEXT,                  -- Celestial body name (NULL for geo events)
  actors         TEXT,                  -- JSON array: '["Ukraine","Russia"]'
  tags           TEXT,                  -- JSON array: '["artillery","frontline"]'
  sources_count  INTEGER,              -- Number of corroborating sources mentioned

  -- Heat Score System
  heat_score     REAL DEFAULT 0.0,     -- Dynamic heat score determining retention
  expires_at     DATETIME,             -- Expiry time calculated from heat_score
  last_referenced DATETIME             -- Last time touched by new article (actors/tags match)
);

-- Retention Worker: fast lookup of expired old data
CREATE INDEX IF NOT EXISTS idx_expires_at    ON articles(expires_at);

-- Ollama Worker: fast lookup of pending articles
CREATE INDEX IF NOT EXISTS idx_is_analyzed   ON articles(is_analyzed);

-- Frontend queries: filter analyzed recent events by category
CREATE INDEX IF NOT EXISTS idx_category_time ON articles(category, published_at)
  WHERE is_analyzed = 1;

-- Heat Score updates: find related analyzed articles
CREATE INDEX IF NOT EXISTS idx_heat_score    ON articles(heat_score, last_referenced)
  WHERE is_analyzed = 1;

-- ─────────────────────────────────────────────────────────
-- Annotation strokes (collaborative canvas)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS annotation_strokes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT    NOT NULL,
  data       TEXT    NOT NULL,   -- JSON-serialised stroke
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_strokes_session ON annotation_strokes(session_id);
CREATE INDEX IF NOT EXISTS idx_strokes_time    ON annotation_strokes(created_at DESC);
