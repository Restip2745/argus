import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MIN_FONT_PX } from '../type'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue
      sourceFiles(p, out)
    } else if (/\.(tsx?|css)$/.test(e.name)) {
      out.push(p)
    }
  }
  return out
}

interface Offence { file: string; line: number; text: string; px: number }

/**
 * Guards the floor set in `styles/type.ts`. Before this rule existed, 209 of
 * roughly 290 font-size declarations were below 10px — the single biggest
 * readability problem in the HUD. Without a guard the scale drifts straight
 * back, one "just this one label" at a time.
 */
function findOffences(): Offence[] {
  // Every way a font size can be expressed in this codebase. The first version
  // of this guard only covered the first three and missed SVG <text fontSize="8">
  // and the two 8px notice rules in index.css.
  const patterns: RegExp[] = [
    /fontSize:\s*['"](\d+(?:\.\d+)?)px['"]/g,      // fontSize: '8px'
    /fontSize:\s*(\d+(?:\.\d+)?)(?![\d.px])/g,     // fontSize: 8
    /text-\[(\d+(?:\.\d+)?)px\]/g,                 // tailwind text-[8px]
    /fontSize=["'{](\d+(?:\.\d+)?)(?:px)?["'}]/g,  // SVG fontSize="8" / {8}
    /font-size:\s*(\d+(?:\.\d+)?)px/g,             // CSS font-size: 8px
  ]

  const offences: Offence[] = []
  for (const file of sourceFiles(SRC)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n')
    lines.forEach((text, i) => {
      for (const re of patterns) {
        re.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          const px = parseFloat(m[1])
          if (px < MIN_FONT_PX) {
            offences.push({
              file: path.relative(SRC, file).replace(/\\/g, '/'),
              line: i + 1,
              text: text.trim().slice(0, 100),
              px,
            })
          }
        }
      }
    })
  }
  return offences
}

describe('type scale', () => {
  it(`declares no font size below ${MIN_FONT_PX}px`, () => {
    const offences = findOffences()
    const detail = offences
      .map((o) => `  ${o.file}:${o.line}  ${o.px}px  ${o.text}`)
      .join('\n')
    expect(offences.length, `sub-${MIN_FONT_PX}px font sizes found:\n${detail}`).toBe(0)
  })
})
