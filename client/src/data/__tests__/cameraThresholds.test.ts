import { describe, it, expect } from 'vitest'
import {
  EARTH_DETAIL_THRESHOLD, EARTH_HOME_DISTANCE,
  TIER_TO_ORBITAL, TIER_TO_SURFACE,
  bodyMinDistance,
} from '../celestialBodies'
import { determineNavLevel } from '../../config/navLevels'

/**
 * The Earth home view is a single number that has to satisfy four independent
 * constraints at once. None of them are visible from the value itself, and the
 * failure mode is quiet — the camera lands somewhere that half-works, with the
 * political layer on but markers uncollapsed, or the nav list showing the wrong
 * level. These assertions are the reasoning behind the number.
 */
describe('Earth home view distance', () => {
  it('is inside the detail threshold, so layers and markers are live on arrival', () => {
    expect(EARTH_HOME_DISTANCE).toBeLessThan(EARTH_DETAIL_THRESHOLD)
  })

  it('is outside the surface tier, so markers still cluster on arrival', () => {
    // Landing at tier 2 would render every event as its own uncollapsed pin.
    expect(EARTH_HOME_DISTANCE).toBeGreaterThan(TIER_TO_SURFACE)
  })

  it('is inside the orbital tier, not the solar tier', () => {
    expect(EARTH_HOME_DISTANCE).toBeLessThan(TIER_TO_ORBITAL)
  })

  it('is outside Earth itself, so the camera cannot start inside the globe', () => {
    expect(EARTH_HOME_DISTANCE).toBeGreaterThan(bodyMinDistance('earth'))
  })

  it('resolves to the orbital nav level, so the nav list offers Earth and its moons', () => {
    expect(determineNavLevel(EARTH_HOME_DISTANCE).id).toBe('orbital')
  })
})

describe('camera threshold ladder', () => {
  it('is strictly ordered', () => {
    expect(TIER_TO_SURFACE).toBeLessThan(EARTH_DETAIL_THRESHOLD)
    expect(EARTH_DETAIL_THRESHOLD).toBeLessThan(TIER_TO_ORBITAL)
  })

  it('keeps the detail threshold inside the orbital tier', () => {
    // If detail switched on only after clustering had already collapsed to the
    // solar tier, there would be a band where the globe is close but empty.
    expect(EARTH_DETAIL_THRESHOLD).toBeLessThanOrEqual(TIER_TO_ORBITAL)
  })

  it('puts the marker solar tier and the nav solar level at the same boundary', () => {
    // Crossing TIER_TO_ORBITAL should flip the markers to solar clustering and
    // the nav list to the solar body list together. If these two drifted apart
    // there would be a band where the nav says SOLAR SYSTEM while the markers
    // are still clustering at orbital radius, or vice versa.
    expect(determineNavLevel(TIER_TO_ORBITAL).id).toBe('solar')
    expect(determineNavLevel(TIER_TO_ORBITAL - 0.01).id).toBe('orbital')
  })

  it('resolves the extremes as expected', () => {
    expect(determineNavLevel(200).id).toBe('solar')
    expect(determineNavLevel(1).id).toBe('surface')
  })
})
