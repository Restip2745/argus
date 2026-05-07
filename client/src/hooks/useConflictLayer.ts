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
 *  Returns null while loading; returns empty FeatureCollection on error. */
export function useConflictLayer(enabled: boolean): ConflictFeatureCollection | null {
  const [data, setData] = useState<ConflictFeatureCollection | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) { setData(null); return }

    let cancelled = false

    async function load() {
      try {
        const r = await fetch(`${API}/api/conflict/fronts`)
        if (!cancelled && r.ok) {
          const json = await r.json() as ConflictFeatureCollection
          if (json?.type === 'FeatureCollection') setData(json)
        }
      } catch { /* network errors silently ignored */ } finally {
        if (!cancelled) timerRef.current = setTimeout(load, 24 * 60 * 60 * 1000)
      }
    }

    load()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled])

  return data
}
