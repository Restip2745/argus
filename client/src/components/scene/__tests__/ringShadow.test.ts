import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { applyRingShadow, createRingShadowUniforms } from '../ringShadow'

/**
 * These guard the one failure mode an onBeforeCompile patch has: the injection
 * is a string replace against three.js's own shader source, and if the anchor
 * ever stops matching, `replace` returns the source untouched. No exception,
 * no warning — Saturn simply renders with no ring shadow, which looks close
 * enough to "fine" that it could survive a long time unnoticed.
 *
 * So the tests assert the injected code is actually *present* afterwards,
 * never merely that the call did not throw.
 */

/** The shader object three.js hands to onBeforeCompile: raw source, includes
 *  not yet resolved. MeshStandardMaterial compiles from ShaderLib.physical. */
function makeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader:   THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  }
}

function patch(mode: 'planet' | 'rings') {
  const material = new THREE.MeshStandardMaterial()
  const uniforms = createRingShadowUniforms({
    ringInner: 10.58, ringOuter: 22.21, planetRadius: 9.45, ringOpacity: 0.85,
  })
  applyRingShadow(material, uniforms, mode)
  const shader = makeShader()
  material.onBeforeCompile(shader as never, null as never)
  return { material, uniforms, shader }
}

describe('ringShadow injection anchors', () => {
  // If a three.js upgrade renames either chunk, this fails here rather than
  // silently removing the shadow at runtime.
  it('three.js still exposes the chunks the patch injects against', () => {
    expect(THREE.ShaderLib.physical.vertexShader).toContain('#include <worldpos_vertex>')
    expect(THREE.ShaderLib.physical.fragmentShader).toContain('#include <lights_fragment_begin>')
  })
})

describe('applyRingShadow — planet mode', () => {
  it('injects the world-position varying into the vertex stage', () => {
    const { shader } = patch('planet')
    expect(shader.vertexShader).toContain('varying vec3 vRingShadowWorld;')
    expect(shader.vertexShader).toContain('vRingShadowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  })

  it('samples the ring texture so the shadow carries the ring structure', () => {
    const { shader } = patch('planet')
    // The whole point of the analytic version over a shadow map: the band is
    // modulated by the rings' own alpha rather than being solid.
    expect(shader.fragmentShader).toContain('texture2D(uRingTex, vec2(u, 0.5)).a')
    expect(shader.fragmentShader).toContain('reflectedLight.directDiffuse  *= ringShadow;')
  })

  it('attenuates direct light only, leaving the ambient term intact', () => {
    const { shader } = patch('planet')
    // A shadowed band still has to pick up ambient, or it goes pure black.
    expect(shader.fragmentShader).not.toContain('reflectedLight.indirectDiffuse *= ringShadow')
  })

  it('binds every uniform the injected code reads', () => {
    const { shader, uniforms } = patch('planet')
    for (const key of Object.keys(uniforms)) {
      expect(shader.uniforms[key], `uniform ${key} not bound`).toBeDefined()
    }
    // Same objects, not copies — the per-frame update mutates these in place.
    expect(shader.uniforms.uSunDir).toBe(uniforms.uSunDir)
    expect(shader.uniforms.uRingTex).toBe(uniforms.uRingTex)
  })
})

describe('applyRingShadow — rings mode', () => {
  it('injects the ray-sphere occlusion test', () => {
    const { shader } = patch('rings')
    expect(shader.fragmentShader).toContain('smoothstep(uPlanetRadius - uSoftness, uPlanetRadius + uSoftness, d)')
    expect(shader.vertexShader).toContain('vRingShadowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  })

  it('does not sample the ring texture — the globe is the occluder here', () => {
    const { shader } = patch('rings')
    expect(shader.fragmentShader).not.toContain('texture2D(uRingTex')
  })
})

describe('applyRingShadow — hygiene', () => {
  it('declares the varying exactly once per stage', () => {
    const { shader } = patch('planet')
    const count = (src: string) => src.split('varying vec3 vRingShadowWorld;').length - 1
    expect(count(shader.vertexShader)).toBe(1)
    expect(count(shader.fragmentShader)).toBe(1)
  })

  it('is idempotent — re-applying the same mode does not force a recompile', () => {
    const material = new THREE.MeshStandardMaterial()
    const uniforms = createRingShadowUniforms({
      ringInner: 10.58, ringOuter: 22.21, planetRadius: 9.45, ringOpacity: 0.85,
    })
    applyRingShadow(material, uniforms, 'planet')
    const first = material.onBeforeCompile
    applyRingShadow(material, uniforms, 'planet')
    expect(material.onBeforeCompile).toBe(first)
  })

  it('starts with an opaque ring stand-in so the globe shades correctly before the PNG lands', () => {
    const uniforms = createRingShadowUniforms({
      ringInner: 10.58, ringOuter: 22.21, planetRadius: 9.45, ringOpacity: 0.85,
    })
    // A sampler uniform may not be null, and the globe's material compiles
    // before the ring texture has loaded.
    expect(uniforms.uRingTex.value).toBeInstanceOf(THREE.DataTexture)
  })
})
