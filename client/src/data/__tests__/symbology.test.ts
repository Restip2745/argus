import { describe, it, expect } from 'vitest'
import {
  ALL_CATEGORIES, CATEGORY_GLYPH, CATEGORY_TINT,
  SEVERITY_COLOR, SEVERITY_ORDER, SEVERITY_SIZE,
  eventSymbol, peakSeverity, severityColor, severityRank, withAlpha,
} from '../symbology'
import type { EventCategory, EventIntensity } from '../../types'

/**
 * These tests encode the rule the symbology exists to enforce: each of the
 * three channels carries exactly one meaning. The pre-refactor scheme failed
 * the first two assertions here — ARMED_CONFLICT and CRITICAL were both
 * #ff4d4d, so a red mark was ambiguous.
 */
describe('symbology channel separation', () => {
  it('maps each severity to a distinct colour', () => {
    const colours = SEVERITY_ORDER.map((s) => SEVERITY_COLOR[s])
    expect(new Set(colours).size).toBe(SEVERITY_ORDER.length)
  })

  it('never reuses a severity colour as a category tint', () => {
    const severity = new Set(SEVERITY_ORDER.map((s) => SEVERITY_COLOR[s].toLowerCase()))
    const collisions = ALL_CATEGORIES.filter((c) => severity.has(CATEGORY_TINT[c].toLowerCase()))
    expect(collisions).toEqual([])
  })

  it('gives every category a unique glyph', () => {
    const glyphs = ALL_CATEGORIES.map((c) => CATEGORY_GLYPH[c])
    expect(new Set(glyphs).size).toBe(ALL_CATEGORIES.length)
  })

  it('never uses a directional arrow as a category glyph', () => {
    // ▲ / ▼ are the status bar's trend-direction marks.
    const arrows = ['▲', '▼', '△', '▽']
    const clashes = ALL_CATEGORIES.filter((c) => arrows.includes(CATEGORY_GLYPH[c]))
    expect(clashes).toEqual([])
  })

  it('covers every category defined in the event type', () => {
    expect(ALL_CATEGORIES.length).toBe(9)
    for (const c of ALL_CATEGORIES) {
      expect(CATEGORY_GLYPH[c]).toBeTruthy()
      expect(CATEGORY_TINT[c]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('eventSymbol', () => {
  const base = { category: 'ARMED_CONFLICT' as EventCategory, intensity: 'LOW' as EventIntensity }

  it('colours by severity, not category', () => {
    const lowConflict  = eventSymbol({ ...base, intensity: 'LOW' })
    const critConflict = eventSymbol({ ...base, intensity: 'CRITICAL' })
    const critHealth   = eventSymbol({ category: 'HEALTH', intensity: 'CRITICAL' })

    // Same category, different severity → different colour
    expect(lowConflict.color).not.toBe(critConflict.color)
    // Different category, same severity → same colour
    expect(critHealth.color).toBe(critConflict.color)
  })

  it('shapes by category, not severity', () => {
    const lowConflict  = eventSymbol({ ...base, intensity: 'LOW' })
    const critConflict = eventSymbol({ ...base, intensity: 'CRITICAL' })
    const critHealth   = eventSymbol({ category: 'HEALTH', intensity: 'CRITICAL' })

    expect(lowConflict.glyph).toBe(critConflict.glyph)
    expect(critHealth.glyph).not.toBe(critConflict.glyph)
  })

  it('frames by reliability, independent of the other two channels', () => {
    const confirmed  = eventSymbol({ ...base, reliability: 'HIGH' })
    const unverified = eventSymbol({ ...base, reliability: 'UNVERIFIED' })

    expect(confirmed.borderStyle).toBe('solid')
    expect(unverified.borderStyle).toBe('dotted')
    // Reliability must not leak into severity or category
    expect(confirmed.color).toBe(unverified.color)
    expect(confirmed.glyph).toBe(unverified.glyph)
  })

  it('treats a missing reliability as unverified rather than confirmed', () => {
    expect(eventSymbol({ ...base, reliability: null }).borderStyle).toBe('dotted')
    expect(eventSymbol(base).borderStyle).toBe('dotted')
  })

  it('scales size with severity', () => {
    expect(SEVERITY_SIZE.CRITICAL).toBeGreaterThan(SEVERITY_SIZE.HIGH)
    expect(SEVERITY_SIZE.HIGH).toBeGreaterThan(SEVERITY_SIZE.MODERATE)
    expect(SEVERITY_SIZE.MODERATE).toBeGreaterThan(SEVERITY_SIZE.LOW)
  })

  it('falls back to a neutral glyph and lowest severity for unknown input', () => {
    const s = eventSymbol({ category: 'NOT_A_CATEGORY', intensity: 'NOT_A_LEVEL' })
    expect(s.glyph).toBe('◇')
    expect(s.color).toBe(SEVERITY_COLOR.LOW)
  })
})

describe('severity helpers', () => {
  it('ranks severities in ascending order of alarm', () => {
    expect(severityRank('CRITICAL')).toBeGreaterThan(severityRank('HIGH'))
    expect(severityRank('HIGH')).toBeGreaterThan(severityRank('MODERATE'))
    expect(severityRank('MODERATE')).toBeGreaterThan(severityRank('LOW'))
    expect(severityRank('nonsense')).toBe(0)
  })

  it('reports a group by its worst member, not its first or its average', () => {
    const group = [
      { intensity: 'LOW' },
      { intensity: 'CRITICAL' },
      { intensity: 'MODERATE' },
    ]
    expect(peakSeverity(group)).toBe('CRITICAL')
    expect(severityColor(peakSeverity(group))).toBe(SEVERITY_COLOR.CRITICAL)
    expect(peakSeverity([{ intensity: 'LOW' }])).toBe('LOW')
    expect(peakSeverity([])).toBe('LOW')
  })
})

describe('withAlpha', () => {
  it('appends a two-digit alpha channel', () => {
    expect(withAlpha('#ff3b30', 1)).toBe('#ff3b30ff')
    expect(withAlpha('#ff3b30', 0)).toBe('#ff3b3000')
    expect(withAlpha('#ff3b30', 0.5)).toBe('#ff3b3080')
  })

  it('clamps out-of-range alpha', () => {
    expect(withAlpha('#ff3b30', 2)).toBe('#ff3b30ff')
    expect(withAlpha('#ff3b30', -1)).toBe('#ff3b3000')
  })
})
