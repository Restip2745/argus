/**
 * EventTimeline — left-strip timeline for EventPanel.
 *
 * Shows ALL events in chronological order (newest first): the currently
 * displayed event is included and marked with a bookmark indicator (▶).
 * Clicking a row fires onSelect(id) which drives the slide animation in
 * EventPanel.  Clicking the already-active row is a no-op.
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { CATEGORY_ICON, CATEGORY_COLOR } from '../../data/categoryConfig'
import type { ArgusEvent } from '../../types'

const INTENSITY_COLOR: Record<string, string> = {
  LOW:      '#4a6fa5',
  MODERATE: '#ff9c2a',
  HIGH:     '#ff6b35',
  CRITICAL: '#ff4d4d',
}

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
  isActive:    boolean   // currently displayed event → show bookmark
  accentColor: string
  isNew:       boolean
  nudgeGen:    number
  onSelect:    (id: string) => void
}

function TimelineRow({ ev, isLast, isActive, accentColor, isNew, nudgeGen, onSelect }: RowProps) {
  const color = CATEGORY_COLOR[ev.category] ?? '#4a6070'
  const icon  = CATEGORY_ICON[ev.category]  ?? '◉'

  const prevNudgeGen = useRef(nudgeGen)
  const [nudging, setNudging] = useState(false)
  const rowRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (nudgeGen !== prevNudgeGen.current) {
      prevNudgeGen.current = nudgeGen
      setNudging(true)
      const t = setTimeout(() => setNudging(false), 420)
      return () => clearTimeout(t)
    }
  }, [nudgeGen])

  // Scroll active row into view when it becomes active
  useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isActive])

  const animation = isNew
    ? 'timelineSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) both'
    : nudging
      ? 'timelineNudgeDown 0.38s ease-out both'
      : undefined

  return (
    <button
      ref={rowRef}
      onClick={() => { if (!isActive) onSelect(ev.id) }}
      style={{
        display:     'block',
        width:       '100%',
        textAlign:   'left',
        background:  isActive ? `${accentColor}0f` : 'none',
        border:      'none',
        borderBottom: isLast ? 'none' : `1px solid ${color}0e`,
        borderLeft:  isActive ? `2px solid ${accentColor}` : '2px solid transparent',
        padding:     '8px 8px 8px 12px',
        cursor:      isActive ? 'default' : 'pointer',
        position:    'relative',
        fontFamily:  'JetBrains Mono, monospace',
        transition:  'background 0.12s',
        animation,
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget.style.background = `${color}0a`) }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget.style.background = 'none') }}
    >
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

      {/* Header row: icon · time · intensity dot · bookmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
        <span style={{ fontSize: 9, color, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 7, color: '#2a4060', letterSpacing: '0.06em' }}>
          {relativeTime(ev.published_at)}
        </span>
        <span style={{
          marginLeft: 'auto',
          width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
          background: INTENSITY_COLOR[ev.intensity] ?? '#4a6fa5',
        }} />
        {/* Bookmark ▶ marks the currently displayed event */}
        {isActive && (
          <span style={{
            fontSize: 7,
            color: accentColor,
            lineHeight: 1,
            marginLeft: 2,
            opacity: 0.9,
          }}>▶</span>
        )}
      </div>

      {/* Title */}
      <p style={{
        margin: 0, fontSize: 8.5, lineHeight: 1.35,
        color: isActive ? '#a8c4d8' : '#7a9ab0',
        fontWeight: isActive ? 600 : 400,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
        overflow: 'hidden',
      }}>
        {ev.title}
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
          borderRight: `1px solid ${accentColor}18`,
          borderRadius: '4px 0 0 4px',
          cursor: 'pointer', padding: '10px 0', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accentColor}08` }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(2,6,14,0.97)' }}
      >
        <span style={{ color: accentColor, fontSize: 8, opacity: 0.7 }}>▶</span>
        <span style={{
          fontSize: 7, letterSpacing: '0.1em', color: '#2a4060',
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
      borderRight: `1px solid ${accentColor}18`,
      background: 'rgba(2,6,14,0.97)',
      borderRadius: '4px 0 0 4px',
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 3rem)',
    }}>
      {/* Header */}
      <div style={{
        padding: '9px 10px 7px',
        borderBottom: `1px solid ${accentColor}18`,
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <span style={{ color: accentColor, fontSize: 8, opacity: 0.6 }}>◈</span>
        <span style={{
          fontSize: 7, letterSpacing: '0.12em', color: '#2a4060',
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, flex: 1,
        }}>
          TIMELINE · {count}
        </span>
        <button
          onClick={handleToggle}
          title="Collapse"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#2a4060', fontSize: 9, lineHeight: 1, padding: '1px 2px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2a4060' }}
        >◀</button>
      </div>

      {/* Scrollable list */}
      <div style={{
        overflowY: 'auto', flex: 1, minHeight: 0,
        scrollbarWidth: 'thin', scrollbarColor: `${accentColor}50 transparent`,
      }}>
        {loading && (
          <div style={{ padding: '12px 10px', color: '#2a4060', fontSize: 8, letterSpacing: '0.08em' }}>
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
