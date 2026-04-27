import { useEffect, useState } from 'react'

export interface MousePos { x: number; y: number }

/** Global window-level mouse position — shared via singleton so only one listener is needed. */
let globalPos: MousePos = { x: 0, y: 0 }
const listeners = new Set<(pos: MousePos) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    globalPos = { x: e.clientX, y: e.clientY }
    listeners.forEach((fn) => fn(globalPos))
  }, { passive: true })
}

/** Returns the current window-level mouse position, updated on every mousemove. */
export function useMousePosition(): MousePos {
  const [pos, setPos] = useState<MousePos>(globalPos)
  useEffect(() => {
    listeners.add(setPos)
    return () => { listeners.delete(setPos) }
  }, [])
  return pos
}

/**
 * Returns mouse position normalised to [-1, 1] relative to a given element.
 * Pass the element ref; returns { nx, ny } where (0,0) = centre.
 */
export function useMouseRelative(ref: React.RefObject<HTMLElement | null>): { nx: number; ny: number } {
  const [norm, setNorm] = useState({ nx: 0, ny: 0 })
  useEffect(() => {
    function update(pos: MousePos) {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const nx = ((pos.x - rect.left) / rect.width)  * 2 - 1  // -1 … 1
      const ny = ((pos.y - rect.top)  / rect.height) * 2 - 1
      setNorm({ nx, ny })
    }
    listeners.add(update)
    return () => { listeners.delete(update) }
  }, [ref])
  return norm
}
