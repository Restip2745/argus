import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const POLL_INTERVAL = 60_000
const STALE_SCRAPER_MS = 45 * 60_000  // 45 minutes

export interface ServiceHealth {
  ollamaOnline: boolean
  lastScraperRun: string | null
  analyzedCount: number
  healthy: boolean
}

export function useServiceHealth(): ServiceHealth {
  const [health, setHealth] = useState<ServiceHealth>({
    ollamaOnline: true,
    lastScraperRun: null,
    analyzedCount: 0,
    healthy: true,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const r = await fetch(`${API_BASE}/api/health`)
        if (!r.ok || cancelled) return
        const data = await r.json() as {
          ollamaOnline?: boolean
          lastScraperRun?: string | null
          analyzedCount?: number
        }
        if (cancelled) return

        const ollamaOnline   = data.ollamaOnline !== false
        const lastScraperRun = data.lastScraperRun ?? null
        const analyzedCount  = data.analyzedCount ?? 0

        const scraperStale = lastScraperRun != null
          ? (Date.now() - new Date(lastScraperRun).getTime()) > STALE_SCRAPER_MS
          : false
        const healthy = ollamaOnline && !scraperStale

        setHealth({ ollamaOnline, lastScraperRun, analyzedCount, healthy })
      } catch { /* network error — keep previous health state */ }
      finally {
        if (!cancelled) timerRef.current = setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return health
}
