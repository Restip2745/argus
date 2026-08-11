/**
 * YouTube URL → video id.
 *
 * Feeds reach us as watch links, but the same video can arrive as a share link
 * or a short, so all three forms are accepted. Anything else returns null and
 * the caller falls back to the plain thumbnail.
 */

/** YouTube ids are exactly 11 chars of the URL-safe base64 alphabet. */
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

export function youtubeVideoId(rawUrl: string): string | null {
  let url: URL
  try { url = new URL(rawUrl) } catch { return null }

  const host = url.hostname.replace(/^www\./, '')
  let id: string | null = null

  if (host === 'youtu.be') {
    id = url.pathname.slice(1)
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v')
    } else {
      const m = url.pathname.match(/^\/(?:shorts|embed|v)\/([^/]+)/)
      id = m ? m[1] : null
    }
  }

  return id && VIDEO_ID_RE.test(id) ? id : null
}

/**
 * Player URL for an embedded iframe.
 *
 * Uses the nocookie host: ARGUS promises that nothing leaves the machine, and
 * while playing a video necessarily contacts Google, this at least keeps the
 * request free of ad-tracking cookies. Only ever called after the user clicks
 * play — nothing is requested from Google while the panel merely sits open.
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
}
