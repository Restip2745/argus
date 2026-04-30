/**
 * Panel — base visual shell for all floating panels.
 *
 * Provides: outer container styling, left accent bar, corner accents,
 * draggable header (title + controls + close button), and a body slot.
 *
 * Does NOT manage position or z-index — callers use usePanelDrag for that
 * and pass panelRef / style / onMouseDown as needed.
 *
 * Extension pattern:
 *   const { panelRef, pos, dragging, onHeaderMouseDown, zIndex, handleBringToFront } = usePanelDrag(...)
 *   <div ref={panelRef} onMouseDown={handleBringToFront} style={{ position:'fixed', left:pos.x, top:pos.y, zIndex }}>
 *     <Panel accentColor={...} title={...} dragging={dragging} onHeaderMouseDown={onHeaderMouseDown} onClose={...}>
 *       {body}
 *     </Panel>
 *   </div>
 */
import type { HTMLAttributes } from 'react'

// ── Corner accents ────────────────────────────────────────────────────────────

function CornerAccents({ color }: { color: string }) {
  return (
    <>
      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => {
        const [v, h] = corner.split('-') as [string, string]
        return (
          <div
            key={corner}
            style={{
              position: 'absolute', [v]: 0, [h]: 0,
              width: 8, height: 8,
              borderTop:    v === 'top'    ? `1px solid ${color}60` : 'none',
              borderBottom: v === 'bottom' ? `1px solid ${color}60` : 'none',
              borderLeft:   h === 'left'   ? `1px solid ${color}60` : 'none',
              borderRight:  h === 'right'  ? `1px solid ${color}60` : 'none',
              pointerEvents: 'none',
            }}
          />
        )
      })}
    </>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  // --- Chrome ---
  accentColor?: string
  width?: number | string
  // --- Header ---
  /** Optional node rendered left of the title (e.g. intensity badge). */
  headerLeft?: React.ReactNode
  /** Main header label. Rendered with accentColor + monospace styling. */
  title: React.ReactNode
  /** Controls rendered right of the title, before the close button. */
  headerControls?: React.ReactNode
  onClose: () => void
  dragging?: boolean
  onHeaderMouseDown?: (e: React.MouseEvent) => void
  // --- Body ---
  children: React.ReactNode
  // --- Ref ---
  /** Attach to the outer container div (for SVG tail, drag boundary). */
  panelRef?: React.RefObject<HTMLDivElement>
}

export function Panel({
  accentColor = '#00d4ff',
  width,
  headerLeft,
  title,
  headerControls,
  onClose,
  dragging = false,
  onHeaderMouseDown,
  children,
  panelRef,
  style,
  className,
  ...rest
}: PanelProps) {
  return (
    <div
      ref={panelRef}
      className={className}
      {...rest}
      style={{
        position:      'relative',
        background:    'rgba(4,9,22,0.94)',
        border:        '1px solid rgba(0,180,255,0.18)',
        borderRadius:  '4px',
        fontFamily:    'JetBrains Mono, monospace',
        userSelect:    dragging ? 'none' : 'auto',
        display:       'flex',
        flexDirection: 'column',
        boxShadow:     '0 0 32px rgba(0,100,180,0.18)',
        overflow:      'hidden',
        width,
        ...style,
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position:   'absolute', left: 0, top: 0, bottom: 0, width: '2px',
        background: `linear-gradient(180deg, transparent, ${accentColor}60, transparent)`,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Corner accents */}
      <CornerAccents color={accentColor} />

      {/* Header — acts as drag handle */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          cursor:       dragging ? 'grabbing' : 'grab',
          padding:      '7px 10px',
          borderBottom: '1px solid rgba(0,180,255,0.12)',
          background:   `linear-gradient(90deg, ${accentColor}0a 0%, transparent 100%)`,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          flexShrink:   0,
          userSelect:   'none',
        }}
      >
        {/* Left: badge slot + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {headerLeft}
          <span style={{ color: accentColor, fontSize: '8px', letterSpacing: '0.15em' }}>
            {title}
          </span>
        </div>

        {/* Right: controls + close */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          {headerControls}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: '#4a6070', cursor: 'pointer',
              fontSize: '11px', lineHeight: 1, padding: '1px 3px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#00d4ff' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a6070' }}
          >✕</button>
        </div>
      </div>

      {/* Body — rendered as-is; panels manage their own scroll / fixed sections */}
      {children}
    </div>
  )
}
