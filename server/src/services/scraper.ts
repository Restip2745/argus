import { createHash } from 'crypto'
import cron from 'node-cron'
import Parser from 'rss-parser'
import { getFeedsConfig } from '../config/feedsConfig'
import { insertRawArticle } from '../db/sqlite'
import { setLastScraperRun, recordFeedSuccess, recordFeedError } from './healthTracker'
import type { RawFeedItem } from '../types'
import { logger } from '../utils/logger'

const parser = new Parser({
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

  for (const feed of getFeedsConfig().filter(f => f.enabled)) {
    try {
      const result = await parser.parseURL(feed.url)
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
