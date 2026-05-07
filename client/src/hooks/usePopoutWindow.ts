import { useCallback } from 'react'
import { useAppStore } from '../store'

export function usePopoutWindow(panelKey: 'event' | 'region' | 'person') {
  const setPoppedOut = useAppStore((s) => s.setPoppedOut)
  const poppedOut    = useAppStore((s) => s.poppedOut)

  const open = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?popout=${panelKey}`
    const w   = window.screen.availWidth
    const h   = window.screen.availHeight
    const win = window.open(url, `argus-popout-${panelKey}`, `width=${w},height=${h},left=0,top=0,menubar=no,toolbar=no,status=no`)
    if (win) {
      setPoppedOut(panelKey, true)
      const timer = setInterval(() => {
        if (win.closed) { setPoppedOut(panelKey, false); clearInterval(timer) }
      }, 1000)
    }
  }, [panelKey, setPoppedOut])

  return { open, isPopped: !!poppedOut[panelKey] }
}
