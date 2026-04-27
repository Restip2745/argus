import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * useWASD — keyboard pan hook.
 * Returns an `applyWASD` function to call inside `useFrame`.
 * Pan speed scales with camera distance to target for natural feel.
 */
export function useWASD() {
  const keysRef = useRef(new Set<string>())

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      // Don't hijack keyboard when user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      keysRef.current.add(e.key.toLowerCase())
    }
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const applyWASD = (
    camera: THREE.PerspectiveCamera,
    controls: { target: THREE.Vector3; update: () => void } | null
  ) => {
    if (!controls) return
    const keys = keysRef.current
    if (keys.size === 0) return

    // Speed proportional to distance so panning feels consistent at any zoom level
    const dist = camera.position.distanceTo(controls.target)
    const speed = dist * 0.008

    // Right vector: forward × up
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()

    const delta = new THREE.Vector3()
    if (keys.has('a'))          delta.addScaledVector(right,      -speed)
    if (keys.has('d'))          delta.addScaledVector(right,       speed)
    if (keys.has('w'))          delta.addScaledVector(camera.up,   speed)
    if (keys.has('s'))          delta.addScaledVector(camera.up,  -speed)

    controls.target.add(delta)
    camera.position.add(delta)
    controls.update()
  }

  return { applyWASD, keysRef }
}
