import { useMemo } from 'react'
import { useAppStore } from '../store'
import type { ArgusEvent } from '../types'

const TIME_RANGE_MS: Record<string, number> = {
  '6h':  6  * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

function safeTs(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return isNaN(t) ? 0 : t
}

/** Returns the same sorted/filtered event list that EventStack renders. */
export function useFilteredEvents(): ArgusEvent[] {
  const events            = useAppStore((s) => s.events)
  const hiddenCategories  = useAppStore((s) => s.hiddenCategories)
  const timeRangeFilter   = useAppStore((s) => s.timeRangeFilter)
  const searchQuery       = useAppStore((s) => s.searchQuery)
  const bookmarkedIds     = useAppStore((s) => s.bookmarkedIds)
  const showWatchlistOnly = useAppStore((s) => s.showWatchlistOnly)

  return useMemo(() => {
    const cutoff = timeRangeFilter !== 'all'
      ? Date.now() - TIME_RANGE_MS[timeRangeFilter]
      : null
    const q = searchQuery.trim().toLowerCase()
    const bookmarkSet = new Set(bookmarkedIds)
    return [...events]
      .sort((a, b) => safeTs(b.published_at) - safeTs(a.published_at))
      .filter((e) => {
        if (showWatchlistOnly && !bookmarkSet.has(e.id)) return false
        if (hiddenCategories.includes(e.category)) return false
        const ts = safeTs(e.published_at)
        if (cutoff && ts > 0 && ts < cutoff) return false
        if (q) {
          const inTitle   = e.title.toLowerCase().includes(q)
          const inContent = (e.content ?? '').toLowerCase().includes(q)
          const inActors  = e.actors.some((a) => a.toLowerCase().includes(q))
          const inTags    = e.tags.some((t) => t.toLowerCase().includes(q))
          if (!inTitle && !inContent && !inActors && !inTags) return false
        }
        return true
      })
  }, [events, hiddenCategories, timeRangeFilter, searchQuery, bookmarkedIds, showWatchlistOnly])
}
