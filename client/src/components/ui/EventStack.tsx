import { useState, useEffect, useRef, useMemo } from 'react'
import { useAppStore } from '../../store'
import type { ArgusEvent } from '../../types'

import { CATEGORY_COLOR, CATEGORY_ICON } from '../../data/categoryConfig'

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function heatColor(score: number): string {
  if (score >= 1.5) return '#ff4d4d'
  if (score >= 1.0) return '#ff9c2a'
  if (score >= 0.5) return '#00d4ff'
  if (score >= 0.3) return '#4a9eff'
  return '#2a4060'
}

interface IconItemProps {
  event: ArgusEvent
  animDelay: number
  isNew: boolean
  nudgeGen: number  // increments each time a new item arrives → re-triggers nudge
}

function IconItem({ event, animDelay, isNew, nudgeGen }: IconItemProps) {
  const [hovered, setHovered] = useState(false)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const prevNudgeGen = useRef(nudgeGen)
  const [nudging, setNudging] = useState(false)

  useEffect(() => {
    if (nudgeGen !== prevNudgeGen.current) {
      prevNudgeGen.current = nudgeGen
      setNudging(true)
      const t = setTimeout(() => setNudging(false), 400)
      return () => clearTimeout(t)
    }
  }, [nudgeGen])

  const color = CATEGORY_COLOR[event.category] ?? '#4a6070'
  const icon  = CATEGORY_ICON[event.category]  ?? '◉'
  const title = event.title

  let animation: string
  if (isNew) {
    animation = 'iconNewArrival 0.45s cubic-bezier(0.34,1.56,0.64,1) both'
  } else if (nudging) {
    animation = 'iconNudgeDown 0.35s ease-out both'
  } else {
    animation = `iconFallIn 0.38s ease-out ${animDelay}s both`
  }

  return (
    <div className="relative" style={{ animation }}>
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setActivePanelId(event.id)}
        className="flex items-center justify-center font-mono border rounded pointer-events-auto"
        style={{
          width: '26px',
          height: '26px',
          fontSize: '11px',
          color,
          borderColor: hovered ? color + '80' : color + '28',
          background: hovered ? color + '1e' : 'rgba(4,9,22,0.82)',
          transform: hovered ? 'scale(1.55)' : 'scale(1)',
          transition: 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), background 0.12s, border-color 0.12s, box-shadow 0.12s',
          boxShadow: hovered ? `0 0 10px ${color}55` : isNew ? `0 0 8px ${color}66` : 'none',
          position: 'relative',
          zIndex: hovered ? 60 : 'auto' as React.CSSProperties['zIndex'],
        }}
      >
        {icon}
      </button>

      {/* Tooltip — appears to the right of the icon */}
      {hovered && (
        <div
          className="absolute pointer-events-none font-mono border rounded"
          style={{
            left: '34px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(4,9,22,0.96)',
            borderColor: color + '44',
            boxShadow: `0 2px 14px rgba(0,0,0,0.7), 0 0 0 1px ${color}18`,
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            maxWidth: '240px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 60,
            fontSize: '9px',
          }}
        >
          <span style={{ color }}>{icon} </span>
          <span style={{ color: '#c8dde8' }}>{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
            {event.published_at && (
              <span style={{ color: '#2a4060', fontSize: 8 }}>
                {relativeTime(event.published_at)}
              </span>
            )}
            {event.heat_score != null && (
              <>
                <span style={{ color: '#1a3050', fontSize: 7 }}>·</span>
                <span style={{ color: '#1a3050', fontSize: 7, letterSpacing: '0.12em' }}>HEAT</span>
                <span style={{
                  color: heatColor(event.heat_score),
                  fontSize: 8,
                  fontWeight: 600,
                }}>
                  {event.heat_score.toFixed(2)}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const TIME_RANGE_MS: Record<string, number> = {
  '6h':  6  * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

// Returns 0 for null/undefined/invalid ISO strings so sort and filter never produce NaN.
function safeTs(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return isNaN(t) ? 0 : t
}

const ITEM_H = 30  // 26px icon + 4px flex gap
const VSCROLL_BUFFER = 8  // extra items rendered above/below visible window

export function EventStack() {
  const events             = useAppStore((s) => s.events)
  const hiddenCategories   = useAppStore((s) => s.hiddenCategories)
  const timeRangeFilter    = useAppStore((s) => s.timeRangeFilter)
  const searchQuery        = useAppStore((s) => s.searchQuery)
  const bookmarkedIds      = useAppStore((s) => s.bookmarkedIds)
  const showWatchlistOnly  = useAppStore((s) => s.showWatchlistOnly)
  const eventsLoadFailed   = useAppStore((s) => s.eventsLoadFailed)

  // Sort newest-first, apply watchlist / time-range / category / text filters (no hard cap)
  const filtered = useMemo(() => {
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

  // ── Virtual scroll ────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTopRef = useRef(0)
  const [scrollTop,   setScrollTop]   = useState(0)
  const [containerH,  setContainerH]  = useState(600)

  // Track container height via ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight))
    ro.observe(el)
    setContainerH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  // Drive scroll from wheel events while keeping pointer-events:none on container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      const rect = el!.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return
      const maxScroll = Math.max(0, filtered.length * ITEM_H - rect.height)
      scrollTopRef.current = Math.max(0, Math.min(maxScroll, scrollTopRef.current + e.deltaY))
      el!.scrollTop = scrollTopRef.current
      setScrollTop(scrollTopRef.current)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [filtered.length])

  const total    = filtered.length
  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_H) - VSCROLL_BUFFER)
  const endIdx   = Math.min(total, Math.ceil((scrollTop + containerH) / ITEM_H) + VSCROLL_BUFFER)

  // ── New-arrival animation tracking ───────────────────────────────────────
  const prevIdsRef    = useRef<Set<string>>(new Set())
  const [newIds,      setNewIds]    = useState<Set<string>>(new Set())
  const [nudgeGen,    setNudgeGen]  = useState(0)
  const isFirstRender = useRef(true)

  useEffect(() => {
    const currentIds = new Set(filtered.map((e) => e.id))

    if (isFirstRender.current) {
      isFirstRender.current = false
      prevIdsRef.current = currentIds
      return
    }

    const arriving = filtered.filter((e) => !prevIdsRef.current.has(e.id))
    prevIdsRef.current = currentIds

    if (arriving.length === 0) return

    const ids = new Set(arriving.map((e) => e.id))
    setNewIds((prev) => new Set([...prev, ...ids]))
    setNudgeGen((g) => g + 1)

    const t = setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }, 600)
    return () => clearTimeout(t)
  }, [filtered])

  return (
    <div
      ref={containerRef}
      className="absolute left-2 pointer-events-none"
      style={{ top: '44px', bottom: '36px', overflow: 'hidden' }}
    >
      {/* Connection-error indicator — shown when the initial event fetch failed */}
      {eventsLoadFailed && events.length === 0 && (
        <div
          className="pointer-events-auto font-mono"
          title="Could not reach server — retrying on next connection"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            fontSize: '11px',
            color: '#ff9c2a',
            borderColor: '#ff9c2a28',
            background: 'rgba(4,9,22,0.82)',
            border: '1px solid #ff9c2a44',
            borderRadius: '4px',
            marginBottom: '4px',
          }}
        >
          ⚠
        </div>
      )}
      {/* Sentinel div establishes total scroll height */}
      <div style={{ height: `${total * ITEM_H}px`, position: 'relative' }}>
        {/* Render only the visible window, positioned at startIdx */}
        <div
          className="flex flex-col gap-1"
          style={{ position: 'absolute', top: `${startIdx * ITEM_H}px` }}
        >
          {filtered.slice(startIdx, endIdx).map((event, localI) => (
            <IconItem
              key={event.id}
              event={event}
              animDelay={Math.min((startIdx + localI) * 0.035, 0.7)}
              isNew={newIds.has(event.id)}
              nudgeGen={newIds.has(event.id) ? 0 : nudgeGen}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
