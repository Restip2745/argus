/**
 * Geometry construction for the conflict front layer.
 *
 * Split out of ConflictLayer.tsx so it can be tested without dragging
 * react-three-fiber and the app store into the test run.
 *
 * Feeds are heterogeneous: ISW publishes control of terrain as polygons, front
 * movement as lines, and strike campaigns as thousands of points, and none of
 * them promise well-formed coordinates. Every builder here skips what it cannot
 * read rather than trusting the declared geometry type — one malformed ring
 * used to be enough to throw and take the whole layer down.
 */

import * as THREE from 'three'
import { latLngToLocal } from '../../lib/coordinates'
import type { ConflictFeature } from '../../hooks/useConflictLayer'

// Slightly above the political border layer (1.004) to avoid z-fighting
export const CONFLICT_RADIUS = 1.009
export const FILL_RADIUS     = 1.006

// Color mapping by `control` property value
const CONTROL_COLORS: Record<string, { line: string; fill: string }> = {
  frontline: { line: '#ff8800', fill: '#ff8800' },
  contested: { line: '#ffaa00', fill: '#ffaa00' },
  russia:    { line: '#dd2222', fill: '#cc2222' },
  ukraine:   { line: '#4488ff', fill: '#3366cc' },
  israel:    { line: '#33ccdd', fill: '#2299aa' },
  sdf:       { line: '#88cc44', fill: '#66aa33' },
  strike:    { line: '#ff3333', fill: '#ff3333' },
}

const DEFAULT_COLORS = { line: '#ff6600', fill: '#ff6600' }

export function controlColors(control: string | undefined) {
  return CONTROL_COLORS[(control ?? '').toLowerCase()] ?? DEFAULT_COLORS
}

// ── Geometry builders ─────────────────────────────────────────────────────────

function isCoordPair(c: unknown): c is number[] {
  return Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1])
}

/** Normalises Polygon and MultiPolygon to a common ring-of-rings shape. */
function polygonsOf(feature: ConflictFeature): number[][][][] {
  const coords = feature.geometry.coordinates
  if (!Array.isArray(coords)) return []
  return feature.geometry.type === 'Polygon'
    ? [coords as number[][][]]
    : (coords as number[][][][])
}

function pushSegments(pts: THREE.Vector3[], ring: unknown): void {
  if (!Array.isArray(ring)) return
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]
    const b = ring[i + 1]
    if (!isCoordPair(a) || !isCoordPair(b)) continue
    pts.push(latLngToLocal(a[1], a[0], CONFLICT_RADIUS))
    pts.push(latLngToLocal(b[1], b[0], CONFLICT_RADIUS))
  }
}

function ringToVec2(ring: unknown): THREE.Vector2[] {
  if (!Array.isArray(ring)) return []
  const out: THREE.Vector2[] = []
  for (const c of ring) {
    if (!isCoordPair(c)) continue
    out.push(new THREE.Vector2(c[0], c[1]))
  }
  return out
}

function buildLineGeometry(feature: ConflictFeature): THREE.BufferGeometry | null {
  const pts: THREE.Vector3[] = []
  const coords = feature.geometry.coordinates

  if (feature.geometry.type === 'LineString') {
    pushSegments(pts, coords)
  } else if (Array.isArray(coords)) {
    for (const line of coords as number[][][]) pushSegments(pts, line)
  }

  if (pts.length === 0) return null
  const geo = new THREE.BufferGeometry()
  geo.setFromPoints(pts)
  return geo
}

/** Strike sites, incident reports and other point feeds. */
function collectPoints(feature: ConflictFeature): THREE.Vector3[] {
  const coords = feature.geometry.coordinates
  if (!Array.isArray(coords)) return []

  const positions: unknown[] =
    feature.geometry.type === 'Point' ? [coords] : coords

  const pts: THREE.Vector3[] = []
  for (const c of positions) {
    if (!isCoordPair(c)) continue
    pts.push(latLngToLocal(c[1], c[0], CONFLICT_RADIUS))
  }
  return pts
}

function buildPolygonBorderGeometry(feature: ConflictFeature): THREE.BufferGeometry | null {
  const pts: THREE.Vector3[] = []

  for (const poly of polygonsOf(feature)) {
    if (!Array.isArray(poly)) continue
    for (const ring of poly) pushSegments(pts, ring)
  }

  if (pts.length === 0) return null
  const geo = new THREE.BufferGeometry()
  geo.setFromPoints(pts)
  return geo
}

function buildFillGeometry(feature: ConflictFeature): THREE.BufferGeometry | null {
  const positions: number[] = []

  for (const poly of polygonsOf(feature)) {
    if (!Array.isArray(poly) || poly.length === 0) continue
    const outerRing = ringToVec2(poly[0])
    if (outerRing.length < 3) continue

    const shape = new THREE.Shape(outerRing)
    for (let h = 1; h < poly.length; h++) {
      const hole = ringToVec2(poly[h])
      if (hole.length >= 3) shape.holes.push(new THREE.Path(hole))
    }

    try {
      const pts2d   = shape.extractPoints(1)
      const indices = THREE.ShapeUtils.triangulateShape(pts2d.shape, pts2d.holes)
      const allPts  = [...pts2d.shape, ...pts2d.holes.flat()]

      for (const [a, b, c] of indices) {
        for (const idx of [a, b, c]) {
          const pt = allPts[idx]
          const v  = latLngToLocal(pt.y, pt.x, FILL_RADIUS)
          positions.push(v.x, v.y, v.z)
        }
      }
    } catch { /* skip degenerate polygons */ }
  }

  if (positions.length === 0) return null
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return geo
}

// ── Scene assembly ────────────────────────────────────────────────────────────

type FeatureKind = 'line' | 'polygon' | 'point'

function geometryKind(type: string | undefined): FeatureKind | null {
  switch (type) {
    case 'LineString': case 'MultiLineString': return 'line'
    case 'Polygon':    case 'MultiPolygon':    return 'polygon'
    case 'Point':      case 'MultiPoint':      return 'point'
    default:                                   return null
  }
}

export interface RenderedShape {
  key: string
  isLine: boolean
  lineGeo: THREE.BufferGeometry | null
  fillGeo: THREE.BufferGeometry | null
  colors: { line: string; fill: string }
}

export interface RenderedPoints {
  key: string
  geo: THREE.BufferGeometry
  color: string
  count: number
}

/**
 * Splits a feed into line/polygon shapes and point clusters.
 *
 * Points are merged into one geometry per colour rather than one per feature:
 * ISW's strike layers carry ~1,600 single-point features apiece, and a draw
 * call each would cost more than the rest of the globe put together.
 */
export function buildRenderedScene(features: ConflictFeature[]): {
  shapes: RenderedShape[]
  points: RenderedPoints[]
} {
  const shapes: RenderedShape[] = []
  const pointsByColor = new Map<string, THREE.Vector3[]>()

  features.forEach((f, i) => {
    const kind = geometryKind(f.geometry?.type)
    if (!kind) return
    const colors = controlColors(f.properties?.control)

    if (kind === 'point') {
      const pts = collectPoints(f)
      if (pts.length === 0) return
      let bucket = pointsByColor.get(colors.line)
      if (!bucket) pointsByColor.set(colors.line, (bucket = []))
      for (const p of pts) bucket.push(p)
      return
    }

    const isLine = kind === 'line'
    shapes.push({
      key:     `${f.properties?.name ?? i}-${i}`,
      isLine,
      lineGeo: isLine ? buildLineGeometry(f) : buildPolygonBorderGeometry(f),
      fillGeo: isLine ? null : buildFillGeometry(f),
      colors,
    })
  })

  const points: RenderedPoints[] = []
  for (const [color, pts] of pointsByColor) {
    const geo = new THREE.BufferGeometry()
    geo.setFromPoints(pts)
    points.push({ key: `points-${color}`, geo, color, count: pts.length })
  }

  return { shapes, points }
}
