/**
 * The dock is a single strip of icon-only buttons whose labels appear only on
 * hover, so the icon is the entire identity of a control. Two buttons sharing
 * one is therefore not a cosmetic issue — it makes them indistinguishable until
 * you hover each in turn.
 *
 * This has happened twice: POSTURE borrowed ◈, which marks a panel/section
 * everywhere else in the app and was already on the EVENT PANEL button; and the
 * service-degraded badge used ⚙, the CONFIGURATION glyph, so an alarm and a
 * settings button became identical precisely when something was broken.
 *
 * A button's icon can be a glyph (`icon`) or an image (`iconSrc`). Both are
 * checked, and each has already been the blind spot that let a duplicate
 * through: the first version of this file scanned only written-out glyphs and
 * reported the dock clean while ⚔ sat on two buttons, because the category
 * filters are generated from CATEGORY_GLYPH; and image icons arrived later, so
 * a glyph-only check would go quiet again as buttons migrate to artwork.
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

/** The glyphs of one map-mode table, by its constant name. */
function modeTable(name: 'MAP_MODES' | 'SPACE_MAP_MODES'): string[] {
  const block = source.match(new RegExp(`const ${name}[\\s\\S]*?\\n\\]`))?.[0] ?? ''
  return [...block.matchAll(/icon:\s*'([^']+)'/g)].map((m) => m[1])
}

/**
 * Glyph literals written into the dock, excluding the map-mode tables.
 *
 * The two tables are alternatives — the selector occupies one slot and shows
 * the Earth family or the space family depending on distance, never both. So
 * "none" carrying the same ○ in each is shared vocabulary rather than a
 * collision, and folding them into one flat list would report a clash that
 * cannot occur on screen.
 */
function staticIcons(): string[] {
  const inTables = new Set([...modeTable('MAP_MODES'), ...modeTable('SPACE_MAP_MODES')])
  const out: string[] = []
  for (const m of source.matchAll(/icon="([^"]+)"/g)) out.push(m[1])
  for (const m of source.matchAll(/icon:\s*'([^']+)'/g)) if (!inTables.has(m[1])) out.push(m[1])
  return out
}

/** Image icons: `iconSrc="/icons/x.png"`. */
function imageIcons(): string[] {
  return [...source.matchAll(/iconSrc="([^"]+)"/g)].map(m => m[1])
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
  return [...staticIcons(), ...imageIcons(), ...Object.values(CATEGORY_GLYPH)]
}

/** Everything on screen at once for a given map-mode family. */
function dockIconsWith(family: 'MAP_MODES' | 'SPACE_MAP_MODES'): string[] {
  return [...dockIcons(), ...modeTable(family)]
}

describe('dock icons', () => {
  it('finds both kinds at all, so the scan cannot silently pass on a rename', () => {
    // Without this, migrating every button to artwork would leave the
    // uniqueness checks below scanning an empty list and passing vacuously.
    expect(staticIcons().length).toBeGreaterThan(8)
    expect(staticIcons()).toContain('⚙')          // CONFIGURATION
    expect(staticIcons()).toContain('⧉')          // multi-entity context
    expect(imageIcons().length).toBeGreaterThan(0)
    expect(imageIcons().every(p => p.startsWith('/'))).toBe(true)
  })

  // Checked once per map-mode family, since exactly one of them is on screen
  // at a time. Doing it per family rather than over a flat list is what keeps
  // the shared ○ for "none" from reading as a clash.
  it.each(['MAP_MODES', 'SPACE_MAP_MODES'] as const)(
    'gives every dock control a unique icon with %s showing',
    (family) => {
      const seen = new Map<string, number>()
      for (const i of dockIconsWith(family)) seen.set(i, (seen.get(i) ?? 0) + 1)
      const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([g]) => g)
      expect(duplicated).toEqual([])
    },
  )

  it('keeps each map-mode family internally distinct', () => {
    for (const family of ['MAP_MODES', 'SPACE_MAP_MODES'] as const) {
      const icons = modeTable(family)
      expect(icons.length, family).toBeGreaterThan(1)
      expect(new Set(icons).size, family).toBe(icons.length)
    }
  })

  it('never gives one button both a glyph and an image', () => {
    // DockBtn renders iconSrc in preference to icon, so a button carrying both
    // silently drops the glyph — which reads as an intentional choice in the
    // source while being dead code.
    // Identify the offender by its icons rather than its label: labels are
    // sometimes `t(...)` calls or ternaries, and a half-parsed one turns the
    // failure message into noise exactly when someone needs it to be useful.
    const both = [...source.matchAll(/<DockBtn\b[\s\S]*?\/>/g)]
      .map(m => m[0])
      .filter(tag => /\bicon="/.test(tag) && /\biconSrc="/.test(tag))
      .map(tag => `icon=${tag.match(/\bicon="([^"]*)"/)![1]}` +
                  ` + iconSrc=${tag.match(/\biconSrc="([^"]*)"/)![1]}`)
    expect(both).toEqual([])
  })

  it('does not reuse ◈, which marks a panel or agent section elsewhere', () => {
    // One use is legitimate: the button that opens the event *panel*.
    const uses = dockIcons().filter(g => g === '◈')
    expect(uses.length).toBeLessThanOrEqual(1)
  })

  it('keeps the four Earth surface modes', () => {
    // A count, not just uniqueness: losing one to a bad edit would otherwise
    // pass every check above.
    expect(modeTable('MAP_MODES')).toHaveLength(4)
  })
})
