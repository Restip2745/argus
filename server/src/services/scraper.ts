import { createHash } from 'crypto'
import cron from 'node-cron'
import Parser from 'rss-parser'
import { getFeedsConfig } from '../config/feedsConfig'
import { insertRawArticle } from '../db/sqlite'
import { setLastScraperRun, recordFeedSuccess, recordFeedError } from './healthTracker'
import type { RawFeedItem } from '../types'
import { logger } from '../utils/logger'

/**
 * YouTube answers a burst of feed requests from one address with a 404 that
 * clears within seconds — the channel is fine, the request was merely one too
 * many. A single miss would otherwise cost that source a whole 15-minute cycle,
 * so failures are retried with a widening gap before the feed is given up on.
 */
const FETCH_ATTEMPTS = 3
const RETRY_BASE_MS  = 2_000
/** Gap between feeds, so a cycle is a trickle rather than one burst of requests. */
const FEED_GAP_MS    = 800

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const parser = new Parser({
  timeout: 15_000,
  // Default clients get throttled hardest; identify as a browser would.
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                  '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  customFields: {
    item: [
      ['media:content',   'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:group',     'mediaGroup'],
    ],
  },
})

/**
 * Video descriptions end in a promo block — a hashtag pile followed by channel
 * links — which carries no reporting and would eat into the 800-char budget the
 * classifier sees. The block always starts at the first hashtag-only or URL line,
 * so cut there. If that leaves nothing (hashtags inline in the opening line),
 * keep the original rather than feeding the classifier an empty string.
 */
export function stripPromoTail(description: string): string {
  const lines = description.split(/\r?\n/)
  const cut = lines.findIndex(l => {
    const t = l.trim()
    return t !== '' && (/^(#\S+\s*)+$/.test(t) || /https?:\/\//.test(t))
  })
  const kept = (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim()
  return kept.length > 0 ? kept : description.trim()
}

export function extractContent(item: RawFeedItem): string | null {
  const snippet = item.contentSnippet?.trim()
  if (snippet) return snippet.slice(0, 800)

  const description = item.mediaGroup?.['media:description']?.[0]
  if (description) return stripPromoTail(description).slice(0, 800)

  return null
}

function extractImageUrl(item: RawFeedItem): string | null {
  // Checked first: on YouTube items the top-level media:* fields are absent, and
  // the media:content nested here is a .swf player URL, not an image.
  const groupThumb = item.mediaGroup?.['media:thumbnail']?.[0]?.$?.url
  if (groupThumb) return groupThumb

  if (item.enclosure?.url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(item.enclosure.url)) {
    return item.enclosure.url
  }
  if (item.mediaContent) {
    const mc = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent
    const url = mc?.$?.url
    if (url) return url
  }
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url
  }
  return null
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** Fetch one feed, retrying transient rejections before reporting it broken. */
async function parseFeedWithRetry(feedName: string, url: string) {
  let lastErr: unknown
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      return await parser.parseURL(url)
    } catch (err) {
      lastErr = err
      if (attempt === FETCH_ATTEMPTS) break
      // Jittered backoff: feeds that failed together must not retry in lockstep.
      const wait = RETRY_BASE_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 500)
      logger.warn('[Scraper]', `"${feedName}" attempt ${attempt} failed (${(err as Error).message}) — retrying in ${wait}ms`)
      await sleep(wait)
    }
  }
  throw lastErr
}

export function startScraper(): void {
  // Initial fetch on startup
  void fetchAllFeeds()

  // Then every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    void fetchAllFeeds()
  })

  logger.info('[Scraper]', 'RSS scraper scheduled — every 15 min')
}

async function fetchAllFeeds(): Promise<void> {
  logger.info('[Scraper]', `Starting feed fetch (${new Date().toISOString()})`)
  let inserted = 0
  let skipped = 0

  const enabled = getFeedsConfig().filter(f => f.enabled)

  for (const [index, feed] of enabled.entries()) {
    if (index > 0) await sleep(FEED_GAP_MS)
    try {
      const result = await parseFeedWithRetry(feed.name, feed.url)
      const items = (result.items as RawFeedItem[]).slice(0, 20)

      for (const item of items) {
        if (!item.title || !item.link) continue

        // Shorts are filler (celebrity clips, animal videos) that would land on
        // the globe as events. They are ~20-25% of a news channel's feed.
        if (item.link.includes('/shorts/')) { skipped++; continue }

        const id = sha256(item.link)
        const wasInserted = insertRawArticle({
          id,
          source:       feed.name,
          title:        item.title,
          content:      extractContent(item),
          url:          item.link,
          published_at: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
          image_url:    extractImageUrl(item),
        })

        if (wasInserted) inserted++
        else skipped++
      }
      recordFeedSuccess(feed.name)
    } catch (err) {
      const msg = (err as Error).message
      recordFeedError(feed.name, msg)
      logger.error('[Scraper]', `Failed to fetch "${feed.name}":`, msg)
    }
  }

  setLastScraperRun(new Date().toISOString())
  logger.info('[Scraper]', `Done — ${inserted} new, ${skipped} duplicates skipped`)
}
