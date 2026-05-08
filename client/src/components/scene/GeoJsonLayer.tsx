import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { getGAST, gastToRotY } from '../../hooks/useGAST'
import { latLngToLocal, AXIAL_TILT_RAD } from '../../lib/coordinates'
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

const COMPARE_COLORS = ['#00ffcc', '#ff9c2a', '#9b6dff', '#39ff8a', '#ff4d4d', '#00d4ff']

const HEATMAP_FILL_RADIUS = 1.003

// Map total heat score → CSS hex color (blue → amber → red)
function heatmapColor(total: number): string {
  if (total >= 3.0) return '#ff2222'
  if (total >= 2.0) return '#ff6600'
  if (total >= 1.2) return '#ff9c2a'
  if (total >= 0.6) return '#ffd700'
  return '#00d4ff'
}

// Opacity scales with intensity, capped at 0.22
function heatmapOpacity(total: number): number {
  return Math.min(0.22, 0.06 + total * 0.06)
}

function buildHeatFillGeometry(feature: GeoFeature): THREE.BufferGeometry | null {
  const polygons: number[][][][] =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])

  const positions: number[] = []

  for (const poly of polygons) {
    if (poly.length === 0) continue
    const shape = new THREE.Shape(
      poly[0].map(([lng, lat]) => new THREE.Vector2(lng, lat)),
    )
    for (let h = 1; h < poly.length; h++) {
      shape.holes.push(new THREE.Path(
        poly[h].map(([lng, lat]) => new THREE.Vector2(lng, lat)),
      ))
    }
    const pts2d   = shape.extractPoints(1)
    const indices = THREE.ShapeUtils.triangulateShape(pts2d.shape, pts2d.holes)
    const allPts  = [...pts2d.shape, ...pts2d.holes.flat()]
    for (const [a, b, c] of indices) {
      for (const idx of [a, b, c]) {
        const pt = allPts[idx]
        const v  = latLngToLocal(pt.y, pt.x, HEATMAP_FILL_RADIUS)
        positions.push(v.x, v.y, v.z)
      }
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
  const compareMode            = useAppStore((s) => s.compareMode)
  const comparedCountries      = useAppStore((s) => s.comparedCountries)
  const addComparedCountry     = useAppStore((s) => s.addComparedCountry)
  const removeComparedCountry  = useAppStore((s) => s.removeComparedCountry)
  const showHeatmapLayer       = useAppStore((s) => s.showHeatmapLayer)
  const events                 = useAppStore((s) => s.events)

  // Refs so handleSurfaceClick stays stable across compare state changes
  const compareModeRef       = useRef(compareMode)
  const comparedCountriesRef = useRef(comparedCountries)
  useEffect(() => { compareModeRef.current = compareMode },       [compareMode])
  useEffect(() => { comparedCountriesRef.current = comparedCountries }, [comparedCountries])

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
          if (compareModeRef.current) {
            const already = comparedCountriesRef.current.some(c => c.name === name)
            if (already) removeComparedCountry(name)
            else         addComparedCountry({ name, lat, lng })
          } else {
            setSelectedCountry({ name, lat, lng })
          }
          return
        }
      }
      if (!compareModeRef.current) setSelectedCountry(null)
    },
    [features, setSelectedCountry, addComparedCountry, removeComparedCountry],
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
    if (compareMode || !selectedCountry || features.length === 0) return null
    return features.find((f) =>
      pointInPolygon(selectedCountry.lat, selectedCountry.lng, f.geometry),
    ) ?? null
  }, [compareMode, selectedCountry, features])

  const highlightBorderGeo = useMemo(
    () => (highlightFeature ? buildHighlightBorderGeometry(highlightFeature) : null),
    [highlightFeature],
  )

  const highlightFillGeo = useMemo(
    () => (highlightFeature ? buildHighlightFillGeometry(highlightFeature) : null),
    [highlightFeature],
  )

  // ── Compare mode: highlight all compared countries ────────────────────────────
  const compareHighlightGeos = useMemo(() => {
    if (!compareMode || features.length === 0) return []
    return comparedCountries.map((c, i) => {
      const feat = features.find(f => pointInPolygon(c.lat, c.lng, f.geometry))
      if (!feat) return null
      return {
        key: c.name,
        color: COMPARE_COLORS[i % COMPARE_COLORS.length],
        borderGeo: buildHighlightBorderGeometry(feat),
        fillGeo:   buildHighlightFillGeometry(feat),
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [compareMode, comparedCountries, features])

  // ── Heatmap: per-country total heat score from events ────────────────────────
  const heatmapEntries = useMemo(() => {
    if (!showHeatmapLayer || !showGeoJsonLayer || features.length === 0) return []

    // Build label → total heat score map (events in last 24 h only)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const scoreByLabel = new Map<string, number>()
    for (const e of events) {
      const label = e.location_label
      if (!label || label === '—') continue
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      if (ts > 0 && ts < cutoff) continue
      const heat = e.heat_score ?? 0.1
      scoreByLabel.set(label, (scoreByLabel.get(label) ?? 0) + heat)
    }
    if (scoreByLabel.size === 0) return []

    // Match labels to GeoJSON features (case-insensitive substring)
    const entries: { geo: THREE.BufferGeometry; color: string; opacity: number }[] = []
    for (const [label, total] of scoreByLabel) {
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
      entries.push({ geo, color: heatmapColor(total), opacity: heatmapOpacity(total) })
    }
    return entries
  }, [showHeatmapLayer, showGeoJsonLayer, features, events])

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

          {/* Compare mode: highlight each compared country */}
          {compareHighlightGeos.map(({ key, color, borderGeo, fillGeo }) => (
            <group key={key}>
              <lineSegments geometry={borderGeo}>
                <lineBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
              </lineSegments>
              {fillGeo && (
                <mesh geometry={fillGeo}>
                  <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
              )}
            </group>
          ))}

          {/* Heatmap: country fills colored by 24h event heat score */}
          {heatmapEntries.map(({ geo, color, opacity }, i) => (
            <mesh key={`heat-${i}`} geometry={geo}>
              <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          ))}

        </group>
      </group>
    </group>
  )
}
