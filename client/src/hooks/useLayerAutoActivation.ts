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
  'low earth orbit', 'leo ', 'geo ', 'launch vehicle',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchesKeywords(event: ArgusEvent, keywords: string[]): boolean {
  const haystack = [
    event.title,
    ...(event.tags   ?? []),
    ...(event.actors ?? []),
    event.content ?? '',
  ].join(' ').toLowerCase()
  return keywords.some((kw) => haystack.includes(kw))
}

function isAviationEvent(event: ArgusEvent): boolean {
  return matchesKeywords(event, AVIATION_KEYWORDS)
}

function isMaritimeEvent(event: ArgusEvent): boolean {
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
