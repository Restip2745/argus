/**
 * TrackingLayer — renders ship / aircraft / satellite icons on the globe.
 *
 * Distance-based visibility rules (camera distance to Earth centre):
 *   > DIST_SATELLITE_MAX (20)  → nothing (solar system / other body view)
 *   ≤ DIST_SATELLITE_MAX       → satellites visible
 *   ≤ DIST_SURFACE_MAX  (12)   → aircraft + ships also visible
 *
 * Coordinate pipeline (same as EventMarkers):
 *   lat/lng → local sphere vector → GAST Y-rotation → axial-tilt Z-rotation → world pos
 *
 * Satellites use satellite.js TLE propagation, so their icons orbit in real-time.
 */

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import * as sat from 'satellite.js'

import { useAppStore } from '../../store'
import { useAircraftLayer, useSatelliteLayer, useShipsLayer } from '../../hooks/useTrackingLayers'
import { latLngToWorld } from '../../lib/coordinates'
import { EARTH_DETAIL_THRESHOLD } from '../../data/celestialBodies'
import type { CelestialBodyName } from '../../types'

// ── Visibility thresholds ─────────────────────────────────────────────────────

/** Max camera-to-Earth distance to show satellites (= EARTH_DETAIL_THRESHOLD) */
const DIST_SATELLITE_MAX = EARTH_DETAIL_THRESHOLD          // 20
/** Max camera-to-Earth distance to show aircraft & ships (~half of satellite threshold) */
const DIST_SURFACE_MAX   = EARTH_DETAIL_THRESHOLD * 0.6   // 12

// ── Scene constants ───────────────────────────────────────────────────────────

const EARTH_RADIUS    = 1.0   // Earth sphere scene-units radius
const _camDist = new THREE.Vector3()

// ── Shared refs updated once per frame by DistanceTracker ────────────────────
type DistRef   = React.MutableRefObject<number>
type CamPosRef = React.MutableRefObject<THREE.Vector3>

/**
 * Returns true if markerWorldPos is occluded by the Earth from the camera.
 *
 * Correct horizon formula (scalar, avoids shared-vector clobbering):
 *   dot(earth→marker, earth→cam) < R_earth × |earth→marker|
 *   ⟺  cos(θ) < R_earth / camDist
 *   i.e. the marker is past the horizon tangent cone from the camera.
 */
function isBehindEarth(markerPos: THREE.Vector3, earthPos: THREE.Vector3, camPos: THREE.Vector3): boolean {
  const mx = markerPos.x - earthPos.x,  my = markerPos.y - earthPos.y,  mz = markerPos.z - earthPos.z
  const cx = camPos.x   - earthPos.x,   cy = camPos.y   - earthPos.y,   cz = camPos.z   - earthPos.z
  const dot    = mx * cx + my * cy + mz * cz
  const mLen   = Math.sqrt(mx * mx + my * my + mz * mz)
  return dot < EARTH_RADIUS * mLen
}

// ── Aircraft marker ───────────────────────────────────────────────────────────

interface AircraftMarkerProps {
  lat: number; lng: number
  callsign: string | null; heading: number | null
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
  distRef: DistRef; camPosRef: CamPosRef
}

function AircraftMarker({ lat, lng, callsign, heading, positionsRef, distRef, camPosRef }: AircraftMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const domRef   = useRef<HTMLDivElement>(null)
  const pos = useRef(new THREE.Vector3())

  useFrame(() => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos || !groupRef.current || !domRef.current) return

    let visible = true
    if (distRef.current > DIST_SURFACE_MAX) {
      visible = false
    } else {
      latLngToWorld(lat, lng, 1.042, earthPos, pos.current)
      if (isBehindEarth(pos.current, earthPos, camPosRef.current)) visible = false
      else groupRef.current.position.copy(pos.current)
    }
    const d = visible ? '' : 'none'
    if (domRef.current.style.display !== d) domRef.current.style.display = d
  })

  const rotate = heading != null ? `rotate(${heading}deg)` : undefined

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: 'none', userSelect: 'none' }} zIndexRange={[1, 10]}>
        <div ref={domRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontSize: 10, color: '#a0c4ff', transform: rotate,
            display: 'block', lineHeight: 1,
            filter: 'drop-shadow(0 0 3px #a0c4ff88)',
          }}>✈</span>
          {callsign && (
            <span style={{
              fontSize: 6, color: '#3a6080',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.04em', whiteSpace: 'nowrap',
            }}>{callsign}</span>
          )}
        </div>
      </Html>
    </group>
  )
}

// ── Ship marker — AIS feed not yet implemented ────────────────────────────────

interface ShipMarkerProps {
  lat: number; lng: number; name: string | null
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
  distRef: DistRef; camPosRef: CamPosRef
}

export function ShipMarker({ lat, lng, name, positionsRef, distRef, camPosRef }: ShipMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const domRef   = useRef<HTMLDivElement>(null)
  const pos = useRef(new THREE.Vector3())

  useFrame(() => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos || !groupRef.current || !domRef.current) return

    let visible = true
    if (distRef.current > DIST_SURFACE_MAX) {
      visible = false
    } else {
      latLngToWorld(lat, lng, 1.024, earthPos, pos.current)
      if (isBehindEarth(pos.current, earthPos, camPosRef.current)) visible = false
      else groupRef.current.position.copy(pos.current)
    }
    const d = visible ? '' : 'none'
    if (domRef.current.style.display !== d) domRef.current.style.display = d
  })

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: 'none', userSelect: 'none' }} zIndexRange={[1, 10]}>
        <div ref={domRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontSize: 10, color: '#39ff8a', lineHeight: 1,
            filter: 'drop-shadow(0 0 3px #39ff8a88)',
          }}>🚢</span>
          {name && (
            <span style={{
              fontSize: 5, color: '#1e4060',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.03em', whiteSpace: 'nowrap',
              maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{name}</span>
          )}
        </div>
      </Html>
    </group>
  )
}

// ── Satellite marker (propagates TLE each frame) ──────────────────────────────

interface SatMarkerProps {
  name: string; satrec: sat.SatRec
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
  distRef: DistRef; camPosRef: CamPosRef
}

function SatMarker({ name, satrec, positionsRef, distRef, camPosRef }: SatMarkerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const domRef   = useRef<HTMLDivElement>(null)
  const pos = useRef(new THREE.Vector3())

  useFrame(() => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos || !groupRef.current || !domRef.current) return

    let visible = true
    if (distRef.current > DIST_SATELLITE_MAX) {
      visible = false
    } else {
      const now = new Date()
      const pv  = sat.propagate(satrec, now)
      if (typeof pv.position === 'boolean') {
        visible = false
      } else {
        const gmst   = sat.gstime(now)
        const geo    = sat.eciToGeodetic(pv.position as sat.EciVec3<sat.Kilometer>, gmst)
        const latDeg = sat.degreesLat(geo.latitude)
        const lngDeg = sat.degreesLong(geo.longitude)
        const sceneR = Math.min(1 + (geo.height / 6371) * 0.6, 1.6)

        latLngToWorld(latDeg, lngDeg, sceneR, earthPos, pos.current)

        // Hemisphere test (satellites can be above the horizon even at altitude)
        const sx = pos.current.x - earthPos.x, sy = pos.current.y - earthPos.y, sz = pos.current.z - earthPos.z
        const cx = camPosRef.current.x - earthPos.x, cy = camPosRef.current.y - earthPos.y, cz = camPosRef.current.z - earthPos.z
        if (sx * cx + sy * cy + sz * cz < 0) visible = false
        else groupRef.current.position.copy(pos.current)
      }
    }
    const d = visible ? '' : 'none'
    if (domRef.current.style.display !== d) domRef.current.style.display = d
  })

  return (
    <group ref={groupRef}>
      <Html center style={{ pointerEvents: 'none', userSelect: 'none' }} zIndexRange={[1, 10]}>
        <div ref={domRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontSize: 10, color: '#00d4ff', lineHeight: 1,
            filter: 'drop-shadow(0 0 4px #00d4ff88)',
          }}>🛰</span>
          <span style={{
            fontSize: 5, color: '#1e4060',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.03em', whiteSpace: 'nowrap',
            maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name.trim()}</span>
        </div>
      </Html>
    </group>
  )
}

// ── Distance tracker — updates distRef each frame ─────────────────────────────

function DistanceTracker({
  positionsRef, distRef, camPosRef,
}: {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
  distRef: DistRef
  camPosRef: CamPosRef
}) {
  const { camera } = useThree()
  useFrame(() => {
    const earthPos = positionsRef.current.get('earth')
    if (earthPos) {
      camPosRef.current.copy(camera.position)
      distRef.current = _camDist.copy(camera.position).distanceTo(earthPos)
    }
  })
  return null
}

// ── Main TrackingLayer component ──────────────────────────────────────────────

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

export function TrackingLayer({ positionsRef }: Props) {
  const showAircraftLayer   = useAppStore((s) => s.showAircraftLayer)
  const showSatellitesLayer = useAppStore((s) => s.showSatellitesLayer)
  const showShipsLayer      = useAppStore((s) => s.showShipsLayer)
  const setLayerError       = useAppStore((s) => s.setLayerError)

  const setLayerLoading     = useAppStore((s) => s.setLayerLoading)

  const { data: aircraft,  error: aircraftErr,  loading: aircraftLoad  } = useAircraftLayer(showAircraftLayer)
  const { data: ships,     error: shipsErr,     loading: shipsLoad     } = useShipsLayer(showShipsLayer)
  const { data: tleData,   error: satelliteErr, loading: satelliteLoad } = useSatelliteLayer(showSatellitesLayer)

  useEffect(() => { setLayerError('aircraft',   aircraftErr)   }, [aircraftErr,   setLayerError])
  useEffect(() => { setLayerError('ships',       shipsErr)     }, [shipsErr,      setLayerError])
  useEffect(() => { setLayerError('satellites',  satelliteErr) }, [satelliteErr,  setLayerError])
  useEffect(() => { setLayerLoading('aircraft',   aircraftLoad)  }, [aircraftLoad,  setLayerLoading])
  useEffect(() => { setLayerLoading('ships',       shipsLoad)    }, [shipsLoad,     setLayerLoading])
  useEffect(() => { setLayerLoading('satellites',  satelliteLoad) }, [satelliteLoad, setLayerLoading])

  // Shared refs updated every frame by DistanceTracker
  const distRef   = useRef<number>(Infinity)
  const camPosRef = useRef<THREE.Vector3>(new THREE.Vector3())

  // Parse TLE → satrec once when tleData changes
  const satrecsRef = useRef<{ name: string; satrec: sat.SatRec }[]>([])
  const prevTleRef = useRef<typeof tleData>([])
  if (tleData !== prevTleRef.current) {
    prevTleRef.current = tleData
    satrecsRef.current = tleData.flatMap(({ name, tle1, tle2 }) => {
      try { return [{ name, satrec: sat.twoline2satrec(tle1, tle2) }] }
      catch { return [] }
    })
  }

  const anyLayerOn = showAircraftLayer || showSatellitesLayer || showShipsLayer
  if (!anyLayerOn) return null

  return (
    <>
      {/* Update distRef + camPosRef every frame */}
      <DistanceTracker positionsRef={positionsRef} distRef={distRef} camPosRef={camPosRef} />

      {/* Aircraft layer — visible only when close to Earth surface */}
      {showAircraftLayer && aircraft.map((a) => (
        <AircraftMarker
          key={a.icao}
          lat={a.lat} lng={a.lng}
          callsign={a.callsign} heading={a.heading}
          positionsRef={positionsRef}
          distRef={distRef} camPosRef={camPosRef}
        />
      ))}

      {/* Ship layer — requires AISSTREAM_API_KEY on the server; returns [] if not configured */}
      {showShipsLayer && ships.map((s) => (
        <ShipMarker
          key={s.mmsi}
          lat={s.lat} lng={s.lng} name={s.name}
          positionsRef={positionsRef}
          distRef={distRef} camPosRef={camPosRef}
        />
      ))}

      {/* Satellite layer — visible from Earth focus distance */}
      {showSatellitesLayer && satrecsRef.current.map(({ name, satrec }, i) => (
        <SatMarker
          key={`${i}-${name}`}
          name={name} satrec={satrec}
          positionsRef={positionsRef}
          distRef={distRef} camPosRef={camPosRef}
        />
      ))}
    </>
  )
}
