import { useRef, useCallback } from 'react'
import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { useAppStore } from '../store'
import type { CelestialBodyName } from '../types'

// Rendered radii in Three.js scene units
export const BODY_RADIUS: Record<string, number> = {
  sun:       109.0,
  mercury:     0.38,
  venus:       0.95,
  earth:       1.0,
  mars:        0.53,
  jupiter:    11.2,
  saturn:      9.45,
  uranus:      4.0,
  neptune:     3.88,
  moon:        0.27,
  titan:       0.40,
  '3i-atlas':  0.05,
}

const SAFE_BUFFER = 0.15

export function useCameraFocus(
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>,
  controlsRef: React.MutableRefObject<{ target: THREE.Vector3; minDistance: number; update: () => void } | null>
) {
  const setFocusedBody = useAppStore((s) => s.setFocusedBody)
  const previousState = useRef<{
    position: THREE.Vector3
    target: THREE.Vector3
    body: CelestialBodyName | null
  } | null>(null)

  const focusOn = useCallback(
    (bodyName: CelestialBodyName, worldPosition: THREE.Vector3) => {
      const camera = cameraRef.current
      const controls = controlsRef.current
      if (!camera || !controls) return

      // Save current state for back navigation
      previousState.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        body: null,
      }

      const radius = BODY_RADIUS[bodyName] ?? 1.0
      controls.minDistance = radius + SAFE_BUFFER
      const viewDist = radius * 4

      const endPos = worldPosition.clone().add(new THREE.Vector3(0, viewDist * 0.3, viewDist))
      const startPos = camera.position.clone()
      const startTarget = controls.target.clone()

      new TWEEN.Tween({ t: 0 })
        .to({ t: 1 }, 1200)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(({ t }) => {
          camera.position.lerpVectors(startPos, endPos, t)
          controls.target.lerpVectors(startTarget, worldPosition, t)
          controls.update()
        })
        .onComplete(() => setFocusedBody(bodyName))
        .start()
    },
    [cameraRef, controlsRef, setFocusedBody]
  )

  const goBack = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls || !previousState.current) return

    const { position, target, body } = previousState.current
    const radius = body ? (BODY_RADIUS[body] ?? 1.0) + SAFE_BUFFER : 0
    controls.minDistance = radius

    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 1200)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(({ t }) => {
        camera.position.lerpVectors(startPos, position, t)
        controls.target.lerpVectors(startTarget, target, t)
        controls.update()
      })
      .onComplete(() => setFocusedBody(body))
      .start()

    previousState.current = null
  }, [cameraRef, controlsRef, setFocusedBody])

  return { focusOn, goBack }
}
