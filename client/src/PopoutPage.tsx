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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation }     from 'react-i18next'
import { useSceneTime }       from './hooks/useSceneTime'
import { useAppStore }        from './store'
import { usePopoutSync }      from './hooks/usePopoutSync'
import { getCountryInfo, getDynamicTags } from './data/countryData'
import { severityColor } from './data/symbology'
import { categoryQueries, entityQueries, contextQueries } from './lib/suggestedQueries'
import { PopoutAIPanel }      from './components/panels/PopoutAIPanel'
import './i18n'

// Lazy imports for panel content components (avoids loading 3-D scene code)
import { EventPanelBody }      from './components/panels/EventPanelBody'
import { RegionPanelIdentity, RegionPanelTabContent } from './components/panels/RegionPanelOverview'
import type { RegionTab }      from './components/panels/RegionPanelOverview'
import { WikiPanelBody }     from './components/panels/WikiPanelBody'
import { EntityCard }          from './components/panels/MultiEntityContextPanel'
import { useWikiSummary }      from './hooks/useWikiSummary'
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

  const accentColor = severityColor(event.intensity)

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
  const { now: sceneNow } = useSceneTime()
  const selectedCountry  = useAppStore((s) => s.selectedCountry)
  const focusOnEarthSurface = useAppStore((s) => s.focusOnEarthSurface)
  const events           = useAppStore((s) => s.events)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const [tab, setTab]    = useState<RegionTab>('overview')
  const { data: wikiData, loading: wikiLoading } = useWikiSummary(selectedCountry?.name ?? null)

  const info        = selectedCountry ? getCountryInfo(selectedCountry.name)       : null
  const dynamicTags = selectedCountry ? getDynamicTags(selectedCountry.name, events) : []
  const allTags     = [...(info?.govType ?? []), ...dynamicTags]

  // Same rule as the docked panel: everything for this region at or before the
  // viewed instant, newest first, uncapped.
  const regionEvents = useMemo<ArgusEvent[]>(() => {
    if (!selectedCountry) return []
    const cname = selectedCountry.name.toLowerCase()
    return events
      .filter((e) => {
        const ts = e.published_at ? new Date(e.published_at).getTime() : 0
        if (ts > sceneNow) return false
        const loc = (e.location_label ?? '').toLowerCase()
        return loc.includes(cname) || cname.includes(loc.replace(/[()]/g, '').trim())
      })
      .sort((a, b) =>
        new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime())
  }, [events, selectedCountry?.name, sceneNow]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedCountry) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: '10px', letterSpacing: '0.1em' }}>
        NO REGION SELECTED
      </div>
    )
  }

  return (
    <>
      <RegionPanelIdentity
        country={selectedCountry}
        info={info}
        tab={tab}
        setTab={setTab}
        eventCount={regionEvents.length}
        focusOnEarthSurface={focusOnEarthSurface}
      />
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
        <RegionPanelTabContent
          tab={tab}
          country={selectedCountry}
          info={info}
          allTags={allTags}
          regionEvents={regionEvents}
          sceneNow={sceneNow}
          onOpenEvent={setActivePanelId}
          wikiData={wikiData ?? null}
          wikiLoading={wikiLoading}
        />
      </div>
    </>
  )
}

// ── Entity popout ──────────────────────────────────────────────────────────────

function EntityPopoutContent() {
  const selectedEntities = useAppStore((s) => s.selectedEntities)

  if (selectedEntities.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: '10px', letterSpacing: '0.1em' }}>
        NO ENTITY SELECTED
      </div>
    )
  }

  const ACCENT = '#c084fc'

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
      {selectedEntities.map(p => (
        <WikiPanelBody key={p.name} entity={p} accentColor={ACCENT} />
      ))}
    </div>
  )
}

// ── Context popout ────────────────────────────────────────────────────────────

function ContextPopoutContent() {
  const contextEntities     = useAppStore((s) => s.contextEntities)
  const removeContextEntity = useAppStore((s) => s.removeContextEntity)

  if (contextEntities.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: '10px', letterSpacing: '0.1em' }}>
        NO ENTITIES IN CONTEXT
      </div>
    )
  }

  const cols = contextEntities.length <= 1 ? 1 : Math.min(3, contextEntities.length)

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '12px 14px',
      display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px',
      alignContent: 'start',
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,204,0.15) transparent',
    }}>
      {contextEntities.map(entity => (
        <EntityCard
          key={entity.id}
          entity={entity}
          onRemove={() => removeContextEntity(entity.id)}
        />
      ))}
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function PopoutPage() {
  usePopoutSync('guest')
  const { t } = useTranslation()

  const activePanelId    = useAppStore((s) => s.activePanelId)
  const events           = useAppStore((s) => s.events)
  const selectedCountry  = useAppStore((s) => s.selectedCountry)
  const selectedEntities  = useAppStore((s) => s.selectedEntities)
  const contextEntities  = useAppStore((s) => s.contextEntities)

  useEffect(() => {
    const titles: Record<string, string> = {
      region:  'ARGUS — Region Intel',
      person:  'ARGUS — Person Intel',
      context: 'ARGUS — Context Intel',
    }
    document.title = titles[popoutType] ?? 'ARGUS — Event Intel'
    document.body.style.background = '#04090e'
    document.body.style.overflow   = 'hidden'
    document.body.style.margin     = '0'
  }, [])

  // Build agentContext and suggestedQueries for the right panel
  const event = events.find((e) => e.id === activePanelId)

  const eventAgentContext = useMemo(() => {
    if (!event) return ''
    return [
      `Event: ${event.title}`,
      `Category: ${event.category}`,
      `Intensity: ${event.intensity}`,
      `Location: ${event.location_label ?? 'Unknown'}`,
      `Source: ${event.source}`,
      event.content ? `Summary: ${event.content.slice(0, 300)}` : '',
      event.actors?.length ? `Actors: ${event.actors.join(', ')}` : '',
    ].filter(Boolean).join('\n')
  }, [event])

  const eventQueries = useMemo(
    () => event ? categoryQueries(t, event.category) : [],
    [event, t],
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

  const entityAgentContext = useMemo(() => {
    if (selectedEntities.length === 0) return ''
    return selectedEntities.map(p =>
      `Person: ${p.name}${p.wikiTitle && p.wikiTitle !== p.name ? ` (Wikipedia: ${p.wikiTitle})` : ''}`
    ).join('\n')
  }, [selectedEntities])

  const entityQueriesList = useMemo(
    () => entityQueries(t, selectedEntities.map((p) => p.name)),
    [selectedEntities, t],
  )

  const contextAgentContext = useMemo(() => {
    if (contextEntities.length === 0) return ''
    return contextEntities.map(e =>
      `[${e.type.toUpperCase()}] ${e.name}: ${e.summary}`
    ).join('\n\n')
  }, [contextEntities])

  const contextQueriesList = useMemo(
    () => contextQueries(t, contextEntities),
    [contextEntities, t],
  )

  const agentContext     = popoutType === 'context' ? contextAgentContext : popoutType === 'region' ? regionAgentContext  : popoutType === 'wiki' ? entityAgentContext : eventAgentContext
  const suggestedQueries = popoutType === 'context' ? contextQueriesList  : popoutType === 'region' ? regionQueries       : popoutType === 'wiki' ? entityQueriesList : eventQueries
  const agentLabel       = popoutType === 'context' ? 'CONTEXT AGENT'    : popoutType === 'region' ? 'REGION AGENT'      : popoutType === 'wiki' ? 'ENTITY AGENT'    : 'EVENT AGENT'

  // Whatever this window is currently following. The popout mirrors the main
  // window over BroadcastChannel, so navigating there swaps the subject out
  // from under a transcript that would otherwise stay on screen.
  const agentSubject     = popoutType === 'context' ? contextEntities.map(e => ({ id: e.id, label: e.name }))
                         : popoutType === 'region'  ? (selectedCountry?.name ?? '')
                         : popoutType === 'wiki'    ? selectedEntities.map(p => ({ id: p.name, label: p.name }))
                         : (activePanelId ?? '')

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
          <span style={{ color: popoutType === 'context' ? '#00ffcc' : '#00d4ff', fontSize: '11px', letterSpacing: '0.15em' }}>
            {popoutType === 'context' ? '◈ CONTEXT INTEL' : popoutType === 'region' ? '◈ REGION INTEL' : popoutType === 'wiki' ? '◈ ENTITY INTEL' : '◈ EVENT INTEL'}
          </span>
        </div>
        {popoutType === 'context' ? <ContextPopoutContent /> : popoutType === 'region' ? <RegionPopoutContent /> : popoutType === 'wiki' ? <EntityPopoutContent /> : <EventPopoutContent />}
      </div>

      {/* ── Right column: AI agent (40%) ── */}
      <div style={{ ...COL_STYLE, flex: '0 0 40%' }}>
        <PopoutAIPanel
          agentContext={agentContext}
          suggestedQueries={suggestedQueries}
          label={agentLabel}
          subject={agentSubject}
        />
      </div>
    </div>
  )
}
