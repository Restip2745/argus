import { useEffect, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Traps keyboard focus within the given container element while enabled.
 * Restores focus to the previously-focused element when disabled/unmounted.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const restore = document.activeElement as HTMLElement | null

    const getFocusable = () =>
      Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    getFocusable()[0]?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const els = getFocusable()
      if (els.length === 0) return
      const first = els[0], last = els[els.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      restore?.focus?.()
    }
  }, [enabled, containerRef])
}
