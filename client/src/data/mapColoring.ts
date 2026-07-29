/**
 * Neutral map colouring — the four-colour-theorem trick, used for legibility
 * rather than meaning.
 *
 * The problem this solves is narrow: on a dark globe, adjacent countries drawn
 * with outlines alone are hard to separate at a glance. The problem it must NOT
 * solve is identity — a country's shape already identifies it uniquely, and
 * spending hue on identity would collide with the severity ramp, which owns
 * colour everywhere else in the app (see `data/symbology.ts`).
 *
 * So the palette is deliberately desaturated and close in value: enough
 * separation to read a border, not enough to compete with a CRITICAL marker.
 *
 * Adjacency is approximated by bounding-box overlap. That over-approximates —
 * some non-neighbours are treated as neighbours — which costs a colour or two
 * but can never let two true neighbours share one, because the bounding boxes
 * of two polygons that share a border always intersect. Correctness in the
 * direction that matters is guaranteed; palette economy is not.
 */

export interface BBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

/** Desaturated slate/olive/taupe. Varied in value as well as hue, because on a
 *  busy satellite texture luminance separates better than hue does. */
export const NEUTRAL_FILLS = [
  '#3b4a58',
  '#4a4a3d',
  '#3f3a4a',
  '#33474a',
  '#4c4340',
  '#3a4440',
] as const

export type GeometryLike = {
  type: string
  coordinates: unknown
}

function polygonParts(geometry: GeometryLike): number[][][][] {
  const polys =
    geometry.type === 'Polygon'
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][])
  return Array.isArray(polys) ? polys : []
}

function ringsBBox(rings: number[][][]): BBox | null {
  let minLng = Infinity, minLat = Infinity
  let maxLng = -Infinity, maxLat = -Infinity
  for (const ring of rings) {
    if (!Array.isArray(ring)) continue
    for (const pt of ring) {
      const lng = pt[0], lat = pt[1]
      if (typeof lng !== 'number' || typeof lat !== 'number') continue
      if (lng < minLng) minLng = lng
      if (lat < minLat) minLat = lat
      if (lng > maxLng) maxLng = lng
      if (lat > maxLat) maxLat = lat
    }
  }
  if (!isFinite(minLng) || !isFinite(minLat)) return null
  return { minLng, minLat, maxLng, maxLat }
}

/** Union bounding box of a whole Polygon / MultiPolygon. */
export function geometryBBox(geometry: GeometryLike): BBox | null {
  const boxes = geometryBBoxes(geometry)
  if (boxes.length === 0) return null
  return boxes.reduce((a, b) => ({
    minLng: Math.min(a.minLng, b.minLng),
    minLat: Math.min(a.minLat, b.minLat),
    maxLng: Math.max(a.maxLng, b.maxLng),
    maxLat: Math.max(a.maxLat, b.maxLat),
  }))
}

/**
 * One bounding box per polygon part.
 *
 * A single union box is useless for countries with distant territory: Russia's
 * far-eastern polygons cross the antimeridian, so its union box spans the
 * entire globe and would be treated as adjacent to almost everything. The same
 * applies to the US (Alaska, Hawaii), France (overseas départements) and New
 * Zealand. Per-part boxes keep the adjacency approximation tight enough to be
 * useful.
 */
export function geometryBBoxes(geometry: GeometryLike): BBox[] {
  const out: BBox[] = []
  for (const poly of polygonParts(geometry)) {
    if (!Array.isArray(poly)) continue
    const b = ringsBBox(poly)
    if (b) out.push(b)
  }
  return out
}

/** Do two boxes touch or overlap, allowing a small tolerance in degrees? */
export function bboxTouches(a: BBox, b: BBox, pad = 0.5): boolean {
  return !(
    a.maxLng + pad < b.minLng ||
    b.maxLng + pad < a.minLng ||
    a.maxLat + pad < b.minLat ||
    b.maxLat + pad < a.minLat
  )
}

export interface ColorableRegion {
  /** Stable identifier — colouring is keyed and ordered by this, so the same
   *  dataset always produces the same colours across reloads. */
  id: string
  /** One box per disjoint part. Two regions are neighbours if any part of one
   *  touches any part of the other. */
  bboxes: BBox[]
}

/** Do any parts of two regions touch? */
export function regionsTouch(a: ColorableRegion, b: ColorableRegion, pad = 0.5): boolean {
  for (const ba of a.bboxes) {
    for (const bb of b.bboxes) {
      if (bboxTouches(ba, bb, pad)) return true
    }
  }
  return false
}

/**
 * Welsh–Powell greedy colouring: order by descending degree, then give each
 * region the lowest-indexed colour not used by an already-coloured neighbour.
 *
 * Ties are broken by id so the result is deterministic — a map whose colours
 * shuffle between reloads would be worse than no colouring at all.
 */
export function assignRegionColors(
  regions: ColorableRegion[],
  palette: readonly string[] = NEUTRAL_FILLS,
): Map<string, string> {
  const result = new Map<string, string>()
  if (regions.length === 0 || palette.length === 0) return result

  const sorted = [...regions].sort((a, b) => a.id.localeCompare(b.id))
  const n = sorted.length

  // Adjacency via per-part bbox overlap.
  const neighbours: number[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (regionsTouch(sorted[i], sorted[j])) {
        neighbours[i].push(j)
        neighbours[j].push(i)
      }
    }
  }

  const order = sorted
    .map((_, i) => i)
    .sort((a, b) =>
      neighbours[b].length - neighbours[a].length ||
      sorted[a].id.localeCompare(sorted[b].id),
    )

  const colorIdx = new Array<number>(n).fill(-1)
  for (const i of order) {
    const usage = new Array<number>(palette.length).fill(0)
    for (const nb of neighbours[i]) {
      if (colorIdx[nb] !== -1) usage[colorIdx[nb]]++
    }
    let best = 0
    for (let c = 0; c < palette.length; c++) {
      if (usage[c] === 0) { best = c; break }
      // If nothing is free, fall back to whichever colour the fewest already
      // coloured neighbours are using, rather than always colliding on index 0.
      if (usage[c] < usage[best]) best = c
    }
    colorIdx[i] = best
  }

  for (let i = 0; i < n; i++) {
    result.set(sorted[i].id, palette[colorIdx[i]])
  }
  return result
}
