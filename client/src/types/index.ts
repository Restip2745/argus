// ────────────────────────────────────────────────────────────
// Celestial body identifiers
// ────────────────────────────────────────────────────────────

export type CelestialBodyName =
  | 'sun'
  // Planets
  | 'mercury' | 'venus' | 'earth' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
  // Dwarf planets / KBOs
  | 'pluto' | 'ceres' | 'eris' | 'makemake' | 'haumea'
  // Earth's Moon
  | 'moon'
  // Mars moons
  | 'phobos' | 'deimos'
  // Jupiter moons (Galilean)
  | 'io' | 'europa' | 'ganymede' | 'callisto'
  // Saturn moons
  | 'titan' | 'enceladus' | 'mimas' | 'rhea' | 'dione'
  // Uranus moons
  | 'miranda' | 'ariel' | 'umbriel' | 'titania' | 'oberon'
  // Neptune moons
  | 'triton'
  // Notable asteroids
  | 'vesta' | 'apophis' | 'bennu'
  // Comets
  | 'halley' | '67p'
  // Interstellar objects
  | '3i-atlas'

// ────────────────────────────────────────────────────────────
// Event data
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

export type EventIntensity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export type SourceReliability = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED'

export interface ArgusEvent {
  id: string
  title: string
  title_zh: string | null
  content: string | null       // Original RSS content snippet
  summary_zh: string | null
  source: string
  url: string
  published_at: string
  fetched_at: string
  category: EventCategory
  intensity: EventIntensity
  // Location
  location_type: 'geo' | 'orbital' | null
  location_label: string | null
  lat: number | null
  lng: number | null
  body: CelestialBodyName | null
  // Intelligence metadata
  actors: string[]          // Parsed from JSON string
  tags: string[]            // Parsed from JSON string
  sources_count: number
  reliability: SourceReliability
  // Heat Score
  heat_score: number
  expires_at: string | null
  last_referenced: string | null
}

// ────────────────────────────────────────────────────────────
// Person entity (for PersonPanel / entity linking)
// ────────────────────────────────────────────────────────────

export interface PersonEntity {
  name:        string
  description: string | null   // Wikidata short description
  extract:     string | null   // Wikipedia first paragraph
  thumbnail:   string | null   // image URL
  wikiUrl:     string | null   // Wikipedia desktop page URL
}

// ────────────────────────────────────────────────────────────
// Context entity (unified type for MultiEntityContextPanel)
// ────────────────────────────────────────────────────────────

export type ContextEntityType = 'event' | 'person' | 'region' | 'celestial'

export interface ContextEntity {
  id:      string
  type:    ContextEntityType
  name:    string
  summary: string
}

// ────────────────────────────────────────────────────────────
// Annotation canvas
// ────────────────────────────────────────────────────────────

export interface AnnotationStroke {
  id: string
  sessionId: string
  points: [number, number][]
  color: string
  width: number
  createdAt: string
}
