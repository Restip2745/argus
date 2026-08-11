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

  // ── Wire services (YouTube) ──────────────────────────────
  // Reuters and AP retired their public RSS; the channel Atom feed is the only
  // machine-readable stream they still publish. Outlets already listed above are
  // deliberately not duplicated here — the same story from both would double-count
  // into heat_score. Feed URL form: /feeds/videos.xml?channel_id=<UC…>, 15 items.
  { name: 'Reuters',         url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChqUTb7kYRX8-EiaN3XFrSQ', lang: 'en', region: null },
  { name: 'Associated Press', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC52X5wxOL_s5yw0dQk7NtgA', lang: 'en', region: null },
  { name: 'France 24',       url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCCCPCZNChQdGa9EkATeye4g', lang: 'en', region: null },
]
