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
