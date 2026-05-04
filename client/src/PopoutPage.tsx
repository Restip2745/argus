/**
 * Popout page — rendered when a panel opens in a separate window.
 * URL: /?popout=event  or  /?popout=region
 *
 * Layout: two columns side-by-side.
 *   Left  (60%) — panel content (event data or region intel)
 *   Right (40%) — dedicated AI intelligence agent column
 *
 * State is synced from the main window via BroadcastChannel.
 */
import { useEffect, useMemo } from 'react'
import { useAppStore }        from './store'
import { usePopoutSync }      from './hooks/usePopoutSync'
import { getCountryInfo, getDynamicTags } from './data/countryData'
import { PopoutAIPanel }      from './components/panels/PopoutAIPanel'
import './i18n'

// Lazy imports for panel content components (avoids loading 3-D scene code)
import { EventPanelBody }      from './components/panels/EventPanelBody'
import { RegionPanelOverview } from './components/panels/RegionPanelOverview'
import { useWikiSummary }      from './hooks/useWikiSummary'
import { CATEGORY_COLOR }      from './data/categoryConfig'
import type { ArgusEvent }     from './types'

const params     = new URLSearchParams(window.location.search)
const popoutType = params.get('popout') ?? 'event'

// ── Shared styling ─────────────────────────────────────────────────────────────

const COL_STYLE: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  height:        '100vh',
  overflow:      'hidden',
}

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

// ── Event popout ───────────────────────────────────────────────────────────────

function EventPopoutContent() {
  const activePanelId      = useAppStore((s) => s.activePanelId)
  const events             = useAppStore((s) => s.events)
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry)

  const event = events.find((e) => e.id === activePanelId)

  if (!event) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: '10px', letterSpacing: '0.1em' }}>
        NO EVENT SELECTED
      </div>
    )
  }

  const accentColor = CATEGORY_COLOR[event.category] ?? '#00d4ff'

  // Minimal stubs for agent props that are handled by the right column
  const noop = () => {}
  const noopRef = { current: null } as React.RefObject<HTMLDivElement>

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
      <EventPanelBody
        event={event}
        accentColor={accentColor}
        onFocus={noop}
        canFocus={false}
        setSelectedCountry={setSelectedCountry}
        agentHistory={[]}
        agentLoading={false}
        agentError={null}
        agentInput=""
        setAgentInput={noop}
        suggestedQueries={[]}
        agentContext=""
        agentAsk={noop}
        agentScrollRef={noopRef}
        hideAgent
      />
    </div>
  )
}

// ── Region popout ──────────────────────────────────────────────────────────────

function RegionPopoutContent() {
  const selectedCountry  = useAppStore((s) => s.selectedCountry)
  const focusOnEarthSurface = useAppStore((s) => s.focusOnEarthSurface)
  const events           = useAppStore((s) => s.events)
  const { data: wikiData, loading: wikiLoading } = useWikiSummary(selectedCountry?.name ?? null)

  const info        = selectedCountry ? getCountryInfo(selectedCountry.name)       : null
  const dynamicTags = selectedCountry ? getDynamicTags(selectedCountry.name, events) : []
  const allTags     = [...(info?.govType ?? []), ...dynamicTags]

  const recentEvents = useMemo<ArgusEvent[]>(() => {
    if (!selectedCountry) return []
    const cutoff = Date.now() - 24 * 3600 * 1000
    return events.filter((e) => {
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      if (ts < cutoff) return false
      const loc   = (e.location_label ?? '').toLowerCase()
      const cname = selectedCountry.name.toLowerCase()
      return loc.includes(cname) || cname.includes(loc.replace(/[()]/g, '').trim())
    }).slice(0, 6)
  }, [events, selectedCountry?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedCountry) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: '10px', letterSpacing: '0.1em' }}>
        NO REGION SELECTED
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
      <RegionPanelOverview
        country={selectedCountry}
        info={info}
        allTags={allTags}
        recentEvents={recentEvents}
        focusOnEarthSurface={focusOnEarthSurface}
        wikiData={wikiData ?? null}
        wikiLoading={wikiLoading}
      />
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function PopoutPage() {
  usePopoutSync('guest')

  const activePanelId   = useAppStore((s) => s.activePanelId)
  const events          = useAppStore((s) => s.events)
  const selectedCountry = useAppStore((s) => s.selectedCountry)

  useEffect(() => {
    document.title = popoutType === 'region' ? 'ARGUS — Region Intel' : 'ARGUS — Event Intel'
    document.body.style.background = '#04090e'
    document.body.style.overflow   = 'hidden'
    document.body.style.margin     = '0'
  }, [])

  // Build agentContext and suggestedQueries for the right panel
  const event = events.find((e) => e.id === activePanelId)

  const eventAgentContext = useMemo(() => {
    if (!event) return ''
    return [
      `Event: ${event.title_zh || event.title}`,
      `Category: ${event.category}`,
      `Intensity: ${event.intensity}`,
      `Location: ${event.location_label ?? 'Unknown'}`,
      `Source: ${event.source}`,
      event.summary_zh ? `Summary: ${event.summary_zh}` : '',
      event.actors?.length ? `Actors: ${event.actors.join(', ')}` : '',
    ].filter(Boolean).join('\n')
  }, [event])

  const eventQueries = useMemo(
    () => (event ? (CATEGORY_QUERIES[event.category] ?? []).slice(0, 4) : []),
    [event],
  )

  const regionAgentContext = useMemo(() => {
    if (!selectedCountry) return ''
    const info   = getCountryInfo(selectedCountry.name)
    const lines  = [
      `Region: ${selectedCountry.name}`,
      `Coordinates: ${selectedCountry.lat.toFixed(2)}°, ${selectedCountry.lng.toFixed(2)}°`,
    ]
    if (info) {
      lines.push(`Capital: ${info.capital}`)
      lines.push(`Government: ${info.govType.join(', ')}`)
      lines.push(`Stability Index: ${info.stability}/100`)
    }
    return lines.join('\n')
  }, [selectedCountry])

  const regionQueries = useMemo(() => {
    if (!selectedCountry) return []
    const info = getCountryInfo(selectedCountry.name)
    return (info?.queries ?? []).slice(0, 4)
  }, [selectedCountry])

  const agentContext     = popoutType === 'region' ? regionAgentContext : eventAgentContext
  const suggestedQueries = popoutType === 'region' ? regionQueries      : eventQueries
  const agentLabel       = popoutType === 'region' ? 'REGION AGENT'     : 'EVENT AGENT'

  return (
    <div style={{
      display:    'flex',
      flexDirection: 'row',
      height:     '100vh',
      background: '#04090e',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {/* ── Left column: panel content (60%) ── */}
      <div style={{ ...COL_STYLE, flex: '0 0 60%', background: 'rgba(4,9,22,0.97)', borderRight: '1px solid rgba(0,180,255,0.12)' }}>
        {/* Column header */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,180,255,0.1)', background: 'linear-gradient(90deg, rgba(0,212,255,0.04) 0%, transparent 100%)', flexShrink: 0 }}>
          <span style={{ color: '#00d4ff', fontSize: '9px', letterSpacing: '0.15em' }}>
            {popoutType === 'region' ? '◈ REGION INTEL' : '◈ EVENT INTEL'}
          </span>
        </div>
        {popoutType === 'region' ? <RegionPopoutContent /> : <EventPopoutContent />}
      </div>

      {/* ── Right column: AI agent (40%) ── */}
      <div style={{ ...COL_STYLE, flex: '0 0 40%' }}>
        <PopoutAIPanel
          agentContext={agentContext}
          suggestedQueries={suggestedQueries}
          label={agentLabel}
        />
      </div>
    </div>
  )
}
