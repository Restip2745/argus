import { useState, useRef, useCallback } from 'react'

/**
 * Manages window mousemove/mouseup listener lifecycle for draggable panels.
 * Returns a stable `onMouseDown` that accepts a move handler capturing
 * start-position values at mousedown time.
 */
export function useDraggable() {
  const [dragging, setDragging] = useState(false)
  const onMoveRef = useRef<((mv: MouseEvent) => void) | null>(null)

  const onMouseDown = useCallback((
    e: React.MouseEvent,
    moveHandler: (mv: MouseEvent) => void,
  ) => {
    e.preventDefault()
    onMoveRef.current = moveHandler
    setDragging(true)

    const handleMove = (mv: MouseEvent) => onMoveRef.current?.(mv)
    const handleUp   = () => {
      setDragging(false)
      onMoveRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup',   handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup',   handleUp)
  }, [])

  return { onMouseDown, dragging }
}
