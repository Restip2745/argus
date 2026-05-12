import { createHash } from 'crypto'
import cron from 'node-cron'
import Parser from 'rss-parser'
import { getFeedsConfig } from '../config/feedsConfig'
import { insertRawArticle } from '../db/sqlite'
import { setLastScraperRun, recordFeedSuccess, recordFeedError } from './healthTracker'
import type { RawFeedItem } from '../types'

const parser = new Parser()

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

  console.log('[Scraper] RSS scraper scheduled — every 15 min')
}

async function fetchAllFeeds(): Promise<void> {
  console.log(`[Scraper] Starting feed fetch (${new Date().toISOString()})`)
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
        })

        if (wasInserted) inserted++
        else skipped++
      }
      recordFeedSuccess(feed.name)
    } catch (err) {
      const msg = (err as Error).message
      recordFeedError(feed.name, msg)
      console.error(`[Scraper] Failed to fetch "${feed.name}":`, msg)
    }
  }

  setLastScraperRun(new Date().toISOString())
  console.log(`[Scraper] Done — ${inserted} new, ${skipped} duplicates skipped`)
}
