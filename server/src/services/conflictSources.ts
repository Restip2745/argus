/**
 * Conflict front layer — multi-source registry.
 *
 * A single `CONFLICT_GEOJSON_URL` only ever covered one theatre. Real conflict
 * data is published per-layer (occupied territory, 24-hour gains, strike
 * events…), each at its own endpoint and none of them carrying the `control`
 * property the client colours by. This module fetches a set of sources in
 * parallel, tags every feature with the `control` / `conflict` labels declared
 * for its source, and merges them into one FeatureCollection.
 *
 * Sources are cached individually, so one dead endpoint does not invalidate
 * the rest.
 */

import { logger } from '../utils/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConflictSource {
  /** Stable id — used as the cache key and reported in the merged metadata. */
  id:        string
  url:       string
  /** Injected as `properties.control`; drives ConflictLayer's colour mapping. */
  control?:  string
  /** Injected as `properties.conflict`; groups features by theatre. */
  conflict?: string
  /** Fallback `properties.name` for features that carry none of their own. */
  label?:    string
}

export interface ConflictFeature {
  type:       'Feature'
  properties: Record<string, unknown>
  geometry:   { type: string; coordinates: unknown }
}

export interface ConflictFeatureCollection {
  type:      'FeatureCollection'
  features:  ConflictFeature[]
  metadata?: Record<string, unknown>
}

/** Geometry types ConflictLayer can render. Anything else is dropped. */
const RENDERABLE_GEOMETRY = new Set([
  'LineString', 'MultiLineString',
  'Polygon', 'MultiPolygon',
  'Point', 'MultiPoint',
])

// ── Built-in preset ───────────────────────────────────────────────────────────

const ARCGIS = 'https://services5.arcgis.com/SaBe5HMtmnbqSWlu/arcgis/rest/services'

// geometryPrecision=4 (~11 m) halves the payload with no visible loss at globe scale.
const ARCGIS_QUERY = 'query?where=1%3D1&outFields=*&outSR=4326&f=geojson&geometryPrecision=4'

function iswLayer(service: string, layer: number): string {
  return `${ARCGIS}/${service}/FeatureServer/${layer}/${ARCGIS_QUERY}`
}

/**
 * Institute for the Study of War / AEI Critical Threats Project layers.
 * Attribution required; see https://www.understandingwar.org for their terms.
 * Only layers ISW still updates are included — see .env.example for the rest.
 */
export const ISW_PRESET: ConflictSource[] = [
  {
    id:       'isw-ua-control',
    url:      iswLayer('VIEW_RussiaCoTinUkraine_V3', 49),
    control:  'russia',
    conflict: 'ukraine',
    label:    'Assessed Russian-controlled territory',
  },
  {
    id:       'isw-ua-gains-24h',
    url:      iswLayer('Assessed_Russian_Gains_in_the_Past_24_Hours_view', 0),
    control:  'contested',
    conflict: 'ukraine',
    label:    'Assessed Russian gains, past 24 hours',
  },
  {
    id:       'isw-sy-sdf',
    url:      iswLayer('Syrian_Democratic_Forces__SDF_MDS_V5_view', 0),
    control:  'sdf',
    conflict: 'syria',
    label:    'Syrian Democratic Forces',
  },
  {
    id:       'isw-ir-strikes',
    url:      iswLayer('View_Iran_Axis_Retaliatory_Strikes_2026', 0),
    control:  'strike',
    conflict: 'iran',
    label:    'Iran / Axis retaliatory strikes',
  },
]

const PRESETS: Record<string, ConflictSource[]> = { isw: ISW_PRESET }

// ── Source resolution ─────────────────────────────────────────────────────────

function isSource(v: unknown): v is ConflictSource {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.id === 'string' && o.id !== '' && typeof o.url === 'string' && o.url !== ''
}

/** Parses a CONFLICT_SOURCES value: a preset name, or a JSON array of sources. */
export function parseConflictSources(spec: string): ConflictSource[] {
  const trimmed = spec.trim()
  if (trimmed === '') return []

  const preset = PRESETS[trimmed.toLowerCase()]
  if (preset) return preset

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    logger.warn('[conflict]', 'CONFLICT_SOURCES is neither a known preset nor valid JSON — ignoring')
    return []
  }

  if (!Array.isArray(parsed)) {
    logger.warn('[conflict]', 'CONFLICT_SOURCES JSON must be an array of sources — ignoring')
    return []
  }

  const sources = parsed.filter(isSource)
  if (sources.length !== parsed.length) {
    logger.warn('[conflict]', `dropped ${parsed.length - sources.length} CONFLICT_SOURCES entries missing id or url`)
  }
  return sources
}

/**
 * Resolves the active source list from the environment.
 * `CONFLICT_SOURCES` wins; `CONFLICT_GEOJSON_URL` remains supported as a
 * single untagged source. Empty means "serve the bundled demo data".
 */
export function resolveConflictSources(env: NodeJS.ProcessEnv = process.env): ConflictSource[] {
  const spec = env.CONFLICT_SOURCES
  if (spec && spec.trim() !== '') return parseConflictSources(spec)

  const legacy = env.CONFLICT_GEOJSON_URL
  if (legacy && legacy.trim() !== '') {
    return [{ id: 'conflict-geojson-url', url: legacy.trim() }]
  }
  return []
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Validates a fetched payload and stamps each feature with its source's
 * labels. Existing `control` / `conflict` properties win, so a feed that
 * already carries them is passed through untouched.
 */
export function normalizeFeatures(raw: unknown, source: ConflictSource): ConflictFeature[] {
  if (typeof raw !== 'object' || raw === null) return []
  const fc = raw as Partial<ConflictFeatureCollection>
  if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) return []

  const out: ConflictFeature[] = []
  for (const f of fc.features) {
    if (typeof f !== 'object' || f === null) continue
    const geometry = (f as ConflictFeature).geometry
    if (!geometry || !RENDERABLE_GEOMETRY.has(geometry.type) || !Array.isArray(geometry.coordinates)) continue

    const props = { ...((f as ConflictFeature).properties ?? {}) }
    if (source.control  != null && props.control  == null) props.control  = source.control
    if (source.conflict != null && props.conflict == null) props.conflict = source.conflict
    if (source.label    != null && props.name     == null) props.name     = source.label
    props.source = source.id

    out.push({ type: 'Feature', properties: props, geometry })
  }
  return out
}

// ── Fetch + cache ─────────────────────────────────────────────────────────────

interface CacheEntry { features: ConflictFeature[]; ts: number }

const cache = new Map<string, CacheEntry>()

/** Test seam — drops every cached source. */
export function resetConflictCache(): void {
  cache.clear()
}

export interface LoadOptions {
  ttlMs?:     number
  timeoutMs?: number
  fetchImpl?: typeof fetch
  now?:       () => number
  /** Attempts per source, including the first. */
  attempts?:  number
  retryMs?:   number
}

const DEFAULT_TTL      = 24 * 60 * 60 * 1000
const DEFAULT_TIMEOUT  = 15_000
const DEFAULT_ATTEMPTS = 2
const DEFAULT_RETRY_MS = 750

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * ArcGIS refuses a random one of a parallel burst often enough to matter — a
 * different source each run. Without a retry that source stays missing until
 * the client's next 24-hour refresh, so one dropped connection would cost a
 * whole theatre for a day.
 */
async function fetchSource(
  source: ConflictSource, doFetch: typeof fetch,
  timeout: number, attempts: number, retryMs: number,
): Promise<ConflictFeature[]> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const r = await doFetch(source.url, { signal: AbortSignal.timeout(timeout) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return normalizeFeatures(await r.json(), source)
    } catch (err) {
      lastErr = err
      if (attempt < attempts) await sleep(retryMs)
    }
  }
  throw lastErr
}

/**
 * Fetches every source in parallel and merges the results.
 *
 * A source that fails falls back to its last cached features if it has any;
 * only when every source yields nothing does this return null, which the
 * caller treats as "serve the demo data instead".
 */
export async function loadConflictFronts(
  sources: ConflictSource[],
  opts: LoadOptions = {},
): Promise<ConflictFeatureCollection | null> {
  const ttl       = opts.ttlMs     ?? DEFAULT_TTL
  const timeout   = opts.timeoutMs ?? DEFAULT_TIMEOUT
  const doFetch   = opts.fetchImpl ?? fetch
  const now       = opts.now       ?? Date.now
  const attempts  = opts.attempts  ?? DEFAULT_ATTEMPTS
  const retryMs   = opts.retryMs   ?? DEFAULT_RETRY_MS
  if (sources.length === 0) return null

  const loaded = await Promise.all(sources.map(async (source) => {
    const hit = cache.get(source.id)
    if (hit && now() - hit.ts < ttl) {
      return { source, features: hit.features, ok: true, cached: true }
    }

    try {
      const features = await fetchSource(source, doFetch, timeout, attempts, retryMs)
      cache.set(source.id, { features, ts: now() })
      return { source, features, ok: true, cached: false }
    } catch (err) {
      logger.warn('[conflict]', `source "${source.id}" failed:`, (err as Error).message)
      // Stale features beat no features — keep serving them until the next hit.
      return { source, features: hit?.features ?? [], ok: false, cached: hit != null }
    }
  }))

  const features = loaded.flatMap((l) => l.features)
  if (features.length === 0) return null

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      source:  'ARGUS conflict source registry',
      updated: new Date(now()).toISOString(),
      sources: loaded.map((l) => ({
        id:       l.source.id,
        label:    l.source.label ?? null,
        control:  l.source.control ?? null,
        conflict: l.source.conflict ?? null,
        features: l.features.length,
        ok:       l.ok,
        cached:   l.cached,
      })),
    },
  }
}
