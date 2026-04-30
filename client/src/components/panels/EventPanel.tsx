/**
 * EventPanel — orchestration shell.
 *
 * Responsibilities:
 *  • Drag / position — via usePanelDrag
 *  • SVG tail line   — via PanelTail
 *  • Slide animation when navigating the timeline
 *  • Merges current event into the sorted timeline list
 *  • Delegates rendering to EventTimeline + EventPanelBody
 */
import { useRef, useState, useEffect, useMemo, useCallback } from 'react'

import { useAppStore }        from '../../store'
import { useAgentQuery }      from '../../hooks/useAgentQuery'
import { usePopoutWindow }    from '../../hooks/usePopoutWindow'
import { useRelatedEvents }   from '../../hooks/useRelatedEvents'
import { usePanelDrag }             from '../../hooks/usePanelDrag'
import { useLayerAutoActivation }   from '../../hooks/useLayerAutoActivation'
import { resolveCountryName, getCountryCentroid } from '../../data/countryData'
import { EventTimeline }      from './EventTimeline'
import { EventPanelBody }     from './EventPanelBody'
import { Panel }              from './Panel'
import { PanelTail }          from './PanelTail'
import type { ArgusEvent }    from '../../types'

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
  const activePanelId       = useAppStore((s) => s.activePanelId)
  const events              = useAppStore((s) => s.events)
  const setActivePanelId    = useAppStore((s) => s.setActivePanelId)
  const goBack              = useAppStore((s) => s.goBack)
  const focusOnEarthSurface = useAppStore((s) => s.focusOnEarthSurface)
  const focusOn             = useAppStore((s) => s.focusOn)
  const setSelectedCountry  = useAppStore((s) => s.setSelectedCountry)

  // ── Drag / position ────────────────────────────────────────────────────────
  const { panelRef, pos, dragging, onHeaderMouseDown, zIndex, handleBringToFront, uiScale } =
    usePanelDrag({
      panelKey:   'event',
      defaultPos: {
        x: Math.max(20, window.innerWidth  - 380),
        y: Math.max(80, window.innerHeight - 600),
      },
    })

  const [hovered, setHovered] = useState(false)

  const { open: popoutOpen, isPopped } = usePopoutWindow('event')
  const { history: agentHistory, loading: agentLoading, error: agentError, ask: agentAsk } = useAgentQuery()
  const { events: relatedEvents, loading: relatedLoading } = useRelatedEvents(activePanelId)

  // ── Timeline open/close ────────────────────────────────────────────────────
  const [timelineOpen, setTimelineOpen] = useState(true)

  // ── Agent ──────────────────────────────────────────────────────────────────
  const [agentInput, setAgentInput] = useState('')
  const agentScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    agentScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [agentHistory])

  // ── Current event (always from activePanelId) ──────────────────────────────
  const event = events.find((e) => e.id === activePanelId)

  // ── Merged timeline: current event + related, sorted newest-first ──────────
  const relatedIdsKey = useMemo(() => relatedEvents.map((e) => e.id).join(','), [relatedEvents])
  const allTimelineEvents = useMemo<ArgusEvent[]>(() => {
    if (!event) return relatedEvents
    const dedupd = relatedEvents.some((e) => e.id === event.id)
      ? relatedEvents
      : [event, ...relatedEvents]
    return [...dedupd].sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0
      return tb - ta
    })
  }, [relatedIdsKey, event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const allTimelineEventsRef = useRef(allTimelineEvents)
  allTimelineEventsRef.current = allTimelineEvents

  // ── Slide animation state ──────────────────────────────────────────────────
  const [displayedEventId, setDisplayedEventId] = useState(activePanelId)
  const [slideDir,         setSlideDir]          = useState<'up' | 'down'>('down')
  const [outgoingEvent,    setOutgoingEvent]      = useState<ArgusEvent | null>(null)
  const [copied,           setCopied]             = useState(false)
  const displayedEventIdRef = useRef(displayedEventId)
  displayedEventIdRef.current = displayedEventId
  const isFirstNavRef    = useRef(true)
  const eventsRef        = useRef(events)
  eventsRef.current      = events
  const pendingDirRef    = useRef<'up' | 'down'>('down')

  useEffect(() => {
    if (!activePanelId) return
    if (isFirstNavRef.current) { isFirstNavRef.current = false; setDisplayedEventId(activePanelId); return }
    if (activePanelId === displayedEventIdRef.current) return
    const leaving = eventsRef.current.find((e) => e.id === displayedEventIdRef.current) ?? null
    setSlideDir(pendingDirRef.current)
    setOutgoingEvent(leaving)
    setDisplayedEventId(activePanelId)
  }, [activePanelId])

  const displayedEvent = events.find((e) => e.id === displayedEventId) ?? event

  const agentContext = useMemo(() => {
    if (!displayedEvent) return ''
    return [
      `Event: ${displayedEvent.title_zh || displayedEvent.title}`,
      `Category: ${displayedEvent.category}`,
      `Intensity: ${displayedEvent.intensity}`,
      `Location: ${displayedEvent.location_label ?? 'Unknown'}`,
      `Source: ${displayedEvent.source}`,
      displayedEvent.summary_zh ? `Summary: ${displayedEvent.summary_zh}` : '',
      displayedEvent.actors?.length ? `Actors: ${displayedEvent.actors.join(', ')}` : '',
      displayedEvent.lat !== null ? `Coordinates: ${displayedEvent.lat?.toFixed(3)}, ${displayedEvent.lng?.toFixed(3)}` : '',
    ].filter(Boolean).join('\n')
  }, [displayedEvent])

  const suggestedQueries = useMemo(() => {
    if (!displayedEvent) return []
    return (CATEGORY_QUERIES[displayedEvent.category] ?? []).slice(0, 4)
  }, [displayedEvent])

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportEvent = useCallback(() => {
    if (!displayedEvent) return
    const e = displayedEvent
    const md = [
      `# ${e.title}`, '',
      `**Category:** ${e.category.replace(/_/g, ' ')}  `,
      `**Intensity:** ${e.intensity}  `,
      `**Source:** ${e.source}  `,
      `**Published:** ${e.published_at ?? '—'}  `,
      e.location_label ? `**Location:** ${e.location_label}  ` : '',
      e.heat_score != null ? `**Heat Score:** ${e.heat_score.toFixed(2)}  ` : '',
      e.reliability ? `**Reliability:** ${e.reliability}  ` : '',
      '', e.summary_zh ? `## Summary\n\n${e.summary_zh}` : '',
      e.actors?.length ? `\n## Actors\n\n${e.actors.join(', ')}` : '',
      e.tags?.length   ? `\n## Tags\n\n${e.tags.join(', ')}`   : '',
      '', `## Source\n\n[${e.source}](${e.url})`,
    ].filter((l) => l !== null).join('\n').trim()
    navigator.clipboard.writeText(md).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }, [displayedEvent])

  // ── Context-aware layer activation ────────────────────────────────────────
  useLayerAutoActivation(displayedEvent)

  // ── Focus ──────────────────────────────────────────────────────────────────
  function triggerFocus() {
    if (!displayedEvent) return
    const coords = resolveEventLatLng(displayedEvent)
    if (coords && focusOnEarthSurface) focusOnEarthSurface(coords.lat, coords.lng)
    else if (displayedEvent.body && displayedEvent.body !== 'earth' && focusOn)
      focusOn(displayedEvent.body as import('../../types').CelestialBodyName)
  }
  useEffect(() => { triggerFocus() }, [activePanelId]) // eslint-disable-line react-hooks/exhaustive-deps

  const canFocus = !!(displayedEvent &&
    (resolveEventLatLng(displayedEvent) !== null || (displayedEvent.body && displayedEvent.body !== 'earth')))

  // ── SVG tail — reads via ref each rAF tick ─────────────────────────────────
  const eventRef   = useRef(event)
  eventRef.current = event
  const getEventLatLng = useCallback((): { lat: number; lng: number } | null => {
    const ev = eventRef.current
    if (!ev) return null
    return resolveEventLatLng(ev)
  }, [])

  if (!event) return null

  const accentColor    = CATEGORY_COLOR[displayedEvent?.category ?? event.category] ?? '#00d4ff'
  const intensityColor = INTENSITY_COLOR[displayedEvent?.intensity ?? event.intensity] ?? '#4a6fa5'
  const hasTimeline    = relatedLoading || allTimelineEvents.length > 0

  const exitAnim  = outgoingEvent
    ? (slideDir === 'up' ? 'scrollUpExit 0.28s ease-in-out forwards' : 'scrollDownExit 0.28s ease-in-out forwards')
    : undefined
  const enterAnim = outgoingEvent
    ? (slideDir === 'up' ? 'scrollUpEnter 0.28s ease-in-out forwards' : 'scrollDownEnter 0.28s ease-in-out forwards')
    : undefined

  return (
    <>
      {/* ── SVG tail ── */}
      <PanelTail
        panelRef={panelRef}
        getLatLng={getEventLatLng}
        color={accentColor}
        zIndex={zIndex}
        filterId="tailGlowEvent"
      />

      {/* ── Outer positioning wrapper (flex row: timeline + card) ── */}
      <div
        ref={panelRef}
        onMouseDown={handleBringToFront}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position:   'fixed',
          left:       pos.x,
          top:        pos.y,
          zIndex,
          display:    'flex',
          flexDirection: 'row',
          cursor:     dragging ? 'grabbing' : 'default',
          transition: dragging ? 'none' : 'box-shadow 0.2s',
          boxShadow:  hovered
            ? `0 0 0 1px ${accentColor}30, 0 8px 32px rgba(0,0,0,0.7), 0 0 24px ${accentColor}18`
            : `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,180,255,0.1)`,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize:   '12px',
        }}
      >
        {/* Left: timeline strip */}
        {hasTimeline && (
          <EventTimeline
            events={allTimelineEvents}
            loading={relatedLoading}
            accentColor={accentColor}
            activeEventId={displayedEventId ?? ''}
            onSelect={(id) => {
              const sorted = allTimelineEventsRef.current
              const curIdx = sorted.findIndex((e) => e.id === (displayedEventIdRef.current ?? ''))
              const newIdx = sorted.findIndex((e) => e.id === id)
              pendingDirRef.current = (newIdx !== -1 && curIdx !== -1 && newIdx < curIdx) ? 'up' : 'down'
              setActivePanelId(id)
            }}
            isOpen={timelineOpen}
            onToggle={() => setTimelineOpen((o) => !o)}
          />
        )}

        {/* Right: main card via Panel base */}
        <Panel
          accentColor={accentColor}
          width={320}
          dragging={dragging}
          onHeaderMouseDown={onHeaderMouseDown}
          headerLeft={
            <span style={{
              fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase',
              fontWeight: 600, padding: '1px 5px', borderRadius: '2px',
              color: intensityColor,
              border: `1px solid ${intensityColor}40`,
              background: `${intensityColor}12`,
            }}>
              {displayedEvent?.intensity ?? event.intensity}
            </span>
          }
          title={<>{(displayedEvent?.category ?? event.category).replace(/_/g, ' ')}</>}
          headerControls={
            <>
              <button
                onClick={exportEvent}
                title="Export as Markdown"
                style={{
                  background:   copied ? 'rgba(57,255,138,0.12)' : 'none',
                  border:       copied ? '1px solid rgba(57,255,138,0.4)' : '1px solid transparent',
                  borderRadius: '2px',
                  color:        copied ? '#39ff8a' : '#4a6070',
                  cursor: 'pointer', fontSize: '9px', lineHeight: 1,
                  padding: '1px 5px', transition: 'all 0.15s',
                  fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
                }}
              >{copied ? '✓' : '↓ MD'}</button>
              <button
                onClick={popoutOpen}
                title="Open in new window"
                style={{
                  background: 'none', border: 'none',
                  color: isPopped ? '#00d4ff' : '#4a6070',
                  cursor: 'pointer', fontSize: '10px', lineHeight: 1,
                  padding: '1px 3px', transition: 'color 0.15s',
                }}
              >⊡</button>
            </>
          }
          onClose={() => setActivePanelId(null)}
          style={{ flexShrink: 0, boxShadow: 'none' }}
        >
          {/* Animated body clip container */}
          <div style={{
            overflow: 'hidden', position: 'relative',
            height: `calc(${80 / uiScale}vh - 5.6rem)`,
          }}>
            {/* Outgoing event — absolute overlay, exits */}
            {outgoingEvent && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                animation: exitAnim, pointerEvents: 'none', zIndex: 1,
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
                />
              </div>
            )}
            {/* Incoming event — in-flow, enters */}
            <div onAnimationEnd={() => setOutgoingEvent(null)} style={{ animation: enterAnim }}>
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
                />
              )}
            </div>
          </div>
        </Panel>
      </div>
    </>
  )
}
