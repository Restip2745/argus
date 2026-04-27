import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { HelioVector, Body } from 'astronomy-engine'
import { auToScene, AU_SCALE, BODIES } from '../../data/celestialBodies'
import type { CelestialBodyName } from '../../types'

// ── Heliocentric orbit configs ────────────────────────────────────────────────

interface HelioOrbitConfig {
  id: CelestialBodyName
  astronomyBody: Body | null
  periodDays: number
  semiMajorAU?: number   // for circular fallback
  segments: number
  color: string
  opacity: number
}

const HELIO_ORBITS: HelioOrbitConfig[] = [
  // ── Planets (real ephemeris) ──────────────────────────────────────────────
  { id: 'mercury', astronomyBody: Body.Mercury, periodDays:   87.97,  segments: 128, color: '#2a6888', opacity: 0.70 },
  { id: 'venus',   astronomyBody: Body.Venus,   periodDays:  224.70,  segments: 128, color: '#2a6888', opacity: 0.70 },
  { id: 'earth',   astronomyBody: Body.Earth,   periodDays:  365.25,  segments: 128, color: '#1e7aa0', opacity: 0.80 },
  { id: 'mars',    astronomyBody: Body.Mars,    periodDays:  686.97,  segments: 128, color: '#2a6888', opacity: 0.70 },
  { id: 'jupiter', astronomyBody: Body.Jupiter, periodDays: 4332.59,  segments:  96, color: '#235878', opacity: 0.65 },
  { id: 'saturn',  astronomyBody: Body.Saturn,  periodDays: 10759.22, segments:  96, color: '#235878', opacity: 0.65 },
  { id: 'uranus',  astronomyBody: Body.Uranus,  periodDays: 30688.5,  segments:  64, color: '#1e4e68', opacity: 0.55 },
  { id: 'neptune', astronomyBody: Body.Neptune, periodDays: 60182.0,  segments:  64, color: '#1e4e68', opacity: 0.55 },
  { id: 'pluto',   astronomyBody: Body.Pluto,   periodDays: 90560.0,  segments:  64, color: '#1a3a50', opacity: 0.45 },

  // ── Asteroid belt (circular approximation) ───────────────────────────────
  { id: 'ceres',   astronomyBody: null, periodDays: 1681.6,  semiMajorAU: 2.77,   segments: 96, color: '#1a3a50', opacity: 0.35 },
  { id: 'vesta',   astronomyBody: null, periodDays: 1325.0,  semiMajorAU: 2.362,  segments: 96, color: '#1a3a50', opacity: 0.30 },

  // ── Near-Earth asteroids ─────────────────────────────────────────────────
  { id: 'apophis', astronomyBody: null, periodDays: 324.8,   semiMajorAU: 0.9226, segments: 96, color: '#1a4a3a', opacity: 0.30 },
  { id: 'bennu',   astronomyBody: null, periodDays: 435.9,   semiMajorAU: 1.126,  segments: 96, color: '#1a4a3a', opacity: 0.30 },

  // ── KBOs / dwarf planets ─────────────────────────────────────────────────
  { id: 'eris',     astronomyBody: null, periodDays: 204199,  semiMajorAU: 67.8,  segments: 64, color: '#152030', opacity: 0.30 },
  { id: 'makemake', astronomyBody: null, periodDays: 111845,  semiMajorAU: 45.4,  segments: 64, color: '#152030', opacity: 0.30 },
  { id: 'haumea',   astronomyBody: null, periodDays: 104025,  semiMajorAU: 43.3,  segments: 64, color: '#152030', opacity: 0.30 },

  // ── Comets ───────────────────────────────────────────────────────────────
  { id: '67p',    astronomyBody: null, periodDays: 2351,    semiMajorAU: 3.46,   segments: 80, color: '#1a4a50', opacity: 0.30 },
  { id: 'halley', astronomyBody: null, periodDays: 27497,   semiMajorAU: 17.8,   segments: 64, color: '#1a4a50', opacity: 0.30 },
  // 3I/ATLAS is hyperbolic — no closed orbit to draw
]

function useHelioOrbitGeometry(cfg: HelioOrbitConfig): THREE.BufferGeometry {
  return useMemo(() => {
    const pts: THREE.Vector3[] = []

    if (cfg.astronomyBody !== null) {
      const J2000 = new Date('2000-01-01T12:00:00Z')
      const msPerDay = 86400000
      for (let i = 0; i <= cfg.segments; i++) {
        const t = new Date(J2000.getTime() + (i / cfg.segments) * cfg.periodDays * msPerDay)
        try {
          const v = HelioVector(cfg.astronomyBody, t)
          const [x, y, z] = auToScene(v.x, v.y, v.z)
          pts.push(new THREE.Vector3(x, y, z))
        } catch { /* skip */ }
      }
    } else if (cfg.semiMajorAU) {
      const r = cfg.semiMajorAU * AU_SCALE
      for (let i = 0; i <= cfg.segments; i++) {
        const a = (i / cfg.segments) * Math.PI * 2
        pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)))
      }
    }

    return new THREE.BufferGeometry().setFromPoints(pts)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // orbit shapes are static
}

function HelioOrbitLine({ cfg }: { cfg: HelioOrbitConfig }) {
  const geometry = useHelioOrbitGeometry(cfg)
  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: cfg.opacity }),
    [cfg.color, cfg.opacity]
  )
  const lineObj = useMemo(() => new THREE.Line(geometry, material), [geometry, material])
  return <primitive object={lineObj} />
}

// ── Moon orbit rings ──────────────────────────────────────────────────────────

// Collect all bodies that have a parent (moons) and a known orbit radius
const MOON_ORBITS = BODIES.filter(
  (b) => b.orbitParent !== null && b.orbitRadiusScene != null && b.id !== 'moon'
)
// Earth's Moon uses GeoMoon for direction — show its visual orbit ring too
const MOON_ENTRY = BODIES.find((b) => b.id === 'moon')!

interface MoonOrbitLineProps {
  parentId: CelestialBodyName
  orbitRadius: number
  segments?: number
  color?: string
  opacity?: number
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

function MoonOrbitLine({
  parentId, orbitRadius, segments = 64, color = '#1a3050', opacity = 0.25, positionsRef,
}: MoonOrbitLineProps) {
  const groupRef = useRef<THREE.Group>(null)

  const lineObj = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      pts.push(new THREE.Vector3(orbitRadius * Math.cos(a), 0, orbitRadius * Math.sin(a)))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    return new THREE.Line(geo, mat)
  }, [orbitRadius, segments, color, opacity])

  useFrame(() => {
    const parentPos = positionsRef.current.get(parentId)
    if (parentPos && groupRef.current) {
      groupRef.current.position.copy(parentPos)
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={lineObj} />
    </group>
  )
}

// ── Colour helpers for moon systems ──────────────────────────────────────────

const MOON_SYSTEM_COLORS: Partial<Record<CelestialBodyName, string>> = {
  earth:   '#1e4060',
  mars:    '#3a2010',
  jupiter: '#2a3820',
  saturn:  '#2a2a18',
  uranus:  '#0a2a30',
  neptune: '#0a1828',
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

export function OrbitLines({ positionsRef }: Props) {
  return (
    <>
      {/* Heliocentric orbits (planets, dwarfs, asteroids, comets) */}
      {HELIO_ORBITS.map((cfg) => (
        <HelioOrbitLine key={cfg.id} cfg={cfg} />
      ))}

      {/* Earth's Moon */}
      <MoonOrbitLine
        parentId="earth"
        orbitRadius={MOON_ENTRY.orbitRadiusScene ?? 4.0}
        segments={64}
        color={MOON_SYSTEM_COLORS['earth']}
        opacity={0.30}
        positionsRef={positionsRef}
      />

      {/* All other moons */}
      {MOON_ORBITS.map((body) => (
        <MoonOrbitLine
          key={body.id}
          parentId={body.orbitParent!}
          orbitRadius={body.orbitRadiusScene!}
          segments={48}
          color={MOON_SYSTEM_COLORS[body.orbitParent as CelestialBodyName] ?? '#1a2a3a'}
          opacity={0.22}
          positionsRef={positionsRef}
        />
      ))}
    </>
  )
}
