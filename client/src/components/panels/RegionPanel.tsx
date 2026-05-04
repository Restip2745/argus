import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '../../store'
import { useTranslation } from 'react-i18next'
import { getCountryInfo, getDynamicTags } from '../../data/countryData'
import { useAgentQuery } from '../../hooks/useAgentQuery'
import { usePopoutWindow } from '../../hooks/usePopoutWindow'
import { useWikiSummary } from '../../hooks/useWikiSummary'
import { usePanelDrag } from '../../hooks/usePanelDrag'
import { RegionPanelOverview } from './RegionPanelOverview'
import { RegionPanelAgent } from './RegionPanelAgent'
import { CompareCard, COMPARE_PALETTE, formatGdp, formatPop } from './RegionPanelCompare'
import { Panel } from './Panel'
import { PanelTail } from './PanelTail'

export function RegionPanel() {
  const { t } = useTranslation()
  const selectedCountry       = useAppStore((s) => s.selectedCountry)
  const setSelectedCountry    = useAppStore((s) => s.setSelectedCountry)
  const focusOnEarthSurface   = useAppStore((s) => s.focusOnEarthSurface)
  const events                = useAppStore((s) => s.events)
  const compareMode           = useAppStore((s) => s.compareMode)
  const setCompareMode        = useAppStore((s) => s.setCompareMode)
  const comparedCountries     = useAppStore((s) => s.comparedCountries)
  const removeComparedCountry = useAppStore((s) => s.removeComparedCountry)

  // ── Drag / position ──────────────────────────────────────────────────────────
  const { panelRef, pos, setPos, dragging, onHeaderMouseDown, zIndex, handleBringToFront, uiScale } =
    usePanelDrag({ panelKey: 'region', defaultPos: { x: 20, y: 80 } })

  // Auto-focus on new country select
  useEffect(() => {
    if (selectedCountry && focusOnEarthSurface) {
      focusOnEarthSurface(selectedCountry.lat, selectedCountry.lng)
    }
  }, [selectedCountry?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
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
      setWindowWidth(window.innerWidth)
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
    if (compareMode || !selectedCountry) {
      // No flip for compare mode or panel closing
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
  }, [selectedCountry?.name, compareMode])

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
    if (compareMode && comparedCountries.length > 0) {
      const sections = comparedCountries.map(c => {
        const ci = getCountryInfo(c.name)
        const lines = [`[${c.name}]`]
        if (ci) {
          lines.push(`  Capital: ${ci.capital}`)
          lines.push(`  Population: ${formatPop(ci.populationM)}`)
          lines.push(`  GDP: ${formatGdp(ci.gdpB)}`)
          lines.push(`  Government: ${ci.govType.join(', ')}`)
          lines.push(`  Stability: ${ci.stability}/100`)
        }
        return lines.join('\n')
      })
      return `Comparative intelligence report.\nCountries:\n${sections.join('\n\n')}`
    }
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
  }, [compareMode, comparedCountries, selectedCountry, info, dynamicTags, recentEvents])

  const suggestedQueries = useMemo(() => {
    if (compareMode && comparedCountries.length >= 2) {
      const names = comparedCountries.map(c => c.name)
      return [
        `比較 ${names.slice(0,2).join(' 與 ')} 的政治穩定性`,
        `${names.slice(0,2).join(' 和 ')} 的經濟實力對比`,
        `${names.slice(0,2).join(' 與 ')} 的外交關係分析`,
        '各國軍事能力比較',
        '貿易往來與相互依存',
        '地緣政治風險評估',
      ].slice(0, 6)
    }
    const base = info?.queries ?? []
    const catSet = new Set(recentEvents.map(e => e.category))
    const extra: string[] = []
    if (catSet.has('ARMED_CONFLICT') && !base.some(q => q.includes('衝突') || q.includes('戰')))  extra.push('目前衝突態勢分析')
    if (catSet.has('ECONOMIC')       && !base.some(q => q.includes('經濟')))                        extra.push('經濟風險評估')
    if (catSet.has('POLITICAL')      && !base.some(q => q.includes('政治') || q.includes('政局'))) extra.push('政治穩定性分析')
    return [...base, ...extra].slice(0, 6)
  }, [compareMode, comparedCountries, info, recentEvents])

  // Scroll agent responses into view
  useEffect(() => {
    agentScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history])

  // Wikipedia summary — follows displayedCountry so it doesn't flash during flip
  const { data: wikiData, loading: wikiLoading } = useWikiSummary(
    displayedCountry && !compareMode ? displayedCountry.name : null
  )

  // Stable getLatLng for PanelTail — reads live state via refs
  const selectedCountryRef = useRef(selectedCountry)
  selectedCountryRef.current = selectedCountry
  const compareModeRef = useRef(compareMode)
  compareModeRef.current = compareMode

  const getRegionLatLng = useCallback((): { lat: number; lng: number } | null => {
    if (compareModeRef.current) return null
    const c = selectedCountryRef.current
    return c ? { lat: c.lat, lng: c.lng } : null
  }, [])

  if (!selectedCountry && !compareMode) return null

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

  const MIN_CARD_W = 190
  const CARD_GAP   = 6
  const H_PAD      = 24
  const maxPanelW  = windowWidth - 100
  const compareColumns = compareMode
    ? Math.min(
        Math.max(1, Math.floor((maxPanelW - H_PAD + CARD_GAP) / (MIN_CARD_W + CARD_GAP))),
        Math.max(1, comparedCountries.length),
      )
    : 1
  const panelWidth = compareMode
    ? Math.min(maxPanelW, compareColumns * MIN_CARD_W + (compareColumns - 1) * CARD_GAP + H_PAD)
    : 310

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
          <span style={{ color: compareMode ? '#ff9c2a' : regionAccent }}>
            {compareMode ? '⊞ COMPARE MODE' : `◈ ${t('panel.region', 'REGION INTEL')}`}
          </span>
        }
        headerControls={
          <>
            <button
              onClick={() => setCompareMode(!compareMode)}
              title={compareMode ? 'Exit compare mode' : 'Enter compare mode'}
              style={{
                background:   compareMode ? 'rgba(255,156,42,0.15)' : 'rgba(0,212,255,0.06)',
                border:       `1px solid ${compareMode ? 'rgba(255,156,42,0.4)' : 'rgba(0,212,255,0.2)'}`,
                borderRadius: '2px',
                color:        compareMode ? '#ff9c2a' : '#4a6070',
                cursor: 'pointer', fontSize: '8px', padding: '2px 5px',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                transition: 'all 0.15s',
              }}
            >⊞</button>
            <button
              onClick={popoutOpen}
              title={isPopped ? 'Panel is open in separate window' : 'Pop out to separate window'}
              style={{ background: 'none', border: 'none', color: isPopped ? '#00d4ff' : '#4a6070', cursor: 'pointer', fontSize: '11px', lineHeight: 1 }}
            >⊡</button>
          </>
        }
        onClose={() => { setSelectedCountry(null); setCompareMode(false) }}
        style={{
          position:   'fixed',
          left:       pos.x,
          top:        pos.y,
          zIndex,
          width:      `${panelWidth}px`,
          transition: 'width 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
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

          {/* Compare grid */}
          {compareMode && (
            <div style={{ padding: '8px 12px' }}>
              {comparedCountries.length === 0 ? (
                <div style={{ color: '#2a4060', fontSize: '8px', letterSpacing: '0.1em', padding: '8px 0', textAlign: 'center' }}>
                  點擊地球上的國家以加入比較
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: comparedCountries.length === 1 ? '1fr' : `repeat(${compareColumns}, 1fr)`,
                  gap: '6px',
                }}>
                  {comparedCountries.map((c, i) => (
                    <CompareCard
                      key={c.name}
                      country={c}
                      color={COMPARE_PALETTE[i % COMPARE_PALETTE.length]}
                      onRemove={() => removeComparedCountry(c.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overview (single country mode) */}
          {displayedCountry && !compareMode && (
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
