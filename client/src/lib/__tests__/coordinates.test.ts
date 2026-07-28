import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { isAboveHorizon, latLngToWorld } from '../coordinates'

const EARTH_R  = 1.0
const MARKER_R = 1.025

/** Camera placed `dist` units from the body, looking along +X from the body. */
function cameraAt(bodyPos: THREE.Vector3, dir: THREE.Vector3, dist: number): THREE.Vector3 {
  return dir.clone().normalize().multiplyScalar(dist).add(bodyPos)
}

describe('isAboveHorizon', () => {
  it('shows the near-side point and hides the far-side one', () => {
    const body   = new THREE.Vector3(0, 0, 0)
    const camera = cameraAt(body, new THREE.Vector3(1, 0, 0), 20)

    const near = new THREE.Vector3(MARKER_R, 0, 0)
    const far  = new THREE.Vector3(-MARKER_R, 0, 0)

    expect(isAboveHorizon(near, body, camera, EARTH_R)).toBe(true)
    expect(isAboveHorizon(far,  body, camera, EARTH_R)).toBe(false)
  })

  it('culls at the tangent plane, not at the equator', () => {
    const body   = new THREE.Vector3(0, 0, 0)
    const dist   = 20
    const camera = cameraAt(body, new THREE.Vector3(1, 0, 0), dist)

    // Horizon plane sits at x = R²/dist, so a point just past 90° of arc is
    // still visible while one well behind the tangent plane is not.
    const justInside  = new THREE.Vector3(EARTH_R ** 2 / dist + 0.01, MARKER_R, 0)
    const justOutside = new THREE.Vector3(EARTH_R ** 2 / dist - 0.01, MARKER_R, 0)

    expect(isAboveHorizon(justInside,  body, camera, EARTH_R)).toBe(true)
    expect(isAboveHorizon(justOutside, body, camera, EARTH_R)).toBe(false)
  })

  // Regression: the cull used to dot the WORLD-space marker position against the
  // body-relative camera vector. The body's own offset then dominated the result,
  // so once Earth sat far from the scene origin every marker showed or hid
  // together — back-face markers bleeding through, then all of them vanishing
  // after a camera rotation.
  it('is independent of how far the body sits from the scene origin', () => {
    const dir = new THREE.Vector3(1, 0, 0)

    for (const offset of [0, 50, 500, 5000]) {
      const body   = new THREE.Vector3(offset, 0, offset * 0.5)
      const camera = cameraAt(body, dir, 20)

      const near = dir.clone().multiplyScalar(MARKER_R).add(body)
      const far  = dir.clone().multiplyScalar(-MARKER_R).add(body)

      expect(isAboveHorizon(near, body, camera, EARTH_R), `near @${offset}`).toBe(true)
      expect(isAboveHorizon(far,  body, camera, EARTH_R), `far @${offset}`).toBe(false)
    }
  })

  it('keeps exactly one hemisphere visible from any camera direction', () => {
    const body = new THREE.Vector3(300, -120, 80)

    const dirs = [
      new THREE.Vector3(1, 0, 0),  new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),  new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),  new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 1, 1),
    ]

    // A lat/lng grid of surface markers, positioned exactly as EventMarkers does.
    const pts: THREE.Vector3[] = []
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lng = -180; lng < 180; lng += 20) {
        const v = new THREE.Vector3()
        latLngToWorld(lat, lng, MARKER_R, body, v)
        pts.push(v)
      }
    }

    for (const dir of dirs) {
      const camera  = cameraAt(body, dir, 20)
      const visible = pts.filter(p => isAboveHorizon(p, body, camera, EARTH_R)).length

      // Never all-on or all-off — that was the reported bug.
      expect(visible, `dir ${dir.toArray()}`).toBeGreaterThan(0)
      expect(visible, `dir ${dir.toArray()}`).toBeLessThan(pts.length)

      // A cap seen from 20 units out is a hair under half the sphere.
      expect(visible / pts.length).toBeGreaterThan(0.35)
      expect(visible / pts.length).toBeLessThan(0.55)
    }
  })

  it('hides a marker once the camera swings to the opposite side', () => {
    const body = new THREE.Vector3(1000, 0, 0)
    const pin  = new THREE.Vector3()
    latLngToWorld(25, 121, MARKER_R, body, pin)   // Taiwan

    const toPin   = pin.clone().sub(body).normalize()
    const front   = cameraAt(body, toPin, 20)
    const back    = cameraAt(body, toPin.clone().negate(), 20)

    expect(isAboveHorizon(pin, body, front, EARTH_R)).toBe(true)
    expect(isAboveHorizon(pin, body, back,  EARTH_R)).toBe(false)
  })
})
