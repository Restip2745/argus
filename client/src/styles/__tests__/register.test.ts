import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const LOCALES = path.resolve(SRC, '../public/locales')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === '__tests__') continue
      sourceFiles(p, out)
    } else if (/\.tsx$/.test(e.name)) {
      out.push(p)
    }
  }
  return out
}

/** Strip comments so prose in documentation blocks is not flagged. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const CJK = /[一-鿿㐀-䶿]/

describe('localisation register', () => {
  /**
   * Hardcoded Chinese in a component means that string ignores the language
   * setting. This was the state of AnnotationToolbar and the suggested-query
   * tables in EventPanel / PersonPanel / MultiEntityContextPanel, which each
   * carried a private copy of strings the locale files already held.
   */
  it('has no hardcoded CJK strings left in components', () => {
    const offenders: string[] = []

    for (const file of sourceFiles(SRC)) {
      const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n')
      lines.forEach((line, i) => {
        if (!CJK.test(line)) return
        // A default value handed to t() is the fallback for that key, which is
        // where a translated default legitimately lives.
        if (/\bt\(/.test(line)) return
        // A language picker must name each language in its own script — an
        // endonym is the one string that must never be translated.
        if (file.endsWith('LanguageSwitcher.tsx')) return
        offenders.push(`${path.relative(SRC, file).replace(/\\/g, '/')}:${i + 1}  ${line.trim().slice(0, 80)}`)
      })
    }

    expect(offenders, `hardcoded CJK:\n${offenders.join('\n')}`).toEqual([])
  })

  /**
   * One ellipsis character, not three periods. Mixed forms in the same HUD read
   * as two different products.
   */
  it('uses the ellipsis character rather than three periods in UI strings', () => {
    const offenders: string[] = []

    for (const lng of fs.readdirSync(LOCALES)) {
      const file = path.join(LOCALES, lng, 'translation.json')
      if (!fs.existsSync(file)) continue
      const walk = (node: unknown, keyPath: string): void => {
        if (typeof node === 'string') {
          if (node.includes('...')) offenders.push(`${lng}:${keyPath} = ${node}`)
          return
        }
        if (node && typeof node === 'object') {
          for (const [k, v] of Object.entries(node)) walk(v, keyPath ? `${keyPath}.${k}` : k)
        }
      }
      walk(JSON.parse(fs.readFileSync(file, 'utf8')), '')
    }

    expect(offenders, `use … instead of ...:\n${offenders.join('\n')}`).toEqual([])
  })

  /** Every locale must define the same keys, or a language silently degrades. */
  it('keeps every locale in sync', () => {
    const flatten = (node: unknown, pre = '', out: string[] = []): string[] => {
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) flatten(v, pre ? `${pre}.${k}` : k, out)
      } else {
        out.push(pre)
      }
      return out
    }

    const langs = fs.readdirSync(LOCALES).filter((l) =>
      fs.existsSync(path.join(LOCALES, l, 'translation.json')),
    )
    expect(langs.length).toBeGreaterThan(1)

    const keysets = langs.map((l) => ({
      lang: l,
      keys: new Set(flatten(JSON.parse(fs.readFileSync(path.join(LOCALES, l, 'translation.json'), 'utf8')))),
    }))

    const [base, ...rest] = keysets
    for (const other of rest) {
      const missing = [...base.keys].filter((k) => !other.keys.has(k))
      const extra   = [...other.keys].filter((k) => !base.keys.has(k))
      expect(missing, `${other.lang} is missing: ${missing.slice(0, 12).join(', ')}`).toEqual([])
      expect(extra, `${other.lang} has extra: ${extra.slice(0, 12).join(', ')}`).toEqual([])
    }
  })
})
