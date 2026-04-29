import { useRef, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { updateGlobeProjection } from '../../hooks/useGlobeProjection'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'

import { useAstronomy } from '../../hooks/useAstronomy'
import { useWASD } from '../../hooks/useWASD'
import { getGAST, gastToRotY } from '../../hooks/useGAST'
import { BODIES, bodyMinDistance, bodyViewDistance, EARTH_DETAIL_THRESHOLD } from '../../data/celestialBodies'
import { determineNavLevel } from '../../config/navLevels'
import { CelestialBody } from './CelestialBody'
import { OrbitLines } from './OrbitLines'
import { EventMarkers } from './EventMarkers'
import { GeoJsonLayer } from './GeoJsonLayer'
import { TrackingLayer } from './TrackingLayer'
import { ConflictLayer } from './ConflictLayer'
import { useAppStore } from '../../store'
import type { CelestialBodyName } from '../../types'

// ── Globe projection updater (feeds DOM panels with camera + Earth pos) ─────────
function GlobeProjectorSetup({
  positionsRef,
}: {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}) {
  const { camera } = useThree()
  useFrame(() => {
    const earthPos = positionsRef.current.get('earth')
    if (earthPos) updateGlobeProjection(camera, earthPos)
  })
  return null
}

// Previous camera state for "back" navigation
interface CameraSnapshot {
  position: THREE.Vector3
  target: THREE.Vector3
  focusedBody: CelestialBodyName | null
}

export function SolarSystem() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const simTimeRef  = useRef(new Date())
  const previousCamRef = useRef<CameraSnapshot | null>(null)

  const positionsRef = useAstronomy(simTimeRef)
  const { applyWASD } = useWASD()

  const setFocusedBody      = useAppStore((s) => s.setFocusedBody)
  const focusedBody         = useAppStore((s) => s.focusedBody)
  const setShowGeoJsonLayer = useAppStore((s) => s.setShowGeoJsonLayer)
  const setShowEventMarkers = useAppStore((s) => s.setShowEventMarkers)

  // ── Simulation clock ────────────────────────────────────────────────────────
  useFrame(() => {
    simTimeRef.current = new Date()  // Real-time sync

    // Tick TWEEN animations
    TWEEN.update()

    // Apply WASD keyboard pan
    applyWASD(camera as THREE.PerspectiveCamera, controlsRef.current)
  })

  // ── Distance-aware layer switching + celestial nav update ────────────────────
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    let prevNavLevelId = ''
    let prevNavFocused: CelestialBodyName | null = null

    const handler = () => {
      const store = useAppStore.getState()
      const currentFocused = store.focusedBody

      // Earth detail layers — show whenever camera is close to Earth, regardless of focusedBody
      const earthPos = positionsRef.current.get('earth') ?? new THREE.Vector3()
      const distToEarth = camera.position.distanceTo(earthPos)
      const detail = distToEarth < EARTH_DETAIL_THRESHOLD
      store.setShowGeoJsonLayer(detail)
      store.setShowEventMarkers(detail)

      // Celestial nav level — only recalculate on level or focus change
      const camDist = camera.position.distanceTo(controls.target)
      const level = determineNavLevel(camDist)

      if (level.id !== prevNavLevelId || currentFocused !== prevNavFocused) {
        store.setNavLevel(level.id)
        store.setNavCandidates(level.candidates(currentFocused))
        prevNavLevelId = level.id
        prevNavFocused = currentFocused
      }
    }

    // Initial computation
    handler()
    controls.addEventListener('change', handler)

    return () => controls.removeEventListener('change', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera])

  // ── Camera focus ────────────────────────────────────────────────────────────
  const focusOn = useCallback(
    (bodyId: CelestialBodyName, worldPos: THREE.Vector3) => {
      const controls = controlsRef.current
      if (!controls) return

      // Save state for goBack()
      previousCamRef.current = {
        position:    camera.position.clone(),
        target:      controls.target.clone(),
        focusedBody: focusedBody,
      }

      const minDist  = bodyMinDistance(bodyId)
      const viewDist = bodyViewDistance(bodyId)

      controls.minDistance = minDist

      const startPos    = camera.position.clone()
      const startTarget = controls.target.clone()
      const endPos      = worldPos.clone().add(new THREE.Vector3(0, viewDist * 0.25, viewDist))

      new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, 1200)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(({ t }) => {
          camera.position.lerpVectors(startPos, endPos, t)
          controls.target.lerpVectors(startTarget, worldPos, t)
          controls.update()
        })
        .onComplete(() => {
          setFocusedBody(bodyId)
          if (bodyId !== 'earth') {
            setShowGeoJsonLayer(false)
            setShowEventMarkers(false)
          }
          // Open celestial body info panel
          useAppStore.getState().setSelectedBody(bodyId)
          // Update celestial nav after focus completes
          const camDist = camera.position.distanceTo(controls.target)
          const level = determineNavLevel(camDist)
          useAppStore.getState().setNavLevel(level.id)
          useAppStore.getState().setNavCandidates(level.candidates(bodyId))
        })
        .start()
    },
    [camera, focusedBody, setFocusedBody, setShowGeoJsonLayer, setShowEventMarkers]
  )

  const goBack = useCallback(() => {
    const controls = controlsRef.current
    const prev = previousCamRef.current
    if (!controls || !prev) return

    controls.minDistance = prev.focusedBody ? bodyMinDistance(prev.focusedBody) : 0

    const startPos    = camera.position.clone()
    const startTarget = controls.target.clone()

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 1200)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(({ t }) => {
        camera.position.lerpVectors(startPos, prev.position, t)
        controls.target.lerpVectors(startTarget, prev.target, t)
        controls.update()
      })
      .onComplete(() => {
        setFocusedBody(prev.focusedBody)
        previousCamRef.current = null
        // Update celestial nav after goBack completes
        const camDist = camera.position.distanceTo(controls.target)
        const level = determineNavLevel(camDist)
        useAppStore.getState().setNavLevel(level.id)
        useAppStore.getState().setNavCandidates(level.candidates(prev.focusedBody))
      })
      .start()
  }, [camera, setFocusedBody])

  // Expose goBack and focusOn to store so UI components can call them
  useEffect(() => {
    useAppStore.getState().setGoBack(goBack)
  }, [goBack])

  // focusOnFromStore: wraps focusOn by resolving bodyId → worldPos from positionsRef
  const focusOnFromStore = useCallback(
    (bodyId: CelestialBodyName) => {
      const pos = positionsRef.current.get(bodyId)
      if (!pos) return
      focusOn(bodyId, pos.clone())
    },
    [focusOn],
  )
  useEffect(() => {
    useAppStore.getState().setFocusOn(focusOnFromStore)
  }, [focusOnFromStore])

  // resetToSolarView: tween camera back to overview position focused on Sun
  const resetToSolarView = useCallback(() => {
    const controls = controlsRef.current
    if (!controls) return

    const sunPos = positionsRef.current.get('sun') ?? new THREE.Vector3(0, 0, 0)
    const endPos = new THREE.Vector3(0, 180, 520)
    const endTarget = sunPos.clone()

    controls.minDistance = 0

    const startPos    = camera.position.clone()
    const startTarget = controls.target.clone()

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 1200)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(({ t }) => {
        camera.position.lerpVectors(startPos, endPos, t)
        controls.target.lerpVectors(startTarget, endTarget, t)
        controls.update()
      })
      .onComplete(() => {
        setFocusedBody(null)
        previousCamRef.current = null
        const camDist = camera.position.distanceTo(controls.target)
        const level = determineNavLevel(camDist)
        useAppStore.getState().setNavLevel(level.id)
        useAppStore.getState().setNavCandidates(level.candidates(null))
      })
      .start()
  }, [camera, setFocusedBody])

  useEffect(() => {
    useAppStore.getState().setResetToSolarView(resetToSolarView)
  }, [resetToSolarView])

  // focusOnEarthSurface: tween camera to a lat/lng point on Earth's surface.
  // Converts lat/lng → local sphere coords → applies axial tilt + GAST rotation
  // → adds Earth's world position, then tweens camera to look at that point.
  const AXIAL_TILT_RAD = (23.44 * Math.PI) / 180
  const focusOnEarthSurface = useCallback(
    (lat: number, lng: number) => {
      const controls = controlsRef.current
      if (!controls) return

      const earthPos = positionsRef.current.get('earth')
      if (!earthPos) return

      // Convert lat/lng to a unit vector in Earth's local sphere frame
      const latR = (lat  * Math.PI) / 180
      const lngR = (lng  * Math.PI) / 180
      const local = new THREE.Vector3(
        Math.cos(latR) * Math.cos(lngR),
        Math.sin(latR),
        -Math.cos(latR) * Math.sin(lngR),
      )

      // Apply GAST (Y) then tilt (Z) — applyEuler(A) then applyEuler(B) = B*A*v,
      // so this produces R_z(tilt) * R_y(GAST) * local, matching scene hierarchy.
      local.applyEuler(new THREE.Euler(0, gastToRotY(getGAST()), 0))
      local.applyEuler(new THREE.Euler(0, 0, AXIAL_TILT_RAD))

      // Camera sits along the region direction, looking at Earth's center
      const targetPos = earthPos.clone()
      const endPos    = earthPos.clone().addScaledVector(local, 1.5)

      // Save current state for goBack()
      previousCamRef.current = {
        position:    camera.position.clone(),
        target:      controls.target.clone(),
        focusedBody: focusedBody,
      }
      controls.minDistance = bodyMinDistance('earth')

      const startPos    = camera.position.clone()
      const startTarget = controls.target.clone()

      new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, 1200)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(({ t }) => {
          camera.position.lerpVectors(startPos, endPos, t)
          controls.target.lerpVectors(startTarget, targetPos, t)
          controls.update()
        })
        .onComplete(() => {
          setFocusedBody('earth')
        })
        .start()
    },
    [camera, focusedBody, setFocusedBody],
  )

  useEffect(() => {
    useAppStore.getState().setFocusOnEarthSurface(focusOnEarthSurface)
  }, [focusOnEarthSurface])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Sun light — single point light at origin, powers day/night on all bodies */}
      <pointLight
        position={[0, 0, 0]}
        intensity={2.5}
        color="#fff9e6"
        distance={0}
        decay={0}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={5000}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      {/* Very faint ambient so dark sides aren't pure black */}
      <ambientLight intensity={0.04} />

      {/* All celestial bodies */}
      {BODIES.map((def) => (
        <CelestialBody
          key={def.id}
          def={def}
          positionsRef={positionsRef}
          onFocus={focusOn}
          labelMinDist={def.id === 'sun' ? 2000 : 400}
        />
      ))}

      {/* Orbit path lines */}
      <OrbitLines positionsRef={positionsRef} />

      {/* Intelligence event markers (visible when close to Earth) */}
      <EventMarkers positionsRef={positionsRef} />

      {/* Political GeoJSON border layer (visible when close to Earth) */}
      <GeoJsonLayer positionsRef={positionsRef} />

      {/* Live tracking layers: aircraft (ADS-B), satellites (TLE), ships (AIS) */}
      <TrackingLayer positionsRef={positionsRef} />

      {/* Dynamic conflict front lines and controlled-territory fills */}
      <ConflictLayer positionsRef={positionsRef} />

      {/* Keeps useGlobeProjection singleton up-to-date for DOM panels */}
      <GlobeProjectorSetup positionsRef={positionsRef} />

      {/* OrbitControls — left=PAN, right=ROTATE */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        mouseButtons={{
          LEFT:   THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT:  THREE.MOUSE.ROTATE,
        }}
        touches={{
          ONE:  THREE.TOUCH.PAN,
          TWO:  THREE.TOUCH.DOLLY_ROTATE,
        }}
        enableDamping
        dampingFactor={0.08}
        screenSpacePanning
        enableZoom
        zoomSpeed={1.2}
        minDistance={0}
        maxDistance={Infinity}
        enablePan
      />
    </>
  )
}
