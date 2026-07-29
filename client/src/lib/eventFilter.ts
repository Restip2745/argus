/**
 * The one definition of "is this event currently visible".
 *
 * This lives apart from the hook because it kept drifting. The sidebar, the
 * lite-mode stack, the 3-D markers and the map-mode fills each decided for
 * themselves, and the globe ended up showing a different set of events from the
 * feed sitting next to it — you could hide a category and watch the list shrink
 * while the markers stayed put.
 *
 * The rule the app follows:
 *
 *   status bar    UNFILTERED. It is labelled GLOBAL POSTURE and describes the
 *                 world, not the operator's current view.
 *   everything    FILTERED. The feed, the markers and the map fills are three
 *   else          renderings of one set and must always agree.
 *
 * Scene time is not a filter, it is the clock — see the isLive note below.
 */
import type { ArgusEvent } from '../types'

const TIME_RANGE_MS: Record<string, number> = {
  '6h':  6  * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

export function safeTs(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return isNaN(t) ? 0 : t
}

export interface FilterCriteria {
  hiddenCategories: string[]
  timeRangeFilter: '6h' | '12h' | '24h' | 'all'
  searchQuery: string
  bookmarkedIds: string[]
  showWatchlistOnly: boolean
  /** Effective "now" — scene time, not the wall clock. */
  now: number
  /** False while the operator is reviewing a past instant. */
  isLive: boolean
}

/**
 * Category visibility on its own.
 *
 * Arrival cues use this rather than the full predicate: a toast announces
 * something that just happened, so the time window is meaningless against it,
 * and a transient search or a watchlist view should not silence alerts for a
 * monitoring tool. Hiding a category, though, is a standing statement that the
 * operator does not want to hear about it.
 */
export function isCategoryVisible(event: ArgusEvent, hiddenCategories: string[]): boolean {
  return !hiddenCategories.includes(event.category)
}

export function matchesFilters(event: ArgusEvent, c: FilterCriteria): boolean {
  if (c.showWatchlistOnly && !c.bookmarkedIds.includes(event.id)) return false
  if (!isCategoryVisible(event, c.hiddenCategories)) return false

  const ts = safeTs(event.published_at)

  // Rewound: an event that had not happened yet at the scrubbed instant must
  // not be visible, or "the past" would still contain the future.
  if (!c.isLive && ts > c.now) return false

  if (c.timeRangeFilter !== 'all') {
    const cutoff = c.now - TIME_RANGE_MS[c.timeRangeFilter]
    if (ts > 0 && ts < cutoff) return false
  }

  const q = c.searchQuery.trim().toLowerCase()
  if (q) {
    const hit =
      event.title.toLowerCase().includes(q) ||
      (event.content ?? '').toLowerCase().includes(q) ||
      event.actors.some((a) => a.toLowerCase().includes(q)) ||
      event.tags.some((t) => t.toLowerCase().includes(q))
    if (!hit) return false
  }

  return true
}

/** Faster path for filtering a whole array — builds the bookmark set once. */
export function filterEvents(events: ArgusEvent[], c: FilterCriteria): ArgusEvent[] {
  const bookmarkSet = new Set(c.bookmarkedIds)
  const cutoff = c.timeRangeFilter !== 'all' ? c.now - TIME_RANGE_MS[c.timeRangeFilter] : null
  const q = c.searchQuery.trim().toLowerCase()
  const hidden = new Set(c.hiddenCategories)

  return events.filter((e) => {
    if (c.showWatchlistOnly && !bookmarkSet.has(e.id)) return false
    if (hidden.has(e.category)) return false
    const ts = safeTs(e.published_at)
    if (!c.isLive && ts > c.now) return false
    if (cutoff !== null && ts > 0 && ts < cutoff) return false
    if (q) {
      const hit =
        e.title.toLowerCase().includes(q) ||
        (e.content ?? '').toLowerCase().includes(q) ||
        e.actors.some((a) => a.toLowerCase().includes(q)) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      if (!hit) return false
    }
    return true
  })
}
