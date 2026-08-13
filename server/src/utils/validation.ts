/**
 * Pure validation helpers for Express route handlers.
 * Each function returns null on success or an error message string on failure.
 */

/**
 * Checks the X-Config-Key header against the CONFIG_SECRET env var.
 * Returns null if auth passes, or an error string if it fails.
 * If secret is undefined/empty, auth is disabled (self-hosted default).
 */
export function validateConfigAuth(headerValue: string | undefined, secret: string | undefined): string | null {
  if (!secret) return null
  if (headerValue !== secret) return 'Invalid or missing X-Config-Key header'
  return null
}

const SAFE_ID_RE = /^[a-zA-Z0-9_\-]{1,120}$/

export function validateExportParams(
  format: string | undefined,
  ids: string | undefined,
): string | null {
  const fmt = format ?? 'json'
  if (fmt !== 'json' && fmt !== 'csv') return "format must be 'json' or 'csv'"
  if (ids !== undefined && ids.length > 10_000) return 'ids parameter too long'
  return null
}

/** Largest event page the server will hand out in one response. */
export const MAX_EVENT_LIMIT = 2000
/** Applied when the caller does not ask for a limit. */
export const DEFAULT_EVENT_LIMIT = 2000

/**
 * Resolve `?limit=` for the event feed.
 *
 * This is a guard rail, not pagination. The client needs the whole set to
 * compute its severity census, hourly histograms and per-country fills, so the
 * default is deliberately high enough that nothing changes in normal use — it
 * exists so that a database which has escaped its retention policy cannot
 * hand the browser an unbounded response.
 *
 * Returns the limit to use, or an error string for a malformed request.
 */
export function resolveEventLimit(raw: string | undefined): number | string {
  if (raw === undefined) return DEFAULT_EVENT_LIMIT
  if (!/^\d+$/.test(raw)) return 'limit must be a positive integer'
  const n = Number(raw)
  if (n < 1) return 'limit must be at least 1'
  return Math.min(n, MAX_EVENT_LIMIT)
}

export function validateEventId(id: string): string | null {
  if (!SAFE_ID_RE.test(id)) return 'invalid event id'
  return null
}

export function validateLlmConfigBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'body must be a JSON object'
  }
  const b = body as Record<string, unknown>
  if (b.host        !== undefined && typeof b.host        !== 'string') return 'host must be a string'
  if (b.model       !== undefined && typeof b.model       !== 'string') return 'model must be a string'
  if (b.temperature !== undefined && typeof b.temperature !== 'number') return 'temperature must be a number'
  if (b.contextSize !== undefined && typeof b.contextSize !== 'number') return 'contextSize must be a number'
  return null
}

export function validateAzureSpeechConfigBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'body must be a JSON object'
  }
  const b = body as Record<string, unknown>
  if (b.key    !== undefined && typeof b.key    !== 'string') return 'key must be a string'
  if (b.region !== undefined && typeof b.region !== 'string') return 'region must be a string'
  if (b.voice  !== undefined && typeof b.voice  !== 'string') return 'voice must be a string'
  return null
}

export function validateSpeechSynthesizeBody(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'body must be a JSON object'
  }
  const b = body as Record<string, unknown>
  if (typeof b.text !== 'string' || !b.text.trim()) return 'text is required'
  if (b.text.length > 4000) return 'text too long (max 4000 characters)'
  return null
}

export function validateFeedsBody(body: unknown): string | null {
  if (!Array.isArray(body)) return 'body must be a JSON array of feed objects'
  for (const item of body) {
    if (typeof item !== 'object' || item === null) return 'each feed must be an object'
    const f = item as Record<string, unknown>
    if (typeof f.url !== 'string' || !f.url) return 'each feed must have a url string'
    if (typeof f.enabled !== 'boolean') return 'each feed must have an enabled boolean'
  }
  return null
}
