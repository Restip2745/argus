import { FEEDS } from './feeds'

export interface FeedConfigItem {
  name:    string
  url:     string
  lang:    'en' | 'zh' | 'ar' | 'fr'
  region:  string | null
  enabled: boolean
}

const feeds: FeedConfigItem[] = FEEDS.map(f => ({ ...f, enabled: true }))

export function getFeedsConfig(): FeedConfigItem[] {
  return [...feeds]
}

export function setFeedsConfig(updated: FeedConfigItem[]): FeedConfigItem[] {
  feeds.length = 0
  feeds.push(...updated)
  return [...feeds]
}
