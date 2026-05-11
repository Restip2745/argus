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

/**
 * Shared drag + z-index hook for floating panels.
 *
 * Positions the panel with `position: fixed; left; top` in unscaled-viewport
 * coordinates (all values are divided by uiScale so the panel stays at the
 * correct visual position when the HUD zoom layer is active).
 */
export function usePanelDrag({ panelKey, defaultPos }: UsePanelDragOptions): UsePanelDragResult {
  const uiScale     = useAppStore((s) => s.uiScale)
  const panelZ      = useAppStore((s) => s.panelZ)
  const bringToFront = useAppStore((s) => s.bringToFront)

  const uiScaleRef  = useRef(uiScale)
  uiScaleRef.current = uiScale

  const { onMouseDown: startDrag, dragging } = useDraggable()

  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(defaultPos)
  const posRef = useRef(pos)
  posRef.current = pos

  // One-shot viewport clamp: runs after each render until the ref element is
  // available and has layout dimensions, then sets hasClamped and stops.
  // useLayoutEffect with [] would fire before some panels render their ref div
  // (e.g. EventPanel returns null until an event is selected), so we use a
  // depless useEffect + guard ref instead.
  const hasClamped = useRef(false)
  useEffect(() => {
    if (hasClamped.current) return
    const el = panelRef.current
    if (!el || el.offsetWidth === 0) return
    hasClamped.current = true
    const s  = uiScaleRef.current
    const pw = el.offsetWidth
    const ph = el.offsetHeight
    setPos(p => ({
      x: Math.max(0, Math.min(window.innerWidth  / s - pw, p.x)),
      y: Math.max(0, Math.min(window.innerHeight / s - ph, p.y)),
    }))
  })

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
