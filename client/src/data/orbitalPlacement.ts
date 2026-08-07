/**
 * Where an off-Earth event belongs in the scene.
 *
 * Orbital events were invisible: the marker layer looked up `event.body` in the
 * position map, but the map is keyed by lowercase ids ('moon') while the model
 * writes prose ("Moon", "Saturn's B Ring"), so every lookup missed and the
 * renderer returned null for all of them.
 *
 * Case was only the surface of it. Reading the data, `body` is set on 15 of 37
 * orbital events while `location_label` names a place on far more of them —
 * "Low Earth Orbit", "International Space Station", "Mars System". So placement
 * is resolved from both fields, and the label is the better source.
 *
 * Three outcomes, because the events genuinely fall into three groups:
 *   body        something orbiting or on a named body
 *   earthOrbit  the large majority — satellites, launches, stations, debris
 *   deepSpace   beyond the planets, or outside the solar system entirely
 * and a fourth, null, for strings that name no place at all ("Space Industry",
 * "New Glenn Rocket / BE-4 Engine"). Those keep their feed entry and simply do
 * not get a marker, which is honest: there is nowhere to put them.
 */
import { BODIES } from './celestialBodies'
import type { CelestialBodyName } from '../types'

export type OrbitalPlacement =
  | { kind: 'body'; body: CelestialBodyName }
  | { kind: 'earthOrbit' }
  | { kind: 'deepSpace' }

/** id and label of every body, lowercased, longest first so "3i-atlas" wins over "io". */
const BODY_TERMS: Array<{ term: string; id: CelestialBodyName }> = BODIES
  .flatMap((b) => {
    const terms = new Set([b.id.toLowerCase(), b.label.toLowerCase()])
    return [...terms].map((term) => ({ term, id: b.id }))
  })
  .sort((a, b) => b.term.length - a.term.length)

/** Extra names for bodies that news copy uses but the body table does not. */
const ALIASES: Record<string, CelestialBodyName> = {
  luna: 'moon',
  sol: 'sun',
  'the moon': 'moon',
  'red planet': 'mars',
  'martian': 'mars',
  'lunar': 'moon',
  'jovian': 'jupiter',
  'cislunar': 'moon',
}

/** Phrases that mean "in orbit around Earth" rather than naming another body. */
const EARTH_ORBIT_RE =
  /\b(leo|geo|meo|ngso|low[- ]earth|near[- ]earth|earth[- ]orbit|geostationary|geosynchronous|orbital|orbit|satellite|space ?station|iss|international space station)\b/i

/** Beyond the planets, or not in this system at all. */
const DEEP_SPACE_RE =
  /\b(deep space|interstellar|nebula|galaxy|galactic|exoplanet|kuiper|oort|heliopause|supernova|black hole|quasar|pulsar)\b/i

/**
 * Word-boundary match, so "io" does not fire inside "station" and "mars" does
 * not fire inside "marshalling". Hyphens and slashes count as boundaries
 * because the labels use them: "Earth Orbit / Space", "3I/ATLAS".
 */
function mentions(haystack: string, term: string): boolean {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(haystack)
}

/**
 * @param body  the model's `body` field, often absent
 * @param label the model's `location_label`, which names a place more often
 */
export function resolveOrbitalPlacement(
  body: string | null | undefined,
  label: string | null | undefined,
): OrbitalPlacement | null {
  const fields = [body ?? '', label ?? ''].map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (fields.length === 0) return null

  const namedBody = (text: string): CelestialBodyName | null => {
    for (const { term, id } of BODY_TERMS) if (mentions(text, term)) return id
    for (const [alias, id] of Object.entries(ALIASES)) if (mentions(text, alias)) return id
    return null
  }

  // A body other than Earth wins outright: "Mars System" is Mars and
  // "Saturn's B Ring" is Saturn, neither being an exact id.
  for (const text of fields) {
    const id = namedBody(text)
    if (id && id !== 'earth') return { kind: 'body', body: id }
  }

  // Earth is the exception, because most of these events only mention it to
  // say which orbit they are in. Matching the body term first put "Low Earth
  // Orbit" and "Near Earth Space" onto Earth's surface alongside ground
  // events, which is the conflation this layer exists to avoid.
  for (const text of fields) if (DEEP_SPACE_RE.test(text)) return { kind: 'deepSpace' }
  for (const text of fields) if (EARTH_ORBIT_RE.test(text)) return { kind: 'earthOrbit' }

  // "Earth" with no orbit wording left: an event genuinely about the planet.
  for (const text of fields) if (namedBody(text) === 'earth') return { kind: 'body', body: 'earth' }

  return null
}
