import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import type { ArgusEvent } from '../../types'

import { eventSymbol, SEVERITY_LABEL } from '../../data/symbology'
import { relativeTime, heatColor } from '../../utils/eventUtils'
import { eventTitle } from '../../lib/eventText'
import { useFilteredEvents } from '../../hooks/useFilteredEvents'
import { highlightText } from '../../utils/highlightText'
import { STATUS_BAR_H } from './StatusBar'

interface IconItemProps {
  event: ArgusEvent
  animDelay: number
  isNew: boolean
  nudgeGen: number  // increments each time a new item arrives → re-triggers nudge
  searchQuery: string
  /** Immersive: one line instead of the full readout. The dense block is a
   *  HUD element, and popping one over a view whose whole purpose is to be
   *  clear works against the mode. */
  terse: boolean
}

const IconItem = memo(function IconItem({ event, animDelay, isNew, nudgeGen, searchQuery, terse }: IconItemProps) {
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

  const { i18n } = useTranslation()
  const sym   = eventSymbol(event)
  const color = sym.color
  const icon  = sym.glyph
  const title = eventTitle(event, i18n.language)

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
        className="flex items-center justify-center font-mono rounded pointer-events-auto"
        style={{
          width: '26px',
          height: '26px',
          fontSize: '12px',
          color,
          // Border style is the reliability channel; colour is severity.
          border: `1px ${sym.borderStyle} ${hovered ? color + 'aa' : sym.borderColor}`,
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
            fontSize: '11px',
          }}
        >
          {terse ? (
            <span>
              <span style={{ color }}>{icon} </span>
              <span style={{ color: '#c8dde8' }}>{highlightText(title, searchQuery)}</span>
              {event.published_at && (
                <span style={{ color: '#2a4060', marginLeft: 6, fontSize: 10 }}>
                  {relativeTime(event.published_at)}
                </span>
              )}
            </span>
          ) : (
            <>
              {/* Name the symbol so the glyph is learnable in passing */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <span style={{ color }}>{icon}</span>
                <span style={{ color: '#5d7c92', fontSize: '10px', letterSpacing: '0.1em' }}>{sym.label}</span>
                <span style={{ color, fontSize: '10px', letterSpacing: '0.08em' }}>{SEVERITY_LABEL[event.intensity]}</span>
                <span style={{ color: '#2a4060', fontSize: '10px', letterSpacing: '0.06em' }}>{sym.reliabilityLabel}</span>
              </div>
              <span style={{ color: '#c8dde8' }}>{highlightText(title, searchQuery)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                {event.published_at && (
                  <span style={{ color: '#2a4060', fontSize: 10 }}>
                    {relativeTime(event.published_at)}
                  </span>
                )}
                {event.heat_score != null && (
                  <>
                    <span style={{ color: '#1a3050', fontSize: 10 }}>·</span>
                    <span style={{ color: '#1a3050', fontSize: 10, letterSpacing: '0.12em' }}>HEAT</span>
                    <span style={{
                      color: heatColor(event.heat_score),
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      {event.heat_score.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}, (prev, next) =>
  prev.event.id === next.event.id &&
  prev.isNew    === next.isNew &&
  prev.nudgeGen === next.nudgeGen &&
  prev.searchQuery === next.searchQuery &&
  prev.terse === next.terse
)

const ITEM_H = 30  // 26px icon + 4px flex gap
const VSCROLL_BUFFER = 8  // extra items rendered above/below visible window

/**
 * How many icons immersive will show.
 *
 * Not a performance limit — it is what the mode is for. Compact is a feed you
 * work through; immersive is a glance that answers "anything just happen?",
 * and an unbounded column of icons down a deliberately clean view stops
 * reading as recent activity and starts reading as a wall.
 */
const IMMERSIVE_MAX = 14

export function EventStack() {
  const all          = useFilteredEvents()
  const eventsLoaded = useAppStore((s) => s.eventsLoaded)
  const searchQuery  = useAppStore((s) => s.searchQuery)
  const hudMode      = useAppStore((s) => s.hudMode)

  const immersive = hudMode === 'immersive'
  const filtered  = useMemo(
    () => (immersive ? all.slice(0, IMMERSIVE_MAX) : all),
    [all, immersive],
  )

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

  // Drive scroll from wheel events while keeping pointer-events:none on container.
  // Immersive caps the list short enough that it always fits, so there is
  // nothing to scroll and no reason to keep a window-level wheel listener
  // competing with the camera for the wheel.
  useEffect(() => {
    const el = containerRef.current
    if (!el || immersive) return
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
  }, [filtered.length, immersive])

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
      style={{
        // These offsets clear the status bar above and the time scrubber
        // below. Immersive has neither, and leaving them in place would hang
        // the stack off an edge that is no longer there.
        top:    immersive ? '16px' : `${STATUS_BAR_H + 44}px`,
        bottom: immersive ? '16px' : '36px',
        overflow: 'hidden',
      }}
    >
      {/* Loading skeleton — shown until first REST fetch resolves */}
      {!eventsLoaded && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '2px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '26px', height: '26px',
                borderRadius: '3px',
                background: 'rgba(0,180,255,0.06)',
                border: '1px solid rgba(0,180,255,0.1)',
                animation: `skeletonPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
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
              searchQuery={searchQuery}
              terse={immersive}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
