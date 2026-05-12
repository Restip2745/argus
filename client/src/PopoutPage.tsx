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
import { useTranslation }     from 'react-i18next'
import { useAppStore }        from './store'
import { usePopoutSync }      from './hooks/usePopoutSync'
import { getCountryInfo, getDynamicTags } from './data/countryData'
import { PopoutAIPanel }      from './components/panels/PopoutAIPanel'
import './i18n'

// Lazy imports for panel content components (avoids loading 3-D scene code)
import { EventPanelBody }      from './components/panels/EventPanelBody'
import { RegionPanelOverview } from './components/panels/RegionPanelOverview'
import { PersonPanelBody }     from './components/panels/PersonPanelBody'
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

  const CATEGORY_COLOR: Record<string, string> = {
    ARMED_CONFLICT: '#ff4d4d', POLITICAL: '#ff9c2a', ECONOMIC: '#ffd700',
    SOCIAL: '#c8cdd2', SCIENCE_TECH: '#9b6dff', ENVIRONMENT: '#39ff8a',
    HEALTH: '#a0c4ff', CRIME_SECURITY: '#6a8090', SPACE: '#00d4ff',
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

// ── Person popout ──────────────────────────────────────────────────────────────

function PersonPopoutContent() {
  const selectedPersons = useAppStore((s) => s.selectedPersons)

  if (selectedPersons.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a4060', fontSize: '10px', letterSpacing: '0.1em' }}>
        NO PERSON SELECTED
      </div>
    )
  }

  const ACCENT = '#c084fc'

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
      {selectedPersons.map(p => (
        <PersonPanelBody key={p.name} person={p} accentColor={ACCENT} />
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
  const selectedPersons  = useAppStore((s) => s.selectedPersons)
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
      `Event: ${event.title_zh || event.title}`,
      `Category: ${event.category}`,
      `Intensity: ${event.intensity}`,
      `Location: ${event.location_label ?? 'Unknown'}`,
      `Source: ${event.source}`,
      event.summary_zh ? `Summary: ${event.summary_zh}` : '',
      event.actors?.length ? `Actors: ${event.actors.join(', ')}` : '',
    ].filter(Boolean).join('\n')
  }, [event])

  const eventQueries = useMemo(() => {
    if (!event) return []
    const cat = event.category
    return [
      t(`popout.catQ.${cat}.0`, ''),
      t(`popout.catQ.${cat}.1`, ''),
      t(`popout.catQ.${cat}.2`, ''),
      t(`popout.catQ.${cat}.3`, ''),
    ].filter(Boolean)
  }, [event, t])

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

  const personAgentContext = useMemo(() => {
    if (selectedPersons.length === 0) return ''
    return selectedPersons.map(p =>
      `Person: ${p.name}${p.wikiTitle && p.wikiTitle !== p.name ? ` (Wikipedia: ${p.wikiTitle})` : ''}`
    ).join('\n')
  }, [selectedPersons])

  const personQueries = useMemo(() => {
    if (selectedPersons.length === 0) return []
    if (selectedPersons.length === 1) {
      const name = selectedPersons[0].name
      return [
        t('popout.personQ.s0', { name }),
        t('popout.personQ.s1', { name }),
        t('popout.personQ.s2', { name }),
        t('popout.personQ.s3', { name }),
      ]
    }
    const n0 = selectedPersons[0].name
    const n1 = selectedPersons[1].name
    return [
      t('popout.personQ.m0', { n0, n1 }),
      t('popout.personQ.m1', { n0, n1 }),
      t('popout.personQ.m2'),
    ]
  }, [selectedPersons, t])

  const contextAgentContext = useMemo(() => {
    if (contextEntities.length === 0) return ''
    return contextEntities.map(e =>
      `[${e.type.toUpperCase()}] ${e.name}: ${e.summary}`
    ).join('\n\n')
  }, [contextEntities])

  const contextQueries = useMemo(() => {
    if (contextEntities.length === 0) return []
    const types = new Set(contextEntities.map(e => e.type))
    const names = contextEntities.slice(0, 3).map(e => e.name)
    const queries: string[] = []
    if (contextEntities.length >= 2) queries.push(t('popout.contextQ.0', { n0: names[0], n1: names[1] }))
    if (types.has('event') && types.has('person')) queries.push(t('popout.contextQ.1'))
    if (types.has('event') && types.has('region')) queries.push(t('popout.contextQ.2'))
    queries.push(t('popout.contextQ.3'))
    return queries.slice(0, 4)
  }, [contextEntities, t])

  const agentContext     = popoutType === 'context' ? contextAgentContext : popoutType === 'region' ? regionAgentContext  : popoutType === 'person' ? personAgentContext : eventAgentContext
  const suggestedQueries = popoutType === 'context' ? contextQueries     : popoutType === 'region' ? regionQueries       : popoutType === 'person' ? personQueries     : eventQueries
  const agentLabel       = popoutType === 'context' ? 'CONTEXT AGENT'    : popoutType === 'region' ? 'REGION AGENT'      : popoutType === 'person' ? 'PERSON AGENT'    : 'EVENT AGENT'

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
          <span style={{ color: popoutType === 'context' ? '#00ffcc' : '#00d4ff', fontSize: '9px', letterSpacing: '0.15em' }}>
            {popoutType === 'context' ? '◈ CONTEXT INTEL' : popoutType === 'region' ? '◈ REGION INTEL' : popoutType === 'person' ? '◈ PERSON INTEL' : '◈ EVENT INTEL'}
          </span>
        </div>
        {popoutType === 'context' ? <ContextPopoutContent /> : popoutType === 'region' ? <RegionPopoutContent /> : popoutType === 'person' ? <PersonPopoutContent /> : <EventPopoutContent />}
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
