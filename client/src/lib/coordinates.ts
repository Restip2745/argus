/**
 * Shared coordinate utilities for Earth-surface positioning on the 3D globe.
 *
 * Two variants:
 *   latLngToLocal  — local sphere position only (no GAST/tilt); used when parent
 *                    Three.js groups handle rotation (e.g. GeoJsonLayer).
 *   latLngToWorld  — full pipeline including GAST rotation + axial tilt + earthPos
 *                    offset; used in useFrame hooks that set world-space positions
 *                    directly (e.g. TrackingLayer, EventMarkers).
 */
import * as THREE from 'three'
import { getGAST, gastToRotY } from '../hooks/useGAST'

export const AXIAL_TILT_RAD = (23.44 * Math.PI) / 180

const _ea = new THREE.Euler(0, 0, 0, 'XYZ')
const _et = new THREE.Euler(0, 0, AXIAL_TILT_RAD, 'XYZ')

/**
 * Converts lat/lng (degrees) + radius to a local-sphere Vector3.
 * No GAST rotation or axial tilt — those are applied by parent group transforms.
 * Allocates a new Vector3.
 */
export function latLngToLocal(latDeg: number, lngDeg: number, R: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180
  const lng = (lngDeg * Math.PI) / 180
  return new THREE.Vector3(
    R * Math.cos(lat) * Math.cos(lng),
    R * Math.sin(lat),
    -R * Math.cos(lat) * Math.sin(lng),
  )
}

/**
 * Converts lat/lng (degrees) + radius to a world-space position.
 * Applies GAST Y-rotation, axial-tilt Z-rotation, then offsets by earthPos.
 * Writes result into `out` (no allocation) — safe to call every frame.
 */
export function latLngToWorld(
  latDeg: number, lngDeg: number, radius: number,
  earthPos: THREE.Vector3, out: THREE.Vector3,
): void {
  const lat = (latDeg * Math.PI) / 180
  const lng = (lngDeg * Math.PI) / 180
  out.set(
    radius * Math.cos(lat) * Math.cos(lng),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lng),
  )
  _ea.set(0, gastToRotY(getGAST()), 0)
  out.applyEuler(_ea)
  _et.set(0, 0, AXIAL_TILT_RAD)
  out.applyEuler(_et)
  out.add(earthPos)
}
