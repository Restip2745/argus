export interface FeedConfig {
  name: string
  url: string
  lang: 'en' | 'zh' | 'ar' | 'fr'
  region: string | null   // ISO country / 'space' / null = global
}

export const FEEDS: FeedConfig[] = [
  // ── Global ──────────────────────────────────────────────
  { name: 'Reuters World',   url: 'https://feeds.reuters.com/reuters/worldNews',          lang: 'en', region: null },
  { name: 'BBC World',       url: 'https://feeds.bbci.co.uk/news/world/rss.xml',          lang: 'en', region: null },
  { name: 'AP Top News',     url: 'https://rsshub.app/apnews/topics/apf-topnews',         lang: 'en', region: null },
  { name: 'Al Jazeera',      url: 'https://www.aljazeera.com/xml/rss/all.xml',            lang: 'en', region: 'ME' },

  // ── Science / Space ──────────────────────────────────────
  { name: 'NASA Breaking',   url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss',       lang: 'en', region: 'space' },
  { name: 'SpaceNews',       url: 'https://spacenews.com/feed/',                          lang: 'en', region: 'space' },

  // ── Asia-Pacific ─────────────────────────────────────────
  { name: 'CNA Asia',        url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511', lang: 'en', region: 'AP' },

  // ── Economy ──────────────────────────────────────────────
  { name: 'Reuters Finance', url: 'https://feeds.reuters.com/reuters/businessNews',       lang: 'en', region: null },
]
