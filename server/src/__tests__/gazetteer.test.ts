/**
 * Roughly half of all analysed geo events arrive with a usable location label
 * but no coordinates, so the gazetteer is what decides whether they reach the
 * globe. These cover the two failure modes that matter: refusing to place an
 * event we cannot place, and never placing one in the wrong country.
 */
import { describe, it, expect } from 'vitest'
import { resolveLocation, resolvePlaceKey, getCentroid, _internals } from '../data/gazetteer'

const { PLACES, ALIASES } = _internals

describe('gazetteer — table integrity', () => {
  it('every alias points at a real place', () => {
    const dangling = Object.entries(ALIASES).filter(([, key]) => !PLACES[key])
    expect(dangling).toEqual([])
  })

  it('every centroid is on Earth', () => {
    const bad = Object.entries(PLACES).filter(
      ([, [lat, lng]]) => lat < -90 || lat > 90 || lng < -180 || lng > 180,
    )
    expect(bad).toEqual([])
  })
})

describe('resolvePlaceKey — direction of containment', () => {
  // The old client-side matcher tested containment in both directions, so
  // "somalia".includes("mali") placed every Mali story ~5,000 km away in
  // Somalia. A key must be found inside the label, never the reverse.
  it('does not resolve a short label into a longer key', () => {
    expect(resolvePlaceKey('Mali')).toBe('Mali')
    expect(getCentroid('Mali')).toEqual({ lat: 17.6, lng: -4.0 })
  })

  it('does not resolve a continent into a country that contains its name', () => {
    // "Africa" used to land on South Africa.
    expect(resolveLocation('Africa', null, null).precision).toBe('region')
    expect(resolveLocation('Africa', null, null).lat).toBeNull()
  })

  it('respects word boundaries', () => {
    // "Nigeria".includes("Niger") is true, but they are different countries.
    expect(resolvePlaceKey('Niger')).toBe('Niger')
    expect(resolvePlaceKey('Nigeria')).toBe('Nigeria')
  })

  it('prefers the longest matching key', () => {
    expect(resolvePlaceKey('northern South Africa')).toBe('South Africa')
    expect(resolvePlaceKey('Unrest in New York State')).toBe('New York State')
  })
})

describe('resolvePlaceKey — compound and qualified labels', () => {
  it('reads the most specific part of a comma list', () => {
    expect(resolvePlaceKey('Cali, Colombia')).toBe('Cali')
    expect(resolvePlaceKey('Nonthaburi, Thailand')).toBe('Thailand')
  })

  it('takes the first resolvable side of a joined label', () => {
    expect(resolvePlaceKey('Israel/Palestine')).toBe('Israel')
    expect(resolvePlaceKey('Nigeria and Niger')).toBe('Nigeria')
    expect(resolvePlaceKey('Gaza Strip / Israel')).toBe('Gaza')
  })

  it('does not split hyphenated single names', () => {
    expect(resolvePlaceKey('Timor-Leste')).toBe('Timor-Leste')
    expect(resolvePlaceKey('Nagorno-Karabakh')).toBe('Nagorno-Karabakh')
  })

  it('strips directional and possessive qualifiers', () => {
    expect(resolvePlaceKey('Eastern Ukraine')).toBe('Ukraine')
    expect(resolvePlaceKey('Northeast India')).toBe('India')
    expect(resolvePlaceKey('West of England')).toBe('England')
    expect(resolvePlaceKey('Pakistan-administered Kashmir')).toBe('Kashmir')
  })
})

describe('resolvePlaceKey — aliases', () => {
  it('resolves the spellings the model actually emits', () => {
    // The canonical key is 'Dem. Rep. Congo', which no model ever writes.
    expect(resolvePlaceKey('Democratic Republic of Congo')).toBe('Dem. Rep. Congo')
    expect(resolvePlaceKey('DR Congo')).toBe('Dem. Rep. Congo')
    expect(resolvePlaceKey('United States')).toBe('United States of America')
    expect(resolvePlaceKey('Czech Republic')).toBe('Czechia')
    expect(resolvePlaceKey('Burma')).toBe('Myanmar')
  })

  it('resolves Chinese labels the model leaks despite the English prompt', () => {
    expect(getCentroid('霍爾木茲海峽')).toEqual({ lat: 26.6, lng: 56.3 })
    expect(resolvePlaceKey('波斯灣/霍爾木茲海峽')).toBe('波斯灣')
  })
})

describe('resolveLocation — precision', () => {
  it('keeps model coordinates when they are usable', () => {
    const r = resolveLocation('Ukraine', 48.4, 37.8)
    expect(r).toEqual({ lat: 48.4, lng: 37.8, precision: 'exact', key: null })
  })

  it('rejects Null Island and out-of-range coordinates', () => {
    // 0,0 is what a model emits when it means "I don't know".
    expect(resolveLocation('Thailand', 0, 0).precision).toBe('centroid')
    expect(resolveLocation('Thailand', 999, 12).precision).toBe('centroid')
    expect(resolveLocation('Thailand', null, null).precision).toBe('centroid')
  })

  it('falls back to the centroid when only a label survives', () => {
    const r = resolveLocation('Strait of Hormuz', null, null)
    expect(r.precision).toBe('centroid')
    expect(r.key).toBe('Strait of Hormuz')
    expect(r.lat).toBeCloseTo(26.6)
  })

  // A pin is a claim about a point. These labels do not name one, and putting
  // them on the globe anyway is worse than leaving them off it.
  it('marks scope words as region rather than guessing a point', () => {
    for (const label of [
      'Global Tech Sector',
      'International Football Governance',
      'Europe',
      'Middle East',
      'Pacific Ocean',
      'Arctic and Antarctic Poles',
      'Global Oceans/Western Europe',
    ]) {
      const r = resolveLocation(label, null, null)
      expect({ label, precision: r.precision }).toEqual({ label, precision: 'region' })
      expect(r.lat).toBeNull()
    }
  })

  it('prefers a real place over a region when the label carries both', () => {
    expect(resolveLocation('Gaza Strip / Israel', null, null).precision).toBe('centroid')
  })

  it('reports none for an empty or unresolvable label', () => {
    expect(resolveLocation('', null, null).precision).toBe('none')
    expect(resolveLocation(null, null, null).precision).toBe('none')
    expect(resolveLocation('Meroë', null, null).precision).toBe('none')
  })

  // "N/A" is the model admitting it does not know, which is `none`. Filing it
  // as `region` would claim there is an area when there is only a gap.
  it('separates placeholders from real areas', () => {
    expect(resolveLocation('N/A', null, null).precision).toBe('none')
    expect(resolveLocation('Unknown', null, null).precision).toBe('none')
    expect(resolveLocation('Europe', null, null).precision).toBe('region')
  })
})
