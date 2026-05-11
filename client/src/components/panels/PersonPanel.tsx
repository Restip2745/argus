import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { usePanelDrag } from '../../hooks/usePanelDrag'
import { useAgentQuery } from '../../hooks/useAgentQuery'
import { usePopoutWindow } from '../../hooks/usePopoutWindow'
import { Panel } from './Panel'
import { PersonPanelBody } from './PersonPanelBody'
import type { ContextEntity } from '../../types'

const ACCENT = '#c084fc'

interface WikiSearchResult {
  title: string
  description?: string
  thumbnail?: { source: string }
}

function useWikiSearch(query: string) {
  const [results, setResults] = useState<WikiSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)

    const encoded = encodeURIComponent(query)
    fetch(`https://en.wikipedia.org/api/rest_v1/page/related/${encoded}`, { signal: ctrl.signal })
      .catch(() => null)

    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srnamespace=0&srlimit=8&format=json&origin=*`,
      { signal: ctrl.signal },
    )
      .then(r => r.json())
      .then((data: { query?: { search?: Array<{ title: string; snippet: string }> } }) => {
        if (ctrl.signal.aborted) return
        const items = (data.query?.search ?? []).map(s => ({
          title: s.title,
          description: s.snippet.replace(/<[^>]*>/g, '').slice(0, 100),
        }))
        setResults(items)
      })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })

    return () => ctrl.abort()
  }, [query])

  return { results, loading }
}

export function PersonPanel() {
  const { t } = useTranslation()
  const selectedPersons = useAppStore(s => s.selectedPersons)
  const addSelectedPerson = useAppStore(s => s.addSelectedPerson)
  const removeSelectedPerson = useAppStore(s => s.removeSelectedPerson)
  const clearSelectedPersons = useAppStore(s => s.clearSelectedPersons)

  const addContextEntity    = useAppStore(s => s.addContextEntity)
  const contextEntities     = useAppStore(s => s.contextEntities)

  const { panelRef, pos, setPos, dragging, onHeaderMouseDown, zIndex, handleBringToFront, uiScale } =
    usePanelDrag({ panelKey: 'person', defaultPos: { x: 60, y: 120 } })

  const [searchInput, setSearchInput] = useState('')
  const [showSearch, setShowSearch] = useState(true)
  const { results: searchResults, loading: searchLoading } = useWikiSearch(searchInput)

  const { history, loading: agentLoading, error: agentError, ask } = useAgentQuery()
  const { open: popoutOpen, isPopped } = usePopoutWindow('person')
  const [agentInput, setAgentInput] = useState('')
  const agentScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    agentScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history])

  useEffect(() => {
    const onResize = () => {
      setPos(p => ({
        x: Math.max(0, Math.min(window.innerWidth / uiScale - 340, p.x)),
        y: Math.max(0, Math.min(window.innerHeight / uiScale - 60, p.y)),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [uiScale, setPos])

  const agentContext = useMemo(() => {
    if (selectedPersons.length === 0) return ''
    return selectedPersons.map(p =>
      `Person: ${p.name}${p.wikiTitle && p.wikiTitle !== p.name ? ` (Wikipedia: ${p.wikiTitle})` : ''}`
    ).join('\n')
  }, [selectedPersons])

  const suggestedQueries = useMemo(() => {
    if (selectedPersons.length === 0) return []
    if (selectedPersons.length === 1) {
      const name = selectedPersons[0].name
      return [
        `${name} 的政治立場分析`,
        `${name} 的重要事蹟`,
        `${name} 的國際影響力`,
        `${name} 與當前事件的關聯`,
      ]
    }
    const names = selectedPersons.slice(0, 2).map(p => p.name)
    return [
      `${names.join(' 與 ')} 的關係分析`,
      `${names.join(' 和 ')} 的政治立場比較`,
      `二者在國際事務上的角色`,
    ]
  }, [selectedPersons])

  if (selectedPersons.length === 0) return null

  const handleSend = () => {
    if (agentInput.trim()) { ask(agentInput, agentContext); setAgentInput('') }
  }

  return (
    <Panel
      panelRef={panelRef}
      accentColor={ACCENT}
      onMouseDown={handleBringToFront}
      dragging={dragging}
      onHeaderMouseDown={onHeaderMouseDown}
      title={
        <span style={{ color: ACCENT }}>
          {selectedPersons.length > 1
            ? `◈ ${t('person.title', 'PERSONS')} (${selectedPersons.length})`
            : `◈ ${t('person.title', 'PERSON')}`}
        </span>
      }
      headerControls={
        <>
          {/* Add persons to context */}
          {(() => {
            const allInContext = selectedPersons.every(p => contextEntities.some(e => e.id === `person-${p.name}`))
            return (
              <button
                onClick={() => {
                  for (const p of selectedPersons) {
                    const ce: ContextEntity = {
                      id: `person-${p.name}`,
                      type: 'person',
                      name: p.name,
                      summary: p.wikiTitle ? `Wikipedia: ${p.wikiTitle}` : p.name,
                    }
                    addContextEntity(ce)
                  }
                }}
                title={allInContext ? 'Already in context' : 'Add to context panel'}
                disabled={allInContext}
                style={{
                  background: allInContext ? 'rgba(0,255,204,0.12)' : 'none',
                  border: `1px solid ${allInContext ? 'rgba(0,255,204,0.4)' : 'transparent'}`,
                  borderRadius: '2px',
                  color: allInContext ? '#00ffcc' : '#4a6070',
                  cursor: allInContext ? 'default' : 'pointer',
                  fontSize: '9px', lineHeight: 1,
                  padding: '1px 4px', transition: 'all 0.15s',
                  fontFamily: 'JetBrains Mono, monospace',
                  opacity: allInContext ? 0.6 : 1,
                }}
              >⊕</button>
            )
          })()}
          <button
            onClick={() => setShowSearch(v => !v)}
            title={t('person.search', 'Search person')}
            style={{
              background: showSearch ? `${ACCENT}18` : 'none',
              border: `1px solid ${showSearch ? ACCENT + '40' : 'transparent'}`,
              borderRadius: '2px', color: showSearch ? ACCENT : '#4a6070',
              cursor: 'pointer', fontSize: '9px', padding: '2px 5px',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
              transition: 'all 0.15s',
            }}
          >⌕</button>
          <button
            onClick={popoutOpen}
            title={isPopped ? 'Panel is open in separate window' : 'Pop out to separate window'}
            style={{
              background: 'none', border: 'none',
              color: isPopped ? ACCENT : '#4a6070',
              cursor: 'pointer', fontSize: '10px', lineHeight: 1,
              padding: '1px 3px', transition: 'color 0.15s',
            }}
          >⊡</button>
        </>
      }
      onClose={clearSelectedPersons}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex,
        width: '320px',
        maxHeight: `calc(${100 / uiScale}vh - 100px)`,
      }}
    >
      {/* Search bar */}
      {showSearch && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,180,255,0.08)' }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('person.searchPlaceholder', 'Search people…')}
            style={{
              width: '100%', background: 'rgba(0,180,255,0.05)', border: `1px solid ${ACCENT}25`,
              borderRadius: '3px', color: '#a8c4d8', fontSize: '9px', padding: '5px 8px',
              fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchLoading && (
            <div style={{ color: '#2a4060', fontSize: '7px', padding: '4px 0', letterSpacing: '0.1em' }}>Searching…</div>
          )}
          {searchResults.length > 0 && (
            <div style={{ marginTop: '4px', maxHeight: '140px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
              {searchResults.map(r => {
                const isSelected = selectedPersons.some(p => p.name === r.title)
                return (
                  <button
                    key={r.title}
                    onClick={() => {
                      if (!isSelected) addSelectedPerson({ name: r.title, wikiTitle: r.title })
                      setSearchInput('')
                    }}
                    disabled={isSelected}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      background: isSelected ? `${ACCENT}0a` : 'transparent',
                      border: 'none', padding: '4px 6px', cursor: isSelected ? 'default' : 'pointer',
                      borderBottom: '1px solid rgba(0,180,255,0.05)',
                      fontFamily: 'JetBrains Mono, monospace', transition: 'background 0.1s',
                      opacity: isSelected ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = `${ACCENT}10` }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? `${ACCENT}0a` : 'transparent' }}
                  >
                    <div style={{ color: '#c8dde8', fontSize: '9px', fontWeight: 600 }}>{r.title}</div>
                    {r.description && (
                      <div style={{ color: '#4a6070', fontSize: '7px', marginTop: '1px', lineHeight: 1.3 }}>{r.description}</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Scrollable person cards */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
        {selectedPersons.map(p => (
          <PersonPanelBody
            key={p.name}
            person={p}
            accentColor={ACCENT}
            onRemove={selectedPersons.length > 1 ? () => removeSelectedPerson(p.name) : undefined}
          />
        ))}
      </div>

      {/* AI Agent section */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,180,255,0.1)', background: 'rgba(4,9,22,0.97)' }}>
        {/* Suggested queries */}
        {suggestedQueries.length > 0 && (
          <div style={{ padding: '7px 12px 5px', borderBottom: '1px solid rgba(0,180,255,0.07)' }}>
            <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '5px' }}>
              {t('event.labels.suggestedQueries', 'SUGGESTED QUERIES')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {suggestedQueries.map(q => (
                <button
                  key={q}
                  onClick={() => { setAgentInput(q); ask(q, agentContext) }}
                  style={{
                    background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`,
                    borderRadius: '2px', color: `${ACCENT}bb`, fontSize: '8px',
                    padding: '3px 7px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.05em', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}14`; e.currentTarget.style.color = ACCENT }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}08`; e.currentTarget.style.color = `${ACCENT}bb` }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div style={{ padding: '7px 12px 10px' }}>
          <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '5px' }}>
            {t('person.agent', '◈ PERSON INTELLIGENCE')}
          </div>

          {history.length > 0 && (
            <div style={{
              marginBottom: '7px', maxHeight: '180px', overflowY: 'auto',
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent',
            }}>
              {history.map(entry => (
                <div key={entry.id} style={{ marginBottom: '7px' }}>
                  <div style={{ color: ACCENT, fontSize: '8px', letterSpacing: '0.08em', marginBottom: '3px', opacity: 0.7 }}>
                    ▸ {entry.question}
                  </div>
                  {entry.streaming ? (
                    <div style={{ color: '#8aabbf', fontSize: '9px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {entry.html || <span style={{ color: '#2a4060' }}>●●●</span>}
                      {entry.html && <span className="agent-stream-cursor" />}
                    </div>
                  ) : (
                    <div
                      className="agent-response"
                      dangerouslySetInnerHTML={{ __html: entry.html }}
                      style={{ color: '#8aabbf', fontSize: '9px', lineHeight: 1.6 }}
                    />
                  )}
                </div>
              ))}
              <div ref={agentScrollRef} />
            </div>
          )}

          {agentLoading && history.length > 0 && history[history.length - 1]?.html === '' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
              <span style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em' }}>
                {t('event.labels.analyzing', 'ANALYZING')}
              </span>
              <span className="agent-loading-dots"><span /><span /><span /></span>
            </div>
          )}

          {agentError && (
            <div style={{ color: '#ff4d4d', fontSize: '8px', marginBottom: '5px', letterSpacing: '0.06em' }}>⚠ {agentError}</div>
          )}

          <div style={{ display: 'flex', gap: '5px' }}>
            <input
              value={agentInput}
              onChange={e => setAgentInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={t('person.askAgent', '詢問人物情報…')}
              disabled={agentLoading}
              style={{
                flex: 1, background: 'rgba(0,180,255,0.05)', border: `1px solid ${ACCENT}25`,
                borderRadius: '3px', color: '#a8c4d8', fontSize: '9px', padding: '5px 8px',
                fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                opacity: agentLoading ? 0.5 : 1,
              }}
            />
            <button
              onClick={handleSend}
              disabled={agentLoading || !agentInput.trim()}
              style={{
                background: agentLoading ? `${ACCENT}06` : `${ACCENT}0a`,
                border: `1px solid ${ACCENT}25`, borderRadius: '3px',
                color: agentLoading ? '#2a4060' : ACCENT, fontSize: '9px',
                padding: '5px 10px', cursor: agentLoading ? 'wait' : 'pointer',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                transition: 'all 0.15s',
              }}
            >
              {agentLoading ? '…' : '↵'}
            </button>
          </div>
        </div>
      </div>
    </Panel>
  )
}
