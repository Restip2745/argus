const buckets = new Map<string, { count: number; resetAt: number }>()

// Purge expired buckets every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key)
  }
}, 5 * 60_000)

/**
 * Returns true (allowed) or false (rate limited).
 * key: per-client identifier, maxRequests within windowMs.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= maxRequests) return false
  bucket.count++
  return true
}
