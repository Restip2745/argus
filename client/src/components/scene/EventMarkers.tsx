import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { BODY_MAP } from '../../data/celestialBodies'
import { getCountryCentroid, resolveCountryName } from '../../data/countryData'
import { CATEGORY_COLOR, CATEGORY_ICON } from '../../data/categoryConfig'
import { latLngToWorld } from '../../lib/coordinates'
import type { CelestialBodyName } from '../../types'

/** Resolve lat/lng for an event — explicit coords first, centroid fallback. */
function resolveLatLng(e: { lat: number | null; lng: number | null; location_label?: string | null }): { lat: number; lng: number } | null {
  if (e.lat !== null && e.lng !== null) return { lat: e.lat, lng: e.lng }
  if (e.location_label) {
    const key = resolveCountryName(e.location_label)
    if (key) {
      const c = getCountryCentroid(key)
      if (c) return c
    }
  }
  return null
}

// Icon size (px) per intensity — billboard stays screen-aligned so px is correct
const INTENSITY_SIZE: Record<string, number> = {
  LOW:      16,
  MODERATE: 19,
  HIGH:     22,
  CRITICAL: 26,
}

const MARKER_R     = 1.025   // just above Earth surface
const EARTH_RADIUS = 1.0    // Earth sphere scene-units radius

// Pre-allocated temporary for in-place latLngToWorld output
const _local = new THREE.Vector3()

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

// ── Geo billboard: anchored to Earth surface, rotates with GAST ───────────────
function GeoMarker({
  lat, lng, positionsRef, color, icon, size, intensity, onClick,
}: {
  lat: number
  lng: number
  positionsRef: Props['positionsRef']
  color: string
  icon: string
  size: number
  intensity: string
  onClick: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const domRef   = useRef<HTMLDivElement>(null)

  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos || !groupRef.current) return

    latLngToWorld(lat, lng, MARKER_R, earthPos, _local)
    groupRef.current.position.copy(_local)

    // Horizon test:  dot(earth→marker, earth→cam) >= R_earth × |earth→marker|
    const cx = camera.position.x - earthPos.x
    const cy = camera.position.y - earthPos.y
    const cz = camera.position.z - earthPos.z
    const dot = _local.x * cx + _local.y * cy + _local.z * cz
    const visible = dot >= EARTH_RADIUS * MARKER_R

    // drei <Html> renders via DOM portal — parent group.visible does NOT hide it.
    // Toggle the wrapper div's display directly (no React re-render cost).
    // Must use 'flex' (not '') when restoring — '' removes inline style and falls back to 'block'.
    if (domRef.current) {
      const d = visible ? 'flex' : 'none'
      if (domRef.current.style.display !== d) domRef.current.style.display = d
    }
  })

  const isCritical = intensity === 'CRITICAL'
  const isHigh     = intensity === 'HIGH'

  return (
    <group ref={groupRef}>
      <Html
        center
        zIndexRange={[10, 20]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={domRef}
          onClick={(e) => { e.stopPropagation(); onClick() }}
          style={{
            pointerEvents:  'all',
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            position:       'relative',
            width:          size + 10,
            height:         size + 10,
          }}
        >
          {/* Pulsing outer ring */}
          <div style={{
            position:     'absolute',
            inset:        0,
            borderRadius: '50%',
            border:       `1.5px solid ${color}`,
            opacity:      0.6,
            animation:    `markerPulse ${isCritical ? '1s' : isHigh ? '1.4s' : '2s'} ease-in-out infinite`,
          }} />

          {/* Solid backing circle */}
          <div style={{
            position:        'absolute',
            inset:           3,
            borderRadius:    '50%',
            background:      color + '22',
            border:          `1px solid ${color}66`,
            backdropFilter:  'blur(2px)',
          }} />

          {/* Category icon */}
          <span style={{
            position:   'relative',
            fontSize:   size * 0.7,
            lineHeight: 1,
            color,
            textShadow: `0 0 6px ${color}aa`,
            userSelect: 'none',
            fontFamily: 'monospace',
          }}>
            {icon}
          </span>
        </div>
      </Html>
    </group>
  )
}

// ── Orbital billboard: hovers above a celestial body ─────────────────────────
function OrbitalMarker({
  bodyId, positionsRef, color, icon, size, onClick,
}: {
  bodyId: CelestialBodyName
  positionsRef: Props['positionsRef']
  color: string
  icon: string
  size: number
  onClick: () => void
}) {
  const groupRef  = useRef<THREE.Group>(null)
  const bodyDef   = BODY_MAP.get(bodyId)
  const offset    = bodyDef ? bodyDef.renderedRadius * 1.8 : 1.0

  useFrame(() => {
    const bodyPos = positionsRef.current.get(bodyId)
    if (bodyPos && groupRef.current) {
      groupRef.current.position.set(bodyPos.x, bodyPos.y + offset, bodyPos.z)
    }
  })

  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[10, 20]} style={{ pointerEvents: 'none' }}>
        <div
          onClick={(e) => { e.stopPropagation(); onClick() }}
          style={{
            pointerEvents:  'all',
            cursor:         'pointer',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            position:       'relative',
            width:          size + 10,
            height:         size + 10,
          }}
        >
          <div style={{
            position:     'absolute',
            inset:        0,
            borderRadius: '50%',
            border:       `1.5px solid ${color}`,
            opacity:      0.6,
            animation:    'markerPulse 1.8s ease-in-out infinite',
          }} />
          <div style={{
            position:     'absolute',
            inset:        3,
            borderRadius: '50%',
            background:   color + '22',
            border:       `1px solid ${color}66`,
          }} />
          <span style={{
            position:   'relative',
            fontSize:   size * 0.7,
            lineHeight: 1,
            color,
            textShadow: `0 0 6px ${color}aa`,
            userSelect: 'none',
            fontFamily: 'monospace',
          }}>
            {icon}
          </span>
        </div>
      </Html>
    </group>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function EventMarkers({ positionsRef }: Props) {
  const events           = useAppStore((s) => s.events)
  const showEventMarkers = useAppStore((s) => s.showEventMarkers)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)

  const { geoEvents, orbitalByBody } = useMemo(() => {
    const rank = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 } as Record<string, number>
    const geo: { event: typeof events[0]; coords: { lat: number; lng: number } }[] = []
    const orbital = new Map<CelestialBodyName, typeof events[0]>()

    for (const e of events) {
      if (e.location_type === 'orbital' && e.body && e.body !== 'earth') {
        const existing = orbital.get(e.body as CelestialBodyName)
        if (!existing || (rank[e.intensity] ?? 0) > (rank[existing.intensity] ?? 0))
          orbital.set(e.body as CelestialBodyName, e)
      } else if (e.body === 'earth' || e.location_type === 'geo' || !e.body) {
        const coords = resolveLatLng(e)
        if (coords) geo.push({ event: e, coords })
      }
    }
    return { geoEvents: geo, orbitalByBody: orbital }
  }, [events])

  return (
    <>
      {showEventMarkers && geoEvents.map(({ event, coords }) => (
        <GeoMarker
          key={event.id}
          lat={coords.lat}
          lng={coords.lng}
          positionsRef={positionsRef}
          color={CATEGORY_COLOR[event.category] ?? '#888888'}
          icon={CATEGORY_ICON[event.category]  ?? '◉'}
          size={INTENSITY_SIZE[event.intensity] ?? 18}
          intensity={event.intensity}
          onClick={() => setActivePanelId(event.id)}
        />
      ))}

      {Array.from(orbitalByBody.entries()).map(([bodyId, event]) => {
        if (!positionsRef.current.has(bodyId)) return null
        return (
          <OrbitalMarker
            key={`orbital-${bodyId}`}
            bodyId={bodyId}
            positionsRef={positionsRef}
            color={CATEGORY_COLOR[event.category] ?? '#00d4ff'}
            icon={CATEGORY_ICON[event.category]  ?? '◉'}
            size={INTENSITY_SIZE[event.intensity] ?? 18}
            onClick={() => setActivePanelId(event.id)}
          />
        )
      })}
    </>
  )
}
