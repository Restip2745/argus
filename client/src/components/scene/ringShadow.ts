/**
 * Analytic ring shadows for Saturn.
 *
 * The scene used to get these from the Sun's shadow map, which was the wrong
 * tool twice over.
 *
 * Too coarse: the Sun is a point light, so its shadow is a cube — six faces,
 * the whole scene redrawn into all six every frame. Each face spans a 90° FOV,
 * so at Saturn's 9.58 AU (1437 scene units) one face covers ~2874 units while
 * the ring system is only 44 units across. Even at a 4096² map that is ~64
 * texels for the entire ring system.
 *
 * And wrong: the rings are a transparent material with an alpha-channel texture
 * (the Cassini division lives in that alpha). A depth-only shadow map cannot
 * see alpha, so it cast the rings as a solid opaque band — no division, and
 * none of the 15% that genuinely shines through.
 *
 * Both shadows have closed forms instead. From 9.58 AU the Sun subtends about
 * 4.9e-4 rad, so across the ~20 units a shadow travels here the penumbra is
 * ~0.01 scene units — - optically these are hard shadows, and the small
 * smoothstep below is edge anti-aliasing rather than physics.
 *
 * Everything is computed in world space. That is not laziness: `CelestialBody`
 * puts the axial tilt on an inner group and leaves the outer group unrotated,
 * so the ring plane's world normal is a constant and the Sun sits at the world
 * origin. No matrix inversions, no frame bookkeeping, nothing per-fragment but
 * a dot product or two.
 */
import * as THREE from 'three'

/**
 * Which side of the pair a material is on.
 *   planet  the globe, shadowed by the rings crossing in front of the Sun
 *   rings   the annulus, shadowed by the globe
 */
export type RingShadowMode = 'planet' | 'rings'

/**
 * Uniforms shared by the planet and ring materials.
 *
 * One object, referenced by both compiled shaders, mutated in place once per
 * frame. Sharing matters for `uRingTex`: the planet has to sample the ring
 * texture to reproduce the division in its shadow, but it is the ring
 * component that loads it, so the loader writes it here and the planet's
 * shader picks it up without either component knowing about the other.
 */
export interface RingShadowUniforms {
  uSunDir:        { value: THREE.Vector3 }
  uPlanetCenter:  { value: THREE.Vector3 }
  uRingNormal:    { value: THREE.Vector3 }
  uRingInner:     { value: number }
  uRingOuter:     { value: number }
  uPlanetRadius:  { value: number }
  uRingTex:       { value: THREE.Texture }
  uRingOpacity:   { value: number }
  uSoftness:      { value: number }
}

/**
 * A 1×1 opaque white stand-in for the ring texture.
 *
 * A sampler uniform may not be null, and the planet's material compiles before
 * the ring PNG has finished loading. Alpha 1 means the untextured case — and
 * the first few frames — fall back to a uniformly opaque ring, which is
 * exactly what `PlainSaturnRings` wants permanently.
 */
export function createRingTexturePlaceholder(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
  tex.needsUpdate = true
  return tex
}

export function createRingShadowUniforms(opts: {
  ringInner: number
  ringOuter: number
  planetRadius: number
  ringOpacity: number
}): RingShadowUniforms {
  return {
    uSunDir:       { value: new THREE.Vector3(0, 0, 1) },
    uPlanetCenter: { value: new THREE.Vector3() },
    uRingNormal:   { value: new THREE.Vector3(0, 1, 0) },
    uRingInner:    { value: opts.ringInner },
    uRingOuter:    { value: opts.ringOuter },
    uPlanetRadius: { value: opts.planetRadius },
    uRingTex:      { value: createRingTexturePlaceholder() },
    uRingOpacity:  { value: opts.ringOpacity },
    // Roughly a pixel's worth of world space at working range. Only wide
    // enough to keep the terminator of the shadow from stair-stepping.
    uSoftness:     { value: 0.06 },
  }
}

const VERT_DECL = 'varying vec3 vRingShadowWorld;\n'

const FRAG_DECL = `
varying vec3 vRingShadowWorld;
uniform vec3  uSunDir;
uniform vec3  uPlanetCenter;
uniform vec3  uRingNormal;
uniform float uRingInner;
uniform float uRingOuter;
uniform float uPlanetRadius;
uniform sampler2D uRingTex;
uniform float uRingOpacity;
uniform float uSoftness;
`

/**
 * Rings → globe.
 *
 * Walk from the fragment toward the Sun and find where that ray crosses the
 * ring plane. If the crossing lands between the inner and outer radius, the
 * rings are in the way, and how much they block is the ring texture's own
 * alpha at that radius — sampled with the same radial mapping the ring mesh
 * uses for itself (see `useRadialRingGeometry`), so the shadow carries the
 * division and the partial opacity rather than being a flat black band.
 */
const FRAG_PLANET = `
  float ringShadow = 1.0;
  vec3  rel   = vRingShadowWorld - uPlanetCenter;
  float denom = dot(uSunDir, uRingNormal);
  if (abs(denom) > 1e-6) {
    float t = -dot(rel, uRingNormal) / denom;
    if (t > 0.0) {
      // Lands in the ring plane, so its length from the centre is the radius.
      float r = length(rel + uSunDir * t);
      float u = (r - uRingInner) / (uRingOuter - uRingInner);
      if (u > 0.0 && u < 1.0) {
        ringShadow = 1.0 - texture2D(uRingTex, vec2(u, 0.5)).a * uRingOpacity;
      }
    }
  }
  reflectedLight.directDiffuse  *= ringShadow;
  reflectedLight.directSpecular *= ringShadow;
`

/**
 * Globe → rings.
 *
 * Ray-sphere, reduced to its closest-approach form. The rings start at 1.12
 * planet radii so a ring fragment is always outside the globe, which removes
 * every case but one: if the globe lies toward the Sun (`a < 0`) and the ray
 * passes within a planet radius of the centre, the fragment is in shadow.
 */
const FRAG_RINGS = `
  vec3  rel = vRingShadowWorld - uPlanetCenter;
  float a   = dot(rel, uSunDir);
  float ringShadow = 1.0;
  if (a < 0.0) {
    float d = length(rel - uSunDir * a);
    ringShadow = smoothstep(uPlanetRadius - uSoftness, uPlanetRadius + uSoftness, d);
  }
  reflectedLight.directDiffuse  *= ringShadow;
  reflectedLight.directSpecular *= ringShadow;
`

/**
 * Patch a standard material to compute its ring shadow in the fragment stage.
 *
 * Idempotent — R3F may hand back the same material across re-renders, and
 * re-assigning `onBeforeCompile` would force a needless recompile.
 *
 * The injection lands just after `lights_fragment_begin`, where the direct
 * lighting has been accumulated but nothing has been combined yet. Scaling
 * `directDiffuse`/`directSpecular` there leaves indirect light untouched, so a
 * shadowed band still picks up the ambient term instead of going pure black.
 */
export function applyRingShadow(
  material: THREE.Material,
  uniforms: RingShadowUniforms,
  mode: RingShadowMode,
): void {
  // Keyed on the uniform block as well as the mode: were a new block ever
  // handed in, matching on mode alone would skip the re-patch and leave the
  // material bound to the old one, updating uniforms nobody reads.
  if (material.userData.ringShadowMode === mode &&
      material.userData.ringShadowUniforms === uniforms) return
  material.userData.ringShadowMode = mode
  material.userData.ringShadowUniforms = uniforms

  material.onBeforeCompile = (shader) => {
    for (const [key, u] of Object.entries(uniforms)) {
      shader.uniforms[key] = u as THREE.IUniform
    }

    shader.vertexShader = VERT_DECL + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n  vRingShadowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )

    shader.fragmentShader = FRAG_DECL + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      '#include <lights_fragment_begin>\n' + (mode === 'planet' ? FRAG_PLANET : FRAG_RINGS),
    )
  }
  material.needsUpdate = true
}
