/**
 * RegionPanelAgent — suggested queries chip strip + agent chat input/history.
 * Fixed to the bottom of RegionPanel, outside the scrollable area.
 */
import { useState } from 'react'
import type { AgentEntry } from '../../hooks/useAgentQuery'

interface Props {
  history:          AgentEntry[]
  loading:          boolean
  error:            string | null
  suggestedQueries: string[]
  agentContext:     string
  ask:              (q: string, ctx: string) => void
  agentScrollRef:   React.RefObject<HTMLDivElement>
}

export function RegionPanelAgent({
  history, loading, error,
  suggestedQueries, agentContext, ask,
  agentScrollRef,
}: Props) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim()) { ask(input, agentContext); setInput('') }
  }

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,180,255,0.1)', background: 'rgba(4,9,22,0.97)' }}>

      {/* Suggested Queries */}
      {suggestedQueries.length > 0 && (
        <div style={{ padding: '7px 12px 5px', borderBottom: '1px solid rgba(0,180,255,0.07)' }}>
          <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '5px' }}>SUGGESTED QUERIES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {suggestedQueries.map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); ask(q, agentContext) }}
                style={{
                  background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.18)',
                  borderRadius: '2px', color: '#4a90b8', fontSize: '8px',
                  padding: '3px 7px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.05em', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.12)'; (e.target as HTMLElement).style.color = '#00d4ff' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(0,212,255,0.05)'; (e.target as HTMLElement).style.color = '#4a90b8' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent Chat */}
      <div style={{ padding: '7px 12px 10px' }}>
        <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '5px' }}>◈ INTELLIGENCE AGENT</div>

        {history.length > 0 && (
          <div style={{
            marginBottom: '7px', maxHeight: '180px', overflowY: 'auto',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent',
          }}>
            {history.map((entry) => (
              <div key={entry.id} style={{ marginBottom: '7px' }}>
                <div style={{ color: '#00d4ff', fontSize: '8px', letterSpacing: '0.08em', marginBottom: '3px', opacity: 0.7 }}>
                  ▸ {entry.question}
                </div>
                {entry.streaming ? (
                  <div style={{ color: '#8aabbf', fontSize: '9px', lineHeight: 1.6 }}>
                    {entry.html}
                    <span className="agent-stream-cursor" />
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

        {loading && history.length > 0 && (history[history.length - 1]?.html === '') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
            <span style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em' }}>ANALYZING</span>
            <span className="agent-loading-dots"><span /><span /><span /></span>
          </div>
        )}

        {error && (
          <div style={{ color: '#ff4d4d', fontSize: '8px', marginBottom: '5px', letterSpacing: '0.06em' }}>⚠ {error}</div>
        )}

        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="詢問情報分析..."
            disabled={loading}
            style={{
              flex: 1, background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.2)',
              borderRadius: '3px', color: '#a8c4d8', fontSize: '9px', padding: '5px 8px',
              fontFamily: 'JetBrains Mono, monospace', outline: 'none', opacity: loading ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              background: loading ? 'rgba(0,212,255,0.04)' : 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.25)', borderRadius: '3px',
              color: loading ? '#2a4060' : '#00d4ff', fontSize: '9px',
              padding: '5px 10px', cursor: loading ? 'wait' : 'pointer',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', transition: 'all 0.15s',
            }}
          >
            {loading ? '…' : '↵'}
          </button>
        </div>
      </div>
    </div>
  )
}
