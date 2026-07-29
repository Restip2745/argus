import { useState } from 'react'
import { useAppStore } from '../../store'
import type { AnnotationPin, AnnotationLink } from '../../types'

// ── Preset icons & colors ────────────────────────────────────────────────────
const PRESET_ICONS = [
  '📍', '⭐', '⚡', '🔴', '🟠', '🟡',
  '🏴', '💥', '⚠️', '🎯', '🔵', '🟢',
  '🛡️', '⚔️', '🚀', '✈️', '🚢', '🏔️',
]

const PRESET_COLORS = [
  '#00c8ff', '#ff4444', '#ff9c2a', '#ffd700',
  '#44ff88', '#cc44ff', '#ff44cc', '#ffffff',
]

// ── Tool button ──────────────────────────────────────────────────────────────
function ToolBtn({
  label, icon, active, onClick, danger,
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '7px 10px',
        borderRadius: 6,
        border: `1px solid ${active ? (danger ? '#ff4444' : '#9b6dff') : 'rgba(255,255,255,0.12)'}`,
        background: active
          ? (danger ? 'rgba(255,68,68,0.18)' : 'rgba(155,109,255,0.18)')
          : 'rgba(255,255,255,0.04)',
        color: active ? (danger ? '#ff6666' : '#c4a0ff') : 'rgba(255,255,255,0.55)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        minWidth: 52,
        fontSize: 18,
      }}
    >
      <span>{icon}</span>
      <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{label}</span>
    </button>
  )
}

// ── Pin form (add / edit pin) ─────────────────────────────────────────────────
function PinForm({ onConfirm, onCancel }: {
  onConfirm: (icon: string, color: string, label: string) => void
  onCancel: () => void
}) {
  const [icon,  setIcon]  = useState('📍')
  const [color, setColor] = useState('#00c8ff')
  const [label, setLabel] = useState('')

  return (
    <div style={formStyle}>
      <div style={formTitle}>新增標記點</div>

      <div style={fieldLabel}>圖示</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {PRESET_ICONS.map((ic) => (
          <button
            key={ic}
            onClick={() => setIcon(ic)}
            style={{
              fontSize: 18, width: 32, height: 32,
              borderRadius: 6,
              border: `1px solid ${ic === icon ? color : 'rgba(255,255,255,0.15)'}`,
              background: ic === icon ? color + '28' : 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {ic}
          </button>
        ))}
      </div>

      <div style={fieldLabel}>顏色</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: c,
              border: `2px solid ${c === color ? '#fff' : 'transparent'}`,
              cursor: 'pointer',
              boxShadow: c === color ? `0 0 6px ${c}` : 'none',
              padding: 0,
            }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            padding: 0,
            background: 'none',
          }}
          title="自訂顏色"
        />
      </div>

      <div style={fieldLabel}>標籤</div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(icon, color, label) }}
        placeholder="標記說明（可空白）"
        style={inputStyle}
        autoFocus
      />

      {/* Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: color + '28', border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>{icon}</div>
        {label && (
          <span style={{ fontSize: 11, color, fontFamily: 'monospace' }}>{label}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={btnSecondary}>取消</button>
        <button onClick={() => onConfirm(icon, color, label)} style={{ ...btnPrimary, flex: 1 }}>
          放置標記
        </button>
      </div>
    </div>
  )
}

// ── Link form (label / color for a new connection) ────────────────────────────
function LinkForm({ onConfirm, onCancel }: {
  onConfirm: (label: string, color: string) => void
  onCancel: () => void
}) {
  const [color, setColor] = useState('#ff9c2a')
  const [label, setLabel] = useState('')

  return (
    <div style={formStyle}>
      <div style={formTitle}>設定連線</div>

      <div style={fieldLabel}>顏色</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: c,
              border: `2px solid ${c === color ? '#fff' : 'transparent'}`,
              cursor: 'pointer',
              boxShadow: c === color ? `0 0 6px ${c}` : 'none',
              padding: 0,
            }}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            padding: 0,
            background: 'none',
          }}
          title="自訂顏色"
        />
      </div>

      <div style={fieldLabel}>標籤（可空白）</div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(label, color) }}
        placeholder="連線說明"
        style={inputStyle}
        autoFocus
      />

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button onClick={onCancel} style={btnSecondary}>取消</button>
        <button onClick={() => onConfirm(label, color)} style={{ ...btnPrimary, flex: 1 }}>
          建立連線
        </button>
      </div>
    </div>
  )
}

// ── Main toolbar ──────────────────────────────────────────────────────────────
export function AnnotationToolbar() {
  const showAnnotationCanvas = useAppStore((s) => s.showAnnotationCanvas)
  const annotationTool       = useAppStore((s) => s.annotationTool)
  const setAnnotationTool    = useAppStore((s) => s.setAnnotationTool)
  const pendingPin           = useAppStore((s) => s.pendingPin)
  const setPendingPin        = useAppStore((s) => s.setPendingPin)
  const pendingLink          = useAppStore((s) => s.pendingLink)
  const setPendingLink       = useAppStore((s) => s.setPendingLink)
  const pendingLinkFrom      = useAppStore((s) => s.pendingLinkFrom)
  const setPendingLinkFrom   = useAppStore((s) => s.setPendingLinkFrom)
  const addAnnotationPin     = useAppStore((s) => s.addAnnotationPin)
  const addAnnotationLink    = useAppStore((s) => s.addAnnotationLink)
  const clearAnnotations     = useAppStore((s) => s.clearAnnotations)
  const annotationPins       = useAppStore((s) => s.annotationPins)
  const annotationLinks      = useAppStore((s) => s.annotationLinks)

  if (!showAnnotationCanvas) return null

  const handleConfirmPin = (icon: string, color: string, label: string) => {
    if (!pendingPin) return
    const pin: AnnotationPin = {
      id:     crypto.randomUUID(),
      bodyId: pendingPin.bodyId,
      lat:    pendingPin.lat,
      lng:    pendingPin.lng,
      icon, color, label,
    }
    addAnnotationPin(pin)
    setPendingPin(null)
  }

  const handleConfirmLink = (label: string, color: string) => {
    if (!pendingLink) return
    const link: AnnotationLink = {
      id:     crypto.randomUUID(),
      fromId: pendingLink.fromId,
      toId:   pendingLink.toId,
      label, color,
    }
    addAnnotationLink(link)
    setPendingLink(null)
  }

  const hasItems = annotationPins.length > 0 || annotationLinks.length > 0

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      right: 16,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {/* Pin form overlay */}
      {pendingPin && (
        <div style={{ pointerEvents: 'all' }}>
          <PinForm
            onConfirm={handleConfirmPin}
            onCancel={() => setPendingPin(null)}
          />
        </div>
      )}

      {/* Link form overlay */}
      {pendingLink && !pendingPin && (
        <div style={{ pointerEvents: 'all' }}>
          <LinkForm
            onConfirm={handleConfirmLink}
            onCancel={() => setPendingLink(null)}
          />
        </div>
      )}

      {/* Main toolbar panel */}
      <div style={{
        pointerEvents: 'all',
        background: 'rgba(8,14,22,0.88)',
        border: '1px solid rgba(155,109,255,0.35)',
        borderRadius: 10,
        padding: '10px 12px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 200,
      }}>
        {/* Header */}
        <div style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#9b6dff',
          letterSpacing: '0.1em',
          borderBottom: '1px solid rgba(155,109,255,0.2)',
          paddingBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span>✏</span>
          <span>標記工具</span>
          {hasItems && (
            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
              {annotationPins.length} 點 · {annotationLinks.length} 線
            </span>
          )}
        </div>

        {/* Tool buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <ToolBtn
            icon="📍"
            label="標記"
            active={annotationTool === 'pin'}
            onClick={() => setAnnotationTool('pin')}
          />
          <ToolBtn
            icon="→"
            label="連線"
            active={annotationTool === 'link'}
            onClick={() => setAnnotationTool('link')}
          />
          <ToolBtn
            icon="🗑"
            label="刪除"
            active={annotationTool === 'erase'}
            onClick={() => setAnnotationTool('erase')}
            danger
          />
        </div>

        {/* Status hint */}
        <div style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.38)',
          fontFamily: 'monospace',
          lineHeight: 1.5,
          minHeight: 32,
        }}>
          {annotationTool === 'pin' && !pendingPin && (
            <>點擊天體表面<br/>放置標記點</>
          )}
          {annotationTool === 'pin' && pendingPin && (
            <span style={{ color: '#9b6dff' }}>設定標記屬性 ▲</span>
          )}
          {annotationTool === 'link' && !pendingLinkFrom && (
            <>點擊第一個標記點<br/>選擇起點</>
          )}
          {annotationTool === 'link' && pendingLinkFrom && !pendingLink && (
            <span style={{ color: '#ff9c2a' }}>
              已選起點<br/>點擊目標標記點
            </span>
          )}
          {annotationTool === 'link' && pendingLink && (
            <span style={{ color: '#9b6dff' }}>設定連線屬性 ▲</span>
          )}
          {annotationTool === 'erase' && (
            <>點擊標記點刪除<br/>（連線一併移除）</>
          )}
        </div>

        {/* Cancel pending link-from */}
        {annotationTool === 'link' && pendingLinkFrom && !pendingLink && (
          <button
            onClick={() => setPendingLinkFrom(null)}
            style={{ ...btnSecondary, fontSize: 10 }}
          >
            取消選取
          </button>
        )}

        {/* Clear all */}
        {hasItems && (
          <button
            onClick={() => { if (confirm('清除所有標記與連線？')) clearAnnotations() }}
            style={{
              ...btnSecondary,
              fontSize: 11,
              color: 'rgba(255,100,100,0.6)',
              borderColor: 'rgba(255,100,100,0.2)',
              marginTop: 2,
            }}
          >
            清除全部
          </button>
        )}
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const formStyle: React.CSSProperties = {
  background: 'rgba(8,14,22,0.94)',
  border: '1px solid rgba(155,109,255,0.4)',
  borderRadius: 10,
  padding: '14px 16px',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  minWidth: 240,
  maxWidth: 280,
}

const formTitle: React.CSSProperties = {
  fontSize: 12,
  fontFamily: 'monospace',
  color: '#c4a0ff',
  letterSpacing: '0.08em',
  marginBottom: 12,
  borderBottom: '1px solid rgba(155,109,255,0.2)',
  paddingBottom: 8,
}

const fieldLabel: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'monospace',
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: '0.06em',
  marginBottom: 5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  padding: '6px 10px',
  color: '#fff',
  fontSize: 12,
  fontFamily: 'monospace',
  outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  background: 'rgba(155,109,255,0.25)',
  border: '1px solid rgba(155,109,255,0.5)',
  borderRadius: 6,
  padding: '7px 12px',
  color: '#c4a0ff',
  fontSize: 11,
  fontFamily: 'monospace',
  cursor: 'pointer',
  letterSpacing: '0.05em',
}

const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  padding: '7px 12px',
  color: 'rgba(255,255,255,0.45)',
  fontSize: 11,
  fontFamily: 'monospace',
  cursor: 'pointer',
}
