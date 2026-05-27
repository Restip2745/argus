import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '../../store'
import { latLngToWorld, latLngToLocal, AXIAL_TILT_RAD } from '../../lib/coordinates'
import { getGAST, gastToRotY } from '../../hooks/useGAST'
import type { AnnotationPin, AnnotationLink, CelestialBodyName } from '../../types'

const MARKER_R   = 1.030  // just above EventMarkers (1.025)
const EARTH_R    = 1.0
const ARC_SEGS   = 64

interface LayerProps {
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
}

// ── reusable scratch objects (never share across concurrent useFrame calls) ──
// ── Pin Marker ────────────────────────────────────────────────────────────────
function PinMarker({
  pin, positionsRef,
}: {
  pin: AnnotationPin
  positionsRef: LayerProps['positionsRef']
}) {
  const groupRef  = useRef<THREE.Group>(null)
  const domRef    = useRef<HTMLDivElement>(null)
  const _local    = useMemo(() => new THREE.Vector3(), [])

  const annotationTool  = useAppStore((s) => s.annotationTool)
  const pendingLinkFrom = useAppStore((s) => s.pendingLinkFrom)
  const setPendingLinkFrom = useAppStore((s) => s.setPendingLinkFrom)
  const setPendingLink     = useAppStore((s) => s.setPendingLink)
  const removeAnnotationPin  = useAppStore((s) => s.removeAnnotationPin)
  const annotationLinks      = useAppStore((s) => s.annotationLinks)
  const removeAnnotationLink = useAppStore((s) => s.removeAnnotationLink)

  const isLinkSource = pendingLinkFrom === pin.id

  useFrame(({ camera }) => {
    const bodyPos = positionsRef.current.get(pin.bodyId as CelestialBodyName)
    if (!bodyPos || !groupRef.current) return

    if (pin.bodyId === 'earth') {
      latLngToWorld(pin.lat, pin.lng, MARKER_R, bodyPos, _local)
    } else {
      // Non-Earth: local sphere direction + bodyPos (pin won't track body rotation)
      const dir = latLngToLocal(pin.lat, pin.lng, MARKER_R)
      _local.copy(dir).add(bodyPos)
    }
    groupRef.current.position.copy(_local)

    // Horizon cull (Earth only)
    if (pin.bodyId === 'earth' && domRef.current) {
      const earthPos = bodyPos
      const dot = (
        _local.x * (camera.position.x - earthPos.x) +
        _local.y * (camera.position.y - earthPos.y) +
        _local.z * (camera.position.z - earthPos.z)
      )
      const d = dot >= EARTH_R * MARKER_R ? 'block' : 'none'
      if (domRef.current.style.display !== d) domRef.current.style.display = d
    }
  })

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (annotationTool === 'erase') {
      // remove pin + all its links
      annotationLinks
        .filter((l) => l.fromId === pin.id || l.toId === pin.id)
        .forEach((l) => removeAnnotationLink(l.id))
      removeAnnotationPin(pin.id)
      return
    }

    if (annotationTool === 'link') {
      if (!pendingLinkFrom) {
        setPendingLinkFrom(pin.id)
      } else if (pendingLinkFrom !== pin.id) {
        setPendingLink({ fromId: pendingLinkFrom, toId: pin.id })
        setPendingLinkFrom(null)
      }
    }
  }

  const cursor =
    annotationTool === 'erase' ? 'no-drop' :
    annotationTool === 'link'  ? 'crosshair' :
    'default'

  return (
    <group ref={groupRef}>
      <Html center zIndexRange={[25, 35]} style={{ pointerEvents: 'none' }}>
        <div ref={domRef} style={{ display: 'block' }}>
          <div
            onClick={handleClick}
            style={{
              pointerEvents: annotationTool !== 'pin' ? 'all' : 'none',
              cursor,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {/* Icon bubble */}
            <div style={{
              width: 34, height: 34,
              borderRadius: '50%',
              background: pin.color + '28',
              border: `2px solid ${isLinkSource ? '#ffffff' : pin.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
              boxShadow: isLinkSource
                ? '0 0 0 3px rgba(255,255,255,0.3)'
                : `0 0 10px ${pin.color}66`,
              backdropFilter: 'blur(4px)',
              transition: 'box-shadow 0.15s',
            }}>
              {pin.icon}
            </div>

            {/* Label */}
            {pin.label && (
              <div style={{
                background: 'rgba(0,0,0,0.78)',
                border: `1px solid ${pin.color}55`,
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 10,
                color: pin.color,
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
                letterSpacing: '0.06em',
                backdropFilter: 'blur(4px)',
                userSelect: 'none',
              }}>
                {pin.label}
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  )
}

// ── Surface Arc (same-body geodesic connection) ───────────────────────────────
function SurfaceArc({
  link, fromPin, toPin, positionsRef,
}: {
  link: AnnotationLink
  fromPin: AnnotationPin
  toPin: AnnotationPin
  positionsRef: LayerProps['positionsRef']
}) {
  const labelGroupRef = useRef<THREE.Group>(null)
  const labelDomRef   = useRef<HTMLDivElement>(null)

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ARC_SEGS + 1) * 3), 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: link.color }), [link.color])
  const lineObj = useMemo(() => new THREE.Line(geo, mat), [geo, mat])

  const arrowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3))
    return g
  }, [])
  const arrowMat = useMemo(() => new THREE.LineBasicMaterial({ color: link.color }), [link.color])
  const arrowObj = useMemo(() => new THREE.LineLoop(arrowGeo, arrowMat), [arrowGeo, arrowMat])

  // pre-allocate scratch
  const v1 = useMemo(() => new THREE.Vector3(), [])
  const v2 = useMemo(() => new THREE.Vector3(), [])
  const vt = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }) => {
    const bodyPos = positionsRef.current.get(fromPin.bodyId as CelestialBodyName)
    if (!bodyPos) return

    const fromLocal = latLngToLocal(fromPin.lat, fromPin.lng, 1.0)
    const toLocal   = latLngToLocal(toPin.lat,   toPin.lng,   1.0)

    const attr = geo.attributes.position as THREE.BufferAttribute
    const arr  = attr.array as Float32Array

    const midIdx = Math.floor(ARC_SEGS / 2)

    for (let i = 0; i <= ARC_SEGS; i++) {
      const t = i / ARC_SEGS
      vt.lerpVectors(fromLocal, toLocal, t).normalize().multiplyScalar(MARKER_R)

      if (fromPin.bodyId === 'earth') {
        vt.applyEuler(new THREE.Euler(0, gastToRotY(getGAST()), 0))
        vt.applyEuler(new THREE.Euler(0, 0, AXIAL_TILT_RAD))
      }
      vt.add(bodyPos)

      arr[i * 3]     = vt.x
      arr[i * 3 + 1] = vt.y
      arr[i * 3 + 2] = vt.z

      if (i === midIdx && labelGroupRef.current) {
        labelGroupRef.current.position.copy(vt)

        if (fromPin.bodyId === 'earth' && labelDomRef.current) {
          const earthPos = bodyPos
          const dot = (
            vt.x * (camera.position.x - earthPos.x) +
            vt.y * (camera.position.y - earthPos.y) +
            vt.z * (camera.position.z - earthPos.z)
          )
          const d = dot >= EARTH_R * MARKER_R ? 'block' : 'none'
          if (labelDomRef.current.style.display !== d) labelDomRef.current.style.display = d
        }
      }
    }
    attr.needsUpdate = true

    // Arrowhead at "to" end — small triangle in the tangent plane of the arc
    // Tangent = direction from second-to-last to last arc point
    const lastIdx = ARC_SEGS
    const prevIdx = ARC_SEGS - 2
    v1.set(arr[prevIdx * 3], arr[prevIdx * 3 + 1], arr[prevIdx * 3 + 2])
    v2.set(arr[lastIdx * 3], arr[lastIdx * 3 + 1], arr[lastIdx * 3 + 2])

    const tangent = v2.clone().sub(v1).normalize()
    const radial  = v2.clone().sub(bodyPos).normalize()
    const side    = new THREE.Vector3().crossVectors(tangent, radial).normalize()

    const tip  = v2.clone()
    const size = 0.018
    const base = tip.clone().addScaledVector(tangent, -size * 2.5)
    const left = base.clone().addScaledVector(side,  size)
    const right= base.clone().addScaledVector(side, -size)

    const aAttr = arrowGeo.attributes.position as THREE.BufferAttribute
    const aArr  = aAttr.array as Float32Array
    aArr[0] = tip.x;   aArr[1]  = tip.y;   aArr[2]  = tip.z
    aArr[3] = left.x;  aArr[4]  = left.y;  aArr[5]  = left.z
    aArr[6] = right.x; aArr[7]  = right.y; aArr[8]  = right.z
    aArr[9] = tip.x;   aArr[10] = tip.y;   aArr[11] = tip.z
    aAttr.needsUpdate = true
  })

  return (
    <>
      <primitive object={lineObj} />
      <primitive object={arrowObj} />

      {link.label && (
        <group ref={labelGroupRef}>
          <Html center zIndexRange={[25, 35]} style={{ pointerEvents: 'none' }}>
            <div ref={labelDomRef} style={{
              background: 'rgba(0,0,0,0.80)',
              border: `1px solid ${link.color}55`,
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 10,
              color: link.color,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
              userSelect: 'none',
            }}>
              {link.label}
            </div>
          </Html>
        </group>
      )}
    </>
  )
}

// ── Space Line (cross-body straight connection) ───────────────────────────────
function SpaceLine({
  link, fromPin, toPin, positionsRef,
}: {
  link: AnnotationLink
  fromPin: AnnotationPin
  toPin: AnnotationPin
  positionsRef: LayerProps['positionsRef']
}) {
  const labelGroupRef = useRef<THREE.Group>(null)

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3))
    return g
  }, [])
  const mat    = useMemo(() => new THREE.LineBasicMaterial({ color: link.color }), [link.color])
  const lineObj = useMemo(() => new THREE.Line(geo, mat), [geo, mat])

  const arrowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3))
    return g
  }, [])
  const arrowMat = useMemo(() => new THREE.LineBasicMaterial({ color: link.color }), [link.color])
  const arrowObj = useMemo(() => new THREE.LineLoop(arrowGeo, arrowMat), [arrowGeo, arrowMat])

  const fromWorld = useMemo(() => new THREE.Vector3(), [])
  const toWorld   = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const fromBodyPos = positionsRef.current.get(fromPin.bodyId as CelestialBodyName)
    const toBodyPos   = positionsRef.current.get(toPin.bodyId as CelestialBodyName)
    if (!fromBodyPos || !toBodyPos) return

    if (fromPin.bodyId === 'earth') {
      latLngToWorld(fromPin.lat, fromPin.lng, MARKER_R, fromBodyPos, fromWorld)
    } else {
      fromWorld.copy(latLngToLocal(fromPin.lat, fromPin.lng, MARKER_R)).add(fromBodyPos)
    }

    if (toPin.bodyId === 'earth') {
      latLngToWorld(toPin.lat, toPin.lng, MARKER_R, toBodyPos, toWorld)
    } else {
      toWorld.copy(latLngToLocal(toPin.lat, toPin.lng, MARKER_R)).add(toBodyPos)
    }

    const attr = geo.attributes.position as THREE.BufferAttribute
    const arr  = attr.array as Float32Array
    arr[0] = fromWorld.x; arr[1] = fromWorld.y; arr[2] = fromWorld.z
    arr[3] = toWorld.x;   arr[4] = toWorld.y;   arr[5] = toWorld.z
    attr.needsUpdate = true

    if (labelGroupRef.current) {
      labelGroupRef.current.position.lerpVectors(fromWorld, toWorld, 0.5)
    }

    // Arrowhead near "to" end
    const tangent = toWorld.clone().sub(fromWorld).normalize()
    const up   = new THREE.Vector3(0, 1, 0)
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize()
    if (side.lengthSq() < 0.001) side.set(1, 0, 0)

    const tip  = toWorld.clone()
    const size = 0.05
    const base = tip.clone().addScaledVector(tangent, -size * 2.5)
    const left = base.clone().addScaledVector(side,  size)
    const right= base.clone().addScaledVector(side, -size)

    const aAttr = arrowGeo.attributes.position as THREE.BufferAttribute
    const aArr  = aAttr.array as Float32Array
    aArr[0] = tip.x;   aArr[1]  = tip.y;   aArr[2]  = tip.z
    aArr[3] = left.x;  aArr[4]  = left.y;  aArr[5]  = left.z
    aArr[6] = right.x; aArr[7]  = right.y; aArr[8]  = right.z
    aArr[9] = tip.x;   aArr[10] = tip.y;   aArr[11] = tip.z
    aAttr.needsUpdate = true
  })

  return (
    <>
      <primitive object={lineObj} />
      <primitive object={arrowObj} />

      {link.label && (
        <group ref={labelGroupRef}>
          <Html center zIndexRange={[25, 35]} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(0,0,0,0.80)',
              border: `1px solid ${link.color}55`,
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 10,
              color: link.color,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
              userSelect: 'none',
            }}>
              {link.label}
            </div>
          </Html>
        </group>
      )}
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function AnnotationLayer({ positionsRef }: LayerProps) {
  const pins  = useAppStore((s) => s.annotationPins)
  const links = useAppStore((s) => s.annotationLinks)

  if (pins.length === 0 && links.length === 0) return null

  const pinMap = new Map(pins.map((p) => [p.id, p]))

  return (
    <>
      {pins.map((pin) => (
        <PinMarker key={pin.id} pin={pin} positionsRef={positionsRef} />
      ))}

      {links.map((link) => {
        const fromPin = pinMap.get(link.fromId)
        const toPin   = pinMap.get(link.toId)
        if (!fromPin || !toPin) return null

        return fromPin.bodyId === toPin.bodyId ? (
          <SurfaceArc
            key={link.id}
            link={link}
            fromPin={fromPin}
            toPin={toPin}
            positionsRef={positionsRef}
          />
        ) : (
          <SpaceLine
            key={link.id}
            link={link}
            fromPin={fromPin}
            toPin={toPin}
            positionsRef={positionsRef}
          />
        )
      })}
    </>
  )
}
