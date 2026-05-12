import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const POLL_INTERVAL = 60_000
const STALE_SCRAPER_MS = 45 * 60_000  // 45 minutes

export interface ServiceHealth {
  ollamaOnline: boolean
  lastScraperRun: string | null
  analyzedCount: number
  webhookEnabled: boolean
  healthy: boolean
}

export function useServiceHealth(): ServiceHealth {
  const [health, setHealth] = useState<ServiceHealth>({
    ollamaOnline: true,
    lastScraperRun: null,
    analyzedCount: 0,
    webhookEnabled: false,
    healthy: true,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (!document.hidden) {
        try {
          const r = await fetch(`${API_BASE}/api/health`)
          if (!r.ok || cancelled) { /* keep previous state */ }
          else {
            const data = await r.json() as {
              ollamaOnline?: boolean
              lastScraperRun?: string | null
              analyzedCount?: number
              webhookEnabled?: boolean
            }
            if (!cancelled) {
              const ollamaOnline   = data.ollamaOnline !== false
              const lastScraperRun = data.lastScraperRun ?? null
              const analyzedCount  = data.analyzedCount ?? 0
              const webhookEnabled = data.webhookEnabled === true
              const scraperStale = lastScraperRun != null
                ? (Date.now() - new Date(lastScraperRun).getTime()) > STALE_SCRAPER_MS
                : false
              setHealth({ ollamaOnline, lastScraperRun, analyzedCount, webhookEnabled, healthy: ollamaOnline && !scraperStale })
            }
          }
        } catch { /* network error — keep previous health state */ }
      }
      if (!cancelled) timerRef.current = setTimeout(poll, POLL_INTERVAL)
    }

    function onVisible() {
      if (!document.hidden && !cancelled) {
        if (timerRef.current) clearTimeout(timerRef.current)
        void poll()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    poll()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return health
}
