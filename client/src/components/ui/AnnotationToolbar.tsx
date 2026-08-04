import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import type { AnnotationPin, AnnotationLink } from '../../types'

// ── Preset icons & colors ────────────────────────────────────────────────────
const PRESET_ICONS = [
  '/icons/pin.png', '/icons/star.png', '/icons/lightning.png', '/icons/diamond.png', '/icons/hexagon.png', '/icons/square.png',
  '/icons/flag.png', '/icons/impact.png', '/icons/warning.png', '/icons/target.png', '/icons/circle.png', '/icons/cross.png',
  '/icons/shield.png', '/icons/eye.png', '/icons/rocket.png', '/icons/aircraft.png', '/icons/ship.png', '/icons/mountain.png',
]

const PRESET_COLORS = [
  '#00c8ff', '#ff4444', '#ff9c2a', '#ffd700',
  '#44ff88', '#cc44ff', '#ff44cc', '#ffffff',
]

// A marker icon is either a literal glyph (emoji/text) or an image path —
// pins placed before an icon was reskinned as an image keep working either way.
export function MarkerGlyph({ icon, size }: { icon: string; size: number }) {
  return icon.startsWith('/')
    ? <img src={icon} alt="" style={{ width: size, height: size, display: 'block' }} />
    : <>{icon}</>
}

// ── Tool button ──────────────────────────────────────────────────────────────
function ToolBtn({
  label, icon, iconSrc, active, onClick, danger,
}: {
  label: string
  icon?: string
  iconSrc?: string
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
      <span>{iconSrc ? <img src={iconSrc} alt="" style={{ width: 18, height: 18, display: 'block' }} /> : icon}</span>
      <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{label}</span>
    </button>
  )
}

// ── Pin form (add / edit pin) ─────────────────────────────────────────────────
function PinForm({ onConfirm, onCancel }: {
  onConfirm: (icon: string, color: string, label: string) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [icon,  setIcon]  = useState('/icons/pin.png')
  const [color, setColor] = useState('#00c8ff')
  const [label, setLabel] = useState('')

  return (
    <div style={formStyle}>
      <div style={formTitle}>{t('annotation.pinForm.title', 'NEW MARKER')}</div>

      <div style={fieldLabel}>{t('annotation.field.icon', 'ICON')}</div>
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
            <MarkerGlyph icon={ic} size={18} />
          </button>
        ))}
      </div>

      <div style={fieldLabel}>{t('annotation.field.color', 'COLOUR')}</div>
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
          title={t('annotation.field.customColor', 'Custom colour')}
        />
      </div>

      <div style={fieldLabel}>{t('annotation.field.label', 'LABEL')}</div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(icon, color, label) }}
        placeholder={t('annotation.pinForm.placeholder', 'Marker note (optional)')}
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
        }}><MarkerGlyph icon={icon} size={16} /></div>
        {label && (
          <span style={{ fontSize: 11, color, fontFamily: 'monospace' }}>{label}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCancel} style={btnSecondary}>{t('annotation.action.cancel', 'CANCEL')}</button>
        <button onClick={() => onConfirm(icon, color, label)} style={{ ...btnPrimary, flex: 1 }}>
          {t('annotation.action.placePin', 'PLACE MARKER')}
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
  const { t } = useTranslation()
  const [color, setColor] = useState('#ff9c2a')
  const [label, setLabel] = useState('')

  return (
    <div style={formStyle}>
      <div style={formTitle}>{t('annotation.linkForm.title', 'NEW LINK')}</div>

      <div style={fieldLabel}>{t('annotation.field.color', 'COLOUR')}</div>
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
          title={t('annotation.field.customColor', 'Custom colour')}
        />
      </div>

      <div style={fieldLabel}>{t('annotation.field.labelOptional', 'LABEL (OPTIONAL)')}</div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(label, color) }}
        placeholder={t('annotation.linkForm.placeholder', 'Link note')}
        style={inputStyle}
        autoFocus
      />

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button onClick={onCancel} style={btnSecondary}>{t('annotation.action.cancel', 'CANCEL')}</button>
        <button onClick={() => onConfirm(label, color)} style={{ ...btnPrimary, flex: 1 }}>
          {t('annotation.action.createLink', 'CREATE LINK')}
        </button>
      </div>
    </div>
  )
}

// ── Main toolbar ──────────────────────────────────────────────────────────────
export function AnnotationToolbar() {
  const { t } = useTranslation()
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
          <img src="/icons/pencil.png" alt="" style={{ width: 14, height: 14, display: 'block' }} />
          <span>{t('annotation.title', 'MARKING TOOLS')}</span>
          {hasItems && (
            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
              {t('annotation.counts', { pins: annotationPins.length, links: annotationLinks.length, defaultValue: '{{pins}} PINS · {{links}} LINKS' })}
            </span>
          )}
        </div>

        {/* Tool buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <ToolBtn
            iconSrc="/icons/pin.png"
            label={t('annotation.tool.pin', 'PIN')}
            active={annotationTool === 'pin'}
            onClick={() => setAnnotationTool('pin')}
          />
          <ToolBtn
            icon="→"
            label={t('annotation.tool.link', 'LINK')}
            active={annotationTool === 'link'}
            onClick={() => setAnnotationTool('link')}
          />
          <ToolBtn
            iconSrc="/icons/erase.png"
            label={t('annotation.tool.erase', 'ERASE')}
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
            <>{t('annotation.hint.pinIdle', 'Click a body surface')}<br/>{t('annotation.hint.pinIdle2', 'to place a marker')}</>
          )}
          {annotationTool === 'pin' && pendingPin && (
            <span style={{ color: '#9b6dff' }}>{t('annotation.hint.pinPending', 'Set marker properties')} ▲</span>
          )}
          {annotationTool === 'link' && !pendingLinkFrom && (
            <>{t('annotation.hint.linkIdle', 'Click the first marker')}<br/>{t('annotation.hint.linkIdle2', 'to choose the origin')}</>
          )}
          {annotationTool === 'link' && pendingLinkFrom && !pendingLink && (
            <span style={{ color: '#ff9c2a' }}>
              {t('annotation.hint.linkFrom', 'Origin selected')}<br/>{t('annotation.hint.linkFrom2', 'Click the target marker')}
            </span>
          )}
          {annotationTool === 'link' && pendingLink && (
            <span style={{ color: '#9b6dff' }}>{t('annotation.hint.linkPending', 'Set link properties')} ▲</span>
          )}
          {annotationTool === 'erase' && (
            <>{t('annotation.hint.erase', 'Click a marker to delete')}<br/>{t('annotation.hint.erase2', '(its links go too)')}</>
          )}
        </div>

        {/* Cancel pending link-from */}
        {annotationTool === 'link' && pendingLinkFrom && !pendingLink && (
          <button
            onClick={() => setPendingLinkFrom(null)}
            style={{ ...btnSecondary, fontSize: 10 }}
          >
            {t('annotation.action.deselect', 'DESELECT')}
          </button>
        )}

        {/* Clear all */}
        {hasItems && (
          <button
            onClick={() => { if (confirm(t('annotation.confirmClear', 'Clear all markers and links?'))) clearAnnotations() }}
            style={{
              ...btnSecondary,
              fontSize: 11,
              color: 'rgba(255,100,100,0.6)',
              borderColor: 'rgba(255,100,100,0.2)',
              marginTop: 2,
            }}
          >
            {t('annotation.action.clearAll', 'CLEAR ALL')}
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
