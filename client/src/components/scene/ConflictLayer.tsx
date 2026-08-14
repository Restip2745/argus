import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { getGAST, gastToRotY } from '../../hooks/useGAST'
import { AXIAL_TILT_RAD } from '../../lib/coordinates'
import { useConflictLayer } from '../../hooks/useConflictLayer'
import { buildRenderedScene } from './conflictGeometry'
import type { CelestialBodyName } from '../../types'

const DIST_CONFLICT_MAX = 20     // hide beyond this distance from Earth
const POINT_SIZE        = 0.012  // world units; Earth radius is 1

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

export function ConflictLayer({ positionsRef }: Props) {
  const showConflictLayer = useAppStore((s) => s.showConflictLayer)
  const setLayerError     = useAppStore((s) => s.setLayerError)
  const setLayerLoading   = useAppStore((s) => s.setLayerLoading)
  const outerRef = useRef<THREE.Group>(null)
  const gastRef  = useRef<THREE.Group>(null)
  const visRef   = useRef<THREE.Group>(null)

  const { data, error: conflictErr, loading: conflictLoad } = useConflictLayer(showConflictLayer)

  useEffect(() => { setLayerError('conflict',   conflictErr)  }, [conflictErr,  setLayerError])
  useEffect(() => { setLayerLoading('conflict',  conflictLoad) }, [conflictLoad, setLayerLoading])

  const { shapes, points } = useMemo(
    () => (data ? buildRenderedScene(data.features) : { shapes: [], points: [] }),
    [data],
  )

  useFrame(({ camera }) => {
    const earthPos = positionsRef.current.get('earth')
    if (!earthPos) return

    if (outerRef.current) outerRef.current.position.copy(earthPos)
    if (gastRef.current)  gastRef.current.rotation.y = gastToRotY(getGAST())

    const dist = camera.position.distanceTo(earthPos)
    if (visRef.current) visRef.current.visible = dist <= DIST_CONFLICT_MAX
  })

  if (!showConflictLayer) return null

  return (
    <group ref={outerRef}>
      <group rotation={[0, 0, AXIAL_TILT_RAD]}>
        <group ref={gastRef}>
          <group ref={visRef}>

            {/* Strike sites and other point feeds, batched per colour */}
            {points.map(({ key, geo, color }) => (
              <points key={key} geometry={geo}>
                <pointsMaterial
                  color={color}
                  size={POINT_SIZE}
                  sizeAttenuation
                  transparent
                  opacity={0.8}
                  depthWrite={false}
                />
              </points>
            ))}

            {shapes.map(({ key, isLine, lineGeo, fillGeo, colors }) => (
              <group key={key}>
                {/* Front lines and polygon borders */}
                {lineGeo && (
                  <lineSegments geometry={lineGeo}>
                    <lineBasicMaterial
                      color={colors.line}
                      transparent
                      opacity={isLine ? 0.85 : 0.45}
                      depthWrite={false}
                    />
                  </lineSegments>
                )}

                {/* Territory fills (polygons only) */}
                {fillGeo && (
                  <mesh geometry={fillGeo}>
                    <meshBasicMaterial
                      color={colors.fill}
                      transparent
                      opacity={0.12}
                      depthWrite={false}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
              </group>
            ))}

          </group>
        </group>
      </group>
    </group>
  )
}
