import { describe, it, expect } from 'vitest'
import {
  EARTH_DETAIL_THRESHOLD, EARTH_MARKER_THRESHOLD, EARTH_HOME_DISTANCE,
  TIER_TO_ORBITAL, TIER_TO_SURFACE,
  bodyMinDistance, bodyViewDistance, orbitRotateSpeed, ROTATE_MIN_SPEED,
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
  it('is inside the detail threshold, so borders and fills are live on arrival', () => {
    expect(EARTH_HOME_DISTANCE).toBeLessThan(EARTH_DETAIL_THRESHOLD)
  })

  it('is outside the marker threshold, so markers do not bury the globe', () => {
    // Markers are screen-space sized and do not shrink with the camera. At the
    // home distance a marker covers roughly a fifth of the globe, and a few
    // dozen of them hide the planet entirely. The far view is carried by the
    // choropleth instead; markers resolve once the operator pushes in.
    expect(EARTH_HOME_DISTANCE).toBeGreaterThan(EARTH_MARKER_THRESHOLD)
  })

  it('is outside the surface tier, so markers would still cluster if shown', () => {
    expect(EARTH_HOME_DISTANCE).toBeGreaterThan(TIER_TO_SURFACE)
  })

  it('shows markers when the operator explicitly focuses Earth', () => {
    // Clicking Earth tweens to bodyViewDistance with a small elevation. That
    // has to land inside the marker threshold, or focusing Earth would still
    // show no events and the layer would be unreachable by normal navigation.
    const view = bodyViewDistance('earth')
    const focusDistance = Math.hypot(view * 0.25, view)
    expect(focusDistance).toBeLessThan(EARTH_MARKER_THRESHOLD)
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
    expect(EARTH_MARKER_THRESHOLD).toBeLessThan(TIER_TO_SURFACE)
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

/**
 * OrbitControls turns a drag into a fixed angle whatever the distance, which
 * is wrong up close: the same angle sweeps far more of the visible surface, so
 * a nudge throws the view across the globe. These pin the ramp that fixes it.
 */
describe('orbit rotation speed', () => {
  const EARTH_R = 1.0

  it('runs at full speed far out, so distant orbiting is unchanged', () => {
    expect(orbitRotateSpeed(EARTH_HOME_DISTANCE, EARTH_R)).toBe(1)
    expect(orbitRotateSpeed(EARTH_DETAIL_THRESHOLD, EARTH_R)).toBe(1)
    expect(orbitRotateSpeed(500, EARTH_R)).toBe(1)
  })

  it('slows down as the surface comes up', () => {
    const far    = orbitRotateSpeed(6, EARTH_R)
    const mid    = orbitRotateSpeed(3, EARTH_R)
    const close  = orbitRotateSpeed(1.5, EARTH_R)
    expect(far).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(close)
  })

  it('is monotonic in distance — never speeds up as you approach', () => {
    let prev = orbitRotateSpeed(1.0, EARTH_R)
    for (let d = 1.05; d <= 12; d += 0.05) {
      const s = orbitRotateSpeed(d, EARTH_R)
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = s
    }
  })

  it('never reaches zero, so skimming the surface still allows movement', () => {
    // Right at, and even below, the closest the camera may legally come.
    for (const d of [bodyMinDistance('earth'), EARTH_R, 0]) {
      expect(orbitRotateSpeed(d, EARTH_R)).toBeGreaterThanOrEqual(ROTATE_MIN_SPEED)
    }
  })

  it('is capped at 1, so it can only ever slow rotation down', () => {
    for (const d of [0, 1, 10, 1e6]) {
      expect(orbitRotateSpeed(d, EARTH_R)).toBeLessThanOrEqual(1)
    }
  })

  it('scales by body size rather than absolute distance', () => {
    // The same absolute gap is a skim of a big body and a distant view of a
    // small one, and should not produce the same speed.
    const big   = orbitRotateSpeed(5.5, 5.0)   // 0.5 above a sun-sized body
    const small = orbitRotateSpeed(5.5, 0.2)   // far above a moon-sized one
    expect(big).toBeLessThan(small)
    expect(small).toBe(1)
  })

  it('falls back to full speed on nonsense input rather than freezing the camera', () => {
    expect(orbitRotateSpeed(NaN, EARTH_R)).toBe(1)
    expect(orbitRotateSpeed(5, 0)).toBe(1)
    expect(orbitRotateSpeed(5, -1)).toBe(1)
  })

  it('gives the Earth focus distance a usable speed', () => {
    // bodyViewDistance('earth') is where focusing lands; it should not arrive
    // already crawling.
    expect(orbitRotateSpeed(bodyViewDistance('earth'), EARTH_R)).toBeGreaterThan(0.9)
  })
})
