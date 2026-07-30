/**
 * Nebula — a procedural backdrop behind the star field.
 *
 * Generated in a fragment shader rather than shipped as an image: the scene
 * already carries 8k Earth textures, the backdrop has to stay sharp at any
 * zoom, and the palette needs to sit with the HUD rather than fight it.
 *
 * The restraint here is deliberate. This sits behind every readable thing in
 * the app, so it is low-frequency and low-contrast on purpose — it should read
 * as depth in peripheral vision and disappear the moment you look at a panel.
 * Density is banded around a tilted plane so it reads as a galactic band rather
 * than uniform fog, which is what makes it feel like somewhere rather than
 * like a gradient.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../../store'

/** Outside drei's star shells (8000) so the stars sit in front of it. */
const RADIUS = 11000

const VERT = /* glsl */`
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  precision highp float;

  uniform float uIntensity;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  varying vec3  vPos;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vPos);
    vec3 p = dir * 2.3;

    // Domain warping: sample the noise field through a displacement that is
    // itself noise. Plain fbm gives round blobs; warping it is what produces
    // the drawn-out filaments and cavities a nebula actually has.
    vec3 q = vec3(
      fbm(p + vec3(0.0, 0.0, 0.0)),
      fbm(p + vec3(5.2, 1.3, 2.8)),
      fbm(p + vec3(9.1, 4.7, 3.3)));
    float f = fbm(p + 3.6 * q);

    // Hard contrast curve. Nebulae are mostly empty with dense cores; a linear
    // ramp reads as fog, which is what the first attempt looked like.
    float d = pow(clamp((f - 0.26) / 0.46, 0.0, 1.0), 1.5);

    // Banded around a tilted plane so it reads as somewhere, not as even fog.
    vec3 poleAxis = normalize(vec3(0.34, 0.86, 0.38));
    float band = 1.0 - smoothstep(0.28, 1.05, abs(dot(dir, poleAxis)));

    float density = d * band;

    // Colour follows structure: cool blue at the thin edges, violet through the
    // body, hot pink only in the densest cores.
    vec3 col = mix(uColorA, uColorB, smoothstep(0.06, 0.52, f));
    col = mix(col, uColorC, smoothstep(0.54, 0.86, f));

    gl_FragColor = vec4(col, density * uIntensity);
  }
`

export function Nebula() {
  const decorativeFx    = useAppStore((s) => s.decorativeFx)
  const nebulaIntensity = useAppStore((s) => s.nebulaIntensity)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => ({
    uIntensity: { value: 0.0 },
    // Cool, desaturated, and drawn from the HUD's own family so the backdrop
    // never reads as a fifth accent colour competing with the severity ramp.
    uColorA: { value: new THREE.Color('#2b46a8') },   // deep blue
    uColorB: { value: new THREE.Color('#7b3fb5') },   // dusty violet
    uColorC: { value: new THREE.Color('#c96bc4') },   // faint teal core
  }), [])

  // Fade in once rather than popping, and fade out entirely when decorative
  // presentation is off — this is atmosphere, not information.
  const target = decorativeFx ? nebulaIntensity : 0.0
  useFrame((_, delta) => {
    const m = matRef.current
    if (!m) return
    const cur = m.uniforms.uIntensity.value as number
    if (Math.abs(cur - target) < 0.002) return
    m.uniforms.uIntensity.value = cur + (target - cur) * (1 - Math.pow(0.02, delta))
  })

  return (
    <mesh renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, 48, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
