import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { usePanelDrag } from '../../hooks/usePanelDrag'
import { useAgentQuery } from '../../hooks/useAgentQuery'
import { Panel } from './Panel'
import type { ContextEntity, ContextEntityType } from '../../types'

const ACCENT = '#00ffcc'
const LIMIT = 8

const TYPE_ICON: Record<ContextEntityType, string> = {
  event:     '◉',
  person:    '👤',
  region:    '⊙',
  celestial: '✦',
}

const TYPE_COLOR: Record<ContextEntityType, string> = {
  event:     '#ff9c2a',
  person:    '#c084fc',
  region:    '#00d4ff',
  celestial: '#ffd700',
}

function EntityCard({ entity, onRemove }: { entity: ContextEntity; onRemove: () => void }) {
  const color = TYPE_COLOR[entity.type]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      padding: '6px 8px', background: `${color}08`,
      border: `1px solid ${color}20`, borderRadius: '3px',
    }}>
      <span style={{ color, fontSize: '10px', flexShrink: 0, marginTop: '1px' }}>
        {TYPE_ICON[entity.type]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#c8dde8', fontSize: '9px', fontWeight: 600, lineHeight: 1.3 }}>
          {entity.name}
        </div>
        {entity.summary && (
          <div style={{
            color: '#4a6070', fontSize: '8px', lineHeight: 1.4, marginTop: '2px',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {entity.summary}
          </div>
        )}
        <div style={{
          color: `${color}99`, fontSize: '7px', letterSpacing: '0.1em',
          marginTop: '2px', textTransform: 'uppercase',
        }}>
          {entity.type}
        </div>
      </div>
      <button
        onClick={onRemove}
        style={{
          background: 'none', border: 'none', color: '#4a6070',
          cursor: 'pointer', fontSize: '9px', lineHeight: 1,
          padding: '1px 3px', flexShrink: 0, transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4d' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#4a6070' }}
      >✕</button>
    </div>
  )
}

export function MultiEntityContextPanel() {
  const { t } = useTranslation()
  const contextEntities     = useAppStore(s => s.contextEntities)
  const showContextPanel    = useAppStore(s => s.showContextPanel)
  const removeContextEntity = useAppStore(s => s.removeContextEntity)
  const clearContextEntities = useAppStore(s => s.clearContextEntities)

  const { panelRef, pos, setPos, dragging, onHeaderMouseDown, zIndex, handleBringToFront, uiScale } =
    usePanelDrag({ panelKey: 'context', defaultPos: { x: 100, y: 160 } })

  const { history, loading: agentLoading, error: agentError, ask } = useAgentQuery()
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
    if (contextEntities.length === 0) return ''
    return contextEntities.map(e =>
      `[${e.type.toUpperCase()}] ${e.name}: ${e.summary}`
    ).join('\n\n')
  }, [contextEntities])

  const suggestedQueries = useMemo(() => {
    if (contextEntities.length === 0) return []
    const types = new Set(contextEntities.map(e => e.type))
    const names = contextEntities.slice(0, 3).map(e => e.name)
    const queries: string[] = []

    if (contextEntities.length >= 2) {
      queries.push(`分析 ${names.slice(0, 2).join(' 與 ')} 之間的關聯`)
    }
    if (types.has('event') && types.has('person')) {
      queries.push('這些人物在這些事件中扮演什麼角色？')
    }
    if (types.has('event') && types.has('region')) {
      queries.push('這些事件對該地區的影響評估')
    }
    if (types.has('person') && contextEntities.filter(e => e.type === 'person').length >= 2) {
      queries.push('比較這些人物的政治立場')
    }
    queries.push('綜合情報摘要')
    return queries.slice(0, 4)
  }, [contextEntities])

  if (!showContextPanel || contextEntities.length === 0) return null

  const handleSend = () => {
    if (agentInput.trim()) { ask(agentInput, agentContext); setAgentInput('') }
  }

  const atLimit = contextEntities.length >= LIMIT

  return (
    <Panel
      panelRef={panelRef}
      accentColor={ACCENT}
      onMouseDown={handleBringToFront}
      dragging={dragging}
      onHeaderMouseDown={onHeaderMouseDown}
      title={
        <span style={{ color: ACCENT }}>
          ◈ {t('context.title', 'MULTI-ENTITY CONTEXT')} ({contextEntities.length}/{LIMIT})
        </span>
      }
      headerControls={
        <button
          onClick={clearContextEntities}
          title={t('context.clearAll', 'Clear all entities')}
          style={{
            background: 'none', border: '1px solid rgba(255,77,77,0.25)',
            borderRadius: '2px', color: '#4a6070',
            cursor: 'pointer', fontSize: '8px', padding: '2px 5px',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.borderColor = 'rgba(255,77,77,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4a6070'; e.currentTarget.style.borderColor = 'rgba(255,77,77,0.25)' }}
        >⊘ {t('context.clear', 'CLEAR')}</button>
      }
      onClose={() => useAppStore.getState().setShowContextPanel(false)}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex,
        width: '340px',
        maxHeight: `calc(${100 / uiScale}vh - 100px)`,
      }}
    >
      {/* Entity list */}
      <div style={{
        flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: '4px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,204,0.15) transparent',
      }}>
        {contextEntities.map(entity => (
          <EntityCard
            key={entity.id}
            entity={entity}
            onRemove={() => removeContextEntity(entity.id)}
          />
        ))}

        {atLimit && (
          <div style={{
            color: '#ff9c2a', fontSize: '7px', letterSpacing: '0.1em',
            textAlign: 'center', padding: '4px 0',
          }}>
            {t('context.limitReached', 'ENTITY LIMIT REACHED')} ({LIMIT})
          </div>
        )}
      </div>

      {/* AI Agent section */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,255,204,0.1)', background: 'rgba(4,9,22,0.97)' }}>
        {/* Suggested queries */}
        {suggestedQueries.length > 0 && (
          <div style={{ padding: '7px 12px 5px', borderBottom: '1px solid rgba(0,255,204,0.07)' }}>
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
            {t('context.agent', '◈ CROSS-ENTITY INTELLIGENCE')}
          </div>

          {history.length > 0 && (
            <div style={{
              marginBottom: '7px', maxHeight: '180px', overflowY: 'auto',
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,204,0.15) transparent',
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
              placeholder={t('context.askAgent', '詢問跨實體情報分析…')}
              disabled={agentLoading}
              style={{
                flex: 1, background: 'rgba(0,255,204,0.05)', border: `1px solid ${ACCENT}25`,
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
