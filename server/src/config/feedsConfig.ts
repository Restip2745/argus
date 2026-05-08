/**
 * RSS feed configuration store.
 * Settings are persisted to server/data/config.json on every update and
 * reloaded on startup, so enabled/disabled state survives server restarts.
 */
import { FEEDS } from './feeds'
import { loadPersistedConfig, persistConfig } from './configStore'

export interface FeedConfigItem {
  name:    string
  url:     string
  lang:    'en' | 'zh' | 'ar' | 'fr'
  region:  string | null
  enabled: boolean
}

// Build default feed list from static FEEDS definition
const defaultFeeds: FeedConfigItem[] = FEEDS.map(f => ({ ...f, enabled: true }))

// Restore persisted feed order/enabled state if available
function initFeeds(): FeedConfigItem[] {
  const saved = loadPersistedConfig().feeds as FeedConfigItem[] | undefined
  if (!Array.isArray(saved) || saved.length === 0) return [...defaultFeeds]

  // Merge: keep saved enabled flags; add any new feeds from defaults not yet in saved
  const savedUrls = new Set(saved.map(f => f.url))
  const merged = [...saved]
  for (const d of defaultFeeds) {
    if (!savedUrls.has(d.url)) merged.push(d)
  }
  return merged
}

const feeds: FeedConfigItem[] = initFeeds()

export function getFeedsConfig(): FeedConfigItem[] {
  return [...feeds]
}

export function setFeedsConfig(updated: FeedConfigItem[]): FeedConfigItem[] {
  feeds.length = 0
  feeds.push(...updated)
  persistConfig({ feeds: [...feeds] })
  return [...feeds]
}
