import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// ── Aircraft ──────────────────────────────────────────────────────────────────

export interface AircraftState {
  icao:     string
  callsign: string | null
  lat:      number
  lng:      number
  altitude: number | null  // metres
  velocity: number | null  // m/s
  heading:  number | null  // degrees
  country:  string
}

// ── Satellites ────────────────────────────────────────────────────────────────

export interface TleSatellite {
  name: string
  tle1: string
  tle2: string
}

// ── Polling hook helper ───────────────────────────────────────────────────────

function usePoll<T>(url: string, intervalMs: number, enabled: boolean): T[] {
  const [data, setData] = useState<T[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    if (!enabled) { setData([]); return }

    let cancelled = false

    async function load() {
      try {
        activeRef.current = true
        const r = await fetch(url)
        if (!cancelled && r.ok) {
          const json = await r.json()
          if (Array.isArray(json)) setData(json as T[])
        }
      } catch { /* network errors silently ignored */ } finally {
        activeRef.current = false
        if (!cancelled) timerRef.current = setTimeout(load, intervalMs)
      }
    }

    load()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [url, intervalMs, enabled])

  return data
}

// ── Public hooks ──────────────────────────────────────────────────────────────

/** Live aircraft positions from OpenSky Network (refreshes every 45 s). */
export function useAircraftLayer(enabled: boolean): AircraftState[] {
  return usePoll<AircraftState>(
    `${API}/api/tracking/aircraft`,
    45_000,
    enabled,
  )
}

/** TLE data for satellite groups from Celestrak (refreshes every 10 min). */
export function useSatelliteLayer(
  enabled: boolean,
  groups = 'stations,visual',
): TleSatellite[] {
  return usePoll<TleSatellite>(
    `${API}/api/tracking/tle?groups=${groups}`,
    600_000,
    enabled,
  )
}
