import { describe, it, expect } from 'vitest'
import { buildRenderedScene } from '../conflictGeometry'
import type { ConflictFeature } from '../../../hooks/useConflictLayer'

function feature(
  type: ConflictFeature['geometry']['type'],
  coordinates: ConflictFeature['geometry']['coordinates'],
  properties: ConflictFeature['properties'] = {},
): ConflictFeature {
  return { type: 'Feature', properties, geometry: { type, coordinates } }
}

const SQUARE = [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]

describe('buildRenderedScene', () => {
  it('builds border and fill geometry for a polygon', () => {
    const { shapes, points } = buildRenderedScene([feature('Polygon', SQUARE)])
    expect(points).toHaveLength(0)
    expect(shapes).toHaveLength(1)
    expect(shapes[0].isLine).toBe(false)
    expect(shapes[0].lineGeo).not.toBeNull()
    expect(shapes[0].fillGeo).not.toBeNull()
  })

  it('builds line geometry without a fill for a LineString', () => {
    const { shapes } = buildRenderedScene([feature('LineString', [[30, 50], [31, 51]])])
    expect(shapes[0].isLine).toBe(true)
    expect(shapes[0].lineGeo).not.toBeNull()
    expect(shapes[0].fillGeo).toBeNull()
  })

  it('renders Point features as points rather than shapes', () => {
    const { shapes, points } = buildRenderedScene([feature('Point', [30, 50])])
    expect(shapes).toHaveLength(0)
    expect(points).toHaveLength(1)
    expect(points[0].count).toBe(1)
  })

  it('expands MultiPoint into one position per coordinate', () => {
    const { points } = buildRenderedScene([feature('MultiPoint', [[30, 50], [31, 51], [32, 52]])])
    expect(points).toHaveLength(1)
    expect(points[0].count).toBe(3)
    expect(points[0].geo.getAttribute('position').count).toBe(3)
  })

  it('batches points of the same control colour into one geometry', () => {
    const { points } = buildRenderedScene([
      feature('Point', [30, 50], { control: 'strike' }),
      feature('Point', [31, 51], { control: 'strike' }),
      feature('Point', [32, 52], { control: 'russia' }),
    ])
    expect(points).toHaveLength(2)
    expect(points.find(p => p.count === 2)).toBeDefined()
    expect(points.find(p => p.count === 1)).toBeDefined()
  })

  it('tolerates a 3-element Point coordinate', () => {
    const { points } = buildRenderedScene([feature('Point', [30, 50, 0])])
    expect(points[0].count).toBe(1)
  })

  it('drops features whose geometry type it cannot render', () => {
    const bogus = feature('GeometryCollection' as ConflictFeature['geometry']['type'], [])
    const { shapes, points } = buildRenderedScene([bogus])
    expect(shapes).toEqual([])
    expect(points).toEqual([])
  })

  it('survives malformed coordinates instead of throwing', () => {
    const malformed: ConflictFeature[] = [
      feature('Point', null as unknown as number[]),
      feature('Point', ['a', 'b'] as unknown as number[]),
      feature('Polygon', [30, 50] as unknown as number[][][]),
      feature('Polygon', [[[0, 0], [1, 0]]]),               // too few points to fill
      feature('LineString', [[0, 0], null] as unknown as number[][]),
      feature('MultiLineString', null as unknown as number[][][]),
    ]
    expect(() => buildRenderedScene(malformed)).not.toThrow()
    const { shapes, points } = buildRenderedScene(malformed)
    expect(points).toEqual([])
    expect(shapes.every(s => s.fillGeo === null)).toBe(true)
  })

  it('colours features by their control property', () => {
    const { shapes } = buildRenderedScene([
      feature('Polygon', SQUARE, { control: 'russia' }),
      feature('Polygon', SQUARE, { control: 'unmapped-value' }),
    ])
    expect(shapes[0].colors.line).toBe('#dd2222')
    expect(shapes[1].colors.line).toBe('#ff6600')
  })
})
