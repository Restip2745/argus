import { useMemo } from 'react'
import { useAppStore } from '../store'
import { severityRank } from '../data/symbology'
import { useSceneTime } from './useSceneTime'
import { filterEvents, safeTs, type FilterCriteria } from '../lib/eventFilter'
import type { ArgusEvent } from '../types'

/**
 * The criteria currently narrowing the view.
 *
 * Exposed separately so surfaces that aggregate rather than list — the map-mode
 * choropleth, for instance — can apply exactly the same rule without going
 * through a sorted array.
 */
export function useFilterCriteria(): FilterCriteria {
  const hiddenCategories  = useAppStore((s) => s.hiddenCategories)
  const timeRangeFilter   = useAppStore((s) => s.timeRangeFilter)
  const searchQuery       = useAppStore((s) => s.searchQuery)
  const bookmarkedIds     = useAppStore((s) => s.bookmarkedIds)
  const showWatchlistOnly = useAppStore((s) => s.showWatchlistOnly)
  const { now, isLive }   = useSceneTime()

  return useMemo(
    () => ({ hiddenCategories, timeRangeFilter, searchQuery, bookmarkedIds, showWatchlistOnly, now, isLive }),
    [hiddenCategories, timeRangeFilter, searchQuery, bookmarkedIds, showWatchlistOnly, now, isLive],
  )
}

/**
 * The visible event set, sorted.
 *
 * Every surface that renders events reads this — the sidebar feed, the
 * lite-mode stack, the 3-D markers and the map-mode fills. The status bar
 * deliberately does not: it reports world state, not the current view.
 */
export function useFilteredEvents(): ArgusEvent[] {
  const events         = useAppStore((s) => s.events)
  const eventSortOrder = useAppStore((s) => s.eventSortOrder)
  const criteria       = useFilterCriteria()

  return useMemo(() => {
    function sortFn(a: ArgusEvent, b: ArgusEvent): number {
      if (eventSortOrder === 'heat')
        return (b.heat_score ?? 0) - (a.heat_score ?? 0)
      if (eventSortOrder === 'intensity')
        return severityRank(b.intensity) - severityRank(a.intensity)
      return safeTs(b.published_at) - safeTs(a.published_at)
    }

    return filterEvents([...events].sort(sortFn), criteria)
  }, [events, eventSortOrder, criteria])
}
