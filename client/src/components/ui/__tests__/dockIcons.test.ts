/**
 * The dock is a single strip of icon-only buttons whose labels appear only on
 * hover, so the glyph is the entire identity of a control. Two buttons sharing
 * one glyph is therefore not a cosmetic issue — it makes them indistinguishable
 * until you hover each in turn.
 *
 * This has happened twice: POSTURE borrowed ◈, which marks a panel/section
 * everywhere else in the app and was already on the EVENT PANEL button; and the
 * service-degraded badge used ⚙, the CONFIGURATION glyph, so an alarm and a
 * settings button became identical precisely when something was broken.
 *
 * Scans the source rather than importing, because the icons are JSX literals
 * spread across the component rather than a table that can be imported.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CATEGORY_GLYPH } from '../../../data/symbology'

const source = readFileSync(
  join(__dirname, '..', 'FloatDock.tsx'),
  'utf-8',
)

/** Icon literals written into the dock: `icon="X"` props and the MAP_MODES table. */
function staticIcons(): string[] {
  const out: string[] = []
  for (const m of source.matchAll(/icon="([^"]+)"/g)) out.push(m[1])
  for (const m of source.matchAll(/icon:\s*'([^']+)'/g)) out.push(m[1])
  return out
}

/**
 * Everything that can appear in the strip at once.
 *
 * The category quick-filters are generated from CATEGORY_GLYPH rather than
 * written out, so a scan of this file alone misses them — which is how ⚔ came
 * to sit on both the CONFLICT category filter and the CONFLICT FRONTS layer
 * toggle while a source-only check reported the dock clean.
 */
function dockIcons(): string[] {
  return [...staticIcons(), ...Object.values(CATEGORY_GLYPH)]
}

describe('dock icon glyphs', () => {
  it('finds the icons at all, so the scan cannot silently pass on a rename', () => {
    const icons = staticIcons()
    expect(icons.length).toBeGreaterThan(10)
    expect(icons).toContain('⚙')          // CONFIGURATION
    expect(icons).toContain('⧉')          // multi-entity context
  })

  it('gives every dock control a unique glyph', () => {
    const icons = dockIcons()
    const seen = new Map<string, number>()
    for (const i of icons) seen.set(i, (seen.get(i) ?? 0) + 1)
    const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([g]) => g)
    expect(duplicated).toEqual([])
  })

  it('does not reuse ◈, which marks a panel or agent section elsewhere', () => {
    // One use is legitimate: the button that opens the event *panel*.
    const uses = dockIcons().filter(g => g === '◈')
    expect(uses.length).toBeLessThanOrEqual(1)
  })

  it('keeps the map-mode glyphs distinct from one another', () => {
    const table = source.match(/const MAP_MODES[\s\S]*?\n\]/)?.[0] ?? ''
    const icons = [...table.matchAll(/icon:\s*'([^']+)'/g)].map(m => m[1])
    expect(icons).toHaveLength(4)
    expect(new Set(icons).size).toBe(4)
  })
})
