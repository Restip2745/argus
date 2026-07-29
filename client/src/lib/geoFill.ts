/**
 * Geodesic polygon fills.
 *
 * Filling a country on a globe is not the same as filling it on a map. Two
 * things go wrong if you triangulate in lng/lat space and project the result:
 *
 * 1. CHORD SAG. Every triangle becomes a flat plane cutting through the sphere.
 *    A triangle spanning angular distance θ sags below the surface by
 *    R·(1 − cos(θ/2)) at its centre. With the fill sitting 0.003 above a unit
 *    Earth, anything spanning more than ~9° sinks under the terrain and the
 *    globe pokes through the middle of the fill.
 *
 * 2. ANTIMERIDIAN WRAP. A ring with points at both +179 and −179 is treated as
 *    spanning 358° of longitude, so it triangulates into a band stretching the
 *    wrong way around the entire planet.
 *
 * This module fixes both: rings are unwrapped into a continuous longitude frame
 * before triangulation, and triangles are recursively subdivided until every
 * edge is short enough that the remaining sag is far below the surface offset.
 */

/** Angular distance in degrees between two lng/lat points, on the unit sphere. */
export function angularDistanceDeg(
  aLng: number, aLat: number,
  bLng: number, bLat: number,
): number {
  const toRad = Math.PI / 180
  const φ1 = aLat * toRad, φ2 = bLat * toRad
  const dφ = (bLat - aLat) * toRad
  const dλ = (bLng - aLng) * toRad
  const h =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / toRad
}

/**
 * Shift longitudes into a continuous frame so a ring that crosses ±180 does not
 * appear to span the whole planet.
 *
 * Walks the ring and, whenever consecutive points jump more than 180°, adds or
 * subtracts a full turn to keep the path continuous. The result may contain
 * longitudes outside [-180, 180] — that is intentional and harmless, because
 * the projection is periodic in longitude.
 */
export function unwrapRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring
  const out: number[][] = [ring[0].slice()]
  let offset = 0

  for (let i = 1; i < ring.length; i++) {
    const prevRaw = ring[i - 1][0]
    const curRaw  = ring[i][0]
    const delta   = curRaw - prevRaw
    if (delta > 180) offset -= 360
    else if (delta < -180) offset += 360
    out.push([curRaw + offset, ring[i][1]])
  }
  return out
}

/** Does any consecutive pair in the ring jump more than 180° of longitude? */
export function ringCrossesAntimeridian(ring: number[][]): boolean {
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) return true
  }
  return false
}

/** Project lng/lat to Cartesian — must match `lib/coordinates.latLngToLocal`. */
export function project(lngDeg: number, latDeg: number, R: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180
  const lng = (lngDeg * Math.PI) / 180
  const cosLat = Math.cos(lat)
  return [
    R * cosLat * Math.cos(lng),
    R * Math.sin(lat),
    -R * cosLat * Math.sin(lng),
  ]
}

export interface SubdivideOptions {
  /** Subdivide until every edge is shorter than this, in degrees of arc. */
  maxEdgeDeg?: number
  /** Hard recursion bound, so a pathological polygon cannot hang the frame. */
  maxDepth?: number
}

const DEFAULT_MAX_EDGE_DEG = 4
const DEFAULT_MAX_DEPTH    = 6

/**
 * Emit a triangle as a set of sphere-hugging sub-triangles.
 *
 * Vertices are given in lng/lat and every emitted vertex lands exactly on the
 * sphere of the given radius. Subdividing shortens the chords, so the surface
 * the triangles describe converges onto the sphere from above rather than
 * cutting through it.
 */
export function emitSubdividedTriangle(
  a: [number, number],   // [lng, lat]
  b: [number, number],
  c: [number, number],
  radius: number,
  out: number[],
  opts: SubdivideOptions = {},
): void {
  const maxEdge = opts.maxEdgeDeg ?? DEFAULT_MAX_EDGE_DEG
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH

  const recurse = (
    p: [number, number], q: [number, number], r: [number, number],
    depth: number,
  ): void => {
    if (depth < maxDepth) {
      const pq = angularDistanceDeg(p[0], p[1], q[0], q[1])
      const qr = angularDistanceDeg(q[0], q[1], r[0], r[1])
      const rp = angularDistanceDeg(r[0], r[1], p[0], p[1])
      if (Math.max(pq, qr, rp) > maxEdge) {
        const mpq: [number, number] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
        const mqr: [number, number] = [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2]
        const mrp: [number, number] = [(r[0] + p[0]) / 2, (r[1] + p[1]) / 2]
        recurse(p, mpq, mrp, depth + 1)
        recurse(mpq, q, mqr, depth + 1)
        recurse(mrp, mqr, r, depth + 1)
        recurse(mpq, mqr, mrp, depth + 1)
        return
      }
    }
    for (const v of [p, q, r]) {
      const [x, y, z] = project(v[0], v[1], radius)
      out.push(x, y, z)
    }
  }

  recurse(a, b, c, 0)
}

/**
 * Largest angular span a triangle may have before its centre sinks below a
 * sphere of radius `surfaceR`, given the fill sits at `fillR`.
 *
 * Exposed so the subdivision threshold can be checked against the radii the
 * scene actually uses rather than trusting a hard-coded 4°.
 */
export function maxSafeSpanDeg(fillR: number, surfaceR: number): number {
  if (fillR <= surfaceR) return 0
  const ratio = surfaceR / fillR
  return (2 * Math.acos(Math.min(1, ratio)) * 180) / Math.PI
}
