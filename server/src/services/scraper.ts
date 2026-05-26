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
    ],
  },
})

function extractImageUrl(item: RawFeedItem): string | null {
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

        const id = sha256(item.link)
        const wasInserted = insertRawArticle({
          id,
          source:       feed.name,
          title:        item.title,
          content:      (item.contentSnippet ?? '').slice(0, 800) || null,
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
