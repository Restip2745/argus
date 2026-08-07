import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { useFilteredEvents } from '../../hooks/useFilteredEvents'
import { BODY_MAP, TIER_TO_ORBITAL, TIER_TO_SURFACE } from '../../data/celestialBodies'
import { resolveOrbitalPlacement } from '../../data/orbitalPlacement'
import type { OrbitalPlacement } from '../../data/orbitalPlacement'
import { getCountryCentroid, resolveCountryName } from '../../data/countryData'
import { eventSymbol, peakSeverity, severityColor, severityRank, withAlpha } from '../../data/symbology'
import type { EventSymbol } from '../../data/symbology'
import { latLngToWorld, isAboveHorizon } from '../../lib/coordinates'
import type { ArgusEvent, CelestialBodyName } from '../../types'

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

const MARKER_R     = 1.025
const EARTH_RADIUS = 1.0

// Cluster radius in km per zoom tier (0=solar, 1=orbital, 2=surface)
const CLUSTER_KM = [1500, 600, 0]

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface GeoItem {
  event: ArgusEvent
  coords: { lat: number; lng: number }
}

interface GeoCluster {
  lat: number
  lng: number
  events: ArgusEvent[]
}

function clusterGeoEvents(items: GeoItem[], radiusKm: number): GeoCluster[] {
  if (radiusKm === 0) {
    return items.map(it => ({ lat: it.coords.lat, lng: it.coords.lng, events: [it.event] }))
  }
  const clusters: GeoCluster[] = []
  for (const { event, coords } of items) {
    let placed = false
    for (const cl of clusters) {
      if (haversineKm(cl.lat, cl.lng, coords.lat, coords.lng) <= radiusKm) {
        cl.events.push(event)
        placed = true
        break
      }
    }
    if (!placed) clusters.push({ lat: coords.lat, lng: coords.lng, events: [event] })
  }
  return clusters
}

// World-space scratch vector — latLngToWorld() bakes in the Earth offset.
const _world = new THREE.Vector3()

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

// ── Single geo marker ─────────────────────────────────────────────────────────
function GeoMarker({
  lat, lng, positionsRef, sym, intensity, onClick,
}: {
  lat: number
  lng: number
  positionsRef: Props['positionsRef']
  sym: EventSymbol
  intensity: string
  onClick: () => void
}) {
  const { color, glyph, size, borderStyle, borderColor, background } = sym
  const groupRef = useRef<THREE.Group>(null)
  const domRef   = useRef<HTMLDivElement>(null)

  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos || !groupRef.current) return
    latLngToWorld(lat, lng, MARKER_R, earthPos, _world)
    groupRef.current.position.copy(_world)
    const visible = isAboveHorizon(_world, earthPos, camera.position, EARTH_RADIUS)
    if (domRef.current) {
      const d = visible ? 'flex' : 'none'
      if (domRef.current.style.display !== d) domRef.current.style.display = d
    }
  })

  const isCritical = intensity === 'CRITICAL'
  const isHigh     = intensity === 'HIGH'

  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[10, 20]} style={{ pointerEvents: 'none' }}>
        <div
          ref={domRef}
          onClick={(e) => { e.stopPropagation(); onClick() }}
          style={{
            pointerEvents: 'all', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', width: size + 10, height: size + 10,
          }}
        >
          {/* Pulse ring — only CRITICAL/HIGH animate, so movement itself reads
              as urgency instead of every marker breathing at once. */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1.5px solid ${color}`, opacity: isCritical || isHigh ? 0.6 : 0,
            animation: isCritical ? 'markerPulse 1s ease-in-out infinite'
              : isHigh ? 'markerPulse 1.6s ease-in-out infinite' : 'none',
          }} />
          {/* Frame — border style carries source reliability */}
          <div style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background, border: `1.5px ${borderStyle} ${borderColor}`, backdropFilter: 'blur(2px)',
          }} />
          <span style={{
            position: 'relative', fontSize: size * 0.62, lineHeight: 1,
            color, textShadow: `0 0 6px ${color}aa`, userSelect: 'none', fontFamily: 'monospace',
          }}>{glyph}</span>
        </div>
      </Html>
    </group>
  )
}

// ── Cluster marker ────────────────────────────────────────────────────────────
function ClusterMarker({
  cluster, positionsRef, onClick,
}: {
  cluster: GeoCluster
  positionsRef: Props['positionsRef']
  onClick: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const domRef   = useRef<HTMLDivElement>(null)

  // A cluster reports the worst thing inside it — colour is severity, and the
  // severity of a group is its peak, never an average or an arbitrary member.
  const top   = peakSeverity(cluster.events)
  const color = severityColor(top)
  const count = cluster.events.length
  const size  = Math.min(28 + count * 2, 42)
  const urgent = top === 'CRITICAL' || top === 'HIGH'

  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos || !groupRef.current) return
    latLngToWorld(cluster.lat, cluster.lng, MARKER_R, earthPos, _world)
    groupRef.current.position.copy(_world)
    const visible = isAboveHorizon(_world, earthPos, camera.position, EARTH_RADIUS)
    if (domRef.current) {
      const d = visible ? 'flex' : 'none'
      if (domRef.current.style.display !== d) domRef.current.style.display = d
    }
  })

  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[10, 20]} style={{ pointerEvents: 'none' }}>
        <div
          ref={domRef}
          onClick={(e) => { e.stopPropagation(); onClick() }}
          style={{
            pointerEvents: 'all', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', width: size + 10, height: size + 10,
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1.5px solid ${color}`, opacity: urgent ? 0.5 : 0,
            animation: urgent ? 'markerPulse 1.6s ease-in-out infinite' : 'none',
          }} />
          <div style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background: withAlpha(color, 0.16), border: `1.5px solid ${withAlpha(color, 0.55)}`,
            backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, color,
              fontFamily: 'monospace', letterSpacing: '-0.02em',
              textShadow: `0 0 8px ${color}cc`,
            }}>{count}</span>
          </div>
        </div>
      </Html>
    </group>
  )
}

// ── Orbital billboard ─────────────────────────────────────────────────────────
/** Distance beyond Neptune's orbit at which deep-space items are parked. */
const DEEP_SPACE_RADIUS = 320
/** Height above Earth for the orbital band — clear of the surface markers. */
const EARTH_ORBIT_OFFSET = 2.6

function OrbitalMarker({
  placement, positionsRef, sym, count, onClick,
}: {
  placement: OrbitalPlacement
  positionsRef: Props['positionsRef']
  sym: EventSymbol
  count: number
  onClick: () => void
}) {
  const { color, glyph, size, borderStyle, borderColor, background } = sym
  const groupRef = useRef<THREE.Group>(null)

  const bodyId = placement.kind === 'body' ? placement.body : null
  const offset = bodyId
    ? (BODY_MAP.get(bodyId)?.renderedRadius ?? 1.0) * 1.8
    : EARTH_ORBIT_OFFSET

  useFrame(() => {
    const g = groupRef.current
    if (!g) return

    if (placement.kind === 'deepSpace') {
      // Fixed point out past the planets — these have no position in the
      // ephemeris, so anchoring them to a body would be a fiction.
      g.position.set(0, DEEP_SPACE_RADIUS * 0.35, -DEEP_SPACE_RADIUS)
      return
    }

    // Earth orbit rides above Earth rather than on it: these are satellites,
    // stations and launches, and putting them on the surface would mix them
    // in with the ground events they are deliberately distinct from.
    const anchor = positionsRef.current.get(bodyId ?? 'earth')
    if (anchor) g.position.set(anchor.x, anchor.y + offset, anchor.z)
  })

  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[10, 20]} style={{ pointerEvents: 'none' }}>
        <div
          onClick={(e) => { e.stopPropagation(); onClick() }}
          style={{
            pointerEvents: 'all', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', width: size + 10, height: size + 10,
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1.5px solid ${color}`, opacity: 0.6,
            animation: 'markerPulse 1.8s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background, border: `1.5px ${borderStyle} ${borderColor}`,
          }} />
          <span style={{
            position: 'relative', fontSize: size * 0.62, lineHeight: 1,
            color, textShadow: `0 0 6px ${color}aa`, userSelect: 'none', fontFamily: 'monospace',
          }}>{glyph}</span>

          {/* Several stories can share one anchor — the Moon carries eight.
              Without the count the marker would speak for the worst of them
              and give no sign the rest exist. */}
          {count > 1 && (
            <span style={{
              position: 'absolute', top: -4, right: -6,
              fontSize: 10, lineHeight: '12px', minWidth: 12, padding: '0 3px',
              borderRadius: 2, textAlign: 'center',
              background: 'rgba(4,9,22,0.92)', border: `1px solid ${color}66`,
              color, fontFamily: 'JetBrains Mono, monospace', userSelect: 'none',
            }}>{count}</span>
          )}
        </div>
      </Html>
    </group>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function EventMarkers({ positionsRef }: Props) {
  // Same set the feed renders — hiding a category or narrowing the time
  // range must empty the globe too, or the two disagree in plain sight.
  const events           = useFilteredEvents()
  const showEventMarkers = useAppStore((s) => s.showEventMarkers)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)

  // Zoom tier: 0=solar (heavy cluster), 1=orbital (light cluster), 2=surface (no cluster)
  const [zoomTier, setZoomTier] = useState(0)
  const zoomTierRef = useRef(0)
  const earthV3 = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos) return
    earthV3.current.copy(earthPos)
    const dist = camera.position.distanceTo(earthV3.current)
    const newTier = dist > TIER_TO_ORBITAL ? 0 : dist < TIER_TO_SURFACE ? 2 : 1
    if (newTier !== zoomTierRef.current) {
      zoomTierRef.current = newTier
      setZoomTier(newTier)
    }
  })

  const { clusters, orbitalGroups } = useMemo(() => {
    const geoItems: GeoItem[] = []
    // Keyed by placement so several events can share one anchor. Previously a
    // Map of body to a single event, which meant a body with five stories
    // showed one marker and silently dropped the rest.
    const orbital = new Map<string, { placement: OrbitalPlacement; events: ArgusEvent[] }>()

    for (const e of events) {
      if (e.location_type === 'orbital') {
        // Resolved from body *and* label: the model fills the label far more
        // often, and the raw body string never matched the position map.
        const placement = resolveOrbitalPlacement(e.body, e.location_label)
        if (!placement) continue          // names no location — stays in the feed only
        const key = placement.kind === 'body' ? `body:${placement.body}` : placement.kind
        const bucket = orbital.get(key)
        if (bucket) bucket.events.push(e)
        else orbital.set(key, { placement, events: [e] })
      } else {
        const coords = resolveLatLng(e)
        if (coords) geoItems.push({ event: e, coords })
      }
    }

    // Worst first, so a cluster is represented by the event that matters most.
    for (const g of orbital.values()) {
      g.events.sort((a, b) => severityRank(b.intensity) - severityRank(a.intensity))
    }

    const radiusKm = CLUSTER_KM[zoomTier] ?? 0
    return { clusters: clusterGeoEvents(geoItems, radiusKm), orbitalGroups: orbital }
  }, [events, zoomTier])

  return (
    <>
      {showEventMarkers && clusters.map((cl, i) => {
        if (cl.events.length === 1) {
          const e = cl.events[0]
          return (
            <GeoMarker
              key={e.id}
              lat={cl.lat}
              lng={cl.lng}
              positionsRef={positionsRef}
              sym={eventSymbol(e)}
              intensity={e.intensity}
              onClick={() => setActivePanelId(e.id)}
            />
          )
        }
        const topEvent = cl.events.reduce((best, e) =>
          severityRank(e.intensity) > severityRank(best.intensity) ? e : best
        )
        return (
          <ClusterMarker
            key={`cluster-${i}`}
            cluster={cl}
            positionsRef={positionsRef}
            onClick={() => setActivePanelId(topEvent.id)}
          />
        )
      })}

      {Array.from(orbitalGroups.entries()).map(([key, group]) => {
        // Deep space has no ephemeris entry by design; the others must have a
        // position before they can be drawn.
        if (group.placement.kind === 'body' && !positionsRef.current.has(group.placement.body)) return null
        const top = group.events[0]          // sorted worst-first above
        return (
          <OrbitalMarker
            key={`orbital-${key}`}
            placement={group.placement}
            positionsRef={positionsRef}
            sym={eventSymbol(top)}
            count={group.events.length}
            onClick={() => setActivePanelId(top.id)}
          />
        )
      })}
    </>
  )
}
