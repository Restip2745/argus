import { useCallback } from 'react'
import { useAppStore } from '../store'

export function usePopoutWindow(panelKey: 'event' | 'region') {
  const setPoppedOut = useAppStore((s) => s.setPoppedOut)
  const poppedOut    = useAppStore((s) => s.poppedOut)

  const open = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?popout=${panelKey}`
    const win = window.open(url, `argus-popout-${panelKey}`, 'width=420,height=700,menubar=no,toolbar=no,status=no')
    if (win) {
      setPoppedOut(panelKey, true)
      const timer = setInterval(() => {
        if (win.closed) { setPoppedOut(panelKey, false); clearInterval(timer) }
      }, 1000)
    }
  }, [panelKey, setPoppedOut])

  return { open, isPopped: !!poppedOut[panelKey] }
}
