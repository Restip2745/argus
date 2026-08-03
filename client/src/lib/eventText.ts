/**
 * Which language an event's display text is shown in.
 *
 * Both languages are stored per event, so switching the UI language is a field
 * swap rather than a re-analysis. That is the whole reason the DB holds both:
 * classification happens once, in a background worker at ingest time, while the
 * language is chosen later and separately by each viewer — the worker cannot
 * know which one to produce, and one server serves readers of both.
 *
 * Fallbacks cross languages on purpose. A reader who asked for Chinese and gets
 * an untranslated headline is better served than one who gets a blank row, and
 * they are already reading the source's own title in that case.
 */
import type { ArgusEvent } from '../types'

export function isZhLang(lang: string | undefined | null): boolean {
  return (lang ?? '').toLowerCase().startsWith('zh')
}

const clean = (s: string | null | undefined): string => (s ?? '').trim()

/**
 * `title` is the source's own headline and is never regenerated, so English
 * readers always get the original wording rather than a model paraphrase.
 */
export function eventTitle(event: ArgusEvent, lang: string): string {
  if (!isZhLang(lang)) return event.title
  return clean(event.title_zh) || event.title
}

/** '' when neither language has a summary — callers hide the block. */
export function eventSummary(event: ArgusEvent, lang: string): string {
  const zh = clean(event.summary_zh)
  const en = clean(event.summary_en)
  return isZhLang(lang) ? (zh || en) : (en || zh)
}
