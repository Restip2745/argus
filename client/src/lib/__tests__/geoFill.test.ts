import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  angularDistanceDeg, emitSubdividedTriangle, maxSafeSpanDeg,
  project, ringCrossesAntimeridian, unwrapRing,
} from '../geoFill'
import { latLngToLocal } from '../coordinates'

const EARTH_R = 1.0
const FILL_R  = 1.003
const MAX_EDGE = 4

/** Distance from the globe centre to each emitted triangle's centroid. */
function centroidRadii(positions: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < positions.length; i += 9) {
    const cx = (positions[i]     + positions[i + 3] + positions[i + 6]) / 3
    const cy = (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3
    const cz = (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3
    out.push(Math.hypot(cx, cy, cz))
  }
  return out
}

describe('project', () => {
  it('matches the scene projection used everywhere else', () => {
    for (const [lng, lat] of [[0, 0], [45, 30], [-120, -60], [179, 85]]) {
      const mine = project(lng, lat, FILL_R)
      const theirs = latLngToLocal(lat, lng, FILL_R)
      expect(mine[0]).toBeCloseTo(theirs.x, 12)
      expect(mine[1]).toBeCloseTo(theirs.y, 12)
      expect(mine[2]).toBeCloseTo(theirs.z, 12)
    }
  })

  it('puts every point exactly on the sphere', () => {
    const [x, y, z] = project(137, -22, FILL_R)
    expect(Math.hypot(x, y, z)).toBeCloseTo(FILL_R, 12)
  })
})

describe('angularDistanceDeg', () => {
  it('measures arc, not coordinate difference', () => {
    expect(angularDistanceDeg(0, 0, 0, 90)).toBeCloseTo(90, 6)
    expect(angularDistanceDeg(0, 0, 90, 0)).toBeCloseTo(90, 6)
    // 10° of longitude near the pole is a much shorter arc than at the equator.
    expect(angularDistanceDeg(0, 80, 10, 80)).toBeLessThan(2)
    expect(angularDistanceDeg(0, 0, 10, 0)).toBeCloseTo(10, 6)
  })
})

describe('maxSafeSpanDeg', () => {
  it('reproduces the ~8.9° limit the scene actually operates under', () => {
    expect(maxSafeSpanDeg(FILL_R, EARTH_R)).toBeGreaterThan(8.5)
    expect(maxSafeSpanDeg(FILL_R, EARTH_R)).toBeLessThan(9.5)
  })

  it('reports no safe span when the fill is not above the surface', () => {
    expect(maxSafeSpanDeg(1.0, 1.0)).toBe(0)
    expect(maxSafeSpanDeg(0.99, 1.0)).toBe(0)
  })

  it('confirms the configured threshold is inside the safe limit', () => {
    expect(MAX_EDGE).toBeLessThan(maxSafeSpanDeg(FILL_R, EARTH_R))
  })
})

describe('unwrapRing', () => {
  it('leaves an ordinary ring untouched', () => {
    const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    expect(unwrapRing(ring)).toEqual(ring)
  })

  it('makes a ring crossing the antimeridian continuous', () => {
    // Chukotka-style: 175 → -175 is a 10° step east, not a 350° step west.
    const ring = [[175, 60], [-175, 60], [-175, 65], [175, 65], [175, 60]]
    const un = unwrapRing(ring)
    const lngs = un.map((p) => p[0])

    for (let i = 1; i < lngs.length; i++) {
      expect(Math.abs(lngs[i] - lngs[i - 1])).toBeLessThanOrEqual(180)
    }
    expect(Math.max(...lngs) - Math.min(...lngs)).toBeCloseTo(10, 6)
  })

  it('preserves latitudes exactly', () => {
    const ring = [[179, 12], [-179, 13], [-178, 14]]
    expect(unwrapRing(ring).map((p) => p[1])).toEqual([12, 13, 14])
  })

  it('projects unwrapped longitudes to the same points as wrapped ones', () => {
    // Longitude is periodic, so 185° and -175° must land in the same place.
    const a = project(185, 40, FILL_R)
    const b = project(-175, 40, FILL_R)
    for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 12)
  })
})

describe('ringCrossesAntimeridian', () => {
  it('detects a wrap and ignores ordinary rings', () => {
    expect(ringCrossesAntimeridian([[175, 0], [-175, 0]])).toBe(true)
    expect(ringCrossesAntimeridian([[10, 0], [20, 0], [30, 0]])).toBe(false)
  })
})

describe('emitSubdividedTriangle', () => {
  it('keeps a large triangle above the terrain', () => {
    // A 60°-wide triangle. Unsubdivided, its centre would sag to ~0.87 —
    // deep inside a unit Earth.
    const out: number[] = []
    emitSubdividedTriangle([0, 0], [60, 0], [30, 50], FILL_R, out, { maxEdgeDeg: MAX_EDGE })

    const radii = centroidRadii(out)
    expect(radii.length).toBeGreaterThan(50)
    expect(Math.min(...radii)).toBeGreaterThan(EARTH_R)
  })

  it('would sag through the globe without subdivision — the bug this fixes', () => {
    const out: number[] = []
    // maxDepth 0 disables subdivision, reproducing the original behaviour.
    emitSubdividedTriangle([0, 0], [60, 0], [30, 50], FILL_R, out, { maxDepth: 0 })

    expect(centroidRadii(out).every((r) => r < EARTH_R)).toBe(true)
  })

  it('emits whole triangles', () => {
    const out: number[] = []
    emitSubdividedTriangle([0, 0], [30, 0], [15, 20], FILL_R, out, { maxEdgeDeg: MAX_EDGE })
    expect(out.length % 9).toBe(0)
  })

  it('places every vertex exactly on the fill sphere', () => {
    const out: number[] = []
    emitSubdividedTriangle([-10, -40], [25, -35], [5, -5], FILL_R, out, { maxEdgeDeg: MAX_EDGE })
    for (let i = 0; i < out.length; i += 3) {
      expect(Math.hypot(out[i], out[i + 1], out[i + 2])).toBeCloseTo(FILL_R, 9)
    }
  })

  it('does not subdivide a triangle that is already small', () => {
    const out: number[] = []
    emitSubdividedTriangle([0, 0], [1, 0], [0.5, 1], FILL_R, out, { maxEdgeDeg: MAX_EDGE })
    expect(out.length).toBe(9)   // exactly one triangle
  })

  it('respects the recursion bound on a pathological triangle', () => {
    const out: number[] = []
    emitSubdividedTriangle([-179, -89], [179, 89], [0, 0], FILL_R, out, {
      maxEdgeDeg: 0.001, maxDepth: 4,
    })
    expect(out.length / 9).toBeLessThanOrEqual(4 ** 4)
  })
})

describe('real country geometry', () => {
  const fs = require('node:fs') as typeof import('node:fs')
  const path = require('node:path') as typeof import('node:path')
  const GEOJSON = path.resolve(__dirname, '../../../public/geodata/ne_110m_admin_0_countries.geojson')

  function fillPositionsFor(feature: {
    geometry: { type: string; coordinates: unknown }
  }): number[] {
    const polys: number[][][][] =
      feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as number[][][]]
        : (feature.geometry.coordinates as number[][][][])

    const positions: number[] = []
    for (const poly of polys) {
      if (!poly?.length) continue
      const outer = unwrapRing(poly[0])
      const shape = new THREE.Shape(outer.map(([lng, lat]) => new THREE.Vector2(lng, lat)))
      for (let h = 1; h < poly.length; h++) {
        shape.holes.push(new THREE.Path(
          unwrapRing(poly[h]).map(([lng, lat]) => new THREE.Vector2(lng, lat)),
        ))
      }
      const pts = shape.extractPoints(1)
      const idx = THREE.ShapeUtils.triangulateShape(pts.shape, pts.holes)
      const all = [...pts.shape, ...pts.holes.flat()]
      for (const [a, b, c] of idx) {
        const pa = all[a], pb = all[b], pc = all[c]
        emitSubdividedTriangle(
          [pa.x, pa.y], [pb.x, pb.y], [pc.x, pc.y],
          FILL_R, positions, { maxEdgeDeg: MAX_EDGE },
        )
      }
    }
    return positions
  }

  it('keeps every country fill above the terrain, including the awkward ones', () => {
    const gj = JSON.parse(fs.readFileSync(GEOJSON, 'utf8')) as {
      features: { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[]
    }

    const offenders: { name: string; minR: number }[] = []
    let totalTris = 0

    for (const f of gj.features) {
      const positions = fillPositionsFor(f)
      if (positions.length === 0) continue
      totalTris += positions.length / 9
      const minR = Math.min(...centroidRadii(positions))
      if (minR <= EARTH_R) {
        offenders.push({ name: String(f.properties['ADMIN'] ?? f.properties['NAME']), minR })
      }
    }

    expect(totalTris).toBeGreaterThan(1000)
    expect(
      offenders,
      `fills sinking below the surface: ${offenders.slice(0, 8).map((o) => `${o.name}@${o.minR.toFixed(4)}`).join(', ')}`,
    ).toEqual([])
  })

  it('stays within a sane geometry budget', () => {
    // Subdivision is not free — it is a multiplier on every triangle in the
    // dataset, rebuilt whenever the map mode changes. Measured at the 4°
    // threshold: 9.8k raw triangles → 27k subdivided (2.8×), ~1 MB of
    // positions. Most coastline triangles are already small, so only the big
    // interior ones actually split. If a threshold change pushes this an order
    // of magnitude higher, the globe will stutter on every mode switch.
    const gj = JSON.parse(fs.readFileSync(GEOJSON, 'utf8')) as {
      features: { geometry: { type: string; coordinates: unknown } }[]
    }
    let tris = 0
    for (const f of gj.features) tris += fillPositionsFor(f).length / 9

    expect(tris).toBeGreaterThan(10_000)   // subdivision is actually happening
    expect(tris).toBeLessThan(80_000)      // and has not run away
  })

  it('keeps antimeridian countries within a sane longitude span', () => {
    const gj = JSON.parse(fs.readFileSync(GEOJSON, 'utf8')) as {
      features: { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[]
    }
    const russia = gj.features.find((f) => String(f.properties['ADMIN']) === 'Russia')
    expect(russia).toBeTruthy()

    const polys = russia!.geometry.coordinates as number[][][][]
    for (const poly of polys) {
      const un = unwrapRing(poly[0])
      const lngs = un.map((p) => p[0])
      // No single part of Russia genuinely spans more than half the planet;
      // before unwrapping, the far-eastern parts appeared to span ~358°.
      expect(Math.max(...lngs) - Math.min(...lngs)).toBeLessThan(180)
    }
  })
})
