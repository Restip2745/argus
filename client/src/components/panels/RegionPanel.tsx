import { useRef, useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../store'
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_LABEL } from '../../data/categoryConfig'
import type { ArgusEvent } from '../../types'
import { useTranslation } from 'react-i18next'
import { getCountryInfo, getDynamicTags } from '../../data/countryData'
import { useAgentQuery } from '../../hooks/useAgentQuery'
import { usePopoutWindow } from '../../hooks/usePopoutWindow'
import { useWikiSummary } from '../../hooks/useWikiSummary'
import { useDraggable } from '../../hooks/useDraggable'
import { projectLatLng, panelEdgeAnchor } from '../../hooks/useGlobeProjection'
import { RegionPanelOverview } from './RegionPanelOverview'
import { RegionPanelAgent } from './RegionPanelAgent'


const TAG_COLOR: Record<string, string> = {
  'ACTIVE CONFLICT':        '#ff4d4d',
  'CRITICAL ALERT':         '#ff6b35',
  'ECONOMIC STRESS':        '#ffd700',
  'DEMOCRACY':              '#39ff8a',
  'AUTHORITARIAN':          '#ff9c2a',
  'MILITARY JUNTA':         '#ff4d4d',
  'TOTALITARIAN':           '#ff4d4d',
  'COMMUNIST':              '#ff4d4d',
  'SINGLE-PARTY STATE':     '#ff6b35',
  'HYBRID REGIME':          '#ff9c2a',
  'THEOCRACY':              '#ff9c2a',
  'FRAGILE STATE':          '#ff9c2a',
  'HIGH TENSION':           '#ff9c2a',
  'OCCUPIED TERRITORY':     '#ff4d4d',
  'POST-CONFLICT':          '#ffd700',
  'TRANSITIONAL':           '#ffd700',
  'PARTIAL RECOGNITION':    '#c8cdd2',
  'DIVIDED GOVERNMENT':     '#ff9c2a',
  'REPUBLIC':               '#4a6fa5',
  'FEDERAL':                '#4a6fa5',
  'FEDERAL REPUBLIC':       '#4a6fa5',
  'CONSTITUTIONAL MONARCHY':'#4a6fa5',
  'ABSOLUTE MONARCHY':      '#c8a030',
}

function tagColor(tag: string): string { return TAG_COLOR[tag] ?? '#4a6070' }

function formatGdp(gdpB: number): string {
  if (gdpB >= 1000) return `$${(gdpB / 1000).toFixed(1)}T`
  return `$${Math.round(gdpB)}B`
}
function formatPop(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}B`
  return `${m.toFixed(1)}M`
}

const BAR_COLORS = ['#00d4ff', '#4a6fa5', '#9b6dff', '#ff9c2a', '#39ff8a']

// ── Compare mode card ─────────────────────────────────────────────────────────
function compareMatchesCountry(e: ArgusEvent, countryName: string): boolean {
  const loc   = (e.location_label ?? '').toLowerCase()
  const cname = countryName.toLowerCase()
  return loc.includes(cname) || cname.includes(loc.replace(/[()]/g, '').trim())
}

function CompareCard({
  country, color, onRemove,
}: {
  country: import('../../store').SelectedCountry
  color: string
  onRemove: () => void
}) {
  const events = useAppStore((s) => s.events)
  const info = getCountryInfo(country.name)
  const gdpPerCapita = info && info.populationM > 0
    ? Math.round((info.gdpB * 1e9) / (info.populationM * 1e6) / 1000)
    : null
  const stabilityColor = !info ? '#4a6070'
    : info.stability >= 70 ? '#39ff8a'
    : info.stability >= 45 ? '#ff9c2a' : '#ff4d4d'

  const countryEvents = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000
    return events.filter(e => {
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      return ts >= cutoff && compareMatchesCountry(e, country.name)
    })
  }, [events, country.name])

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of countryEvents) {
      counts[e.category] = (counts[e.category] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [countryEvents])

  return (
    <div style={{
      background: 'rgba(4,9,22,0.7)',
      border: `1px solid ${color}30`,
      borderTop: `2px solid ${color}`,
      borderRadius: '3px',
      padding: '8px 9px',
      position: 'relative',
    }}>
      <button
        onClick={onRemove}
        style={{
          position: 'absolute', top: '4px', right: '4px',
          background: 'none', border: 'none', color: '#4a6070',
          cursor: 'pointer', fontSize: '9px', lineHeight: 1, padding: '1px 3px',
        }}
      >✕</button>

      {/* Flag + name + capital */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', paddingRight: '14px' }}>
        {info && (
          <img
            src={`https://flagcdn.com/32x24/${info.code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/64x48/${info.code.toLowerCase()}.png 2x`}
            width="32" height="24" alt={country.name}
            style={{ flexShrink: 0, borderRadius: '2px', objectFit: 'cover', border: `1px solid ${color}25` }}
          />
        )}
        <div>
          <div style={{ color, fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.3 }}>
            {country.name.toUpperCase().slice(0, 20)}{country.name.length > 20 ? '…' : ''}
          </div>
          {info && (
            <div style={{ color: '#3a5060', fontSize: '7px', letterSpacing: '0.06em', marginTop: '1px' }}>
              ⊙ {info.capital}
            </div>
          )}
        </div>
      </div>

      {info ? (
        <>
          {/* Gov type tags */}
          {info.govType.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
              {info.govType.slice(0, 2).map(tag => (
                <span key={tag} style={{
                  fontSize: '6px', letterSpacing: '0.06em', padding: '1px 4px',
                  border: `1px solid ${tagColor(tag)}35`,
                  background: `${tagColor(tag)}10`,
                  color: tagColor(tag), borderRadius: '2px',
                }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Stats grid — 2×3 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px',
            background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.07)',
            borderRadius: '2px', marginBottom: '6px', overflow: 'hidden',
          }}>
            {[
              { l: 'POPULATION', v: formatPop(info.populationM) },
              { l: 'GDP',        v: formatGdp(info.gdpB) },
              { l: 'GDP/CAPITA', v: gdpPerCapita != null ? `$${gdpPerCapita}k` : '—' },
              { l: 'STABILITY',  v: `${info.stability}/100` },
            ].map(({ l, v }) => (
              <div key={l} style={{ padding: '4px 6px', background: 'rgba(4,9,22,0.5)' }}>
                <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.08em', marginBottom: '1px' }}>{l}</div>
                <div style={{ color: '#a8c4d8', fontSize: '9px', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Stability bar */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.08em' }}>STABILITY</span>
              <span style={{ color: stabilityColor, fontSize: '6px' }}>{info.stability}/100</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(0,180,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${info.stability}%`, height: '100%', borderRadius: '2px', background: stabilityColor, transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {/* Top industries */}
          {info.industries.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.1em', marginBottom: '4px' }}>INDUSTRIES</div>
              {info.industries.slice(0, 3).map((ind, i) => (
                <div key={ind.label} style={{ marginBottom: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span style={{ color: '#4a6070', fontSize: '7px' }}>{ind.label}</span>
                    <span style={{ color: '#4a6fa5', fontSize: '7px' }}>{ind.pct}%</span>
                  </div>
                  <div style={{ height: '2px', background: 'rgba(0,180,255,0.08)', borderRadius: '1px', overflow: 'hidden' }}>
                    <div style={{ width: `${ind.pct}%`, height: '100%', borderRadius: '1px', background: BAR_COLORS[i % BAR_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#2a4060', fontSize: '8px', marginBottom: '6px' }}>— no data —</div>
      )}

      {/* Event category breakdown (24h) */}
      {categoryBreakdown.length > 0 && (
        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(0,180,255,0.07)', paddingTop: '5px' }}>
          <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.1em', marginBottom: '4px' }}>EVENTS (24H)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {categoryBreakdown.map(([cat, count]) => {
              const catColor = CATEGORY_COLOR[cat] ?? '#4a6070'
              const catIcon  = CATEGORY_ICON[cat]  ?? '◉'
              const catLabel = CATEGORY_LABEL[cat]  ?? cat
              return (
                <span key={cat} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '2px',
                  fontSize: '6px', padding: '1px 4px', borderRadius: '2px',
                  border: `1px solid ${catColor}30`,
                  background: `${catColor}0a`,
                  color: catColor,
                }}>
                  {catIcon} {catLabel} <span style={{ opacity: 0.7 }}>×{count}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent events list */}
      {countryEvents.length > 0 && (
        <div style={{ marginTop: '5px', borderTop: '1px solid rgba(0,180,255,0.07)', paddingTop: '5px' }}>
          <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.1em', marginBottom: '4px' }}>RECENT</div>
          {countryEvents.slice(0, 3).map(e => {
            const catColor = CATEGORY_COLOR[e.category] ?? '#4a6070'
            const catIcon  = CATEGORY_ICON[e.category]  ?? '◉'
            return (
              <div key={e.id} style={{ display: 'flex', gap: '4px', marginBottom: '3px', alignItems: 'flex-start' }}>
                <span style={{ color: catColor, fontSize: '7px', flexShrink: 0 }}>{catIcon}</span>
                <span style={{ color: '#4a6070', fontSize: '7px', lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {e.title}
                </span>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

const COMPARE_PALETTE = ['#00ffcc', '#ff9c2a', '#9b6dff', '#39ff8a', '#ff4d4d', '#00d4ff']

export function RegionPanel() {
  const { t } = useTranslation()
  const selectedCountry      = useAppStore((s) => s.selectedCountry)
  const setSelectedCountry   = useAppStore((s) => s.setSelectedCountry)
  const focusOnEarthSurface  = useAppStore((s) => s.focusOnEarthSurface)
  const events               = useAppStore((s) => s.events)
  const compareMode          = useAppStore((s) => s.compareMode)
  const setCompareMode       = useAppStore((s) => s.setCompareMode)
  const comparedCountries    = useAppStore((s) => s.comparedCountries)
  const removeComparedCountry = useAppStore((s) => s.removeComparedCountry)
  const panelZ               = useAppStore((s) => s.panelZ)
  const bringToFront         = useAppStore((s) => s.bringToFront)
  const uiScale              = useAppStore((s) => s.uiScale)
  const uiScaleRef           = useRef(uiScale)
  uiScaleRef.current         = uiScale

  // Auto-focus on new country select
  useEffect(() => {
    if (selectedCountry && focusOnEarthSurface) {
      focusOnEarthSurface(selectedCountry.lat, selectedCountry.lng)
    }
  }, [selectedCountry?.name])

  const panelRef    = useRef<HTMLDivElement>(null)
  const tailLineRef = useRef<SVGLineElement>(null)
  const tailDotRef  = useRef<SVGCircleElement>(null)
  const [pos,         setPos]        = useState({ x: 20, y: 80 })
  const posRef      = useRef(pos)
  posRef.current    = pos
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const agentScrollRef               = useRef<HTMLDivElement>(null)
  const { onMouseDown: startDrag, dragging } = useDraggable()

  // ── Card-flip state (country switch animation) ───────────────────────────────
  const [displayedCountry, setDisplayedCountry] = useState(selectedCountry)
  const [flipPhase, setFlipPhase]               = useState<'idle' | 'out' | 'in'>('idle')
  const pendingCountryRef   = useRef(selectedCountry)
  const displayedCountryRef = useRef(displayedCountry)
  displayedCountryRef.current = displayedCountry
  const isInitialMountRef   = useRef(true)
  const [panelEntered, setPanelEntered] = useState(false)  // true after pop-in completes

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // When uiScale changes, clamp panel position so the header stays inside the viewport
  useEffect(() => {
    const scale = uiScale
    const pw = panelRef.current?.offsetWidth  ?? 320
    const ph = panelRef.current?.offsetHeight ?? 400
    const maxX = window.innerWidth  / scale - pw
    const maxY = window.innerHeight / scale - Math.min(ph, 60) // keep at least header (≈60px) in view
    setPos(p => ({
      x: Math.max(0, Math.min(maxX, p.x)),
      y: Math.max(0, Math.min(maxY, p.y)),
    }))
  }, [uiScale])

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

  // rAF loop: imperatively update SVG tail each frame (no re-renders)
  const selectedCountryRef = useRef(selectedCountry)
  selectedCountryRef.current = selectedCountry
  const compareModeRef = useRef(compareMode)
  compareModeRef.current = compareMode

  useEffect(() => {
    let rafId: number
    function tick() {
      const panel   = panelRef.current
      const line    = tailLineRef.current
      const dot     = tailDotRef.current
      const country = selectedCountryRef.current
      const inCmp   = compareModeRef.current

      const hide = () => {
        line?.setAttribute('opacity', '0')
        dot?.setAttribute('opacity', '0')
        rafId = requestAnimationFrame(tick)
      }

      if (!panel || !line || !dot || !country || inCmp) { hide(); return }

      const proj = projectLatLng(country.lat, country.lng)
      if (!proj || proj.behind) { hide(); return }

      const rect = panel.getBoundingClientRect()
      const { ax, ay } = panelEdgeAnchor(rect, proj.x, proj.y)

      line.setAttribute('x1', String(ax))
      line.setAttribute('y1', String(ay))
      line.setAttribute('x2', String(proj.x))
      line.setAttribute('y2', String(proj.y))
      line.setAttribute('opacity', '0.45')
      dot.setAttribute('cx', String(proj.x))
      dot.setAttribute('cy', String(proj.y))
      dot.setAttribute('opacity', '0.7')

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, []) // run once — reads live state via refs each frame

  if (!selectedCountry && !compareMode) return null

  // ── Drag ──────────────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    const scale  = uiScaleRef.current
    const { x: initX, y: initY } = posRef.current
    const startX = e.clientX / scale, startY = e.clientY / scale
    startDrag(e, (mv) => {
      const s  = uiScaleRef.current
      const pw = panelRef.current?.offsetWidth ?? 320
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  / s - pw, initX + mv.clientX / s - startX)),
        y: Math.max(0, Math.min(window.innerHeight / s - 40, initY + mv.clientY / s - startY)),
      })
    })
  }

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
    {/* ── Tail SVG overlay for region panel ─────────────────────────────── */}
    {createPortal(
      <svg
        style={{
          position: 'fixed', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: (panelZ['region'] ?? 31) - 1,
          overflow: 'visible',
        }}
      >
        <defs>
          <filter id="tailGlowRegion" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <line
          ref={tailLineRef}
          stroke={regionAccent}
          strokeWidth="1"
          strokeDasharray="5 4"
          opacity="0"
          filter="url(#tailGlowRegion)"
        />
        <circle
          ref={tailDotRef}
          r="3.5"
          fill={regionAccent}
          opacity="0"
          filter="url(#tailGlowRegion)"
        />
      </svg>,
      document.body,
    )}
    <div
      ref={panelRef}
      className={panelEntered ? undefined : 'region-panel-enter'}
      onMouseDown={() => bringToFront('region')}
      onAnimationEnd={handleFlipAnimEnd}
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        zIndex: panelZ['region'] ?? 31,
        width: `${panelWidth}px`,
        transition: 'width 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        maxHeight: `calc(${100 / uiScale}vh - 100px)`,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(4,9,22,0.94)',
        border: '1px solid rgba(0,180,255,0.18)',
        borderRadius: '4px',
        fontFamily: 'JetBrains Mono, monospace',
        userSelect: dragging ? 'none' : 'auto',
        boxShadow: '0 0 32px rgba(0,100,180,0.18)',
        // Card-flip animation overrides the initial pop-in when switching countries
        ...(flipPhase !== 'idle' && {
          animation: flipPhase === 'out'
            ? 'cardFlipOut 0.17s ease-in forwards'
            : 'cardFlipIn 0.17s ease-out forwards',
          transformOrigin: 'center top',
        }),
      }}
    >
      {/* Left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: 'linear-gradient(180deg, transparent, rgba(0,212,255,0.6), transparent)', pointerEvents: 'none' }} />

      {/* Corner accents */}
      {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
        <div key={`${v}${h}`} style={{ position:'absolute', [v]:0, [h]:0, width:8, height:8,
          borderTop: v==='top' ? '1px solid rgba(0,212,255,0.4)' : 'none',
          borderBottom: v==='bottom' ? '1px solid rgba(0,212,255,0.4)' : 'none',
          borderLeft: h==='left' ? '1px solid rgba(0,212,255,0.4)' : 'none',
          borderRight: h==='right' ? '1px solid rgba(0,212,255,0.4)' : 'none',
          pointerEvents: 'none' }} />
      ))}

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          padding: '7px 10px',
          borderBottom: '1px solid rgba(0,180,255,0.12)',
          background: 'linear-gradient(90deg, rgba(0,212,255,0.06) 0%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span style={{ color: compareMode ? '#ff9c2a' : '#00d4ff', fontSize: '8px', letterSpacing: '0.15em' }}>
          {compareMode ? '⊞ COMPARE MODE' : `◈ ${t('panel.region', 'REGION INTEL')}`}
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={() => setCompareMode(!compareMode)}
            title={compareMode ? 'Exit compare mode' : 'Enter compare mode'}
            style={{
              background: compareMode ? 'rgba(255,156,42,0.15)' : 'rgba(0,212,255,0.06)',
              border: `1px solid ${compareMode ? 'rgba(255,156,42,0.4)' : 'rgba(0,212,255,0.2)'}`,
              borderRadius: '2px', color: compareMode ? '#ff9c2a' : '#4a6070',
              cursor: 'pointer', fontSize: '8px', padding: '2px 5px',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
              transition: 'all 0.15s',
            }}
          >⊞</button>
          <button
            onClick={popoutOpen}
            title={isPopped ? 'Panel is open in separate window' : 'Pop out to separate window'}
            style={{ background:'none', border:'none', color: isPopped ? '#00d4ff' : '#4a6070', cursor:'pointer', fontSize:'11px', lineHeight:1 }}
          >⊡</button>
          <button
            onClick={() => { setSelectedCountry(null); setCompareMode(false) }}
            style={{ background:'none', border:'none', color:'#4a6070', cursor:'pointer', fontSize:'11px', lineHeight:1 }}
          >✕</button>
        </div>
      </div>

      {/* ── Scrollable content area ──────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.2) transparent' }}>

      {/* ── Compare grid ─────────────────────────────────────────────────────── */}
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

      {/* ── Overview (single mode only) — rendered by sub-component ──────────── */}
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

      </div>{/* end scrollable area */}

      {/* ── Agent section (suggested queries + chat) ─────────────────────────── */}
      <RegionPanelAgent
        history={history}
        loading={loading}
        error={error ?? null}
        suggestedQueries={suggestedQueries}
        agentContext={agentContext}
        ask={ask}
        agentScrollRef={agentScrollRef}
      />

    </div>
    </>
  )
}
