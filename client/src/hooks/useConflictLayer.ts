import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// ── GeoJSON types ─────────────────────────────────────────────────────────────

export interface ConflictFeature {
  type: 'Feature'
  properties: {
    name?: string
    control?: 'russia' | 'ukraine' | 'frontline' | 'contested' | string
    conflict?: string
    description?: string
    [key: string]: unknown
  }
  geometry: {
    type: 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon'
    coordinates: number[][] | number[][][] | number[][][][] | number[][][][][]
  }
}

export interface ConflictFeatureCollection {
  type: 'FeatureCollection'
  features: ConflictFeature[]
  metadata?: Record<string, unknown>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/** Fetches conflict front GeoJSON from the server (24-hour refresh).
 *  data is null while loading; error is true if the last fetch failed. */
export function useConflictLayer(enabled: boolean): { data: ConflictFeatureCollection | null; error: boolean; loading: boolean } {
  const [data, setData] = useState<ConflictFeatureCollection | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) { setData(null); setError(false); setLoading(false); return }

    let cancelled = false

    async function load() {
      if (!cancelled) setLoading(true)
      try {
        const r = await fetch(`${API}/api/conflict/fronts`)
        if (!cancelled) {
          if (r.ok) {
            const json = await r.json() as ConflictFeatureCollection
            if (json?.type === 'FeatureCollection') { setData(json); setError(false) }
          } else {
            setError(true)
          }
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) { setLoading(false); timerRef.current = setTimeout(load, 24 * 60 * 60 * 1000) }
      }
    }

    load()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled])

  return { data, error, loading }
}
