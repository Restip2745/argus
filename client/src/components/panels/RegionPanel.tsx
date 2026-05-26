import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '../../store'
import type { ContextEntity } from '../../types'
import { useTranslation } from 'react-i18next'
import { getCountryInfo, getDynamicTags } from '../../data/countryData'
import { useAgentQuery } from '../../hooks/useAgentQuery'
import { usePopoutWindow } from '../../hooks/usePopoutWindow'
import { useWikiSummary } from '../../hooks/useWikiSummary'
import { usePanelDrag } from '../../hooks/usePanelDrag'
import { RegionPanelOverview } from './RegionPanelOverview'
import { RegionPanelAgent } from './RegionPanelAgent'
import { Panel } from './Panel'
import { PanelTail } from './PanelTail'

function formatGdp(gdpB: number): string {
  if (gdpB >= 1000) return `$${(gdpB / 1000).toFixed(1)}T`
  return `$${Math.round(gdpB)}B`
}
function formatPop(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}B`
  return `${m.toFixed(1)}M`
}

export function RegionPanel() {
  const { t } = useTranslation()
  const selectedCountry       = useAppStore((s) => s.selectedCountry)
  const setSelectedCountry    = useAppStore((s) => s.setSelectedCountry)
  const focusOnEarthSurface   = useAppStore((s) => s.focusOnEarthSurface)
  const events                = useAppStore((s) => s.events)
  const addContextEntity      = useAppStore((s) => s.addContextEntity)
  const contextEntities       = useAppStore((s) => s.contextEntities)

  // ── Drag / position ──────────────────────────────────────────────────────────
  const { panelRef, pos, setPos, dragging, onHeaderMouseDown, zIndex, handleBringToFront, uiScale } =
    usePanelDrag({ panelKey: 'region', defaultPos: { x: 20, y: 80 } })

  // Auto-focus on new country select
  useEffect(() => {
    if (selectedCountry && focusOnEarthSurface) {
      focusOnEarthSurface(selectedCountry.lat, selectedCountry.lng)
    }
  }, [selectedCountry?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const agentScrollRef                = useRef<HTMLDivElement>(null)

  // ── Card-flip state (country switch animation) ───────────────────────────────
  const [displayedCountry, setDisplayedCountry] = useState(selectedCountry)
  const [flipPhase, setFlipPhase]               = useState<'idle' | 'out' | 'in'>('idle')
  const pendingCountryRef   = useRef(selectedCountry)
  const displayedCountryRef = useRef(displayedCountry)
  displayedCountryRef.current = displayedCountry
  const isInitialMountRef   = useRef(true)
  const [panelEntered, setPanelEntered] = useState(false)  // true after pop-in completes

  useEffect(() => {
    const onResize = () => {
      const s  = uiScale
      const pw = panelRef.current?.offsetWidth  ?? 320
      const ph = panelRef.current?.offsetHeight ?? 400
      setPos((p) => ({
        x: Math.max(0, Math.min(window.innerWidth  / s - pw,            p.x)),
        y: Math.max(0, Math.min(window.innerHeight / s - Math.min(ph, 60), p.y)),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [uiScale, panelRef, setPos])

  // When uiScale changes, clamp panel position so the header stays inside the viewport
  useEffect(() => {
    const scale = uiScale
    const pw = panelRef.current?.offsetWidth  ?? 320
    const ph = panelRef.current?.offsetHeight ?? 400
    setPos((p) => ({
      x: Math.max(0, Math.min(window.innerWidth  / scale - pw,                p.x)),
      y: Math.max(0, Math.min(window.innerHeight / scale - Math.min(ph, 60),  p.y)),
    }))
  }, [uiScale]) // eslint-disable-line react-hooks/exhaustive-deps

  // Detect country switch → trigger flip; sync immediately on first mount or compare-mode changes
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      setDisplayedCountry(selectedCountry)
      return
    }
    if (!selectedCountry) {
      setDisplayedCountry(selectedCountry)
      setFlipPhase('idle')
      return
    }
    if (!displayedCountryRef.current) {
      // Panel just opened from null state
      setDisplayedCountry(selectedCountry)
      return
    }
    if (displayedCountryRef.current.name === selectedCountry.name) return
    // Different country while panel is open → card flip
    pendingCountryRef.current = selectedCountry
    setFlipPhase('out')
  }, [selectedCountry?.name])

  const { history, loading, error, ask } = useAgentQuery()
  const { open: popoutOpen, isPopped } = usePopoutWindow('region')

  // Derived values — computed before early return so hooks stay in a fixed order
  // Use displayedCountry for all render content so flip mid-point swap is seamless
  const info        = displayedCountry ? getCountryInfo(displayedCountry.name) : null
  const dynamicTags = displayedCountry ? getDynamicTags(displayedCountry.name, events) : []

  const recentEvents = useMemo(() => {
    if (!displayedCountry) return []
    const cutoff = Date.now() - 24 * 3600 * 1000
    return events.filter(e => {
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      if (ts < cutoff) return false
      const loc   = (e.location_label ?? '').toLowerCase()
      const cname = displayedCountry.name.toLowerCase()
      return loc.includes(cname) || cname.includes(loc.replace(/[()]/g, '').trim())
    }).slice(0, 6)
  }, [events, displayedCountry?.name])

  const agentContext = useMemo(() => {
    if (!displayedCountry) return ''
    const lines: string[] = [
      `Region: ${displayedCountry.name}`,
      `Coordinates: ${displayedCountry.lat.toFixed(2)}°, ${displayedCountry.lng.toFixed(2)}°`,
    ]
    if (info) {
      lines.push(`Capital: ${info.capital}`)
      lines.push(`Population: ${formatPop(info.populationM)}`)
      lines.push(`GDP: ${formatGdp(info.gdpB)}`)
      lines.push(`Government: ${info.govType.join(', ')}`)
      lines.push(`Stability Index: ${info.stability}/100`)
    }
    if (dynamicTags.length) lines.push(`Status: ${dynamicTags.join(', ')}`)
    if (recentEvents.length) {
      lines.push(`\nRecent events (24h):`)
      recentEvents.forEach(e => lines.push(`- [${e.category}] ${e.title_zh || e.title}`))
    }
    return lines.join('\n')
  }, [selectedCountry, info, dynamicTags, recentEvents])

  const suggestedQueries = useMemo(() => {
    const base = info?.queries ?? []
    const catSet = new Set(recentEvents.map(e => e.category))
    const extra: string[] = []
    if (catSet.has('ARMED_CONFLICT') && !base.some(q => q.includes('衝突') || q.includes('戰')))  extra.push('目前衝突態勢分析')
    if (catSet.has('ECONOMIC')       && !base.some(q => q.includes('經濟')))                        extra.push('經濟風險評估')
    if (catSet.has('POLITICAL')      && !base.some(q => q.includes('政治') || q.includes('政局'))) extra.push('政治穩定性分析')
    return [...base, ...extra].slice(0, 6)
  }, [info, recentEvents])

  // Scroll agent responses into view
  useEffect(() => {
    agentScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history])

  // Wikipedia summary — follows displayedCountry so it doesn't flash during flip
  const { data: wikiData, loading: wikiLoading } = useWikiSummary(
    displayedCountry ? displayedCountry.name : null
  )

  // Stable getLatLng for PanelTail — reads live state via refs
  const selectedCountryRef = useRef(selectedCountry)
  selectedCountryRef.current = selectedCountry

  const getRegionLatLng = useCallback((): { lat: number; lng: number } | null => {
    const c = selectedCountryRef.current
    return c ? { lat: c.lat, lng: c.lng } : null
  }, [])

  if (!selectedCountry) return null

  // Card-flip + pop-in animation end handler
  const handleFlipAnimEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === 'regionPanelIn') {
      // Initial pop-in done — remove the CSS class so it never replays
      setPanelEntered(true)
    } else if (e.animationName === 'cardFlipOut') {
      setDisplayedCountry(pendingCountryRef.current)
      setFlipPhase('in')
    } else if (e.animationName === 'cardFlipIn') {
      setFlipPhase('idle')
    }
  }

  const allTags = [...(info?.govType ?? []), ...dynamicTags]

  const regionAccent = '#00d4ff'

  return (
    <>
      {/* ── SVG tail ── */}
      <PanelTail
        panelRef={panelRef}
        getLatLng={getRegionLatLng}
        color={regionAccent}
        zIndex={zIndex}
        filterId="tailGlowRegion"
      />

      {/* ── Panel (handles position, styling, header, body) ── */}
      <Panel
        panelRef={panelRef}
        accentColor={regionAccent}
        onMouseDown={handleBringToFront}
        onAnimationEnd={handleFlipAnimEnd}
        className={panelEntered ? undefined : 'region-panel-enter'}
        dragging={dragging}
        onHeaderMouseDown={onHeaderMouseDown}
        title={
          <span style={{ color: regionAccent }}>
            ◈ {t('panel.region', 'REGION INTEL')}
          </span>
        }
        headerControls={
          <>
            {/* Add to context */}
            {displayedCountry && (() => {
              const regionId = `region-${displayedCountry.name}`
              const inContext = contextEntities.some(e => e.id === regionId)
              return (
                <button
                  onClick={() => {
                    const ce: ContextEntity = {
                      id: regionId,
                      type: 'region',
                      name: displayedCountry.name,
                      summary: info
                        ? `${info.capital} · Pop ${formatPop(info.populationM)} · GDP ${formatGdp(info.gdpB)} · Stability ${info.stability}/100`
                        : displayedCountry.name,
                    }
                    addContextEntity(ce)
                  }}
                  aria-label={inContext ? 'Already in context' : 'Add to context panel'}
                  title={inContext ? 'Already in context' : 'Add to context panel'}
                  disabled={inContext}
                  style={{
                    background: inContext ? 'rgba(0,255,204,0.12)' : 'none',
                    border: `1px solid ${inContext ? 'rgba(0,255,204,0.4)' : 'transparent'}`,
                    borderRadius: '2px',
                    color: inContext ? '#00ffcc' : '#4a6070',
                    cursor: inContext ? 'default' : 'pointer',
                    fontSize: '9px', lineHeight: 1,
                    padding: '1px 4px', transition: 'all 0.15s',
                    fontFamily: 'JetBrains Mono, monospace',
                    opacity: inContext ? 0.6 : 1,
                  }}
                >⊕</button>
              )
            })()}
            <button
              onClick={popoutOpen}
              aria-label={isPopped ? 'Panel is open in separate window' : 'Pop out to separate window'}
              title={isPopped ? 'Panel is open in separate window' : 'Pop out to separate window'}
              style={{ background: 'none', border: 'none', color: isPopped ? '#00d4ff' : '#4a6070', cursor: 'pointer', fontSize: '11px', lineHeight: 1 }}
            >⊡</button>
          </>
        }
        onClose={() => setSelectedCountry(null)}
        style={{
          position:   'fixed',
          left:       pos.x,
          top:        pos.y,
          zIndex,
          width:      '310px',
          maxHeight:  `calc(${100 / uiScale}vh - 100px)`,
          ...(flipPhase !== 'idle' && {
            animation:       flipPhase === 'out'
              ? 'cardFlipOut 0.17s ease-in forwards'
              : 'cardFlipIn 0.17s ease-out forwards',
            transformOrigin: 'center top',
          }),
        }}
      >
        {/* ── Scrollable content area ── */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.2) transparent' }}>

          {displayedCountry && (
            <RegionPanelOverview
              country={displayedCountry}
              info={info}
              allTags={allTags}
              recentEvents={recentEvents}
              focusOnEarthSurface={focusOnEarthSurface}
              wikiData={wikiData ?? null}
              wikiLoading={wikiLoading}
            />
          )}
        </div>

        {/* ── Agent section (fixed at bottom) ── */}
        <RegionPanelAgent
          history={history}
          loading={loading}
          error={error ?? null}
          suggestedQueries={suggestedQueries}
          agentContext={agentContext}
          ask={ask}
          agentScrollRef={agentScrollRef}
        />
      </Panel>
    </>
  )
}
