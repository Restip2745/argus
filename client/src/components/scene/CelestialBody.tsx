import { useRef, useState, useCallback, useMemo, forwardRef } from 'react' // r3f
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { BodyDef } from '../../data/celestialBodies'
import type { CelestialBodyName } from '../../types'
import { useAppStore } from '../../store'
import { getGAST, gastToRotY } from '../../hooks/useGAST'

interface Props {
  def: BodyDef
  positionsRef: React.MutableRefObject<Map<CelestialBodyName, THREE.Vector3>>
  onFocus: (id: CelestialBodyName, worldPos: THREE.Vector3) => void
  /** For hover-label visibility at far distances */
  labelMinDist?: number
}

// Segment counts per body size for sphere quality vs performance
function sphereSegments(radius: number): number {
  if (radius >= 5)  return 64
  if (radius >= 1)  return 48
  if (radius >= 0.3) return 32
  return 16
}

// ── Irregular geometry helpers ────────────────────────────────────────────────

/** Deterministic hash of a string → uint32 seed */
function strToSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/** Position-based hash → displacement factor.
 *  Vertices at the same XYZ position get the same displacement, keeping
 *  the mesh watertight even on non-indexed IcosahedronGeometry. */
function posDisplace(x: number, y: number, z: number, seed: number): number {
  // Quantize to 3 decimal places to match IcosahedronGeometry precision
  const qx = Math.round(x * 1000)
  const qy = Math.round(y * 1000)
  const qz = Math.round(z * 1000)
  let h = seed
  h = (Math.imul(h, 1664525) + qx * 2654435761) | 0
  h = (Math.imul(h, 1664525) + qy * 2246822519) | 0
  h = (Math.imul(h, 1664525) + qz * 3266489917) | 0
  return (h >>> 0) / 0xffffffff
}

/** Build an irregular displaced icosahedron geometry.
 *  elongateY > 1 stretches along Y for a comet-like shape. */
function buildIrregularGeometry(
  radius: number, seed: number, detail: number, elongateY = 1.0
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail)
  const pos = geo.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const len = Math.sqrt(x * x + y * y + z * z)
    if (len === 0) continue
    // Position-based displacement: same XYZ → same factor → no tears
    const disp = 0.78 + posDisplace(x, y, z, seed) * 0.44  // 0.78 → 1.22×
    pos.setXYZ(
      i,
      (x / len) * radius * disp,
      (y / len) * radius * disp * elongateY,
      (z / len) * radius * disp,
    )
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

export function CelestialBody({ def, positionsRef, onFocus, labelMinDist = 300 }: Props) {
  const groupRef  = useRef<THREE.Group>(null)
  const meshRef   = useRef<THREE.Object3D>(null)
  const focusedBody = useAppStore((s) => s.focusedBody)
  const isFocused   = focusedBody === def.id

  const { camera } = useThree()

  // Self-rotation accumulator
  const rotYRef = useRef(0)

  // Hi-res texture LOD state — useState so a threshold crossing triggers a re-render
  const [useHiRes, setUseHiRes] = useState(false)

  const axialTiltRad = (def.axialTiltDeg * Math.PI) / 180

  useFrame((_, delta) => {
    const group = groupRef.current
    const mesh  = meshRef.current
    if (!group) return

    // Update world position from astronomy hook
    const pos = positionsRef.current.get(def.id)
    if (pos) group.position.copy(pos)

    // Self-rotation around body's own Y axis
    if (mesh && def.rotationPeriodHours !== 0) {
      if (def.id === 'earth') {
        // Use cached GAST (≤1 recalc/second) for accurate day/night orientation.
        mesh.rotation.y = gastToRotY(getGAST())
      } else {
        const periodSec = Math.abs(def.rotationPeriodHours) * 3600
        const sign      = def.rotationPeriodHours > 0 ? 1 : -1
        rotYRef.current += sign * (Math.PI * 2 / periodSec) * delta
        mesh.rotation.y = rotYRef.current
      }
    }

    // Texture LOD: check every frame so zooming out actually reverts the texture.
    // Hysteresis (< 8 to upgrade, > 14 to downgrade) prevents rapid toggling.
    if (def.hiResTexturePath && pos) {
      const dist = camera.position.distanceTo(pos)
      setUseHiRes((prev) => {
        if (!prev && dist < 8.0)  return true
        if (prev  && dist > 14.0) return false
        return prev   // no change → no re-render
      })
    }
  })

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()

      // When GeoJSON political layer is active, route Earth clicks to the
      // country-selection handler (registered by GeoJsonLayer) instead of
      // the generic focus handler — avoids re-focusing an already-focused body.
      if (def.id === 'earth') {
        const store = useAppStore.getState()
        if (store.showGeoJsonLayer && store.onEarthSurfaceClick) {
          store.onEarthSurfaceClick(e.point)
          return
        }
      }

      const pos = positionsRef.current.get(def.id)
      if (pos) onFocus(def.id, pos.clone())

      // Open the celestial body info panel
      useAppStore.getState().setSelectedBody(def.id)
    },
    [def.id, positionsRef, onFocus]
  )

  const segs = sphereSegments(def.renderedRadius)

  // Distance from camera to body (for label visibility — snapshot at render time is fine)
  const distToCamera = camera.position.distanceTo(
    positionsRef.current.get(def.id) ?? new THREE.Vector3()
  )
  const showLabel = distToCamera < labelMinDist || isFocused

  const activeDayTex   = useHiRes && def.hiResTexturePath      ? def.hiResTexturePath      : (def.texturePath ?? '')
  const activeNightTex = useHiRes && def.hiResNightTexturePath ? def.hiResNightTexturePath : (def.nightTexturePath ?? '')

  return (
    <group ref={groupRef}>
      {/* Axial-tilt wrapper so rotation.y = self-rotation around the tilted axis */}
      <group rotation={[0, 0, axialTiltRad]}>
        {/* Use separate components for textured vs plain bodies to avoid conditional hook calls */}
        {def.navGroup === 'asteroid' ? (
          <IrregularMesh
            ref={meshRef}
            radius={def.renderedRadius}
            color={def.color}
            seed={strToSeed(def.id)}
            detail={def.renderedRadius >= 0.10 ? 2 : 1}
            elongateY={1.0}
            onClick={handleClick}
          />
        ) : def.navGroup === 'comet' ? (
          <IrregularMesh
            ref={meshRef}
            radius={def.renderedRadius}
            color={def.color}
            seed={strToSeed(def.id)}
            detail={1}
            elongateY={1.6}
            onClick={handleClick}
          />
        ) : def.nightTexturePath ? (
          // Earth: textured or plain-dark sphere + atmosphere
          <>
            <EarthSurface
              ref={meshRef}
              activeDayTex={activeDayTex}
              activeNightTex={activeNightTex}
              radius={def.renderedRadius}
              segs={segs}
              onClick={handleClick}
            />
            <EarthAtmosphere radius={def.renderedRadius} />
          </>
        ) : def.texturePath ? (
          <TexturedMesh
            ref={meshRef}
            texturePath={def.texturePath}
            radius={def.renderedRadius}
            segs={segs}
            color={def.color}
            isStar={!!def.isStar}
            onClick={handleClick}
          />
        ) : (
          <mesh
            ref={meshRef as React.Ref<THREE.Mesh>}
            onClick={handleClick}
            castShadow={!def.isStar}
            receiveShadow={!def.isStar}
          >
            <sphereGeometry args={[def.renderedRadius, segs, segs]} />
            {def.isStar ? (
              <meshBasicMaterial color={def.color} />
            ) : (
              <meshStandardMaterial color={def.color} roughness={0.8} metalness={0.0} />
            )}
          </mesh>
        )}

        {/* Saturn ring system */}
        {def.hasRings && (
          def.ringTexturePath
            ? <TexturedSaturnRings radius={def.renderedRadius} ringTexturePath={def.ringTexturePath} />
            : <PlainSaturnRings radius={def.renderedRadius} />
        )}
      </group>

      {/* Hover/focus label */}
      {showLabel && (
        <Html
          center
          position={[0, def.renderedRadius * 1.6, 0]}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span
            style={{
              color: isFocused ? '#00d4ff' : '#4a6fa5',
              fontSize: '9px',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textShadow: '0 0 6px rgba(0,0,0,0.9)',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {def.label}
          </span>
        </Html>
      )}
    </group>
  )
}

// ── Irregular mesh for asteroids and comets ───────────────────────────────────

interface IrregularMeshProps {
  radius: number
  color: string
  seed: number
  detail: number
  elongateY: number
  onClick: (e: ThreeEvent<MouseEvent>) => void
}

const IrregularMesh = forwardRef<THREE.Object3D, IrregularMeshProps>(
  ({ radius, color, seed, detail, elongateY, onClick }, ref) => {
    const geometry = useMemo(
      () => buildIrregularGeometry(radius, seed, detail, elongateY),
      [radius, seed, detail, elongateY],
    )

    return (
      <mesh ref={ref as React.Ref<THREE.Mesh>} geometry={geometry} onClick={onClick} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={1.0} metalness={0.0} />
      </mesh>
    )
  }
)

// ── Textured mesh (only rendered when texturePath exists) ─────────────────────


interface TexturedMeshProps {
  texturePath: string
  radius: number
  segs: number
  color: string
  isStar: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
}

const TexturedMesh = forwardRef<THREE.Object3D, TexturedMeshProps>(
  ({ texturePath, radius, segs, color, isStar, onClick }, ref) => {
    const texture = useLoader(THREE.TextureLoader, texturePath)

    const processedTexture = useMemo(() => {
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace
      }
      return texture
    }, [texture])

    return (
      <mesh
        ref={ref as React.Ref<THREE.Mesh>}
        onClick={onClick}
        castShadow={!isStar}
        receiveShadow={!isStar}
      >
        <sphereGeometry args={[radius, segs, segs]} />
        {isStar ? (
          <meshBasicMaterial
            map={processedTexture}
            color={processedTexture ? undefined : color}
          />
        ) : (
          <meshStandardMaterial
            map={processedTexture}
            color={processedTexture ? undefined : color}
            roughness={0.8}
            metalness={0.0}
          />
        )}
      </mesh>
    )
  }
)

// ── Earth surface: switches between textured and plain-dark based on store flag ─

interface EarthSurfaceProps {
  activeDayTex: string
  activeNightTex: string
  radius: number
  segs: number
  onClick: (e: ThreeEvent<MouseEvent>) => void
}

const EarthSurface = forwardRef<THREE.Object3D, EarthSurfaceProps>(
  ({ activeDayTex, activeNightTex, radius, segs, onClick }, ref) => {
    const showEarthTexture = useAppStore((s) => s.showEarthTexture)

    if (showEarthTexture) {
      return (
        <EarthMesh
          ref={ref}
          texturePath={activeDayTex}
          nightTexturePath={activeNightTex}
          radius={radius}
          segs={segs}
          onClick={onClick}
        />
      )
    }

    // Texture off: plain dark sphere — preserves depth, occlusion, and click.
    // Country borders (GeoJsonLayer at r=1.004) remain fully visible.
    return (
      <mesh ref={ref as React.Ref<THREE.Mesh>} onClick={onClick} castShadow receiveShadow>
        <sphereGeometry args={[radius, segs, segs]} />
        <meshStandardMaterial color="#0b1622" roughness={1} metalness={0} />
      </mesh>
    )
  }
)

// ── Earth mesh: day texture + city-lights emissive on dark side ───────────────

interface EarthMeshProps {
  texturePath: string
  nightTexturePath: string
  radius: number
  segs: number
  onClick: (e: ThreeEvent<MouseEvent>) => void
}

const EarthMesh = forwardRef<THREE.Object3D, EarthMeshProps>(
  ({ texturePath, nightTexturePath, radius, segs, onClick }, ref) => {
    const { gl } = useThree()
    const dayTex   = useLoader(THREE.TextureLoader, texturePath)
    const nightTex = useLoader(THREE.TextureLoader, nightTexturePath)

    const maxAnisotropy = gl.capabilities.getMaxAnisotropy()

    const [day, night] = useMemo(() => {
      dayTex.colorSpace   = THREE.SRGBColorSpace
      nightTex.colorSpace = THREE.SRGBColorSpace
      dayTex.anisotropy   = maxAnisotropy
      nightTex.anisotropy = maxAnisotropy
      dayTex.needsUpdate   = true
      nightTex.needsUpdate = true
      return [dayTex, nightTex]
    }, [dayTex, nightTex, maxAnisotropy])

    return (
      /* Both layers share a single group — rotation.y applied to this group
         rotates day AND night textures in lock-step, keeping them aligned. */
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Base layer: day texture lit by the Sun — opaque, writes depth */}
        <mesh onClick={onClick} castShadow receiveShadow>
          <sphereGeometry args={[radius, segs, segs]} />
          <meshStandardMaterial
            map={day}
            roughness={0.8}
            metalness={0.0}
          />
        </mesh>

        {/* Night layer: city lights, additive blend so they only brighten dark areas.
            Multiply blending means they are invisible where the day mesh is bright,
            and show through where the day mesh is dark (shadowed by Sun). */}
        <mesh renderOrder={1}>
          <sphereGeometry args={[radius * 1.001, segs, segs]} />
          <meshBasicMaterial
            map={night}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    )
  }
)

// ── Atmospheric Fresnel glow (limb + terminator) ───────────────────────────────

// vNormal must be in WORLD space to match cameraPosition (also world space).
// Using mat3(modelMatrix)*normal avoids the view-space mismatch that caused
// the buggy blue band across the whole sphere.
const atmosphereVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal   = normalize(mat3(modelMatrix) * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFrag = /* glsl */ `
  uniform vec3  uColor;
  uniform float uIntensity;
  varying vec3  vNormal;
  varying vec3  vWorldPos;
  void main() {
    vec3  viewDir = normalize(cameraPosition - vWorldPos);  // world space
    float rim     = 1.0 - abs(dot(vNormal, viewDir));       // both world space ✓
    float alpha   = pow(rim, 4.0) * uIntensity;
    gl_FragColor  = vec4(uColor, alpha);
  }
`

function EarthAtmosphere({ radius }: { radius: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => ({
    uColor:     { value: new THREE.Color(0.3, 0.55, 1.0) },
    uIntensity: { value: 0.7 },
  }), [])

  return (
    <mesh>
      <sphereGeometry args={[radius * 1.025, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={atmosphereVert}
        fragmentShader={atmosphereFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  )
}

// ── Saturn rings ──────────────────────────────────────────────────────────────

/** Fix ringGeometry UVs so the texture maps radially (inner→outer) instead of
 *  the default polar mapping. This makes ring texture bands display correctly. */
function useRadialRingGeometry(inner: number, outer: number, segments: number) {
  return useMemo(() => {
    const geo = new THREE.RingGeometry(inner, outer, segments)
    const pos = geo.attributes.position
    const uv  = geo.attributes.uv

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const dist = Math.sqrt(x * x + y * y)
      // U = radial 0 (inner) → 1 (outer)
      uv.setXY(i, (dist - inner) / (outer - inner), 0.5)
    }
    uv.needsUpdate = true
    return geo
  }, [inner, outer, segments])
}

function TexturedSaturnRings({ radius, ringTexturePath }: { radius: number; ringTexturePath: string }) {
  const inner = radius * 1.12
  const outer = radius * 2.35
  const texture = useLoader(THREE.TextureLoader, ringTexturePath)
  const geometry = useRadialRingGeometry(inner, outer, 128)

  const processedTexture = useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace
    }
    return texture
  }, [texture])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        map={processedTexture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  )
}

function PlainSaturnRings({ radius }: { radius: number }) {
  const inner = radius * 1.12
  const outer = radius * 2.35
  const geometry = useRadialRingGeometry(inner, outer, 128)

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#c8b06e"
        side={THREE.DoubleSide}
        transparent
        opacity={0.85}
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  )
}
