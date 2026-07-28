export interface FeedConfig {
  name: string
  url: string
  lang: 'en' | 'zh' | 'ar' | 'fr'
  region: string | null   // ISO country / 'space' / null = global
}

export const FEEDS: FeedConfig[] = [
  // ── Global ──────────────────────────────────────────────
  { name: 'BBC World',       url: 'https://feeds.bbci.co.uk/news/world/rss.xml',          lang: 'en', region: null },
  { name: 'Al Jazeera',      url: 'https://www.aljazeera.com/xml/rss/all.xml',            lang: 'en', region: 'ME' },

  // ── Science / Space ──────────────────────────────────────
  { name: 'NASA Breaking',   url: 'https://www.nasa.gov/news-release/feed/',              lang: 'en', region: 'space' },
  { name: 'SpaceNews',       url: 'https://spacenews.com/feed/',                          lang: 'en', region: 'space' },

  // ── Asia-Pacific ─────────────────────────────────────────
  { name: 'CNA Asia',        url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511', lang: 'en', region: 'AP' },

  // ── Economy ──────────────────────────────────────────────
  { name: 'BBC Business',    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',       lang: 'en', region: null },
]
