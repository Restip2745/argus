import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { getGAST, gastToRotY } from '../../hooks/useGAST'
import { latLngToLocal, AXIAL_TILT_RAD } from '../../lib/coordinates'
import { useConflictLayer, type ConflictFeature } from '../../hooks/useConflictLayer'
import type { CelestialBodyName } from '../../types'

// Slightly above the political border layer (1.004) to avoid z-fighting
const CONFLICT_RADIUS   = 1.009
const FILL_RADIUS       = 1.006
const DIST_CONFLICT_MAX = 20   // hide beyond this distance from Earth

// Color mapping by `control` property value
const CONTROL_COLORS: Record<string, { line: string; fill: string }> = {
  frontline: { line: '#ff8800', fill: '#ff8800' },
  contested: { line: '#ffaa00', fill: '#ffaa00' },
  russia:    { line: '#dd2222', fill: '#cc2222' },
  ukraine:   { line: '#4488ff', fill: '#3366cc' },
}

function controlColors(control: string | undefined) {
  return CONTROL_COLORS[(control ?? '').toLowerCase()] ?? { line: '#ff6600', fill: '#ff6600' }
}

// ── Geometry builders ─────────────────────────────────────────────────────────

function buildLineGeometry(feature: ConflictFeature): THREE.BufferGeometry | null {
  const pts: THREE.Vector3[] = []

  if (feature.geometry.type === 'LineString') {
    const coords = feature.geometry.coordinates as number[][]
    for (let i = 0; i < coords.length - 1; i++) {
      pts.push(latLngToLocal(coords[i][1],     coords[i][0],     CONFLICT_RADIUS))
      pts.push(latLngToLocal(coords[i + 1][1], coords[i + 1][0], CONFLICT_RADIUS))
    }
  } else if (feature.geometry.type === 'MultiLineString') {
    const lines = feature.geometry.coordinates as number[][][]
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        pts.push(latLngToLocal(line[i][1],     line[i][0],     CONFLICT_RADIUS))
        pts.push(latLngToLocal(line[i + 1][1], line[i + 1][0], CONFLICT_RADIUS))
      }
    }
  }

  if (pts.length === 0) return null
  const geo = new THREE.BufferGeometry()
  geo.setFromPoints(pts)
  return geo
}

function buildPolygonBorderGeometry(feature: ConflictFeature): THREE.BufferGeometry | null {
  const pts: THREE.Vector3[] = []
  const polygons: number[][][][] =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])

  for (const poly of polygons) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        pts.push(latLngToLocal(ring[i][1],     ring[i][0],     CONFLICT_RADIUS))
        pts.push(latLngToLocal(ring[i + 1][1], ring[i + 1][0], CONFLICT_RADIUS))
      }
    }
  }

  if (pts.length === 0) return null
  const geo = new THREE.BufferGeometry()
  geo.setFromPoints(pts)
  return geo
}

function buildFillGeometry(feature: ConflictFeature): THREE.BufferGeometry | null {
  const polygons: number[][][][] =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates as number[][][]]
      : (feature.geometry.coordinates as number[][][][])

  const positions: number[] = []

  for (const poly of polygons) {
    if (poly.length === 0) continue
    const outerRing = poly[0]
    const shape = new THREE.Shape(
      outerRing.map(([lng, lat]) => new THREE.Vector2(lng, lat)),
    )
    for (let h = 1; h < poly.length; h++) {
      shape.holes.push(
        new THREE.Path(poly[h].map(([lng, lat]) => new THREE.Vector2(lng, lat))),
      )
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

// ── Rendered feature ──────────────────────────────────────────────────────────

interface RenderedFeature {
  key: string
  isLine: boolean
  lineGeo: THREE.BufferGeometry | null
  fillGeo: THREE.BufferGeometry | null
  colors: { line: string; fill: string }
}

function buildRenderedFeatures(features: ConflictFeature[]): RenderedFeature[] {
  return features.map((f, i) => {
    const isLine = f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
    return {
      key:     `${f.properties.name ?? i}-${i}`,
      isLine,
      lineGeo: isLine ? buildLineGeometry(f) : buildPolygonBorderGeometry(f),
      fillGeo: isLine ? null : buildFillGeometry(f),
      colors:  controlColors(f.properties.control),
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

export function ConflictLayer({ positionsRef }: Props) {
  const showConflictLayer = useAppStore((s) => s.showConflictLayer)
  const outerRef = useRef<THREE.Group>(null)
  const gastRef  = useRef<THREE.Group>(null)
  const visRef   = useRef<THREE.Group>(null)

  const data = useConflictLayer(showConflictLayer)

  const rendered = useMemo(
    () => (data ? buildRenderedFeatures(data.features) : []),
    [data],
  )

  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos) return

    if (outerRef.current) outerRef.current.position.copy(earthPos)
    if (gastRef.current)  gastRef.current.rotation.y = gastToRotY(getGAST())

    const dist = camera.position.distanceTo(earthPos)
    if (visRef.current) visRef.current.visible = dist <= DIST_CONFLICT_MAX
  })

  if (!showConflictLayer) return null

  return (
    <group ref={outerRef}>
      <group rotation={[0, 0, AXIAL_TILT_RAD]}>
        <group ref={gastRef}>
          <group ref={visRef}>

            {rendered.map(({ key, isLine, lineGeo, fillGeo, colors }) => (
              <group key={key}>
                {/* Front lines and polygon borders */}
                {lineGeo && (
                  <lineSegments geometry={lineGeo}>
                    <lineBasicMaterial
                      color={colors.line}
                      transparent
                      opacity={isLine ? 0.85 : 0.45}
                      depthWrite={false}
                    />
                  </lineSegments>
                )}

                {/* Territory fills (polygons only) */}
                {fillGeo && (
                  <mesh geometry={fillGeo}>
                    <meshBasicMaterial
                      color={colors.fill}
                      transparent
                      opacity={0.12}
                      depthWrite={false}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
              </group>
            ))}

          </group>
        </group>
      </group>
    </group>
  )
}
