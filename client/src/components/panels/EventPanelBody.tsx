/**
 * EventPanelBody — scrollable content for EventPanel.
 *
 * Renders everything below the drag-handle header:
 *   title · datetime · summary · actors · meta/location · source link
 *   · coordinates · focus button · back button · suggested queries · agent chat
 *
 * Receives all data as props so EventPanel can animate this whole block as
 * a unit (slide in/out) when the user navigates the timeline.
 */
import { useTranslation } from 'react-i18next'
import { resolveCountryName, getCountryCentroid } from '../../data/countryData'
import type { ArgusEvent } from '../../types'
import type { SelectedCountry } from '../../store'
import { useAppStore } from '../../store'
import type { AgentEntry } from '../../hooks/useAgentQuery'
import { EventRelationGraph } from './EventRelationGraph'
import { extractPersonNames, LinkedText } from '../../utils/entityLinker'
import { relativeTime, heatColor } from '../../utils/eventUtils'

function expiryLabel(expiresAt: string | null, heatScore: number): string {
  if (expiresAt) {
    const msLeft = new Date(expiresAt).getTime() - Date.now()
    if (msLeft <= 0) return 'EXPIRED'
    const h = Math.floor(msLeft / 3_600_000)
    if (h < 1) return `<1h`
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }
  if (heatScore >= 1.5) return '7d'
  if (heatScore >= 1.0) return '3d'
  if (heatScore >= 0.5) return '48h'
  return '24h'
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  event:            ArgusEvent
  accentColor:      string
  onFocus:          () => void
  canFocus:         boolean
  onBack?:          () => void
  setSelectedCountry: (c: SelectedCountry) => void
  // Agent chat
  agentHistory:     AgentEntry[]
  agentLoading:     boolean
  agentError:       string | null
  agentInput:       string
  setAgentInput:    (v: string) => void
  suggestedQueries: string[]
  agentContext:     string
  agentAsk:         (q: string, ctx: string) => void
  agentScrollRef:   React.RefObject<HTMLDivElement>
  /** When true, the embedded agent section is hidden (e.g. in popout where AI is a separate column). */
  hideAgent?:       boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EventPanelBody({
  event, accentColor,
  onFocus, canFocus, onBack,
  setSelectedCountry,
  agentHistory, agentLoading, agentError,
  agentInput, setAgentInput,
  suggestedQueries, agentContext, agentAsk,
  agentScrollRef,
  hideAgent = false,
}: Props) {
  const { t, i18n } = useTranslation()
  const isEN = i18n.language === 'en'
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const addSelectedPerson = useAppStore((s) => s.addSelectedPerson)
  const personNames = extractPersonNames(event.actors ?? [])

  const title = event.title
  // In EN mode: prefer original English content; fall back to title as last resort.
  // In zh-TW mode: prefer the Chinese summary, fall back to content.
  const summary = isEN
    ? (event.content || null)
    : (event.summary_zh || event.content)

  function resolveCountry() {
    const label = event.location_label
    if (!label || label === '—') return null
    const hasCoords  = event.lat !== null && event.lng !== null
    const countryKey = resolveCountryName(label)
    if (!hasCoords && countryKey === null) return null
    return { label, countryKey }
  }

  const countryInfo = resolveCountry()

  function handleOpenCountry() {
    if (!countryInfo) return
    const { label, countryKey } = countryInfo
    const name = countryKey ?? label
    let lat = event.lat ?? 0
    let lng = event.lng ?? 0
    if (event.lat === null) {
      const centroid = getCountryCentroid(name)
      if (centroid) { lat = centroid.lat; lng = centroid.lng }
    }
    setSelectedCountry({ name, lat, lng })
  }

  function hostname() {
    try { return new URL(event.url).hostname.replace('www.', '') }
    catch { return event.source }
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>

      {/* ── Main info ──────────────────────────────────────────────────────── */}
      <div className="relative px-3 py-3 space-y-2.5">
        <h2 className="text-[#c8dde8] text-[11px] font-semibold leading-snug">{title}</h2>

        {/* Datetime */}
        {event.published_at && (
          <div className="flex items-center gap-2 text-[8.5px] font-mono" style={{ color: '#2a4060' }}>
            <span style={{ color: accentColor + '99' }}>{relativeTime(event.published_at)}</span>
            <span style={{ color: '#1a3050' }}>·</span>
            <span>
              {new Date(event.published_at).toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {summary && (
          <p className="text-[#4a6070] text-[10px] leading-relaxed">
            <LinkedText
              text={summary}
              knownPersons={personNames}
              onPersonClick={addSelectedPerson}
            />
          </p>
        )}

        {/* Actors — click to filter EventStack by actor name */}
        {event.actors?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.actors.map(a => {
              const isPerson = personNames.includes(a)
              return (
                <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
                  <button
                    onClick={() => setSearchQuery(a)}
                    title={`Filter events by "${a}"`}
                    className="px-1.5 py-0.5 text-[9px] rounded transition-all"
                    style={{
                      background: `${accentColor}10`,
                      border: `1px solid ${accentColor}30`,
                      color: accentColor + 'cc',
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace',
                      borderRadius: isPerson ? '2px 0 0 2px' : '2px',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = `${accentColor}22`; el.style.borderColor = `${accentColor}70`; el.style.color = accentColor }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = `${accentColor}10`; el.style.borderColor = `${accentColor}30`; el.style.color = accentColor + 'cc' }}
                  >
                    {a}
                  </button>
                  {isPerson && (
                    <button
                      onClick={() => addSelectedPerson({ name: a, wikiTitle: a })}
                      title={`View person: ${a}`}
                      className="py-0.5 text-[8px] transition-all"
                      style={{
                        background: '#c084fc10',
                        border: '1px solid #c084fc30',
                        borderLeft: 'none',
                        color: '#c084fccc',
                        cursor: 'pointer',
                        fontFamily: 'JetBrains Mono, monospace',
                        borderRadius: '0 2px 2px 0',
                        padding: '1px 4px',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#c084fc22'; e.currentTarget.style.color = '#c084fc' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#c084fc10'; e.currentTarget.style.color = '#c084fccc' }}
                    >
                      👤
                    </button>
                  )}
                </span>
              )
            })}
          </div>
        )}

        {/* Tags — click to filter EventStack by tag */}
        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.map(tag => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                title={`Filter events by "${tag}"`}
                className="px-1.5 py-0.5 text-[9px] rounded transition-all"
                style={{
                  background: 'rgba(0,180,255,0.05)',
                  border: '1px solid rgba(0,180,255,0.18)',
                  color: '#2a6080',
                  cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.04em',
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(0,180,255,0.12)'; el.style.borderColor = 'rgba(0,180,255,0.45)'; el.style.color = '#00d4ff' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(0,180,255,0.05)'; el.style.borderColor = 'rgba(0,180,255,0.18)'; el.style.color = '#2a6080' }}
              >
                # {tag}
              </button>
            ))}
          </div>
        )}

        {/* Source Reliability Badge */}
        {(() => {
          const rel = event.reliability ?? 'UNVERIFIED'
          const relColor: Record<string, string> = {
            HIGH:       '#39ff8a',
            MEDIUM:     '#ffd700',
            LOW:        '#ff9c2a',
            UNVERIFIED: '#2a4060',
          }
          const color = relColor[rel] ?? '#2a4060'
          return (
            <div className="flex items-center gap-2">
              <span className="text-[7px] tracking-widest text-[#2a4060] uppercase">{t('event.labels.source', 'SOURCE')}</span>
              <span
                className="text-[7px] tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  color,
                  border: `1px solid ${color}30`,
                  background: `${color}0a`,
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                {rel}
              </span>
            </div>
          )
        })()}

        {/* Heat Score */}
        {event.heat_score != null && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[7px] tracking-widest text-[#2a4060] uppercase">{t('event.labels.heat', 'HEAT')}</span>
            <div
              className="flex-1 rounded-sm overflow-hidden"
              style={{ height: '3px', background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.1)' }}
            >
              <div
                style={{
                  width: `${Math.min(100, (event.heat_score / 2) * 100)}%`,
                  height: '100%',
                  background: heatColor(event.heat_score),
                  boxShadow: `0 0 4px ${heatColor(event.heat_score)}88`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <span className="text-[8px] font-mono" style={{ color: heatColor(event.heat_score), minWidth: '24px', textAlign: 'right' }}>
              {event.heat_score.toFixed(2)}
            </span>
            <span
              className="text-[7px] tracking-wider px-1 rounded"
              style={{
                color: heatColor(event.heat_score),
                border: `1px solid ${heatColor(event.heat_score)}30`,
                background: `${heatColor(event.heat_score)}0a`,
              }}
            >
              {expiryLabel(event.expires_at, event.heat_score)}
            </span>
          </div>
        )}

        {/* Relationship graph */}
        <EventRelationGraph eventId={event.id} accentColor={accentColor} />

        {/* Meta row: source · location */}
        <div className="flex items-center justify-between text-[9px] text-[#2a4060] pt-2 border-t border-[rgba(0,180,255,0.07)]">
          <span className="truncate max-w-[130px]">{event.source}</span>
          <span className="text-[#1e3040] mx-1">·</span>
          {countryInfo ? (
            <button
              onClick={e => { e.stopPropagation(); handleOpenCountry() }}
              className="truncate max-w-[110px] transition-colors"
              style={{
                background: 'none', border: 'none', padding: '1px 5px',
                borderRadius: '2px', cursor: 'pointer',
                color: accentColor + 'cc', fontSize: '9px',
                fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                borderBottom: `1px solid ${accentColor}44`,
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = accentColor; el.style.borderBottomColor = accentColor }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = accentColor + 'cc'; el.style.borderBottomColor = accentColor + '44' }}
              title={`Open ${countryInfo.countryKey ?? countryInfo.label} region panel`}
            >
              ⊙ {countryInfo.label}
            </button>
          ) : (
            <span className="text-[#1e3040]">{event.location_label && event.location_label !== '—' ? event.location_label : '—'}</span>
          )}
        </div>

        {/* Source link */}
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-[9px] tracking-wide transition-all"
          style={{
            background: `${accentColor}08`, border: `1px solid ${accentColor}22`,
            color: '#3a6080', textDecoration: 'none',
          }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = `${accentColor}14`; el.style.borderColor = `${accentColor}55`; el.style.color = accentColor }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = `${accentColor}08`; el.style.borderColor = `${accentColor}22`; el.style.color = '#3a6080' }}
        >
          <span style={{ fontSize: '11px', opacity: 0.7 }}>↗</span>
          <span className="truncate flex-1">{hostname()}</span>
          <span style={{ opacity: 0.5, fontSize: '8px', letterSpacing: '0.12em' }}>{t('event.labels.viewSource', 'VIEW SOURCE')}</span>
        </a>

        {/* Coordinates */}
        {event.lat !== null && (
          <div className="text-[9px] text-[#1e3040]">
            {event.lat.toFixed(3)}° / {event.lng?.toFixed(3)}°
          </div>
        )}
      </div>

      {/* ── Focus button ───────────────────────────────────────────────────── */}
      {canFocus && (
        <div className="relative px-3 pb-1">
          <button
            onClick={onFocus}
            className="w-full py-1.5 text-[9px] tracking-widest transition-colors"
            style={{
              background: `${accentColor}08`, border: `1px solid ${accentColor}28`,
              borderRadius: '3px', color: accentColor,
              fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
            }}
          >
            ⊙ {t('panel.focus', 'FOCUS')}
          </button>
        </div>
      )}

      {/* ── Back button ────────────────────────────────────────────────────── */}
      {onBack && (
        <div className="relative px-3 pb-2.5">
          <button
            onClick={onBack}
            className="text-[9px] text-[#2a4060] hover:text-[#00d4ff] transition-colors"
          >
            ← {t('panel.back', 'Back')}
          </button>
        </div>
      )}

      {/* ── Suggested Queries ──────────────────────────────────────────────── */}
      {suggestedQueries.length > 0 && (
        <div className="relative px-3 pb-2 pt-2 border-t border-[rgba(0,180,255,0.07)]">
          <div className="text-[7px] text-[#2a4060] tracking-widest mb-1.5">{t('event.labels.suggestedQueries', 'SUGGESTED QUERIES')}</div>
          <div className="flex flex-wrap gap-1">
            {suggestedQueries.map(q => (
              <button
                key={q}
                onClick={() => { setAgentInput(q); agentAsk(q, agentContext) }}
                className="text-[8px] px-1.5 py-0.5 rounded transition-colors"
                style={{
                  background: `${accentColor}06`, border: `1px solid ${accentColor}20`,
                  color: accentColor + '99', fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}
                onMouseEnter={e => { const el = e.target as HTMLElement; el.style.background = `${accentColor}12`; el.style.color = accentColor }}
                onMouseLeave={e => { const el = e.target as HTMLElement; el.style.background = `${accentColor}06`; el.style.color = accentColor + '99' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Agent Chat (hidden in popout mode — AI is in the right column) ── */}
      {!hideAgent && <div className="relative px-3 pb-3 pt-2 border-t border-[rgba(0,180,255,0.07)]">
        <div className="text-[7px] text-[#2a4060] tracking-widest mb-2">{t('event.labels.agent', '◈ INTELLIGENCE AGENT')}</div>

        {agentHistory.length > 0 && (
          <div className="mb-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
            {agentHistory.map((entry) => (
              <div key={entry.id} className="mb-2">
                <div className="text-[8px] mb-1 opacity-70" style={{ color: accentColor }}>▸ {entry.question}</div>
                {entry.streaming ? (
                  <div className="text-[9px] leading-relaxed" style={{ color: '#8aabbf', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {entry.html || <span className="text-[#2a4060]">●●●</span>}
                    {entry.html && <span className="agent-stream-cursor" />}
                  </div>
                ) : (
                  <div
                    className="agent-response text-[9px] leading-relaxed"
                    style={{ color: '#8aabbf' }}
                    dangerouslySetInnerHTML={{ __html: entry.html }}
                  />
                )}
              </div>
            ))}
            <div ref={agentScrollRef} />
          </div>
        )}

        {agentLoading && agentHistory.length > 0 && agentHistory[agentHistory.length - 1].html === '' && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[7px] text-[#2a4060] tracking-widest">{t('event.labels.analyzing', 'ANALYZING')}</span>
            <span className="agent-loading-dots"><span /><span /><span /></span>
          </div>
        )}

        {agentError && (
          <div className="text-[8px] text-[#ff4d4d] mb-1.5 tracking-wide">⚠ {agentError}</div>
        )}

        <div className="flex gap-1">
          <input
            value={agentInput}
            onChange={e => setAgentInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (agentInput.trim()) { agentAsk(agentInput, agentContext); setAgentInput('') }
              }
            }}
            placeholder={t('event.labels.askAgent', '詢問情報分析...')}
            disabled={agentLoading}
            className="flex-1 text-[9px] px-2 py-1 rounded outline-none"
            style={{
              background: 'rgba(0,180,255,0.05)', border: `1px solid ${accentColor}20`,
              color: '#a8c4d8', fontFamily: 'JetBrains Mono, monospace',
              opacity: agentLoading ? 0.5 : 1,
            }}
          />
          <button
            disabled={agentLoading || !agentInput.trim()}
            onClick={() => { if (agentInput.trim()) { agentAsk(agentInput, agentContext); setAgentInput('') } }}
            className="text-[9px] px-2.5 py-1 rounded transition-colors"
            style={{
              background: agentLoading ? 'rgba(0,212,255,0.03)' : `${accentColor}0a`,
              border: `1px solid ${accentColor}25`,
              color: agentLoading ? '#2a4060' : accentColor,
              fontFamily: 'JetBrains Mono, monospace',
              cursor: agentLoading ? 'wait' : 'pointer',
            }}
          >
            {agentLoading ? '…' : '↵'}
          </button>
        </div>
      </div>}
    </div>
  )
}
