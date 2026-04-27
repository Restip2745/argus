/**
 * Module-level singleton updated by GlobeProjectorSetup (inside the R3F Canvas).
 * Used by DOM panels to project lat/lng → screen coordinates each rAF tick.
 */
import * as THREE from 'three'
import { gastToRotY, getGAST } from './useGAST'

const AXIAL_TILT_RAD = (23.44 * Math.PI) / 180

// Singleton state — written by the Canvas component, read by DOM panels
let _camera: THREE.Camera | null = null
const _earthPos = new THREE.Vector3()

// Pre-allocated temporaries (avoids per-call GC pressure)
const _local      = new THREE.Vector3()
const _camToEarth = new THREE.Vector3()
const _worldPos   = new THREE.Vector3()
const _ndc        = new THREE.Vector3()
const _egast      = new THREE.Euler(0, 0, 0, 'XYZ')
const _etilt      = new THREE.Euler(0, 0, AXIAL_TILT_RAD, 'XYZ')

/** Called every frame from inside the Canvas (GlobeProjectorSetup). */
export function updateGlobeProjection(
  camera:   THREE.Camera,
  earthPos: THREE.Vector3,
): void {
  _camera = camera
  _earthPos.copy(earthPos)
}

export interface ScreenPos {
  x:      number
  y:      number
  /** true when the point is on the far side of the Earth (occluded) */
  behind: boolean
}

/**
 * Project a geographic coordinate to viewport pixels.
 * Uses the same coordinate math as EventMarkers (GeoMarker.useFrame).
 * Returns null if the camera hasn't been set yet.
 */
export function projectLatLng(lat: number, lng: number): ScreenPos | null {
  if (!_camera) return null

  const latR = (lat * Math.PI) / 180
  const lngR = (lng * Math.PI) / 180

  // Local position on unit sphere (same formula as GeoMarker)
  _local.set(
    Math.cos(latR) * Math.cos(lngR),
    Math.sin(latR),
    -Math.cos(latR) * Math.sin(lngR),
  )

  // Check visibility: if surface normal faces away from camera → occluded
  _camToEarth.subVectors(_camera.position, _earthPos).normalize()
  const behind = _local.dot(_camToEarth) < 0

  // Apply Earth's rotation (GAST) then axial tilt — same order as EventMarkers
  _egast.set(0, gastToRotY(getGAST()), 0)
  _local.applyEuler(_egast)
  _local.applyEuler(_etilt)

  // World position (1.025 * radius = just above surface, like the markers)
  _worldPos.copy(_local).multiplyScalar(1.025).add(_earthPos)

  // NDC → viewport pixels (canvas fills the full viewport)
  _ndc.copy(_worldPos).project(_camera)
  const x = (_ndc.x + 1) / 2 * window.innerWidth
  const y = (-_ndc.y + 1) / 2 * window.innerHeight

  return { x, y, behind }
}

/**
 * Given the panel's DOMRect and the target screen point,
 * returns the point on the panel's edge along the line from panel-center → target.
 */
export function panelEdgeAnchor(
  rect: DOMRect,
  tx: number,
  ty: number,
): { ax: number; ay: number } {
  const cx = (rect.left + rect.right)  / 2
  const cy = (rect.top  + rect.bottom) / 2
  const dx = tx - cx
  const dy = ty - cy

  if (dx === 0 && dy === 0) return { ax: cx, ay: cy }

  // Parametric: find the smallest t > 0 that hits a panel edge
  const tRight  = dx > 0 ? (rect.right  - cx) / dx : Infinity
  const tLeft   = dx < 0 ? (rect.left   - cx) / dx : Infinity
  const tBottom = dy > 0 ? (rect.bottom - cy) / dy : Infinity
  const tTop    = dy < 0 ? (rect.top    - cy) / dy : Infinity
  const t = Math.min(tRight, tLeft, tBottom, tTop)

  return { ax: cx + dx * t, ay: cy + dy * t }
}
