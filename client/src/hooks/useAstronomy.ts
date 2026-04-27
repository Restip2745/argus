import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Body, HelioVector, GeoMoon, JupiterMoons } from 'astronomy-engine'
import { auToScene, BODIES, BODY_MAP, AU_SCALE } from '../data/celestialBodies'
import type { CelestialBodyName } from '../types'

// Heliocentric bodies with astronomy-engine support
const HELIO_BODIES = BODIES.filter(
  (b) => b.astronomyBody !== null && b.orbitParent === null && b.id !== 'sun'
)

// Jupiter moon bodies
const JUPITER_MOON_IDS = ['io', 'europa', 'ganymede', 'callisto'] as const

// Fallback bodies using simple circular orbits around parent
const FALLBACK_MOONS = BODIES.filter(
  (b) => b.astronomyBody === null && b.orbitParent !== null && b.orbitRadiusScene
)

// Fallback heliocentric bodies (no ephemeris — circular orbit approximation)
const FALLBACK_HELIO = BODIES.filter(
  (b) => b.astronomyBody === null && b.orbitParent === null && b.id !== '3i-atlas' && b.orbitPeriodDays
)

/**
 * useAstronomy — real-time solar system position engine.
 *
 * Returns a stable `positionsRef` (Map) that is updated every second.
 * Components read from it in their own `useFrame` — no React re-renders triggered.
 */
export function useAstronomy(simTimeRef: React.MutableRefObject<Date>) {
  const positionsRef = useRef<Map<CelestialBodyName, THREE.Vector3>>(new Map())
  const lastUpdateRef = useRef<number>(0)

  // Initialise all positions at zero
  if (positionsRef.current.size === 0) {
    for (const b of BODIES) {
      positionsRef.current.set(b.id, new THREE.Vector3())
    }
  }

  useFrame(() => {
    const now = Date.now()
    // Throttle: update orbital positions at most once per second
    if (now - lastUpdateRef.current < 1000) return
    lastUpdateRef.current = now

    const date = simTimeRef.current
    const map = positionsRef.current

    // ── Heliocentric planets & Pluto ──────────────────────────────────────────
    for (const body of HELIO_BODIES) {
      try {
        const v = HelioVector(body.astronomyBody as Body, date)
        const [x, y, z] = auToScene(v.x, v.y, v.z)
        map.get(body.id)!.set(x, y, z)
      } catch {
        // Keep previous position on ephemeris failure
      }
    }

    // ── Sun always at origin ──────────────────────────────────────────────────
    map.get('sun')!.set(0, 0, 0)

    // ── Earth's Moon (geocentric → heliocentric) ──────────────────────────────
    // GeoMoon gives the correct direction; we override the distance with the
    // visual orbit radius so the Moon appears outside Earth's rendered sphere.
    const earthPos = map.get('earth')!
    const moonVisualR = BODY_MAP.get('moon')!.orbitRadiusScene ?? 4.0
    try {
      const m = GeoMoon(date)
      const [mx, my, mz] = auToScene(m.x, m.y, m.z)
      const moonDir = new THREE.Vector3(mx, my, mz).normalize()
      map.get('moon')!.copy(earthPos).addScaledVector(moonDir, moonVisualR)
    } catch {
      map.get('moon')!.copy(earthPos).add(new THREE.Vector3(moonVisualR, 0, 0))
    }

    // ── Jupiter moons (jovicentric → heliocentric) ────────────────────────────
    // JupiterMoons gives correct angular positions; distances overridden visually.
    const jupPos = map.get('jupiter')!
    try {
      const jm = JupiterMoons(date)
      const moonVecs = [jm.io, jm.europa, jm.ganymede, jm.callisto]
      JUPITER_MOON_IDS.forEach((id, i) => {
        const sv = moonVecs[i]
        const [jx, jy, jz] = auToScene(sv.x, sv.y, sv.z)
        const dir = new THREE.Vector3(jx, jy, jz).normalize()
        const visualR = BODY_MAP.get(id)!.orbitRadiusScene ?? 20.0
        map.get(id)!.copy(jupPos).addScaledVector(dir, visualR)
      })
    } catch {
      // Fallback: simplified circular orbits handled in the loop below
    }

    // ── Fallback moons (simple circular orbit around parent) ─────────────────
    for (const body of FALLBACK_MOONS) {
      if (JUPITER_MOON_IDS.includes(body.id as (typeof JUPITER_MOON_IDS)[number])) continue
      const parentPos = map.get(body.orbitParent!)
      if (!parentPos || !body.orbitRadiusScene || !body.orbitPeriodDays) continue

      // Negative orbitPeriodDays = retrograde (gives negative angle naturally)
      const angle = ((date.getTime() / 86400000) / body.orbitPeriodDays) * Math.PI * 2

      const r = body.orbitRadiusScene
      map.get(body.id)!.set(
        parentPos.x + r * Math.cos(angle),
        parentPos.y,
        parentPos.z + r * Math.sin(angle)
      )
    }

    // ── Fallback heliocentric (circular orbit approximation) ─────────────────
    for (const body of FALLBACK_HELIO) {
      if (!body.orbitRadiusScene || !body.orbitPeriodDays) continue
      const angle = ((date.getTime() / 86400000) / body.orbitPeriodDays) * Math.PI * 2
      const r = body.orbitRadiusScene
      map.get(body.id)!.set(r * Math.cos(angle), 0, r * Math.sin(angle))
    }

    // ── 3I/ATLAS (placeholder hyperbolic trajectory) ──────────────────────────
    // Will be updated with real ephemeris when available
    const atlasPhase = (date.getTime() / 86400000 / 365.25) * Math.PI * 2
    map.get('3i-atlas')!.set(
      1.5 * AU_SCALE * Math.cos(atlasPhase * 1.3),
      0.2 * AU_SCALE * Math.sin(atlasPhase * 0.7),
      1.0 * AU_SCALE * Math.sin(atlasPhase * 1.1)
    )
  })

  return positionsRef
}
