import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppStore } from '../store'
import { useDraggable } from './useDraggable'

export interface UsePanelDragOptions {
  panelKey: string
  defaultPos: { x: number; y: number }
}

export interface UsePanelDragResult {
  panelRef:           React.RefObject<HTMLDivElement>
  pos:                { x: number; y: number }
  setPos:             React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  dragging:           boolean
  onHeaderMouseDown:  (e: React.MouseEvent) => void
  zIndex:             number
  handleBringToFront: () => void
  uiScale:            number
}

const PANEL_POS_KEY = (k: string) => `argus-panel-pos-${k}`

function loadSavedPos(
  panelKey: string,
  defaultPos: { x: number; y: number },
): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(PANEL_POS_KEY(panelKey))
    if (!raw) return defaultPos
    const p = JSON.parse(raw) as { x: unknown; y: unknown }
    if (typeof p.x !== 'number' || typeof p.y !== 'number') return defaultPos
    // Clamp so at least a corner remains visible after a window resize.
    return {
      x: Math.max(0, Math.min(p.x, window.innerWidth  - 100)),
      y: Math.max(0, Math.min(p.y, window.innerHeight - 40)),
    }
  } catch {
    return defaultPos
  }
}

/**
 * Shared drag + z-index hook for floating panels.
 *
 * Positions the panel with `position: fixed; left; top` in unscaled-viewport
 * coordinates (all values are divided by uiScale so the panel stays at the
 * correct visual position when the HUD zoom layer is active).
 *
 * Panel positions are persisted to localStorage under `argus-panel-pos-{panelKey}`
 * and restored on mount (with bounds-clamping for window-resize safety).
 */
export function usePanelDrag({ panelKey, defaultPos }: UsePanelDragOptions): UsePanelDragResult {
  const uiScale     = useAppStore((s) => s.uiScale)
  const panelZ      = useAppStore((s) => s.panelZ)
  const bringToFront = useAppStore((s) => s.bringToFront)

  const uiScaleRef  = useRef(uiScale)
  uiScaleRef.current = uiScale

  const { onMouseDown: startDrag, dragging } = useDraggable()

  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(() => loadSavedPos(panelKey, defaultPos))
  const posRef = useRef(pos)
  posRef.current = pos

  // Persist position to localStorage whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(PANEL_POS_KEY(panelKey), JSON.stringify(pos))
    } catch {
      // Ignore storage quota errors.
    }
  }, [panelKey, pos])

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    const scale = uiScaleRef.current
    const { x: initX, y: initY } = posRef.current
    const startX = e.clientX / scale
    const startY = e.clientY / scale
    startDrag(e, (mv) => {
      const s  = uiScaleRef.current
      const pw = panelRef.current?.offsetWidth  ?? 320
      const ph = panelRef.current?.offsetHeight ?? 400
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  / s - pw, initX + mv.clientX / s - startX)),
        y: Math.max(0, Math.min(window.innerHeight / s - ph, initY + mv.clientY / s - startY)),
      })
    })
  }, [startDrag])

  return {
    panelRef,
    pos,
    setPos,
    dragging,
    onHeaderMouseDown,
    zIndex:             panelZ[panelKey] ?? 30,
    handleBringToFront: () => bringToFront(panelKey),
    uiScale,
  }
}
