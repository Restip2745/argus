/**
 * PersonPanel — displays Wikipedia information about a person.
 *
 * Features:
 *  • Keyword search via Wikipedia API (debounced, 280 ms)
 *  • Multi-person sidebar: thumbnails for all selected persons, click to switch
 *  • Main body: thumbnail, name, description, extract, Wikipedia link
 *  • AI agent chat with person-aware context
 *  • Follows Panel + usePanelDrag architecture used by all other panels
 */
import { useRef, useState, useEffect, useMemo } from 'react'
import { useAppStore }       from '../../store'
import { useAgentQuery }     from '../../hooks/useAgentQuery'
import { usePanelDrag }      from '../../hooks/usePanelDrag'
import { useWikiSummary }    from '../../hooks/useWikiSummary'
import { usePersonSearch }   from '../../hooks/usePersonSearch'
import { Panel }             from './Panel'
import type { PersonEntity } from '../../types'

const ACCENT = '#9b6dff'

// ── Suggested queries by description keyword ──────────────────────────────────

function suggestedQueriesFor(description: string | null): string[] {
  const d = (description ?? '').toLowerCase()
  if (d.includes('president') || d.includes('prime minister') || d.includes('chancellor'))
    return ['Political ideology and legacy', 'Foreign policy record', 'Key decisions in office']
  if (d.includes('general') || d.includes('admiral') || d.includes('military'))
    return ['Military campaigns', 'Strategic doctrine', 'Role in key conflicts']
  if (d.includes('scientist') || d.includes('physicist') || d.includes('biologist'))
    return ['Major discoveries', 'Scientific legacy', 'Controversies or disputes']
  if (d.includes('ceo') || d.includes('entrepreneur') || d.includes('businessman'))
    return ['Business strategy', 'Companies founded', 'Economic impact']
  return ['Historical significance', 'Key relationships and alliances', 'Controversies']
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PersonPanel() {
  const showPersonPanel      = useAppStore((s) => s.showPersonPanel)
  const selectedPersons      = useAppStore((s) => s.selectedPersons)
  const activePersonName     = useAppStore((s) => s.activePersonName)
  const setActivePersonName  = useAppStore((s) => s.setActivePersonName)
  const addSelectedPerson    = useAppStore((s) => s.addSelectedPerson)
  const removeSelectedPerson = useAppStore((s) => s.removeSelectedPerson)
  const clearSelectedPersons = useAppStore((s) => s.clearSelectedPersons)

  const { panelRef, pos, dragging, onHeaderMouseDown, zIndex, handleBringToFront } =
    usePanelDrag({
      panelKey:   'person',
      defaultPos: { x: 60, y: 120 },
    })

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchInput,   setSearchInput]   = useState('')
  const [showDropdown,  setShowDropdown]  = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  const { results: searchResults, loading: searchLoading } = usePersonSearch(searchInput)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  // ── Person data via Wikipedia REST API ────────────────────────────────────
  const { data: wiki, loading: wikiLoading, error: wikiError } =
    useWikiSummary(activePersonName)

  // When Wikipedia data loads, sync into selectedPersons
  useEffect(() => {
    if (!wiki) return
    const entity: PersonEntity = {
      name:        wiki.title,
      description: wiki.description ?? null,
      extract:     wiki.extract     ?? null,
      thumbnail:   wiki.thumbnail?.source ?? null,
      wikiUrl:     wiki.content_urls?.desktop.page ?? null,
    }
    addSelectedPerson(entity)
  }, [wiki?.title]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Agent chat ────────────────────────────────────────────────────────────
  const { history: agentHistory, loading: agentLoading, error: agentError, ask: agentAsk } =
    useAgentQuery()
  const [agentInput,   setAgentInput]   = useState('')
  const agentScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    agentScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [agentHistory])

  const agentContext = useMemo(() => {
    if (!wiki) return ''
    return [
      `Person: ${wiki.title}`,
      wiki.description ? `Description: ${wiki.description}` : '',
      wiki.extract     ? `Summary: ${wiki.extract.slice(0, 600)}` : '',
    ].filter(Boolean).join('\n')
  }, [wiki])

  const suggestedQueries = useMemo(
    () => suggestedQueriesFor(wiki?.description ?? null),
    [wiki?.description],
  )

  // ── Select person from search dropdown ───────────────────────────────────
  function handleSelectResult(title: string) {
    setSearchInput('')
    setShowDropdown(false)
    setActivePersonName(title)
  }

  // ── Remove a person from the list ────────────────────────────────────────
  function handleRemove(name: string) {
    removeSelectedPerson(name)
    const remaining = selectedPersons.filter((p) => p.name !== name)
    if (remaining.length > 0) {
      setActivePersonName(remaining[remaining.length - 1].name)
    } else {
      clearSelectedPersons()
    }
  }

  if (!showPersonPanel) return null

  const activePerson = selectedPersons.find((p) => p.name === activePersonName)
  const hasSidebar   = selectedPersons.length > 1

  return (
    <>
      <div
        ref={panelRef}
        onMouseDown={handleBringToFront}
        style={{
          position:      'fixed',
          left:          pos.x,
          top:           pos.y,
          zIndex,
          display:       'flex',
          flexDirection: 'row',
          fontFamily:    'JetBrains Mono, monospace',
          cursor:        dragging ? 'grabbing' : 'default',
        }}
      >
        {/* ── Multi-person sidebar ──────────────────────────────────────── */}
        {hasSidebar && (
          <div style={{
            width: '38px',
            background: 'rgba(4,9,22,0.94)',
            border: `1px solid rgba(155,109,255,0.2)`,
            borderRight: 'none',
            borderRadius: '4px 0 0 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '36px',
            gap: '6px',
            paddingBottom: '8px',
            overflow: 'hidden',
          }}>
            {selectedPersons.map((p) => {
              const isActive = p.name === activePersonName
              return (
                <button
                  key={p.name}
                  title={p.name}
                  onClick={() => setActivePersonName(p.name)}
                  style={{
                    width: '26px', height: '26px',
                    borderRadius: '50%',
                    border: `2px solid ${isActive ? ACCENT : 'rgba(155,109,255,0.2)'}`,
                    background: isActive ? `${ACCENT}22` : 'rgba(155,109,255,0.08)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    transition: 'border-color 0.15s, background 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {p.thumbnail
                    ? <img src={p.thumbnail} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: ACCENT, fontSize: '10px' }}>◎</span>
                  }
                </button>
              )
            })}
          </div>
        )}

        {/* ── Main card ────────────────────────────────────────────────── */}
        <Panel
          accentColor={ACCENT}
          width={300}
          dragging={dragging}
          onHeaderMouseDown={onHeaderMouseDown}
          title="PERSON INTEL"
          onClose={clearSelectedPersons}
          style={{
            flexShrink: 0,
            boxShadow: 'none',
            borderRadius: hasSidebar ? '0 4px 4px 0' : '4px',
          }}
        >
          <div style={{
            overflowY: 'auto',
            height: 'calc(80vh - 5rem)',
            maxHeight: '580px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(155,109,255,0.15) transparent',
          }}>

            {/* ── Search bar ─────────────────────────────────────────────── */}
            <div ref={searchWrapRef} style={{ position: 'relative', padding: '8px 10px 4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: `${ACCENT}07`,
                border: `1px solid ${searchInput ? ACCENT + '44' : ACCENT + '1a'}`,
                borderRadius: '3px', padding: '4px 8px',
                transition: 'border-color 0.2s',
              }}>
                <span style={{ color: `${ACCENT}88`, fontSize: '10px', userSelect: 'none' }}>⌕</span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setShowDropdown(true) }}
                  onFocus={() => { if (searchInput) setShowDropdown(true) }}
                  placeholder="Search person…"
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    color: '#a8c4d8', fontSize: '9px',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.05em',
                  }}
                />
                {searchLoading && (
                  <span style={{ color: `${ACCENT}66`, fontSize: '8px', animation: 'pulse 1s infinite' }}>●</span>
                )}
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(''); setShowDropdown(false) }}
                    style={{
                      background: 'none', border: 'none', color: '#4a6070',
                      cursor: 'pointer', fontSize: '9px', lineHeight: 1, padding: 0,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#00d4ff' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a6070' }}
                  >✕</button>
                )}
              </div>

              {/* Search dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% - 2px)',
                  left: '10px', right: '10px',
                  zIndex: 20,
                  background: 'rgba(4,9,22,0.98)',
                  border: `1px solid ${ACCENT}33`,
                  borderRadius: '3px',
                  overflow: 'hidden',
                  boxShadow: `0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px ${ACCENT}18`,
                }}>
                  {searchResults.map((r) => (
                    <button
                      key={r.pageid}
                      onClick={() => handleSelectResult(r.title)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '6px 9px',
                        borderBottom: `1px solid rgba(155,109,255,0.08)`,
                        background: 'none', cursor: 'pointer',
                        fontFamily: 'JetBrains Mono, monospace',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${ACCENT}12` }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                    >
                      <div style={{ color: ACCENT, fontSize: '9px', fontWeight: 600, marginBottom: '2px' }}>
                        {r.title}
                      </div>
                      <div
                        style={{ color: '#4a6070', fontSize: '8px', lineHeight: 1.3 }}
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Loading / error ───────────────────────────────────────── */}
            {wikiLoading && (
              <div style={{ padding: '20px 12px', color: '#2a4060', fontSize: '8px', letterSpacing: '0.12em' }}>
                LOADING…
              </div>
            )}
            {wikiError && !wikiLoading && (
              <div style={{ padding: '10px 12px', color: '#ff4d4d', fontSize: '9px' }}>
                ⚠ {wikiError}
              </div>
            )}

            {/* ── Person info ───────────────────────────────────────────── */}
            {wiki && !wikiLoading && (
              <div style={{ padding: '6px 12px 10px' }}>

                {/* Thumbnail + name row */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                  {wiki.thumbnail && (
                    <img
                      src={wiki.thumbnail.source}
                      alt={wiki.title}
                      style={{
                        width: '60px', height: '60px',
                        objectFit: 'cover', flexShrink: 0,
                        borderRadius: '3px',
                        border: `1px solid ${ACCENT}30`,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{
                      color: '#c8dde8', fontSize: '11px', fontWeight: 600,
                      lineHeight: 1.3, margin: '0 0 4px',
                    }}>
                      {wiki.title}
                    </h2>
                    {wiki.description && (
                      <div style={{
                        color: `${ACCENT}cc`, fontSize: '8px',
                        letterSpacing: '0.06em', lineHeight: 1.4,
                      }}>
                        {wiki.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* Extract */}
                {wiki.extract && (
                  <p style={{
                    color: '#4a6070', fontSize: '9px', lineHeight: 1.55,
                    marginBottom: '10px',
                  }}>
                    {wiki.extract.length > 320
                      ? wiki.extract.slice(0, 320) + '…'
                      : wiki.extract}
                  </p>
                )}

                {/* Wikipedia link + Remove button */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {wiki.content_urls && (
                    <a
                      href={wiki.content_urls.desktop.page}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 8px', borderRadius: '3px',
                        background: `${ACCENT}08`,
                        border: `1px solid ${ACCENT}22`,
                        color: '#3a6080', textDecoration: 'none', fontSize: '9px',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = `${ACCENT}14`; el.style.color = ACCENT }}
                      onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = `${ACCENT}08`; el.style.color = '#3a6080' }}
                    >
                      <span style={{ opacity: 0.7 }}>↗</span>
                      <span>Wikipedia</span>
                    </a>
                  )}

                  {selectedPersons.length > 1 && activePerson && (
                    <button
                      onClick={() => handleRemove(activePerson.name)}
                      style={{
                        padding: '5px 8px', borderRadius: '3px',
                        background: 'none',
                        border: '1px solid rgba(0,180,255,0.12)',
                        color: '#4a6070', fontSize: '8px',
                        letterSpacing: '0.08em', cursor: 'pointer',
                        fontFamily: 'JetBrains Mono, monospace',
                        transition: 'color 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={(e) => { const el = e.currentTarget; el.style.color = '#ff4d4d'; el.style.borderColor = 'rgba(255,77,77,0.3)' }}
                      onMouseLeave={(e) => { const el = e.currentTarget; el.style.color = '#4a6070'; el.style.borderColor = 'rgba(0,180,255,0.12)' }}
                    >
                      ✕ REMOVE
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Suggested queries ─────────────────────────────────────── */}
            {wiki && suggestedQueries.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(155,109,255,0.07)', padding: '8px 12px 4px' }}>
                <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.12em', marginBottom: '6px' }}>
                  SUGGESTED QUERIES
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {suggestedQueries.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setAgentInput(q); agentAsk(q, agentContext) }}
                      style={{
                        fontSize: '8px', padding: '3px 7px', borderRadius: '2px',
                        background: `${ACCENT}07`,
                        border: `1px solid ${ACCENT}22`,
                        color: `${ACCENT}99`,
                        fontFamily: 'JetBrains Mono, monospace',
                        cursor: 'pointer', letterSpacing: '0.04em',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = `${ACCENT}14`; el.style.color = ACCENT }}
                      onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = `${ACCENT}07`; el.style.color = `${ACCENT}99` }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Agent chat ────────────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(155,109,255,0.07)', padding: '10px 12px' }}>
              <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.12em', marginBottom: '8px' }}>
                ◈ INTELLIGENCE AGENT
              </div>

              {agentHistory.length > 0 && (
                <div style={{
                  maxHeight: '160px', overflowY: 'auto', marginBottom: '8px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155,109,255,0.15) transparent',
                }}>
                  {agentHistory.map((entry) => (
                    <div key={entry.id} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '8px', color: `${ACCENT}aa`, marginBottom: '2px', opacity: 0.8 }}>
                        ▸ {entry.question}
                      </div>
                      {entry.streaming ? (
                        <div style={{
                          fontSize: '9px', color: '#8aabbf', lineHeight: 1.5,
                          fontFamily: 'JetBrains Mono, monospace',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {entry.html || <span style={{ color: '#2a4060' }}>●●●</span>}
                          {entry.html && <span className="agent-stream-cursor" />}
                        </div>
                      ) : (
                        <div
                          className="agent-response"
                          style={{ fontSize: '9px', color: '#8aabbf' }}
                          dangerouslySetInnerHTML={{ __html: entry.html }}
                        />
                      )}
                    </div>
                  ))}
                  <div ref={agentScrollRef} />
                </div>
              )}

              {agentLoading && agentHistory.length > 0 && agentHistory[agentHistory.length - 1]?.html === '' && (
                <div style={{ fontSize: '7px', color: '#2a4060', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  <span className="agent-loading-dots"><span /><span /><span /></span>
                </div>
              )}

              {agentError && (
                <div style={{ fontSize: '8px', color: '#ff4d4d', marginBottom: '6px' }}>
                  ⚠ {agentError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (agentInput.trim()) { agentAsk(agentInput, agentContext); setAgentInput('') }
                    }
                  }}
                  placeholder="Ask about this person…"
                  disabled={agentLoading}
                  style={{
                    flex: 1, fontSize: '9px', padding: '4px 8px', borderRadius: '3px',
                    background: `${ACCENT}06`,
                    border: `1px solid ${ACCENT}20`,
                    color: '#a8c4d8',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                    opacity: agentLoading ? 0.5 : 1,
                  }}
                />
                <button
                  disabled={agentLoading || !agentInput.trim()}
                  onClick={() => { if (agentInput.trim()) { agentAsk(agentInput, agentContext); setAgentInput('') } }}
                  style={{
                    fontSize: '9px', padding: '4px 10px', borderRadius: '3px',
                    background: agentLoading ? `${ACCENT}04` : `${ACCENT}0c`,
                    border: `1px solid ${ACCENT}28`,
                    color: agentLoading ? '#2a4060' : ACCENT,
                    cursor: agentLoading ? 'wait' : 'pointer',
                    fontFamily: 'JetBrains Mono, monospace',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                >
                  {agentLoading ? '…' : '↵'}
                </button>
              </div>
            </div>

          </div>
        </Panel>
      </div>
    </>
  )
}
