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
import { resolveCountryName, getCountryCentroid } from '../../data/countryData'
import type { ArgusEvent } from '../../types'
import type { SelectedCountry } from '../../store'
import type { AgentEntry } from '../../hooks/useAgentQuery'


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
  t:                (key: string, fallback: string) => string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EventPanelBody({
  event, accentColor,
  onFocus, canFocus, onBack,
  setSelectedCountry,
  agentHistory, agentLoading, agentError,
  agentInput, setAgentInput,
  suggestedQueries, agentContext, agentAsk,
  agentScrollRef, t,
}: Props) {
  const title   = event.title
  const summary = event.content || event.summary_zh

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
          <p className="text-[#4a6070] text-[10px] leading-relaxed">{summary}</p>
        )}

        {/* Actors */}
        {event.actors?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.actors.map(a => (
              <span
                key={a}
                className="px-1.5 py-0.5 text-[9px] rounded"
                style={{
                  background: `${accentColor}10`,
                  border: `1px solid ${accentColor}30`,
                  color: accentColor + 'cc',
                }}
              >
                {a}
              </span>
            ))}
          </div>
        )}

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
          <span style={{ opacity: 0.5, fontSize: '8px', letterSpacing: '0.12em' }}>VIEW SOURCE</span>
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
          <div className="text-[7px] text-[#2a4060] tracking-widest mb-1.5">SUGGESTED QUERIES</div>
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

      {/* ── Agent Chat ─────────────────────────────────────────────────────── */}
      <div className="relative px-3 pb-3 pt-2 border-t border-[rgba(0,180,255,0.07)]">
        <div className="text-[7px] text-[#2a4060] tracking-widest mb-2">◈ INTELLIGENCE AGENT</div>

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
            <span className="text-[7px] text-[#2a4060] tracking-widest">ANALYZING</span>
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
            placeholder="詢問情報分析..."
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
      </div>
    </div>
  )
}
