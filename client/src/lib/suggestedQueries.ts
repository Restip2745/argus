/**
 * Suggested agent queries — one source, driven by the locale files.
 *
 * These lists existed in four places: a hardcoded Traditional Chinese table in
 * EventPanel, another in PersonPanel, another in MultiEntityContextPanel, and
 * the `popout.*` keys in the locale files that only PopoutPage read. The main
 * window therefore ignored the language setting for its own suggestions while
 * the popout window honoured it.
 *
 * Everything now reads the locale keys. `t` is passed in rather than imported
 * so these stay plain functions, callable from any component and testable
 * without an i18n instance.
 */
import type { TFunction } from 'i18next'

/**
 * i18next's own `t`. Taken as a parameter rather than imported so these stay
 * plain functions — a test can pass a stub cast to this type without spinning
 * up an i18n instance.
 */
export type Translate = TFunction

const CATEGORY_QUERY_COUNT = 4

/** Four queries tuned to an event's category. */
export function categoryQueries(t: Translate, category: string): string[] {
  const out: string[] = []
  for (let i = 0; i < CATEGORY_QUERY_COUNT; i++) {
    const key = `popout.catQ.${category}.${i}`
    const value = t(key, '')
    // i18next echoes the key back when a translation is missing; treat both
    // that and an empty string as "no suggestion" rather than rendering
    // `popout.catQ.SPACE.2` into the UI.
    if (value && value !== key) out.push(value)
  }
  return out
}

/** Queries for one or more selected people. */
export function personQueries(t: Translate, names: string[]): string[] {
  if (names.length === 0) return []

  if (names.length === 1) {
    const name = names[0]
    return ['s0', 's1', 's2', 's3'].map((k) => t(`popout.personQ.${k}`, { name }))
  }

  const [n0, n1] = names
  return ['m0', 'm1', 'm2'].map((k) => t(`popout.personQ.${k}`, { n0, n1 }))
}

export interface ContextEntityLike {
  type: 'event' | 'person' | 'region' | 'celestial'
  name: string
}

/** How many suggestions the context panel shows at once. */
export const CONTEXT_QUERY_LIMIT = 4

/** Queries for the multi-entity context panel, shaped by what is in it. */
export function contextQueries(t: Translate, entities: ContextEntityLike[]): string[] {
  if (entities.length === 0) return []

  const types   = new Set(entities.map((e) => e.type))
  const names   = entities.map((e) => e.name)
  const persons = entities.filter((e) => e.type === 'person')
  const out: string[] = []

  if (entities.length >= 2) {
    out.push(t('popout.contextQ.0', { n0: names[0], n1: names[1] }))
  }
  if (types.has('event') && types.has('person')) out.push(t('popout.contextQ.1'))
  if (types.has('event') && types.has('region')) out.push(t('popout.contextQ.2'))
  if (persons.length >= 2) out.push(t('popout.contextQ.4'))

  // The catch-all summary always applies, so it goes last and may be trimmed
  // away when more specific suggestions have filled the list.
  out.push(t('popout.contextQ.3'))
  return out.slice(0, CONTEXT_QUERY_LIMIT)
}
