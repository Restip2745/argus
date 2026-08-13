/**
 * EventTimeline — right-strip timeline for EventPanel.
 *
 * Shows the events related to the open one, plus the open one itself, newest
 * first. The current event is the anchor of the whole strip, so it is marked
 * hard: accent fill, accent rail, and a brighter bold title.
 *
 * (The header used to claim this showed ALL events. It never did — EventPanel
 * passes related + current — and the mismatch made the strip look broken.)
 *
 * Clicking a row fires onSelect(id), which drives the slide animation in
 * EventPanel. Clicking the already-active row is a no-op.
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { eventSymbol, severityColor } from '../../data/symbology'
import { useAppStore } from '../../store'
import { eventTitle } from '../../lib/eventText'
import type { ArgusEvent } from '../../types'

function relativeTime(iso: string | null): string {
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

// ── Single row ─────────────────────────────────────────────────────────────────

interface RowProps {
  ev:          ArgusEvent
  isLast:      boolean
  isActive:    boolean   // currently displayed event → accent fill, rail, bold title
  accentColor: string
  isNew:       boolean
  nudgeGen:    number
  onSelect:    (id: string) => void
}

function TimelineRow({ ev, isLast, isActive, accentColor, isNew, nudgeGen, onSelect }: RowProps) {
  const { i18n } = useTranslation()
  const sym   = eventSymbol(ev)
  const color = sym.color
  const icon  = sym.glyph

  const prevNudgeGen = useRef(nudgeGen)
  const [nudging, setNudging] = useState(false)
  const rowRef = useRef<HTMLButtonElement>(null)
  const decorativeFx = useAppStore((st) => st.decorativeFx)

  useEffect(() => {
    if (nudgeGen !== prevNudgeGen.current) {
      prevNudgeGen.current = nudgeGen
      setNudging(true)
      const t = setTimeout(() => setNudging(false), 420)
      return () => clearTimeout(t)
    }
  }, [nudgeGen])

  // Bring the selection into view and flash it.
  //
  // 'nearest' scrolled the minimum possible amount, so a row just off the edge
  // would stop flush against it and stay hard to spot. 'center' puts the
  // selection in the middle of the strip every time, which also reveals its
  // neighbours in both directions — the point of a timeline.
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (!isActive || !rowRef.current) return
    rowRef.current.scrollIntoView({
      block: 'center',
      behavior: decorativeFx ? 'smooth' : 'auto',
    })
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 620)
    return () => clearTimeout(t)
  }, [isActive, decorativeFx])

  const animation = isNew
    ? 'timelineSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) both'
    : nudging
      ? 'timelineNudgeDown 0.38s ease-out both'
      : undefined

  return (
    <button
      ref={rowRef}
      data-timeline-row
      data-active={isActive}
      onClick={() => { if (!isActive) onSelect(ev.id) }}
      style={{
        display:     'block',
        width:       '100%',
        textAlign:   'left',
        // The active row is the operator's "you are here". At 6% alpha it was
        // effectively invisible, so the strip read as an undifferentiated list.
        background:  isActive ? `${accentColor}24` : 'none',
        border:      'none',
        borderBottom: isLast ? 'none' : `1px solid ${color}0e`,
        borderLeft:  isActive ? `3px solid ${accentColor}` : '3px solid transparent',
        padding:     '8px 8px 8px 11px',
        cursor:      isActive ? 'default' : 'pointer',
        position:    'relative',
        fontFamily:  'JetBrains Mono, monospace',
        transition:  'background 0.12s',
        animation,
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = `${color}0a`) }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'none') }}
    >
      {/* Selection flash. An overlay rather than an animated background, so the
          keyframe only touches opacity and the accent colour can stay inline.
          Opacity-only also makes it the least motion-sensitive cue available —
          it says "the selection moved here" without anything sliding. */}
      {flash && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: accentColor,
            pointerEvents: 'none',
            animation: 'timelineSelectFlash 0.62s ease-out both',
          }}
        />
      )}

      {/* Timeline spine line */}
      <div style={{
        position: 'absolute', left: -1, top: 0,
        bottom: isLast ? '50%' : 0, width: 1,
        background: `linear-gradient(180deg, ${color}40, ${color}18)`,
      }} />
      {/* Timeline node dot — filled circle when active */}
      <div style={{
        position: 'absolute', left: -5, top: '50%',
        transform: 'translateY(-50%)',
        width: isActive ? 9 : 7,
        height: isActive ? 9 : 7,
        borderRadius: '50%',
        background: isActive ? accentColor : color,
        boxShadow: isActive
          ? `0 0 10px ${accentColor}cc, 0 0 4px ${accentColor}`
          : isNew ? `0 0 8px ${color}cc` : `0 0 5px ${color}88`,
        transition: 'all 0.2s',
      }} />

      {/* Header row: icon · time · intensity dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <span style={{ fontSize: 11, color, lineHeight: 1 }}>{icon}</span>
        <span style={{
          fontSize: 10, letterSpacing: '0.06em',
          color: isActive ? accentColor : '#2a4060',
        }}>
          {relativeTime(ev.published_at)}
        </span>
        <span style={{
          marginLeft: 'auto',
          width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
          background: severityColor(ev.intensity),
        }} />
      </div>

      {/* Title */}
      <p style={{
        margin: 0, fontSize: 11, lineHeight: 1.35,
        color: isActive ? '#dce9f2' : '#7a9ab0',
        fontWeight: isActive ? 700 : 400,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
        overflow: 'hidden',
      }}>
        {eventTitle(ev, i18n.language)}
      </p>
    </button>
  )
}

// ── Container ──────────────────────────────────────────────────────────────────

export interface EventTimelineProps {
  /** All events to show (current event already included, sorted newest-first) */
  events:        ArgusEvent[]
  loading:       boolean
  accentColor:   string
  activeEventId: string       // id of the currently displayed event
  onSelect:      (id: string) => void
  isOpen:        boolean
  onToggle:      () => void
}

export function EventTimeline({
  events, loading, accentColor, activeEventId, onSelect, isOpen, onToggle,
}: EventTimelineProps) {
  // Track new arrivals for slide-in + nudge
  const prevIdsRef  = useRef<Set<string>>(new Set())
  const [newIds,   setNewIds]   = useState<Set<string>>(new Set())
  const [nudgeGen, setNudgeGen] = useState(0)
  const isFirstRender = useRef(true)

  useEffect(() => {
    const currentIds = new Set(events.map(e => e.id))
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevIdsRef.current = currentIds
      return
    }
    const arriving = events.filter(e => !prevIdsRef.current.has(e.id))
    prevIdsRef.current = currentIds
    if (arriving.length === 0) return

    const ids = new Set(arriving.map(e => e.id))
    setNewIds(prev => new Set([...prev, ...ids]))
    setNudgeGen(g => g + 1)
    const t = setTimeout(() => {
      setNewIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
    }, 700)
    return () => clearTimeout(t)
  }, [events])

  const handleToggle = useCallback(onToggle, [onToggle])

  if (!loading && events.length === 0) return null
  const count = loading ? '…' : events.length

  // ── Collapsed tab ──────────────────────────────────────────────────────────
  // Chevrons follow where the strip actually moves, not the side it is docked
  // on: the panel's left edge is anchored, so opening the strip grows it to the
  // right (▶) and closing it pulls back to the left (◀).
  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        title="Expand timeline"
        style={{
          width: 20, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'rgba(2,6,14,0.97)', border: 'none',
          borderLeft: `1px solid ${accentColor}18`,
          borderRadius: '0 4px 4px 0',
          cursor: 'pointer', padding: '10px 0', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accentColor}08` }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(2,6,14,0.97)' }}
      >
        <span style={{ color: accentColor, fontSize: 10, opacity: 0.7 }}>▶</span>
        <span style={{
          fontSize: 10, letterSpacing: '0.1em', color: '#2a4060',
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
          writingMode: 'vertical-rl', textOrientation: 'mixed',
          transform: 'rotate(180deg)', userSelect: 'none',
        }}>
          TIMELINE · {count}
        </span>
      </button>
    )
  }

  // ── Expanded strip ─────────────────────────────────────────────────────────
  return (
    <div style={{
      width: 172, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      borderLeft: `1px solid ${accentColor}18`,
      background: 'rgba(2,6,14,0.97)',
      borderRadius: '0 4px 4px 0',
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 3rem)',
    }}>
      {/* Header */}
      <div style={{
        padding: '9px 10px 7px',
        borderBottom: `1px solid ${accentColor}18`,
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <span style={{ color: accentColor, fontSize: 10, opacity: 0.6 }}>◈</span>
        <span style={{
          fontSize: 10, letterSpacing: '0.12em', color: '#2a4060',
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, flex: 1,
        }}>
          TIMELINE · {count}
        </span>
        <button
          onClick={handleToggle}
          title="Collapse"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#2a4060', fontSize: 11, lineHeight: 1, padding: '1px 2px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2a4060' }}
        >◀</button>
      </div>

      {/* Scrollable list */}
      <div
        data-timeline-scroll
        style={{
        overflowY: 'auto', flex: 1, minHeight: 0,
        scrollbarWidth: 'thin', scrollbarColor: `${accentColor}50 transparent`,
      }}>
        {loading && (
          <div style={{ padding: '12px 10px', color: '#2a4060', fontSize: 10, letterSpacing: '0.08em' }}>
            LOADING…
          </div>
        )}
        {events.map((ev, i) => (
          <TimelineRow
            key={ev.id}
            ev={ev}
            isLast={i === events.length - 1}
            isActive={ev.id === activeEventId}
            accentColor={accentColor}
            isNew={newIds.has(ev.id)}
            nudgeGen={newIds.has(ev.id) ? 0 : nudgeGen}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
