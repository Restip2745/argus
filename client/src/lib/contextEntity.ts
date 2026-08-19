/**
 * The one place a `ContextEntity` is built.
 *
 * Identity is the reason this is shared rather than written where it is used.
 * The collection dedupes on `id`, so the same subject reached two ways — the
 * panel's ⊕ button and an `@` mention — has to produce the same id or the
 * operator ends up holding two cards for one thing and the agent is told about
 * it twice.
 */
import type { ArgusEvent, ContextEntity } from '../types'
import { eventTitle, eventSummary } from './eventText'
import { getCountryInfo } from '../data/countryData'

function formatGdp(gdpB: number): string {
  if (gdpB >= 1000) return `$${(gdpB / 1000).toFixed(1)}T`
  return `$${Math.round(gdpB)}B`
}

function formatPop(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}B`
  return `${m.toFixed(1)}M`
}

export function eventContextEntity(event: ArgusEvent, lang: string): ContextEntity {
  return {
    id:   event.id,
    type: 'event',
    name: eventTitle(event, lang),
    // The generated summary in the reader's language, with the raw RSS snippet
    // only as a fallback for rows ingested before summaries existed.
    summary: eventSummary(event, lang) || event.content || event.title,
  }
}

export function regionContextEntity(name: string): ContextEntity {
  const info = getCountryInfo(name)
  return {
    id:   `region-${name}`,
    type: 'region',
    name,
    summary: info
      ? `${info.capital} · Pop ${formatPop(info.populationM)} · GDP ${formatGdp(info.gdpB)} · Stability ${info.stability}/100`
      : name,
  }
}

/**
 * @param extract The encyclopedia text, not a label. Passing nothing leaves the
 *   name standing in for it, which is what the agent gets asked to reason about
 *   — so it is a fallback for a name with no article, not a shortcut.
 */
export function wikiContextEntity(name: string, extract?: string | null): ContextEntity {
  return {
    id:      `wiki-${name}`,
    type:    'wiki',
    name,
    summary: extract || name,
  }
}
