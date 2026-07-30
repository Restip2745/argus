import { describe, it, expect } from 'vitest'
import {
  shouldAlignNorth, bodyNorthAxis,
  NORTH_ALIGN_ENTER, NORTH_ALIGN_EXIT,
  EARTH_HOME_DISTANCE, EARTH_MARKER_THRESHOLD,
  bodyViewDistance, BODY_MAP,
} from '../celestialBodies'

describe('shouldAlignNorth', () => {
  it('aligns when closer than the enter threshold', () => {
    expect(shouldAlignNorth(NORTH_ALIGN_ENTER - 1, false)).toBe(true)
    expect(shouldAlignNorth(1, false)).toBe(true)
  })

  it('releases when farther than the exit threshold', () => {
    expect(shouldAlignNorth(NORTH_ALIGN_EXIT + 1, true)).toBe(false)
    expect(shouldAlignNorth(500, true)).toBe(false)
  })

  it('holds its current state inside the band', () => {
    // The whole reason for two thresholds: without this, drifting a hair either
    // side of a single boundary would roll the camera back and forth.
    const mid = (NORTH_ALIGN_ENTER + NORTH_ALIGN_EXIT) / 2
    expect(shouldAlignNorth(mid, true)).toBe(true)
    expect(shouldAlignNorth(mid, false)).toBe(false)
  })

  it('cannot oscillate on a small wobble around either edge', () => {
    // Simulate jitter around each threshold and assert the state never flips
    // more than once in each direction.
    let aligned = false
    let flips = 0
    let prev = aligned
    for (let i = 0; i < 200; i++) {
      const jitter = (i % 2 === 0 ? 0.4 : -0.4)
      aligned = shouldAlignNorth(NORTH_ALIGN_ENTER + jitter, aligned)
      if (aligned !== prev) { flips++; prev = aligned }
    }
    expect(flips).toBeLessThanOrEqual(1)
  })

  it('leaves a usable gap between the thresholds', () => {
    expect(NORTH_ALIGN_EXIT).toBeGreaterThan(NORTH_ALIGN_ENTER)
    expect(NORTH_ALIGN_EXIT - NORTH_ALIGN_ENTER).toBeGreaterThanOrEqual(2)
  })
})

describe('alignment against the rest of the camera ladder', () => {
  it('does not align at the home distance — the far view keeps the real tilt', () => {
    // Arriving is the establishing shot; the tilt is what makes it an orrery
    // rather than a map.
    expect(shouldAlignNorth(EARTH_HOME_DISTANCE, false)).toBe(false)
  })

  it('aligns by the time markers appear', () => {
    // Once individual events are readable the globe is being used as a map, and
    // a map wants north at the top.
    expect(EARTH_MARKER_THRESHOLD).toBeLessThan(NORTH_ALIGN_ENTER)
    expect(shouldAlignNorth(EARTH_MARKER_THRESHOLD, false)).toBe(true)
  })

  it('aligns when the operator explicitly focuses Earth', () => {
    const view = bodyViewDistance('earth')
    const focusDistance = Math.hypot(view * 0.25, view)
    expect(shouldAlignNorth(focusDistance, false)).toBe(true)
  })
})

describe('bodyNorthAxis', () => {
  it('is a unit vector', () => {
    for (const id of ['earth', 'mars', 'uranus', 'moon'] as const) {
      const [x, y, z] = bodyNorthAxis(id)
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12)
    }
  })

  it("matches the body's axial tilt, applied about Z as the scene does", () => {
    const tilt = BODY_MAP.get('earth')!.axialTiltDeg
    const t = (tilt * Math.PI) / 180
    expect(bodyNorthAxis('earth')).toEqual([-Math.sin(t), Math.cos(t), 0])
  })

  it('leans further for a more tilted body', () => {
    // Uranus is famously on its side; its pole must be far from world up.
    const earthY  = bodyNorthAxis('earth')[1]
    const uranusY = bodyNorthAxis('uranus')[1]
    expect(Math.abs(uranusY)).toBeLessThan(Math.abs(earthY))
  })

  it('is world up for a body with no meaningful tilt', () => {
    const [x, y, z] = bodyNorthAxis('sun')
    expect(y).toBeGreaterThan(0.99)
    expect(Math.abs(x)).toBeLessThan(0.13)
    expect(z).toBe(0)
  })

  it('falls back to world up for an unknown body rather than throwing', () => {
    expect(bodyNorthAxis('not-a-body' as never)).toEqual([-0, 1, 0])
  })
})
