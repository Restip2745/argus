import { useEffect } from 'react'
import { useAppStore } from '../store'
import type { ArgusEvent } from '../types'

// ── Keyword lists ─────────────────────────────────────────────────────────────

const AVIATION_KEYWORDS = [
  'aviation', 'airline', 'aircraft', 'airport', 'airspace',
  'flight', 'helicopter', 'drone', 'uav', 'aerial', 'airborne',
  'air force', 'bomber', 'fighter jet', 'warplane', 'air traffic',
  'air strike', 'airstrike',
]

const MARITIME_KEYWORDS = [
  'maritime', 'naval', 'navy', 'ship', 'vessel', 'port', 'fleet',
  'submarine', 'coast guard', 'shipping', 'tanker', 'warship',
  'destroyer', 'carrier', 'frigate', 'sea lane', 'blockade',
  'strait', 'harbor', 'harbour', 'amphibious',
]

const SATELLITE_KEYWORDS = [
  'satellite', 'spacecraft', 'orbital', 'orbit', 'iss',
  'space station', 'rocket launch', 'reentry', 'starlink',
  // 'leo' and 'geo' were spelled with a trailing space to stop them matching
  // inside other words — a hack that the word-boundary matcher makes
  // unnecessary, and which stopped them matching at the end of a sentence.
  'low earth orbit', 'leo', 'geo', 'launch vehicle',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Whole-word match, not a substring one.
 *
 * `includes()` made "port" fire on report, support, export and important, and
 * "ship" on relationship, championship and leadership. Across the stored corpus
 * that classified 26% of all events as maritime where 8% actually are — the
 * ships layer was switching itself on for roughly three times as many events as
 * it should, and "carrier" pulled in air carriers for good measure.
 *
 * The same guard, for the same reason, is in `data/entityKind.ts`, where
 * "president" had to stop firing on "presidential".
 */
function hasWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(haystack)
}

function matchesKeywords(event: ArgusEvent, keywords: string[]): boolean {
  const haystack = [
    event.title,
    ...(event.tags   ?? []),
    ...(event.actors ?? []),
    event.content ?? '',
  ].join(' ').toLowerCase()
  return keywords.some((kw) => hasWord(haystack, kw))
}

function isAviationEvent(event: ArgusEvent): boolean {
  return matchesKeywords(event, AVIATION_KEYWORDS)
}

/**
 * Does this story concern shipping at all?
 *
 * Exported because the freight row on the event panel asks the same question:
 * freight is a price of routes, so a market link alone is not enough to justify
 * showing it — the story has to be about the sea.
 */
export function isMaritimeEvent(event: ArgusEvent): boolean {
  return matchesKeywords(event, MARITIME_KEYWORDS)
}

function isSatelliteEvent(event: ArgusEvent): boolean {
  return (
    event.category       === 'SPACE' ||
    event.location_type  === 'orbital' ||
    matchesKeywords(event, SATELLITE_KEYWORDS)
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Activates relevant visualization layers when the displayed event changes.
 * Only turns layers ON — never turns them OFF — so user toggles are preserved.
 * Fires once per unique event ID to avoid repeated triggers on re-renders.
 */
export function useLayerAutoActivation(event: ArgusEvent | undefined): void {
  const setShowAircraftLayer   = useAppStore((s) => s.setShowAircraftLayer)
  const setShowShipsLayer      = useAppStore((s) => s.setShowShipsLayer)
  const setShowSatellitesLayer = useAppStore((s) => s.setShowSatellitesLayer)

  useEffect(() => {
    if (!event) return
    if (isAviationEvent(event))   setShowAircraftLayer(true)
    if (isMaritimeEvent(event))   setShowShipsLayer(true)
    if (isSatelliteEvent(event))  setShowSatellitesLayer(true)
  }, [event?.id]) // eslint-disable-line react-hooks/exhaustive-deps
}
