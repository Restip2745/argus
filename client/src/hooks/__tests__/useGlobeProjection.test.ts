import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as THREE from 'three'
import { updateGlobeProjection, projectLatLng } from '../useGlobeProjection'
import { latLngToWorld, isAboveHorizon } from '../../lib/coordinates'
import { useAppStore } from '../../store'

const EARTH_R  = 1.0
const MARKER_R = 1.025

/** Freeze scene time so GAST is deterministic. */
function atSceneTime(ms: number) {
  useAppStore.setState({ sceneTime: ms })
}

/** Camera `dist` away from the Earth along +X, which is where the tail's
 *  occlusion test and the marker's must agree. */
function setUpCamera(earthPos: THREE.Vector3, dist = 20): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(50, 1.6, 0.1, 5000)
  cam.position.set(earthPos.x + dist, earthPos.y, earthPos.z)
  cam.lookAt(earthPos)
  cam.updateMatrixWorld(true)
  cam.updateProjectionMatrix()
  updateGlobeProjection(cam, earthPos)
  return cam
}

/** What GeoMarker itself decides for the same point at the same instant. */
function markerShows(lat: number, lng: number, earthPos: THREE.Vector3, camPos: THREE.Vector3): boolean {
  const world = new THREE.Vector3()
  latLngToWorld(lat, lng, MARKER_R, earthPos, world)
  return isAboveHorizon(world, earthPos, camPos, EARTH_R)
}

const BASE = Date.UTC(2026, 7, 21, 0, 0, 0)
// Earth parked away from the origin, as it is in the real scene.
const EARTH_POS = new THREE.Vector3(184.2, 0, -73.6)

describe('projectLatLng', () => {
  const prevSceneTime = useAppStore.getState().sceneTime

  beforeEach(() => { atSceneTime(BASE) })
  afterEach(() => { useAppStore.setState({ sceneTime: prevSceneTime }) })

  it('hides exactly when the marker hides, at every hour of the day', () => {
    const cam = setUpCamera(EARTH_POS)
    const seen = new Set<boolean>()

    for (let hour = 0; hour < 24; hour++) {
      atSceneTime(BASE + hour * 3_600_000)
      for (const [lat, lng] of [[0, 0], [0, 90], [0, -90], [0, 180], [51.5, -0.1], [-33.9, 151.2]]) {
        const proj = projectLatLng(lat, lng)
        expect(proj).not.toBeNull()
        const shows = markerShows(lat, lng, EARTH_POS, cam.position)
        expect(proj!.behind, `lat ${lat} lng ${lng} at +${hour}h`).toBe(!shows)
        seen.add(shows)
      }
    }

    // Both outcomes must occur, or the agreement above proves nothing.
    expect(seen.has(true)).toBe(true)
    expect(seen.has(false)).toBe(true)
  })

  it('projects a visible point inside the viewport', () => {
    const cam = setUpCamera(EARTH_POS)
    // Sweep the day for a longitude that is currently facing the camera.
    let found: { x: number; y: number } | null = null
    for (let hour = 0; hour < 24 && !found; hour++) {
      atSceneTime(BASE + hour * 3_600_000)
      const proj = projectLatLng(0, 0)
      if (proj && !proj.behind) found = proj
      updateGlobeProjection(cam, EARTH_POS)
    }
    expect(found).not.toBeNull()
    expect(found!.x).toBeGreaterThan(0)
    expect(found!.x).toBeLessThan(window.innerWidth)
    expect(found!.y).toBeGreaterThan(0)
    expect(found!.y).toBeLessThan(window.innerHeight)
  })
})
