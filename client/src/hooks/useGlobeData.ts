import { useEffect, useState } from 'react'

export interface GeoJsonData {
  type: string
  features: unknown[]
}

export function useGlobeData() {
  const [geoJson, setGeoJson] = useState<GeoJsonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/countries.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<GeoJsonData>
      })
      .then(setGeoJson)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { geoJson, loading, error }
}
