/**
 * Module-level singleton updated by GlobeProjectorSetup (inside the R3F Canvas).
 * Used by DOM panels to project lat/lng → screen coordinates each rAF tick.
 */
import * as THREE from 'three'
import { latLngToWorld, isAboveHorizon } from '../lib/coordinates'

/** Marker altitude and Earth radius — the same numbers EventMarkers uses, so a
 *  tail hides on exactly the frame its marker does. */
const MARKER_R     = 1.025
const EARTH_RADIUS = 1.0

// Singleton state — written by the Canvas component, read by DOM panels
let _camera: THREE.Camera | null = null
const _earthPos = new THREE.Vector3()

// Pre-allocated temporaries (avoids per-call GC pressure)
const _worldPos = new THREE.Vector3()
const _ndc      = new THREE.Vector3()

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
 * Runs the marker pipeline itself — latLngToWorld for the position, and the
 * same horizon test GeoMarker applies — rather than a second copy of the math
 * that can drift out of step with it.
 * Returns null if the camera hasn't been set yet.
 */
export function projectLatLng(lat: number, lng: number): ScreenPos | null {
  if (!_camera) return null

  // World position (1.025 * radius = just above surface, like the markers):
  // GAST rotation, then axial tilt, then the Earth's own offset.
  latLngToWorld(lat, lng, MARKER_R, _earthPos, _worldPos)

  // Occlusion is decided on that finished world position. Testing the local
  // pre-rotation normal against the world-space camera instead — as this did
  // before — leaves the day's Earth rotation out of the comparison, so tails
  // vanished over visible markers and lingered over hidden ones depending on
  // the time of day and the target's longitude.
  const behind = !isAboveHorizon(_worldPos, _earthPos, _camera.position, EARTH_RADIUS)

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
