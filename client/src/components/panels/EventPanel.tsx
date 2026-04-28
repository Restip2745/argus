/**
 * EventPanel — orchestration shell.
 *
 * Responsibilities:
 *  • Drag / position state
 *  • SVG tail line (rAF loop)
 *  • Slide animation state when navigating the timeline
 *  • Merges current event into the sorted timeline list
 *  • Delegates rendering to EventTimeline + EventPanelBody
 */
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { useAgentQuery } from '../../hooks/useAgentQuery'
import { usePopoutWindow } from '../../hooks/usePopoutWindow'
import { useRelatedEvents } from '../../hooks/useRelatedEvents'
import { useDraggable } from '../../hooks/useDraggable'
import { resolveCountryName, getCountryCentroid } from '../../data/countryData'
import { projectLatLng, panelEdgeAnchor } from '../../hooks/useGlobeProjection'
import { EventTimeline } from './EventTimeline'
import { EventPanelBody } from './EventPanelBody'
import type { ArgusEvent } from '../../types'

const CATEGORY_QUERIES: Record<string, string[]> = {
  ARMED_CONFLICT: ['升級風險評估', '停火可能性分析', '國際介入機率', '平民傷亡趨勢'],
  POLITICAL:      ['政局穩定度評估', '選舉影響分析', '盟友反應預測', '外交制裁可能性'],
  ECONOMIC:       ['市場衝擊評估', '供應鏈風險', '貨幣匯率影響', '貿易夥伴反應'],
  SOCIAL:         ['社會穩定指數', '人口遷移趨勢', '媒體輿論走向', '國際關注度'],
  SCIENCE_TECH:   ['技術擴散風險', '軍事應用潛力', '出口管制衝擊', '競爭優勢變化'],
  ENVIRONMENT:    ['人道影響評估', '資源競爭加劇', '區域穩定影響', '氣候安全連結'],
  HEALTH:         ['跨境傳播風險', '醫療系統壓力', '供應鏈中斷', '國際協調機制'],
  CRIME_SECURITY: ['情報網路滲透', '跨境執法合作', '金融制裁效力', '恐攻升級風險'],
  SPACE:          ['戰略軌道影響', '太空軍事化風險', '衛星通訊中斷', '國際條約框架'],
}

const INTENSITY_COLOR: Record<string, string> = {
  LOW:      '#4a6fa5',
  MODERATE: '#ff9c2a',
  HIGH:     '#ff6b35',
  CRITICAL: '#ff4d4d',
}

const CATEGORY_COLOR: Record<string, string> = {
  ARMED_CONFLICT: '#ff4d4d',
  POLITICAL:      '#ff9c2a',
  ECONOMIC:       '#ffd700',
  SOCIAL:         '#c8cdd2',
  SCIENCE_TECH:   '#9b6dff',
  ENVIRONMENT:    '#39ff8a',
  HEALTH:         '#a0c4ff',
  CRIME_SECURITY: '#6a8090',
  SPACE:          '#00d4ff',
}

// ── helpers ────────────────────────────────────────────────────────────────────

function resolveEventLatLng(ev: ArgusEvent): { lat: number; lng: number } | null {
  if (ev.lat !== null && ev.lng !== null) return { lat: ev.lat, lng: ev.lng }
  if (ev.location_label) {
    const direct = getCountryCentroid(ev.location_label)
    if (direct) return direct
    const key = resolveCountryName(ev.location_label)
    if (key) { const c = getCountryCentroid(key); if (c) return c }
  }
  return null
}

// ── Component ──────────────────────────────────────────────────────────────────

export function EventPanel() {
  const { t } = useTranslation()
  const activePanelId      = useAppStore(s => s.activePanelId)
  const events             = useAppStore(s => s.events)
  const setActivePanelId   = useAppStore(s => s.setActivePanelId)
  const goBack             = useAppStore(s => s.goBack)
  const focusOnEarthSurface = useAppStore(s => s.focusOnEarthSurface)
  const focusOn            = useAppStore(s => s.focusOn)
  const panelZ             = useAppStore(s => s.panelZ)
  const bringToFront       = useAppStore(s => s.bringToFront)
  const setSelectedCountry = useAppStore(s => s.setSelectedCountry)
  const uiScale            = useAppStore(s => s.uiScale)

  const { open: popoutOpen, isPopped } = usePopoutWindow('event')
  const { history: agentHistory, loading: agentLoading, error: agentError, ask: agentAsk } = useAgentQuery()
  const { events: relatedEvents, loading: relatedLoading } = useRelatedEvents(activePanelId)

  // ── Drag ──────────────────────────────────────────────────────────────────
  const cardRef        = useRef<HTMLDivElement>(null)
  const uiScaleRef     = useRef(uiScale)
  uiScaleRef.current   = uiScale
  const [hovered,      setHovered]    = useState(false)
  const [dragOffset,   setDragOffset] = useState({ x: 0, y: 0 })
  const dragOffsetRef  = useRef(dragOffset)
  dragOffsetRef.current = dragOffset
  const { onMouseDown: startDrag, dragging: isDragging } = useDraggable()

  function handleHeaderMouseDown(e: React.MouseEvent) {
    const rect   = cardRef.current?.getBoundingClientRect()
    const scale  = uiScaleRef.current
    const W = window.innerWidth / scale, H = window.innerHeight / scale
    const rLeft   = rect ? rect.left   / scale : 0
    const rRight  = rect ? rect.right  / scale : W
    const rTop    = rect ? rect.top    / scale : 0
    const rBottom = rect ? rect.bottom / scale : H
    const { x: initX, y: initY } = dragOffsetRef.current
    const startX = e.clientX / scale, startY = e.clientY / scale
    const minX = rect ? initX - rLeft        : -Infinity
    const maxX = rect ? initX + (W - rRight) :  Infinity
    const minY = rect ? initY - rTop         : -Infinity
    const maxY = rect ? initY + (H - rBottom):  Infinity
    startDrag(e, (ev) => {
      const s = uiScaleRef.current
      setDragOffset({
        x: Math.max(minX, Math.min(maxX, initX + ev.clientX / s - startX)),
        y: Math.max(minY, Math.min(maxY, initY + ev.clientY / s - startY)),
      })
    })
  }

  // ── Timeline open/close ───────────────────────────────────────────────────
  const [timelineOpen, setTimelineOpen] = useState(true)

  // ── Agent ──────────────────────────────────────────────────────────────────
  const [agentInput, setAgentInput] = useState('')
  const agentScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    agentScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [agentHistory])

  // ── Current event (always from activePanelId) ─────────────────────────────
  const event = events.find(e => e.id === activePanelId)

  // ── Merged timeline: current event + related, sorted newest-first ──────────
  // Stable dep: only re-sort when the set of IDs or the current event changes
  const relatedIdsKey = useMemo(() => relatedEvents.map(e => e.id).join(','), [relatedEvents])
  const allTimelineEvents = useMemo<ArgusEvent[]>(() => {
    if (!event) return relatedEvents
    const dedupd = relatedEvents.some(e => e.id === event.id)
      ? relatedEvents
      : [event, ...relatedEvents]
    return [...dedupd].sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0
      return tb - ta
    })
  }, [relatedIdsKey, event?.id])

  const allTimelineEventsRef = useRef(allTimelineEvents)
  allTimelineEventsRef.current = allTimelineEvents

  // ── Slide animation state ─────────────────────────────────────────────────
  const [displayedEventId, setDisplayedEventId] = useState(activePanelId)
  const [slideDir,      setSlideDir]      = useState<'up' | 'down'>('down')
  const [outgoingEvent, setOutgoingEvent] = useState<ArgusEvent | null>(null)
  const [copied, setCopied]               = useState(false)
  const displayedEventIdRef = useRef(displayedEventId)
  displayedEventIdRef.current = displayedEventId
  const isFirstNavRef = useRef(true)
  const eventsRef = useRef(events)
  eventsRef.current = events
  // Direction is computed at click-time (before relatedEvents resets) and stored here
  const pendingDirRef = useRef<'up' | 'down'>('down')

  useEffect(() => {
    if (!activePanelId) return
    if (isFirstNavRef.current) {
      isFirstNavRef.current = false
      setDisplayedEventId(activePanelId)
      return
    }
    if (activePanelId === displayedEventIdRef.current) return

    // Direction was pre-computed at click time (see onSelect below)
    const leaving = eventsRef.current.find(e => e.id === displayedEventIdRef.current) ?? null
    setSlideDir(pendingDirRef.current)
    setOutgoingEvent(leaving)
    setDisplayedEventId(activePanelId)
  }, [activePanelId])

  // ── Derived from displayedEventId (the event now entering / in view) ─────
  const displayedEvent = events.find(e => e.id === displayedEventId) ?? event

  const agentContext = useMemo(() => {
    if (!displayedEvent) return ''
    const lines = [
      `Event: ${displayedEvent.title_zh || displayedEvent.title}`,
      `Category: ${displayedEvent.category}`,
      `Intensity: ${displayedEvent.intensity}`,
      `Location: ${displayedEvent.location_label ?? 'Unknown'}`,
      `Source: ${displayedEvent.source}`,
    ]
    if (displayedEvent.summary_zh) lines.push(`Summary: ${displayedEvent.summary_zh}`)
    if (displayedEvent.actors?.length) lines.push(`Actors: ${displayedEvent.actors.join(', ')}`)
    if (displayedEvent.lat !== null) lines.push(`Coordinates: ${displayedEvent.lat?.toFixed(3)}, ${displayedEvent.lng?.toFixed(3)}`)
    return lines.join('\n')
  }, [displayedEvent])

  const suggestedQueries = useMemo(() => {
    if (!displayedEvent) return []
    return (CATEGORY_QUERIES[displayedEvent.category] ?? []).slice(0, 4)
  }, [displayedEvent])

  // ── Export ────────────────────────────────────────────────────────────────
  const exportEvent = useCallback(() => {
    if (!displayedEvent) return
    const e = displayedEvent
    const md = [
      `# ${e.title}`,
      '',
      `**Category:** ${e.category.replace(/_/g, ' ')}  `,
      `**Intensity:** ${e.intensity}  `,
      `**Source:** ${e.source}  `,
      `**Published:** ${e.published_at ?? '—'}  `,
      e.location_label ? `**Location:** ${e.location_label}  ` : '',
      e.heat_score != null ? `**Heat Score:** ${e.heat_score.toFixed(2)}  ` : '',
      e.reliability ? `**Reliability:** ${e.reliability}  ` : '',
      '',
      e.summary_zh ? `## Summary\n\n${e.summary_zh}` : '',
      e.actors?.length ? `\n## Actors\n\n${e.actors.join(', ')}` : '',
      e.tags?.length   ? `\n## Tags\n\n${e.tags.join(', ')}` : '',
      '',
      `## Source\n\n[${e.source}](${e.url})`,
    ].filter(l => l !== null).join('\n').trim()

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }, [displayedEvent])

  // ── Focus ─────────────────────────────────────────────────────────────────
  function triggerFocus() {
    if (!displayedEvent) return
    const coords = resolveEventLatLng(displayedEvent)
    if (coords && focusOnEarthSurface) focusOnEarthSurface(coords.lat, coords.lng)
    else if (displayedEvent.body && displayedEvent.body !== 'earth' && focusOn)
      focusOn(displayedEvent.body as import('../../types').CelestialBodyName)
  }
  useEffect(() => { triggerFocus() }, [activePanelId]) // eslint-disable-line react-hooks/exhaustive-deps

  const canFocus = !!(displayedEvent && (resolveEventLatLng(displayedEvent) !== null || (displayedEvent.body && displayedEvent.body !== 'earth')))

  // ── SVG tail (rAF loop) ────────────────────────────────────────────────────
  const tailLineRef = useRef<SVGLineElement>(null)
  const tailDotRef  = useRef<SVGCircleElement>(null)
  const eventRef    = useRef(event)
  eventRef.current  = event

  useEffect(() => {
    let rafId: number
    function tick() {
      const panel = cardRef.current
      const line  = tailLineRef.current
      const dot   = tailDotRef.current
      const ev    = eventRef.current
      const hide  = () => { line?.setAttribute('opacity','0'); dot?.setAttribute('opacity','0'); rafId = requestAnimationFrame(tick) }
      if (!panel || !line || !dot || !ev) { hide(); return }
      let lat = ev.lat, lng = ev.lng
      if ((lat === null || lng === null) && ev.location_label) {
        const direct = getCountryCentroid(ev.location_label)
        if (direct) { lat = direct.lat; lng = direct.lng }
        else {
          const key = resolveCountryName(ev.location_label)
          if (key) { const c = getCountryCentroid(key); if (c) { lat = c.lat; lng = c.lng } }
        }
      }
      if (lat === null || lng === null) { hide(); return }
      const proj = projectLatLng(lat, lng)
      if (!proj || proj.behind) { hide(); return }
      const rect = panel.getBoundingClientRect()
      const { ax, ay } = panelEdgeAnchor(rect, proj.x, proj.y)
      line.setAttribute('x1', String(ax)); line.setAttribute('y1', String(ay))
      line.setAttribute('x2', String(proj.x)); line.setAttribute('y2', String(proj.y))
      line.setAttribute('opacity', '0.45')
      dot.setAttribute('cx', String(proj.x)); dot.setAttribute('cy', String(proj.y))
      dot.setAttribute('opacity', '0.7')
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  if (!event) return null

  const accentColor    = CATEGORY_COLOR[displayedEvent?.category ?? event.category] ?? '#00d4ff'
  const intensityColor = INTENSITY_COLOR[displayedEvent?.intensity ?? event.intensity] ?? '#4a6fa5'
  const dragging       = isDragging
  const hasTimeline    = relatedLoading || allTimelineEvents.length > 0

  // Simultaneous scroll animations
  const exitAnim  = outgoingEvent
    ? (slideDir === 'up' ? 'scrollUpExit 0.28s ease-in-out forwards' : 'scrollDownExit 0.28s ease-in-out forwards')
    : undefined
  const enterAnim = outgoingEvent
    ? (slideDir === 'up' ? 'scrollUpEnter 0.28s ease-in-out forwards' : 'scrollDownEnter 0.28s ease-in-out forwards')
    : undefined

  return (
    <>
    {/* ── SVG tail ── */}
    {createPortal(
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: (panelZ['event'] ?? 30) - 1, overflow: 'visible' }}>
        <defs>
          <filter id="tailGlowEvent" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <line ref={tailLineRef} stroke={accentColor} strokeWidth="1" strokeDasharray="5 4" opacity="0" filter="url(#tailGlowEvent)" />
        <circle ref={tailDotRef} r="3.5" fill={accentColor} opacity="0" filter="url(#tailGlowEvent)" />
      </svg>,
      document.body,
    )}

    {/* ── Panel ── */}
    <div
      ref={cardRef}
      onMouseDown={() => bringToFront('event')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute font-mono text-xs flex flex-row"
      style={{
        bottom: '1.5rem', right: '1.5rem',
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        transition: dragging ? 'none' : 'box-shadow 0.2s',
        boxShadow: hovered
          ? `0 0 0 1px ${accentColor}30, 0 8px 32px rgba(0,0,0,0.7), 0 0 24px ${accentColor}18`
          : `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,180,255,0.1)`,
        cursor: dragging ? 'grabbing' : 'default',
        zIndex: panelZ['event'] ?? 30,
      }}
    >
      {/* ── Timeline strip (left) ── */}
      {hasTimeline && (
        <EventTimeline
          events={allTimelineEvents}
          loading={relatedLoading}
          accentColor={accentColor}
          activeEventId={displayedEventId ?? ''}
          onSelect={(id) => {
            // Compute direction NOW while allTimelineEvents is still fully populated.
            // The useRelatedEvents hook resets to [] immediately on activePanelId change,
            // so we must capture direction before that happens.
            const sorted = allTimelineEventsRef.current
            const curIdx = sorted.findIndex(e => e.id === (displayedEventIdRef.current ?? ''))
            const newIdx = sorted.findIndex(e => e.id === id)
            pendingDirRef.current = (newIdx !== -1 && curIdx !== -1 && newIdx < curIdx) ? 'up' : 'down'
            setActivePanelId(id)
          }}
          isOpen={timelineOpen}
          onToggle={() => setTimelineOpen(o => !o)}
        />
      )}

      {/* ── Main card ── */}
      <div
        style={{ backgroundColor: '#04090e', position: 'relative', width: 320 }}
        className="border border-[rgba(0,180,255,0.14)] rounded overflow-hidden flex-shrink-0"
      >
        {/* Decorative accents */}
        <div className="absolute inset-0 pointer-events-none z-10" />
        <div className="absolute left-0 top-0 bottom-0 w-[2px] pointer-events-none z-10"
          style={{ background: `linear-gradient(180deg, transparent, ${accentColor}99, transparent)` }} />
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l pointer-events-none z-10" style={{ borderColor: accentColor + '80' }} />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r pointer-events-none z-10" style={{ borderColor: accentColor + '80' }} />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l pointer-events-none z-10" style={{ borderColor: accentColor + '80' }} />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r pointer-events-none z-10" style={{ borderColor: accentColor + '80' }} />

        <div style={{ margin: '4px' }}>

          {/* ── Header (drag handle — stays fixed, not animated) ── */}
          <div
            className="relative flex justify-between items-center px-3 py-2.5 border-b border-[rgba(0,180,255,0.1)] select-none"
            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleHeaderMouseDown}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[8px] tracking-widest uppercase font-semibold px-1.5 py-0.5 rounded"
                style={{ color: intensityColor, border: `1px solid ${intensityColor}40`, background: `${intensityColor}12` }}
              >
                {displayedEvent?.intensity ?? event.intensity}
              </span>
              <span className="text-[8px] tracking-widest uppercase" style={{ color: accentColor }}>
                {(displayedEvent?.category ?? event.category).replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={exportEvent}
                title="Export as Markdown"
                style={{
                  background: copied ? 'rgba(57,255,138,0.12)' : 'none',
                  border: copied ? '1px solid rgba(57,255,138,0.4)' : '1px solid transparent',
                  borderRadius: '2px',
                  color: copied ? '#39ff8a' : '#4a6070',
                  cursor: 'pointer', fontSize: '9px', lineHeight: 1,
                  padding: '1px 5px', transition: 'all 0.15s',
                  fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
                }}
              >{copied ? '✓' : '↓ MD'}</button>
              <button
                onClick={popoutOpen}
                title="Open in new window"
                style={{ background: 'none', border: 'none', color: isPopped ? '#00d4ff' : '#4a6070', cursor: 'pointer', fontSize: '10px', lineHeight: 1, padding: '1px 3px', transition: 'color 0.15s' }}
              >⊡</button>
              <button
                onClick={() => setActivePanelId(null)}
                className="text-[#4a6070] hover:text-[#00d4ff] transition-colors text-sm leading-none"
              >✕</button>
            </div>
          </div>

          {/* ── Animated body clip container — fixed height, scale-aware so it never overflows ── */}
          <div style={{ overflow: 'hidden', position: 'relative', height: `calc(${80 / uiScale}vh - 5.6rem)` }}>
            {/* Outgoing event — absolute overlay, exits */}
            {outgoingEvent && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                animation: exitAnim,
                pointerEvents: 'none',
                zIndex: 1,
              }}>
                <EventPanelBody
                  event={outgoingEvent}
                  accentColor={CATEGORY_COLOR[outgoingEvent.category] ?? '#00d4ff'}
                  onFocus={triggerFocus}
                  canFocus={false}
                  setSelectedCountry={setSelectedCountry}
                  agentHistory={[]}
                  agentLoading={false}
                  agentError={null}
                  agentInput=""
                  setAgentInput={() => {}}
                  suggestedQueries={[]}
                  agentContext=""
                  agentAsk={() => {}}
                  agentScrollRef={agentScrollRef}
                  t={t}
                />
              </div>
            )}
            {/* Incoming event — in-flow, enters */}
            <div
              onAnimationEnd={() => setOutgoingEvent(null)}
              style={{ animation: enterAnim }}
            >
              {displayedEvent && (
                <EventPanelBody
                  event={displayedEvent}
                  accentColor={accentColor}
                  onFocus={triggerFocus}
                  canFocus={canFocus}
                  onBack={goBack ?? undefined}
                  setSelectedCountry={setSelectedCountry}
                  agentHistory={agentHistory}
                  agentLoading={agentLoading}
                  agentError={agentError}
                  agentInput={agentInput}
                  setAgentInput={setAgentInput}
                  suggestedQueries={suggestedQueries}
                  agentContext={agentContext}
                  agentAsk={agentAsk}
                  agentScrollRef={agentScrollRef}
                  t={t}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  )
}
