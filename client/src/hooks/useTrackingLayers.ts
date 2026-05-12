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

// ── Ships ─────────────────────────────────────────────────────────────────────

export interface ShipState {
  mmsi:    string
  name:    string | null
  lat:     number
  lng:     number
  heading: number | null
  speed:   number | null
}

// ── Polling hook helper ───────────────────────────────────────────────────────

function usePoll<T>(url: string, intervalMs: number, enabled: boolean): { data: T[]; error: boolean; loading: boolean } {
  const [data, setData] = useState<T[]>([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) { setData([]); setError(false); setLoading(false); return }

    let cancelled = false

    async function load() {
      if (!cancelled) setLoading(true)
      try {
        const r = await fetch(url)
        if (!cancelled) {
          if (r.ok) {
            const json = await r.json()
            if (Array.isArray(json)) { setData(json as T[]); setError(false) }
          } else {
            setError(true)
          }
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) { setLoading(false); timerRef.current = setTimeout(load, intervalMs) }
      }
    }

    load()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [url, intervalMs, enabled])

  return { data, error, loading }
}

// ── Public hooks ──────────────────────────────────────────────────────────────

/** Live aircraft positions from OpenSky Network (refreshes every 45 s). */
export function useAircraftLayer(enabled: boolean): { data: AircraftState[]; error: boolean; loading: boolean } {
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
): { data: TleSatellite[]; error: boolean; loading: boolean } {
  return usePoll<TleSatellite>(
    `${API}/api/tracking/tle?groups=${groups}`,
    600_000,
    enabled,
  )
}

/** Live vessel positions from aisstream.io (refreshes every 60 s).
 *  Returns [] immediately if AISSTREAM_API_KEY is not set on the server. */
export function useShipsLayer(enabled: boolean): { data: ShipState[]; error: boolean; loading: boolean } {
  return usePoll<ShipState>(
    `${API}/api/tracking/ships`,
    60_000,
    enabled,
  )
}
