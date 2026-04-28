import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { BODY_MAP } from '../../data/celestialBodies'
import { getCountryCentroid, resolveCountryName } from '../../data/countryData'
import { CATEGORY_COLOR, CATEGORY_ICON } from '../../data/categoryConfig'
import { latLngToWorld } from '../../lib/coordinates'
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

// Icon size (px) per intensity
const INTENSITY_SIZE: Record<string, number> = {
  LOW:      16,
  MODERATE: 19,
  HIGH:     22,
  CRITICAL: 26,
}

const MARKER_R     = 1.025
const EARTH_RADIUS = 1.0

// Cluster radius in km per zoom tier (0=solar, 1=orbital, 2=surface)
const CLUSTER_KM = [1500, 600, 0]

// Camera-to-earth distance thresholds for tier transitions
const TIER_TO_ORBITAL = 80   // farther  → tier 0 (solar)
const TIER_TO_SURFACE = 12   // closer   → tier 2 (surface)

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

const _local = new THREE.Vector3()

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

// ── Single geo marker ─────────────────────────────────────────────────────────
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
    const cx = camera.position.x - earthPos.x
    const cy = camera.position.y - earthPos.y
    const cz = camera.position.z - earthPos.z
    const dot = _local.x * cx + _local.y * cy + _local.z * cz
    const visible = dot >= EARTH_RADIUS * MARKER_R
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
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1.5px solid ${color}`, opacity: 0.6,
            animation: `markerPulse ${isCritical ? '1s' : isHigh ? '1.4s' : '2s'} ease-in-out infinite`,
          }} />
          <div style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background: color + '22', border: `1px solid ${color}66`, backdropFilter: 'blur(2px)',
          }} />
          <span style={{
            position: 'relative', fontSize: size * 0.7, lineHeight: 1,
            color, textShadow: `0 0 6px ${color}aa`, userSelect: 'none', fontFamily: 'monospace',
          }}>{icon}</span>
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

  const rank = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 } as Record<string, number>
  const topEvent = cluster.events.reduce((best, e) =>
    (rank[e.intensity] ?? 0) > (rank[best.intensity] ?? 0) ? e : best
  )
  const color = CATEGORY_COLOR[topEvent.category] ?? '#4a6070'
  const count = cluster.events.length
  const size  = Math.min(28 + count * 2, 42)

  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos || !groupRef.current) return
    latLngToWorld(cluster.lat, cluster.lng, MARKER_R, earthPos, _local)
    groupRef.current.position.copy(_local)
    const cx = camera.position.x - earthPos.x
    const cy = camera.position.y - earthPos.y
    const cz = camera.position.z - earthPos.z
    const dot = _local.x * cx + _local.y * cy + _local.z * cz
    const visible = dot >= EARTH_RADIUS * MARKER_R
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
            border: `1.5px solid ${color}`, opacity: 0.5,
            animation: 'markerPulse 2.2s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 3, borderRadius: '50%',
            background: color + '2a', border: `1.5px solid ${color}88`,
            backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '9px', fontWeight: 700, color,
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
  const groupRef = useRef<THREE.Group>(null)
  const bodyDef  = BODY_MAP.get(bodyId)
  const offset   = bodyDef ? bodyDef.renderedRadius * 1.8 : 1.0

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
            background: color + '22', border: `1px solid ${color}66`,
          }} />
          <span style={{
            position: 'relative', fontSize: size * 0.7, lineHeight: 1,
            color, textShadow: `0 0 6px ${color}aa`, userSelect: 'none', fontFamily: 'monospace',
          }}>{icon}</span>
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

  const { clusters, orbitalByBody } = useMemo(() => {
    const rank = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 } as Record<string, number>
    const geoItems: GeoItem[] = []
    const orbital = new Map<CelestialBodyName, ArgusEvent>()

    for (const e of events) {
      if (e.location_type === 'orbital' && e.body && e.body !== 'earth') {
        const existing = orbital.get(e.body as CelestialBodyName)
        if (!existing || (rank[e.intensity] ?? 0) > (rank[existing.intensity] ?? 0))
          orbital.set(e.body as CelestialBodyName, e)
      } else if (e.body === 'earth' || e.location_type === 'geo' || !e.body) {
        const coords = resolveLatLng(e)
        if (coords) geoItems.push({ event: e, coords })
      }
    }

    const radiusKm = CLUSTER_KM[zoomTier] ?? 0
    return { clusters: clusterGeoEvents(geoItems, radiusKm), orbitalByBody: orbital }
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
              color={CATEGORY_COLOR[e.category] ?? '#888888'}
              icon={CATEGORY_ICON[e.category]  ?? '◉'}
              size={INTENSITY_SIZE[e.intensity] ?? 18}
              intensity={e.intensity}
              onClick={() => setActivePanelId(e.id)}
            />
          )
        }
        const rank = { CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1 } as Record<string, number>
        const topEvent = cl.events.reduce((best, e) =>
          (rank[e.intensity] ?? 0) > (rank[best.intensity] ?? 0) ? e : best
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
