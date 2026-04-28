// ────────────────────────────────────────────────────────────
// Event categories (9 types)
// ────────────────────────────────────────────────────────────

export type EventCategory =
  | 'ARMED_CONFLICT'
  | 'POLITICAL'
  | 'ECONOMIC'
  | 'SOCIAL'
  | 'SCIENCE_TECH'
  | 'ENVIRONMENT'
  | 'HEALTH'
  | 'CRIME_SECURITY'
  | 'SPACE'

export const VALID_CATEGORIES: EventCategory[] = [
  'ARMED_CONFLICT', 'POLITICAL', 'ECONOMIC', 'SOCIAL',
  'SCIENCE_TECH', 'ENVIRONMENT', 'HEALTH', 'CRIME_SECURITY', 'SPACE',
]

export type EventIntensity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export type SourceReliability = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED'

export const VALID_INTENSITIES: EventIntensity[] = [
  'LOW', 'MODERATE', 'HIGH', 'CRITICAL',
]

// ────────────────────────────────────────────────────────────
// Article (DB row — matches `articles` table)
// ────────────────────────────────────────────────────────────

export interface Article {
  id: string                          // SHA-256 of URL
  source: string
  title: string
  content: string | null
  url: string
  published_at: string | null
  fetched_at: string

  is_analyzed: 0 | 1 | -1

  // Ollama output (NULL before analysis)
  category: EventCategory | null
  title_zh: string | null
  summary_zh: string | null
  intensity: EventIntensity | null
  location_type: 'geo' | 'orbital' | null
  location_label: string | null
  lat: number | null
  lng: number | null
  body: string | null
  actors: string | null               // JSON array string in DB
  tags: string | null                  // JSON array string in DB
  sources_count: number | null
  reliability: SourceReliability | null

  // Heat Score
  heat_score: number
  expires_at: string | null
  last_referenced: string | null
}

// ────────────────────────────────────────────────────────────
// Ollama classification result (parsed JSON from LLM)
// ────────────────────────────────────────────────────────────

export interface OllamaClassification {
  category: EventCategory
  title_zh: string
  summary_zh: string
  intensity: EventIntensity
  location: {
    type: 'geo' | 'orbital'
    label: string
    lat: number | null
    lng: number | null
    body: string | null
  }
  actors: string[]
  sources_count: number
  tags: string[]
  reliability: SourceReliability
}

// ────────────────────────────────────────────────────────────
// Client-facing event (broadcast via Socket.io + REST)
// ────────────────────────────────────────────────────────────

export interface ClientEvent {
  id: string
  title: string
  title_zh: string
  content: string | null       // Original RSS content snippet
  summary_zh: string
  source: string
  url: string
  published_at: string | null
  fetched_at: string
  category: EventCategory
  intensity: EventIntensity
  location_type: 'geo' | 'orbital'
  location_label: string
  lat: number | null
  lng: number | null
  body: string | null
  actors: string[]
  tags: string[]
  sources_count: number
  reliability: SourceReliability
  heat_score: number
  expires_at: string | null
  last_referenced: string | null
}

// ────────────────────────────────────────────────────────────
// RSS feed item (from rss-parser)
// ────────────────────────────────────────────────────────────

export interface RawFeedItem {
  title: string
  link: string
  contentSnippet?: string
  pubDate?: string
  isoDate?: string
}
