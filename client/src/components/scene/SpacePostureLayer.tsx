/**
 * SpacePostureLayer — colours each body by the worst event currently attached
 * to it, so the system-wide view answers "where is anything happening" without
 * flying anywhere.
 *
 * Shares the severity band with the Earth posture map on purpose. Pulling in
 * from the solar system to the globe should feel like the same question being
 * asked at finer grain — which body has trouble, then which country — rather
 * than two unrelated colour schemes meeting at a zoom threshold.
 *
 * A halo rather than tinting the body itself: the planets carry photographic
 * textures, and washing severity over them would fight the map and lie about
 * what the surface looks like. The ring sits outside the sphere and scales
 * with it, so it reads at any distance without hiding the body.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { useFilteredEvents } from '../../hooks/useFilteredEvents'
import { BODY_MAP } from '../../data/celestialBodies'
import { resolveOrbitalPlacement } from '../../data/orbitalPlacement'
import { SEVERITY_COLOR, severityRank } from '../../data/symbology'
import type { ArgusEvent, CelestialBodyName, EventIntensity } from '../../types'

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

/** Ring radius as a multiple of the body's own, and its thickness. */
const RING_SCALE = 1.9
const RING_WIDTH = 0.28

function BodyHalo({
  bodyId, positionsRef, intensity, count,
}: {
  bodyId: CelestialBodyName
  positionsRef: Props['positionsRef']
  intensity: EventIntensity
  count: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  const radius = BODY_MAP.get(bodyId)?.renderedRadius ?? 1
  const color = SEVERITY_COLOR[intensity]

  useFrame(({ camera, clock }) => {
    const m = ref.current
    if (!m) return
    const pos = positionsRef.current.get(bodyId)
    if (!pos) return
    m.position.copy(pos)
    // Face the camera: a flat ring seen edge-on would vanish exactly when the
    // body is somewhere awkward in its orbit.
    m.lookAt(camera.position)
    // Breathe with severity — CRITICAL insists, LOW barely moves.
    const urgency = severityRank(intensity) / 3
    const mat = m.material as THREE.MeshBasicMaterial
    mat.opacity = 0.30 + 0.22 * urgency * (0.5 + 0.5 * Math.sin(clock.elapsedTime * (1 + urgency)))
  })

  // More events widen the ring a little, so a body carrying eight stories reads
  // heavier than one carrying a single note without needing a second channel.
  const outer = radius * RING_SCALE * (1 + Math.min(count, 8) * 0.03)

  return (
    <mesh ref={ref} renderOrder={-5}>
      <ringGeometry args={[outer, outer * (1 + RING_WIDTH), 48]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export function SpacePostureLayer({ positionsRef }: Props) {
  const events       = useFilteredEvents()
  const spaceMapMode = useAppStore((s) => s.spaceMapMode)
  const nearEarth    = useAppStore((s) => s.nearEarth)

  // Worst severity and event count per body. Reuses the placement resolver, so
  // a body lights up for exactly the events whose markers anchor to it.
  const byBody = useMemo(() => {
    const acc = new Map<CelestialBodyName, { worst: ArgusEvent; count: number }>()
    for (const e of events) {
      let id: CelestialBodyName | null = null
      if (e.location_type === 'orbital') {
        const p = resolveOrbitalPlacement(e.body, e.location_label)
        // earthOrbit counts toward Earth here: at system range the distinction
        // between "on Earth" and "above Earth" is below one pixel.
        if (p?.kind === 'body') id = p.body
        else if (p?.kind === 'earthOrbit') id = 'earth'
      } else if (e.lat !== null || e.location_label) {
        id = 'earth'
      }
      if (!id) continue
      const cur = acc.get(id)
      if (!cur) acc.set(id, { worst: e, count: 1 })
      else {
        cur.count++
        if (severityRank(e.intensity) > severityRank(cur.worst.intensity)) cur.worst = e
      }
    }
    return acc
  }, [events])

  // Only in the system view: up close the globe's own choropleth answers this
  // question in far more detail, and a ring around Earth would just be clutter.
  if (spaceMapMode === 'none' || nearEarth) return null

  return (
    <>
      {Array.from(byBody.entries()).map(([bodyId, { worst, count }]) => {
        if (!positionsRef.current.has(bodyId)) return null
        return (
          <BodyHalo
            key={`halo-${bodyId}`}
            bodyId={bodyId}
            positionsRef={positionsRef}
            intensity={worst.intensity}
            count={count}
          />
        )
      })}
    </>
  )
}
