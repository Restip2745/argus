import { useState, useRef } from 'react'
import { useCanvasAnalysis } from '../../hooks/useCanvasAnalysis'
import { useAppStore } from '../../store'

const SUGGESTED = [
  '目前哪些地區衝突最激烈？',
  'Identify orbital objects near conflict zones',
  '分析全球政治穩定性趨勢',
  'What anomalies or patterns do you see?',
]

interface Props {
  onClose: () => void
}

export function CanvasAnalysisPanel({ onClose }: Props) {
  const { html, loading, error, analyze, clear } = useCanvasAnalysis()
  const events          = useAppStore((s) => s.events)
  const selectedCountry = useAppStore((s) => s.selectedCountry)
  const panelZ          = useAppStore((s) => s.panelZ)
  const bringToFront    = useAppStore((s) => s.bringToFront)
  const [input, setInput] = useState('')

  // Build a short text context for the model
  const context = [
    selectedCountry ? `Focused region: ${selectedCountry.name} (${selectedCountry.lat.toFixed(2)}, ${selectedCountry.lng.toFixed(2)})` : null,
    `Active events: ${events.length} total`,
    events.slice(0, 6).map(e => `- [${e.category}] ${e.title}`).join('\n'),
  ].filter(Boolean).join('\n')

  const panelRef   = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [pos, setPos] = useState({ x: Math.max(0, window.innerWidth - 480), y: 60 })
  const [dragging, setDragging] = useState(false)

  const onMouseDown = (e: React.MouseEvent) => {
    bringToFront('canvasAnalysis')
    if ((e.target as HTMLElement).closest('button,input,textarea')) return
    setDragging(true)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }
  const onMouseUp = () => setDragging(false)

  const submit = (q: string) => {
    if (loading) return
    analyze(q || undefined, context)
    setInput('')
  }

  return (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        width: '420px',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(4,9,22,0.97)',
        border: '1px solid rgba(0,180,255,0.25)',
        borderRadius: '4px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
        color: '#c8cdd2',
        zIndex: panelZ['canvasAnalysis'] ?? 32,
        cursor: dragging ? 'grabbing' : 'grab',
        boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
        animation: 'regionPanelIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderBottom: '1px solid rgba(0,180,255,0.1)',
        flexShrink: 0,
      }}>
        <span style={{ color: '#9b6dff', fontSize: '8px', letterSpacing: '0.15em' }}>
          ◈ AI CANVAS ANALYSIS
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {html && (
            <button
              onClick={clear}
              title="Clear result"
              style={{ background:'none', border:'none', color:'#4a6070', cursor:'pointer', fontSize:'9px' }}
            >CLEAR</button>
          )}
          <button
            onClick={onClose}
            style={{ background:'none', border:'none', color:'#4a6070', cursor:'pointer', fontSize:'11px', lineHeight:1 }}
          >✕</button>
        </div>
      </div>

      {/* Scrollable result area */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '10px' }}>
        {!html && !loading && !error && (
          <div style={{ color: '#2a4060', fontSize: '10px', lineHeight: 1.6 }}>
            <p>Capture the current globe view and run an AI intelligence analysis.</p>
            <p style={{ marginTop: '6px', color: '#1a3050' }}>
              Requires a multimodal model (e.g. llava, bakllava) configured in Settings.
            </p>
          </div>
        )}

        {loading && (
          <div style={{ color: '#4a6070', fontSize: '9px', letterSpacing: '0.1em' }}>
            ◌ ANALYZING CANVAS...
          </div>
        )}

        {error && (
          <div style={{ color: '#ff4d4d', fontSize: '9px' }}>
            ✗ {error}
          </div>
        )}

        {html && (
          <div
            style={{ fontSize: '11px', lineHeight: 1.7, color: '#a0b0c0' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {/* Fixed bottom: suggested + input */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(0,180,255,0.1)', background: 'rgba(4,9,22,0.97)', padding: '8px 10px' }}>
        {/* Capture button */}
        <button
          onClick={() => submit(input)}
          disabled={loading}
          style={{
            width: '100%',
            marginBottom: '8px',
            padding: '6px',
            background: loading ? 'rgba(155,109,255,0.05)' : 'rgba(155,109,255,0.12)',
            border: '1px solid rgba(155,109,255,0.35)',
            borderRadius: '3px',
            color: loading ? '#4a3070' : '#9b6dff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '9px',
            letterSpacing: '0.12em',
            fontFamily: 'JetBrains Mono, monospace',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '◌ ANALYZING...' : '⊙ CAPTURE & ANALYZE GLOBE'}
        </button>

        {/* Suggested prompts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {SUGGESTED.map(q => (
            <button
              key={q}
              onClick={() => submit(q)}
              disabled={loading}
              style={{
                background: 'rgba(0,180,255,0.04)',
                border: '1px solid rgba(0,180,255,0.12)',
                borderRadius: '2px',
                color: '#2a5070',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '8px',
                padding: '2px 6px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >{q}</button>
          ))}
        </div>

        {/* Custom question input */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) } }}
            placeholder="Custom analysis question..."
            style={{
              flex: 1,
              background: 'rgba(0,180,255,0.04)',
              border: '1px solid rgba(0,180,255,0.15)',
              borderRadius: '2px',
              color: '#6a9090',
              fontSize: '10px',
              padding: '4px 6px',
              fontFamily: 'JetBrains Mono, monospace',
              outline: 'none',
            }}
          />
          <button
            onClick={() => submit(input)}
            disabled={loading || !input.trim()}
            style={{
              background: 'rgba(0,180,255,0.06)',
              border: '1px solid rgba(0,180,255,0.2)',
              borderRadius: '2px',
              color: (!input.trim() || loading) ? '#2a4060' : '#00d4ff',
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
              fontSize: '10px',
              padding: '4px 8px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >▶</button>
        </div>
      </div>
    </div>
  )
}
