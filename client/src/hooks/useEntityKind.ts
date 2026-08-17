import { classifyEntity, type EntityKind } from '../data/entityKind'
import { getCachedWikiSummary, useWikiCacheVersion } from './useWikiSummary'

/**
 * What kind of thing a name refers to, if anything has already looked it up.
 *
 * The chips that link into the entity panel — an event's actors, a region's
 * recurring names, the context panel's cards — render long before any summary
 * for those names exists, and none of them should be the thing that triggers a
 * Wikipedia request: an event with eight actors would fire eight fetches for
 * eight glyphs. So this reads the shared summary cache and does not fetch.
 *
 * A miss returns `unknown`, which is the honest answer rather than a placeholder
 * state: at that moment the kind genuinely is not known. It also needs no glyph
 * of its own, and the entity glyphs are already one collision away from each
 * other at 11px without inventing a sixth.
 *
 * The cache fills from elsewhere — the entity panel proper, and `EventCompanies`,
 * which fetches a summary for up to four actors of the event on screen. So the
 * glyphs on an open event panel do resolve, without this hook asking for
 * anything. `useWikiCacheVersion` is what turns that arrival into a re-render.
 */
export function useCachedEntityKind(title: string | null | undefined): EntityKind {
  useWikiCacheVersion()
  const summary = getCachedWikiSummary(title)
  return classifyEntity(summary?.description, summary?.title)
}
