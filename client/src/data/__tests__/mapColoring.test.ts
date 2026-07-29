import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assignRegionColors, bboxTouches, geometryBBox, geometryBBoxes, regionsTouch, NEUTRAL_FILLS,
  type ColorableRegion,
} from '../mapColoring'
import { SEVERITY_COLOR } from '../symbology'

const GEOJSON = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../public/geodata/ne_110m_admin_0_countries.geojson',
)

function box(minLng: number, minLat: number, maxLng: number, maxLat: number) {
  return { minLng, minLat, maxLng, maxLat }
}

/** Regions laid out in a row, each touching the next. */
function strip(count: number): ColorableRegion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${String(i).padStart(3, '0')}`,
    bboxes: [box(i * 10, 0, i * 10 + 10, 10)],
  }))
}

describe('geometryBBox', () => {
  it('bounds a Polygon', () => {
    expect(geometryBBox({
      type: 'Polygon',
      coordinates: [[[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]]],
    })).toEqual(box(0, 0, 4, 3))
  })

  it('bounds a MultiPolygon across all parts', () => {
    expect(geometryBBox({
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        [[[8, 5], [9, 5], [9, 7], [8, 5]]],
      ],
    })).toEqual(box(0, 0, 9, 7))
  })

  it('returns null for empty or malformed geometry', () => {
    expect(geometryBBox({ type: 'Polygon', coordinates: [] })).toBeNull()
    expect(geometryBBox({ type: 'Polygon', coordinates: 'nonsense' })).toBeNull()
  })
})

describe('bboxTouches', () => {
  it('detects overlap and separation', () => {
    expect(bboxTouches(box(0, 0, 10, 10), box(5, 5, 15, 15))).toBe(true)
    expect(bboxTouches(box(0, 0, 10, 10), box(50, 50, 60, 60))).toBe(false)
  })

  it('treats a shared edge as touching', () => {
    // Two countries sharing a border have bounding boxes that meet exactly.
    expect(bboxTouches(box(0, 0, 10, 10), box(10, 0, 20, 10))).toBe(true)
  })
})

describe('assignRegionColors', () => {
  it('never gives two adjacent regions the same colour', () => {
    const regions = strip(40)
    const colors = assignRegionColors(regions)

    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        if (!regionsTouch(regions[i], regions[j])) continue
        expect(colors.get(regions[i].id)).not.toBe(colors.get(regions[j].id))
      }
    }
  })

  it('holds on a dense grid where every cell touches its neighbours', () => {
    const regions: ColorableRegion[] = []
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        regions.push({ id: `c${x}-${y}`, bboxes: [box(x * 10, y * 10, x * 10 + 10, y * 10 + 10)] })
      }
    }
    const colors = assignRegionColors(regions)

    let checked = 0
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        if (!regionsTouch(regions[i], regions[j])) continue
        checked++
        expect(colors.get(regions[i].id)).not.toBe(colors.get(regions[j].id))
      }
    }
    expect(checked).toBeGreaterThan(100)   // the grid really is dense
  })

  it('is deterministic — the same input yields the same colours', () => {
    const a = assignRegionColors(strip(25))
    const b = assignRegionColors([...strip(25)].reverse())
    for (const [id, color] of a) expect(b.get(id)).toBe(color)
  })

  it('colours every region it is given', () => {
    const regions = strip(30)
    const colors = assignRegionColors(regions)
    expect(colors.size).toBe(regions.length)
    for (const r of regions) expect(colors.get(r.id)).toBeTruthy()
  })

  it('handles empty input and an empty palette without throwing', () => {
    expect(assignRegionColors([]).size).toBe(0)
    expect(assignRegionColors(strip(3), []).size).toBe(0)
  })

  it('keeps the neutral palette clear of the severity ramp', () => {
    // The whole point of neutral fills is that they do not compete with the
    // channel that means "how alarmed should I be".
    const severity = new Set(Object.values(SEVERITY_COLOR).map((c) => c.toLowerCase()))
    for (const fill of NEUTRAL_FILLS) {
      expect(severity.has(fill.toLowerCase())).toBe(false)
    }
  })

  it('separates every neighbour in the real Natural Earth dataset', () => {
    // Synthetic grids are the easy case. This is the map the app actually
    // loads, with enclaves, exclaves and slivers.
    const gj = JSON.parse(fs.readFileSync(GEOJSON, 'utf8')) as {
      features: { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[]
    }

    const regions: ColorableRegion[] = []
    for (const f of gj.features) {
      const bboxes = geometryBBoxes(f.geometry)
      const id = (f.properties['ADM0_A3'] ?? f.properties['ADMIN'] ?? f.properties['NAME']) as string
      if (bboxes.length && id) regions.push({ id, bboxes })
    }
    expect(regions.length).toBeGreaterThan(150)

    const colors = assignRegionColors(regions)
    let pairs = 0
    const conflicts: string[] = []
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        if (!regionsTouch(regions[i], regions[j])) continue
        pairs++
        if (colors.get(regions[i].id) === colors.get(regions[j].id)) {
          conflicts.push(`${regions[i].id}/${regions[j].id}`)
        }
      }
    }

    // Enough real adjacency to be a meaningful test. Using one union box per
    // country instead of one per part inflates this past 500 with false
    // neighbours — Russia's box alone would span the globe — and the greedy
    // then exhausts the palette and collides (RUS/MKD was the observed case).
    expect(pairs).toBeGreaterThan(300)
    expect(conflicts, `same-colour neighbours: ${conflicts.slice(0, 10).join(', ')}`).toEqual([])
  })

  it('uses a palette that is desaturated and dark enough to sit under markers', () => {
    for (const fill of NEUTRAL_FILLS) {
      const r = parseInt(fill.slice(1, 3), 16)
      const g = parseInt(fill.slice(3, 5), 16)
      const b = parseInt(fill.slice(5, 7), 16)
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const saturation = max === 0 ? 0 : (max - min) / max
      expect(saturation).toBeLessThan(0.35)   // muted
      expect(max).toBeLessThan(0x60)          // dark
    }
  })
})
