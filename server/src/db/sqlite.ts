import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Article, OllamaClassification, ClientEvent, SourceReliability } from '../types'
import { logger } from '../utils/logger'

let db: Database.Database

export function initDb(): void {
  db = new Database(join(process.cwd(), 'intelligence.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Migration: drop old `events` table if it exists
  const oldTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'")
    .get()
  if (oldTable) {
    logger.info('[DB]', 'Migrating: dropping old events table')
    db.exec('DROP TABLE IF EXISTS events')
  }

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  db.exec(schema)

  // Migration: add reliability column if missing (schema may already exist)
  const cols = db.prepare("PRAGMA table_info(articles)").all() as { name: string }[]
  if (!cols.some(c => c.name === 'reliability')) {
    db.exec("ALTER TABLE articles ADD COLUMN reliability TEXT")
    logger.info('[DB]', 'Migration: added reliability column')
  }

  logger.info('[DB]', 'SQLite initialised (articles schema)')
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialised — call initDb() first')
  return db
}

// ── Insert helpers ──────────────────────────────────────

interface RawArticleInput {
  id: string
  source: string
  title: string
  content: string | null
  url: string
  published_at: string | null
}

const _insertRaw = () => getDb().prepare(
  `INSERT OR IGNORE INTO articles (id, source, title, content, url, published_at)
   VALUES (@id, @source, @title, @content, @url, @published_at)`
)

export function insertRawArticle(article: RawArticleInput): boolean {
  const result = _insertRaw().run(article)
  return result.changes > 0
}

export interface WebhookEventInput {
  id:             string
  title:          string
  category:       string
  intensity:      string
  location_label: string | null
  location_type:  string | null
  lat:            number | null
  lng:            number | null
  actors:         string[]
  tags:           string[]
  source:         string
  url:            string
  published_at:   string
  heat_score:     number
  expires_at:     string
}

export function insertWebhookEvent(e: WebhookEventInput): void {
  getDb().prepare(
    `INSERT OR IGNORE INTO articles
      (id, source, title, content, url, published_at, is_analyzed,
       category, title_zh, summary_zh, intensity,
       location_type, location_label, lat, lng, body,
       actors, tags, sources_count, reliability, heat_score, expires_at)
     VALUES
      (@id, @source, @title, NULL, @url, @published_at, 1,
       @category, @title, '', @intensity,
       @location_type, @location_label, @lat, @lng, NULL,
       @actors, @tags, 1, 'MEDIUM', @heat_score, @expires_at)`
  ).run({
    ...e,
    actors: JSON.stringify(e.actors),
    tags:   JSON.stringify(e.tags),
  })
}

// ── Query helpers ───────────────────────────────────────

export function getPendingArticles(limit = 10): Article[] {
  return getDb()
    .prepare('SELECT * FROM articles WHERE is_analyzed = 0 ORDER BY fetched_at ASC LIMIT ?')
    .all(limit) as Article[]
}

export function getArticleById(id: string): Article | null {
  return (getDb()
    .prepare('SELECT * FROM articles WHERE id = ?')
    .get(id) as Article) ?? null
}

export function getTopHeatEvents(limit = 5): ClientEvent[] {
  const rows = getDb()
    .prepare('SELECT * FROM articles WHERE is_analyzed = 1 ORDER BY heat_score DESC LIMIT ?')
    .all(limit) as Article[]
  return rows.map(articleToClientEvent)
}

export function getAnalyzedArticles(): ClientEvent[] {
  const rows = getDb()
    .prepare('SELECT * FROM articles WHERE is_analyzed = 1 ORDER BY heat_score DESC, published_at DESC')
    .all() as Article[]

  return rows.map(articleToClientEvent)
}

// ── Update helpers ──────────────────────────────────────

export function markAnalyzed(
  id: string,
  data: OllamaClassification,
  heatScore: number,
  expiresAt: string,
): void {
  getDb().prepare(
    `UPDATE articles SET
       is_analyzed    = 1,
       category       = @category,
       title_zh       = @title_zh,
       summary_zh     = @summary_zh,
       intensity      = @intensity,
       location_type  = @location_type,
       location_label = @location_label,
       lat            = @lat,
       lng            = @lng,
       body           = @body,
       actors         = @actors,
       tags           = @tags,
       sources_count  = @sources_count,
       reliability    = @reliability,
       heat_score     = @heat_score,
       expires_at     = @expires_at
     WHERE id = @id`
  ).run({
    id,
    category:       data.category,
    title_zh:       data.title_zh,
    summary_zh:     data.summary_zh,
    intensity:      data.intensity,
    location_type:  data.location.type,
    location_label: data.location.label,
    lat:            data.location.lat,
    lng:            data.location.lng,
    body:           data.location.body,
    actors:         JSON.stringify(data.actors),
    tags:           JSON.stringify(data.tags),
    sources_count:  data.sources_count,
    reliability:    data.reliability,
    heat_score:     heatScore,
    expires_at:     expiresAt,
  })
}

export function markAnalysisFailed(id: string): void {
  getDb()
    .prepare('UPDATE articles SET is_analyzed = -1 WHERE id = ?')
    .run(id)
}

export function resetFailedArticles(): number {
  const result = getDb()
    .prepare('UPDATE articles SET is_analyzed = 0 WHERE is_analyzed = -1')
    .run()
  return result.changes
}

export function updateHeatScore(id: string, newScore: number, newExpiresAt: string): void {
  getDb().prepare(
    `UPDATE articles SET
       heat_score     = ?,
       expires_at     = ?,
       last_referenced = datetime('now')
     WHERE id = ?`
  ).run(newScore, newExpiresAt, id)
}

// ── Retention helpers ───────────────────────────────────

export function findAnalyzedArticles(): Article[] {
  return getDb()
    .prepare('SELECT * FROM articles WHERE is_analyzed = 1')
    .all() as Article[]
}

export function deleteExpiredArticles(): number {
  let total = 0

  // Condition 1: expired + not recently referenced
  const r1 = getDb().prepare(
    `DELETE FROM articles
     WHERE datetime(expires_at) < datetime('now')
       AND (last_referenced < datetime('now', '-24 hours') OR last_referenced IS NULL)`
  ).run()
  total += r1.changes

  // Condition 2: critically low heat score AND already expired
  // (don't purge fresh LOW articles before they've had a chance to be shown)
  const r2 = getDb().prepare(
    `DELETE FROM articles
     WHERE heat_score < 0.2 AND is_analyzed = 1
       AND datetime(expires_at) < datetime('now')`
  ).run()
  total += r2.changes

  return total
}

// ── Conversion ──────────────────────────────────────────

export function articleToClientEvent(row: Article): ClientEvent {
  return {
    id:              row.id,
    title:           row.title,
    title_zh:        row.title_zh ?? row.title,
    content:         row.content,
    summary_zh:      row.summary_zh ?? '',
    source:          row.source,
    url:             row.url,
    published_at:    row.published_at,
    fetched_at:      row.fetched_at,
    category:        row.category!,
    intensity:       row.intensity!,
    location_type:   row.location_type as 'geo' | 'orbital',
    location_label:  row.location_label ?? '',
    lat:             row.lat,
    lng:             row.lng,
    body:            row.body,
    actors:          safeJsonParse(row.actors),
    tags:            safeJsonParse(row.tags),
    sources_count:   row.sources_count ?? 1,
    reliability:     (row.reliability ?? 'UNVERIFIED') as SourceReliability,
    heat_score:      row.heat_score,
    expires_at:      row.expires_at,
    last_referenced: row.last_referenced,
  }
}

function safeJsonParse(json: string | null): string[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

// ── Related events ──────────────────────────────────────

/**
 * Find events related to a given article by actor/tag overlap.
 * Scoring: +2 per shared actor, +1 per shared tag, +1 for same location.
 * Returns up to `limit` events sorted by score DESC, published_at DESC.
 */
export function getRelatedEvents(id: string, limit = 8): ClientEvent[] {
  const target = getDb()
    .prepare('SELECT * FROM articles WHERE id = ? AND is_analyzed = 1')
    .get(id) as Article | undefined
  if (!target) return []

  const targetActors = new Set(safeJsonParse(target.actors))
  const targetTags   = new Set(safeJsonParse(target.tags))
  const targetLoc    = target.location_label?.toLowerCase() ?? ''

  const others = getDb()
    .prepare('SELECT * FROM articles WHERE is_analyzed = 1 AND id != ? ORDER BY published_at DESC')
    .all(id) as Article[]

  const scored = others
    .map((row) => {
      const actors = safeJsonParse(row.actors)
      const tags   = safeJsonParse(row.tags)
      let score = 0
      for (const a of actors) if (targetActors.has(a)) score += 2
      for (const t of tags)   if (targetTags.has(t))   score += 1
      const loc = row.location_label?.toLowerCase() ?? ''
      if (loc && loc === targetLoc) score += 1
      return { row, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.row.published_at ?? '').localeCompare(a.row.published_at ?? ''))
    .slice(0, limit)

  return scored.map((x) => articleToClientEvent(x.row))
}
