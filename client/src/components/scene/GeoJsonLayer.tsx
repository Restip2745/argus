import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { getGAST, gastToRotY } from '../../hooks/useGAST'
import { latLngToLocal, AXIAL_TILT_RAD } from '../../lib/coordinates'
import { unwrapRing, emitSubdividedTriangle } from '../../lib/geoFill'
import {
  assignRegionColors, geometryBBoxes, NEUTRAL_FILLS, type ColorableRegion,
} from '../../data/mapColoring'
import { severityColor, severityRank } from '../../data/symbology'
import { useSceneTime } from '../../hooks/useSceneTime'
import type { CelestialBodyName } from '../../types'

// ── Constants ──────────────────────────────────────────────────────────────────
const BORDER_RADIUS  = 1.004   // Just above Earth surface — close enough to avoid z-fighting
const CLICK_RADIUS   = 1.010   // Radius used for inverse lat/lng transform

// ── GeoJSON types ──────────────────────────────────────────────────────────────
interface GeoFeature {
  type: 'Feature'
  properties: Record<string, string | number | null>
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}
interface GeoFeatureCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

// ── Coordinate helpers ─────────────────────────────────────────────────────────

/**
 * Convert a local sphere position back to [lat, lng] degrees.
 * Inverse of latLngToVec3: atan2(-z, x) gives longitude.
 */
function vec3ToLatLng(v: THREE.Vector3, R: number): [number, number] {
  const lat = Math.asin(v.y / R) * (180 / Math.PI)
  const lng = Math.atan2(-v.z, v.x) * (180 / Math.PI)
  return [lat, lng]
}

// ── Point-in-polygon (ray casting, 2D lat/lng) ────────────────────────────────
function pointInRing(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInPolygon(lat: number, lng: number, geometry: GeoFeature['geometry']): boolean {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][]
    if (!pointInRing(lat, lng, rings[0])) return false
    for (let h = 1; h < rings.length; h++) {
      if (pointInRing(lat, lng, rings[h])) return false
    }
    return true
  }
  const polys = geometry.coordinates as number[][][][]
  for (const poly of polys) {
    if (!pointInRing(lat, lng, poly[0])) continue
    let inHole = false
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lat, lng, poly[h])) { inHole = true; break }
    }
    if (!inHole) return true
  }
  return false
}

// ── Build line BufferGeometry from GeoJSON features ───────────────────────────
function buildBorderGeometry(features: GeoFeature[]): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = []

  for (const f of features) {
    const { geometry } = f
    const polygons: number[][][][] =
      geometry.type === 'Polygon'
        ? [geometry.coordinates as number[][][]]
        : (geometry.coordinates as number[][][][])

    for (const poly of polygons) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length - 1; i++) {
          pts.push(latLngToLocal(ring[i][1],     ring[i][0],     BORDER_RADIUS))
          pts.push(latLngToLocal(ring[i + 1][1], ring[i + 1][0], BORDER_RADIUS))
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setFromPoints(pts)
  return geo
}

// ── Highlight geometry helpers ─────────────────────────────────────────────────

const HIGHLIGHT_BORDER_RADIUS = 1.007
const HIGHLIGHT_FILL_RADIUS   = 1.005

/**
 * Build LineSegments geometry for a single country's border highlight.
 */
function buildHighlightBorderGeometry(feature: GeoFeature): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = []
  const polygons: number[][][][] =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])

  for (const poly of polygons) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        pts.push(latLngToLocal(ring[i][1],     ring[i][0],     HIGHLIGHT_BORDER_RADIUS))
        pts.push(latLngToLocal(ring[i + 1][1], ring[i + 1][0], HIGHLIGHT_BORDER_RADIUS))
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setFromPoints(pts)
  return geo
}

/**
 * Build a filled mesh for a single country using triangulation.
 * Projects each ring into a flat 2-D lat/lng plane, triangulates, then
 * lifts each vertex back onto the sphere at HIGHLIGHT_FILL_RADIUS.
 */
function buildHighlightFillGeometry(feature: GeoFeature): THREE.BufferGeometry | null {
  const polygons: number[][][][] =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])

  const positions: number[] = []

  for (const poly of polygons) {
    if (poly.length === 0) continue

    // Build THREE.Shape from outer ring
    const outerRing = poly[0]
    const shape = new THREE.Shape(
      outerRing.map(([lng, lat]) => new THREE.Vector2(lng, lat)),
    )

    // Add holes
    for (let h = 1; h < poly.length; h++) {
      const holePath = new THREE.Path(
        poly[h].map(([lng, lat]) => new THREE.Vector2(lng, lat)),
      )
      shape.holes.push(holePath)
    }

    // Triangulate in 2-D lat/lng space
    const pts2d    = shape.extractPoints(1)
    const indices  = THREE.ShapeUtils.triangulateShape(pts2d.shape, pts2d.holes)
    const allPts   = [...pts2d.shape, ...pts2d.holes.flat()]

    for (const [a, b, c] of indices) {
      for (const idx of [a, b, c]) {
        const pt = allPts[idx]
        const v  = latLngToLocal(pt.y, pt.x, HIGHLIGHT_FILL_RADIUS)
        positions.push(v.x, v.y, v.z)
      }
    }
  }

  if (positions.length === 0) return null

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}


const HEATMAP_FILL_RADIUS = 1.003

/**
 * Subdivision threshold for surface fills, in degrees of arc.
 *
 * At radius 1.003 over a unit Earth the geometry may span at most
 * `maxSafeSpanDeg(1.003, 1.0)` ≈ 8.9° before a flat triangle's centre sinks
 * below the terrain. 4° leaves a wide margin: the residual sag is ~0.0006,
 * a fifth of the 0.003 clearance.
 */
const FILL_MAX_EDGE_DEG = 4

/**
 * Activity mode ramp — single hue, opacity carries the quantity.
 *
 * The previous heatmap stepped blue → gold → amber → orange → red, which was a
 * near-copy of the severity ramp with different breakpoints: a country busy
 * with routine news lit up the same red as a CRITICAL marker. A quantity gets a
 * sequential ramp in one cool hue instead, leaving the warm band to severity.
 */
const ACTIVITY_HUE = '#3fc8e0'

function activityOpacity(total: number): number {
  return Math.min(0.34, 0.07 + total * 0.07)
}

interface FillEntry {
  geo: THREE.BufferGeometry
  color: string
  opacity: number
}

/** Stable identity for a GeoJSON feature, used as the colouring key. */
function featureKey(f: GeoFeature): string {
  return (
    (f.properties['ADM0_A3'] as string) ??
    (f.properties['ADMIN']   as string) ??
    (f.properties['NAME']    as string) ??
    JSON.stringify(f.properties['NAME_LONG'] ?? Math.random())
  )
}

function buildHeatFillGeometry(feature: GeoFeature): THREE.BufferGeometry | null {
  const polygons: number[][][][] =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])

  const positions: number[] = []

  for (const poly of polygons) {
    if (poly.length === 0) continue
    // Unwrap first: a ring spanning ±180 would otherwise triangulate into a
    // band stretching the wrong way around the globe.
    const outer = unwrapRing(poly[0])
    const shape = new THREE.Shape(
      outer.map(([lng, lat]) => new THREE.Vector2(lng, lat)),
    )
    for (let h = 1; h < poly.length; h++) {
      shape.holes.push(new THREE.Path(
        unwrapRing(poly[h]).map(([lng, lat]) => new THREE.Vector2(lng, lat)),
      ))
    }
    const pts2d   = shape.extractPoints(1)
    const indices = THREE.ShapeUtils.triangulateShape(pts2d.shape, pts2d.holes)
    const allPts  = [...pts2d.shape, ...pts2d.holes.flat()]
    for (const [a, b, c] of indices) {
      const pa = allPts[a], pb = allPts[b], pc = allPts[c]
      // Subdivide so the flat chords never sag below the terrain.
      emitSubdividedTriangle(
        [pa.x, pa.y], [pb.x, pb.y], [pc.x, pc.y],
        HEATMAP_FILL_RADIUS,
        positions,
        { maxEdgeDeg: FILL_MAX_EDGE_DEG },
      )
    }
  }

  if (positions.length === 0) return null
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geo
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

export function GeoJsonLayer({ positionsRef }: Props) {
  const showGeoJsonLayer       = useAppStore((s) => s.showGeoJsonLayer)
  const setSelectedCountry     = useAppStore((s) => s.setSelectedCountry)
  const selectedCountry        = useAppStore((s) => s.selectedCountry)
  const setOnEarthSurfaceClick = useAppStore((s) => s.setOnEarthSurfaceClick)
  const mapMode                = useAppStore((s) => s.mapMode)
  const events                 = useAppStore((s) => s.events)
  const { now: sceneNow }      = useSceneTime()

  const outerRef = useRef<THREE.Group>(null)   // Earth position + axial tilt
  const gastRef  = useRef<THREE.Group>(null)   // GAST rotation

  const [features, setFeatures] = useState<GeoFeature[]>([])
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [hires,    setHires]    = useState(false)

  // ── Fetch GeoJSON ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loaded || loading || !showGeoJsonLayer) return
    setLoading(true)

    fetch('/geodata/ne_110m_admin_0_countries.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<GeoFeatureCollection>
      })
      .then((data) => { setFeatures(data.features); setLoaded(true) })
      .catch(() => setLoaded(true))
      .finally(() => setLoading(false))
  }, [showGeoJsonLayer, loaded, loading])

  // ── Upgrade to 50m when very close ───────────────────────────────────────────
  useEffect(() => {
    if (!hires) return
    fetch('/geodata/ne_50m_admin_0_countries.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<GeoFeatureCollection>
      })
      .then((data) => setFeatures(data.features))
      .catch(() => {/* keep 110m */})
  }, [hires])

  // ── Country-click handler (called by Earth mesh onClick via store) ────────────
  const handleSurfaceClick = useCallback(
    (worldPt: { x: number; y: number; z: number }) => {
      if (!gastRef.current || features.length === 0) return

      // Transform world-space point into gastRef's local frame to get
      // coordinates in the Earth-rotated sphere space, then convert to lat/lng.
      const v3 = new THREE.Vector3(worldPt.x, worldPt.y, worldPt.z)
      const localPt = gastRef.current.worldToLocal(v3)
      const [lat, lng] = vec3ToLatLng(localPt, CLICK_RADIUS)

      for (const feature of features) {
        if (pointInPolygon(lat, lng, feature.geometry)) {
          const name =
            (feature.properties['NAME'] as string) ??
            (feature.properties['ADMIN'] as string) ??
            'Unknown'
          setSelectedCountry({ name, lat, lng })
          return
        }
      }
      setSelectedCountry(null)
    },
    [features, setSelectedCountry],
  )

  // Register/unregister the handler so CelestialBody can call it on Earth clicks
  useEffect(() => {
    if (showGeoJsonLayer) {
      setOnEarthSurfaceClick(handleSurfaceClick)
    } else {
      setOnEarthSurfaceClick(null)
    }
    return () => setOnEarthSurfaceClick(null)
  }, [showGeoJsonLayer, handleSurfaceClick, setOnEarthSurfaceClick])

  // ── Update Earth position + GAST rotation every frame ────────────────────────
  // Uses the shared getGAST() cache — SiderealTime() recalculated ≤ 1×/second.
  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos) return

    if (outerRef.current) outerRef.current.position.copy(earthPos)
    if (gastRef.current)  gastRef.current.rotation.y = gastToRotY(getGAST())

    // Switch to 50m hi-res when camera < 4 units from Earth
    const dist = camera.position.distanceTo(earthPos)
    if (!hires && dist < 4)  setHires(true)
    if (hires  && dist >= 5) setHires(false)
  })

  // ── Border geometry (rebuilt only when features change) ──────────────────────
  const borderGeometry = useMemo(
    () => (features.length > 0 ? buildBorderGeometry(features) : null),
    [features],
  )

  // ── Highlight geometries (rebuilt when selectedCountry or features change) ────
  const highlightFeature = useMemo(() => {
    if (!selectedCountry || features.length === 0) return null
    return features.find((f) =>
      pointInPolygon(selectedCountry.lat, selectedCountry.lng, f.geometry),
    ) ?? null
  }, [selectedCountry, features])

  const highlightBorderGeo = useMemo(
    () => (highlightFeature ? buildHighlightBorderGeometry(highlightFeature) : null),
    [highlightFeature],
  )

  const highlightFillGeo = useMemo(
    () => (highlightFeature ? buildHighlightFillGeometry(highlightFeature) : null),
    [highlightFeature],
  )

  // ── Compare mode: highlight all compared countries ────────────────────────────
  // ── Heatmap: per-country total heat score from events ────────────────────────
  // ── Neutral political colouring ──────────────────────────────────────────────
  // Computed once per feature set. Purely for telling neighbours apart; carries
  // no meaning, which is why it is safe to leave on underneath the data modes.
  const politicalColors = useMemo(() => {
    if (features.length === 0) return new Map<string, string>()
    const regions: ColorableRegion[] = []
    for (const f of features) {
      const bboxes = geometryBBoxes(f.geometry)
      if (bboxes.length) regions.push({ id: featureKey(f), bboxes })
    }
    return assignRegionColors(regions)
  }, [features])

  // ── Surface fills for the active map mode ────────────────────────────────────
  const fillEntries = useMemo(() => {
    if (mapMode === 'none' || !showGeoJsonLayer || features.length === 0) return []

    // Political mode paints every country, so it needs no event lookup.
    if (mapMode === 'political') {
      const entries: FillEntry[] = []
      for (const f of features) {
        const geo = buildHeatFillGeometry(f)
        if (!geo) continue
        entries.push({
          geo,
          color: politicalColors.get(featureKey(f)) ?? NEUTRAL_FILLS[0],
          opacity: 0.30,
        })
      }
      return entries
    }

    // Data modes aggregate the last 24 h of events per country.
    const cutoff = sceneNow - 24 * 60 * 60 * 1000
    const byLabel = new Map<string, { heat: number; count: number; peak: string }>()
    for (const e of events) {
      const label = e.location_label
      if (!label || label === '—') continue
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      if (ts > 0 && ts < cutoff) continue
      const prev = byLabel.get(label) ?? { heat: 0, count: 0, peak: 'LOW' }
      byLabel.set(label, {
        heat:  prev.heat + (e.heat_score ?? 0.1),
        count: prev.count + 1,
        peak:  severityRank(e.intensity) > severityRank(prev.peak) ? e.intensity : prev.peak,
      })
    }
    if (byLabel.size === 0) return []

    const entries: FillEntry[] = []
    for (const [label, agg] of byLabel) {
      const lower = label.toLowerCase()
      const feat = features.find((f) => {
        const name  = ((f.properties['NAME']  as string) ?? '').toLowerCase()
        const admin = ((f.properties['ADMIN'] as string) ?? '').toLowerCase()
        return name === lower || admin === lower ||
               name.includes(lower) || lower.includes(name)
      })
      if (!feat) continue
      const geo = buildHeatFillGeometry(feat)
      if (!geo) continue

      if (mapMode === 'posture') {
        // Colour is severity — the same ramp as the markers and the status bar,
        // so the globe reads as one continuous severity surface.
        entries.push({
          geo,
          color: severityColor(agg.peak),
          opacity: 0.14 + severityRank(agg.peak) * 0.05,
        })
      } else {
        // Activity is a quantity, so it gets a single-hue sequential ramp.
        // Deliberately cool: a volume of LOW events must never look like alarm.
        entries.push({ geo, color: ACTIVITY_HUE, opacity: activityOpacity(agg.heat) })
      }
    }
    return entries
  }, [mapMode, showGeoJsonLayer, features, events, politicalColors])

  if (!showGeoJsonLayer) return null

  return (
    <group ref={outerRef}>
      {/* Axial tilt — same as Earth CelestialBody wrapper */}
      <group rotation={[0, 0, AXIAL_TILT_RAD]}>
        {/* GAST rotation — updated every frame via getGAST() cache */}
        <group ref={gastRef}>

          {/* Political border lines — single draw call for all countries */}
          {borderGeometry && (
            <lineSegments geometry={borderGeometry}>
              <lineBasicMaterial
                color="#00d4ff"
                transparent
                opacity={0.35}
                depthWrite={false}
              />
            </lineSegments>
          )}

          {/*
           * No invisible click-capture sphere here.
           * Clicks are routed from the Earth mesh's onClick in CelestialBody
           * → store.onEarthSurfaceClick → handleSurfaceClick above.
           * This removes the previous 64×64 sphere (8 192 triangles) entirely.
           */}

          {/* Selected country highlight — bright border */}
          {highlightBorderGeo && (
            <lineSegments geometry={highlightBorderGeo}>
              <lineBasicMaterial color="#00ffcc" transparent opacity={0.9} depthWrite={false} />
            </lineSegments>
          )}

          {/* Selected country highlight — translucent fill */}
          {highlightFillGeo && (
            <mesh geometry={highlightFillGeo}>
              <meshBasicMaterial color="#00ffcc" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          )}

          {/* Surface fill for the active map mode */}
          {fillEntries.map(({ geo, color, opacity }, i) => (
            <mesh key={`heat-${i}`} geometry={geo}>
              <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          ))}

        </group>
      </group>
    </group>
  )
}
