import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { PENDING_ORDER_BY } from '../db/sqlite'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert a JS Date to SQLite's native datetime format (YYYY-MM-DD HH:MM:SS UTC). */
function toSqliteDt(d: Date): string {
  return d.toISOString().replace('T', ' ').split('.')[0]
}

function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf-8')
  db.exec(schema)
  return db
}

function insertWebhook(db: Database.Database, overrides: Partial<{
  id: string; title: string; category: string; intensity: string;
  actors: string[]; tags: string[]; location_label: string | null;
  heat_score: number; expires_at: string;
}> = {}) {
  const now = toSqliteDt(new Date())
  const row = {
    id:             overrides.id ?? 'test-id-1',
    source:         'webhook',
    title:          overrides.title ?? 'Test Event',
    url:            'https://example.com',
    published_at:   now,
    category:       overrides.category ?? 'POLITICAL',
    intensity:      overrides.intensity ?? 'MODERATE',
    location_type:  'geo',
    location_label: overrides.location_label ?? null,
    lat:            null,
    lng:            null,
    actors:         JSON.stringify(overrides.actors ?? []),
    tags:           JSON.stringify(overrides.tags ?? []),
    heat_score:     overrides.heat_score ?? 1.0,
    expires_at:     overrides.expires_at ?? toSqliteDt(new Date(Date.now() + 3600_000)),
  }
  db.prepare(
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
  ).run(row)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SQLite integration', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createTestDb()
  })

  describe('insertWebhookEvent', () => {
    it('inserts a row and retrieves it', () => {
      insertWebhook(db, { id: 'wh-1', title: 'Missile Strike', actors: ['Russia'], tags: ['strike'] })
      const row = db.prepare('SELECT * FROM articles WHERE id = ?').get('wh-1') as Record<string, unknown>
      expect(row).toBeTruthy()
      expect(row.title).toBe('Missile Strike')
      expect(row.category).toBe('POLITICAL')
      expect(row.is_analyzed).toBe(1)
      expect(row.reliability).toBe('MEDIUM')
    })

    it('respects OR IGNORE — duplicate id does not throw or overwrite', () => {
      insertWebhook(db, { id: 'wh-dup', title: 'First' })
      insertWebhook(db, { id: 'wh-dup', title: 'Second' })
      const rows = db.prepare("SELECT * FROM articles WHERE id = 'wh-dup'").all()
      expect(rows).toHaveLength(1)
      expect((rows[0] as Record<string, unknown>).title).toBe('First')
    })

    it('stores actors and tags as JSON arrays', () => {
      insertWebhook(db, { id: 'wh-actors', actors: ['NATO', 'Ukraine'], tags: ['military', 'aid'] })
      const row = db.prepare("SELECT actors, tags FROM articles WHERE id = 'wh-actors'").get() as Record<string, string>
      expect(JSON.parse(row.actors)).toEqual(['NATO', 'Ukraine'])
      expect(JSON.parse(row.tags)).toEqual(['military', 'aid'])
    })
  })

  describe('getRelatedEvents', () => {
    it('returns empty array when no related events exist', () => {
      insertWebhook(db, { id: 'ev-1', actors: ['Russia'], tags: ['strike'] })
      // Inline the relation logic
      const target = db.prepare("SELECT * FROM articles WHERE id = 'ev-1' AND is_analyzed = 1").get() as Record<string, string>
      const targetActors = new Set<string>(JSON.parse(target.actors))
      const targetTags   = new Set<string>(JSON.parse(target.tags))
      const others = db.prepare("SELECT * FROM articles WHERE is_analyzed = 1 AND id != 'ev-1'").all() as Array<Record<string, string>>
      const related = others.filter(row => {
        const actors: string[] = JSON.parse(row.actors ?? '[]')
        const tags:   string[] = JSON.parse(row.tags   ?? '[]')
        let score = 0
        for (const a of actors) if (targetActors.has(a)) score += 2
        for (const t of tags)   if (targetTags.has(t))   score += 1
        return score > 0
      })
      expect(related).toHaveLength(0)
    })

    it('returns related events when actor overlap exists', () => {
      insertWebhook(db, { id: 'ev-a', actors: ['Russia', 'NATO'], tags: ['war'] })
      insertWebhook(db, { id: 'ev-b', actors: ['Russia'],         tags: ['ceasefire'] })
      insertWebhook(db, { id: 'ev-c', actors: ['China'],          tags: ['trade'] })

      const target = db.prepare("SELECT * FROM articles WHERE id = 'ev-a' AND is_analyzed = 1").get() as Record<string, string>
      const targetActors = new Set<string>(JSON.parse(target.actors))
      const targetTags   = new Set<string>(JSON.parse(target.tags))
      const others = db.prepare("SELECT * FROM articles WHERE is_analyzed = 1 AND id != 'ev-a'").all() as Array<Record<string, string>>
      const related = others.filter(row => {
        const actors: string[] = JSON.parse(row.actors ?? '[]')
        const tags:   string[] = JSON.parse(row.tags   ?? '[]')
        let score = 0
        for (const a of actors) if (targetActors.has(a)) score += 2
        for (const t of tags)   if (targetTags.has(t))   score += 1
        return score > 0
      }).map(r => r.id)
      expect(related).toContain('ev-b')
      expect(related).not.toContain('ev-c')
    })

    it('scores shared location label', () => {
      insertWebhook(db, { id: 'ev-loc-a', location_label: 'Kyiv', actors: [] })
      insertWebhook(db, { id: 'ev-loc-b', location_label: 'Kyiv', actors: [] })
      insertWebhook(db, { id: 'ev-loc-c', location_label: 'Moscow', actors: [] })

      const target = db.prepare("SELECT * FROM articles WHERE id = 'ev-loc-a'").get() as Record<string, string>
      const targetLoc = (target.location_label ?? '').toLowerCase()
      const others = db.prepare("SELECT * FROM articles WHERE is_analyzed = 1 AND id != 'ev-loc-a'").all() as Array<Record<string, string>>
      const related = others.filter(row => {
        const loc = (row.location_label ?? '').toLowerCase()
        return loc && loc === targetLoc
      }).map(r => r.id)
      expect(related).toContain('ev-loc-b')
      expect(related).not.toContain('ev-loc-c')
    })
  })

  describe('deleteExpiredArticles', () => {
    it('deletes rows past expires_at with no recent reference', () => {
      const pastExpiry = toSqliteDt(new Date(Date.now() - 3600_000))
      insertWebhook(db, { id: 'old-1', expires_at: pastExpiry, heat_score: 1.5 })
      // Ensure last_referenced is NULL (default)
      const deleted = db.prepare(
        `DELETE FROM articles
         WHERE expires_at < datetime('now')
           AND (last_referenced < datetime('now', '-24 hours') OR last_referenced IS NULL)`
      ).run()
      expect(deleted.changes).toBe(1)
      expect(db.prepare("SELECT * FROM articles WHERE id = 'old-1'").get()).toBeUndefined()
    })

    it('deletes critically low heat score entries that are also expired', () => {
      const pastExpiry = toSqliteDt(new Date(Date.now() - 3600_000))
      insertWebhook(db, { id: 'low-heat', expires_at: pastExpiry, heat_score: 0.1 })
      const deleted = db.prepare(
        `DELETE FROM articles WHERE heat_score < 0.2 AND is_analyzed = 1 AND expires_at < datetime('now')`
      ).run()
      expect(deleted.changes).toBe(1)
    })

    it('does not delete non-expired entries', () => {
      const futureExpiry = toSqliteDt(new Date(Date.now() + 3600_000))
      insertWebhook(db, { id: 'fresh-1', expires_at: futureExpiry, heat_score: 2.0 })
      const deleted = db.prepare(
        `DELETE FROM articles
         WHERE expires_at < datetime('now')
           AND (last_referenced < datetime('now', '-24 hours') OR last_referenced IS NULL)`
      ).run()
      expect(deleted.changes).toBe(0)
      expect(db.prepare("SELECT * FROM articles WHERE id = 'fresh-1'").get()).toBeTruthy()
    })
  })
})

/**
 * What the classifier reaches for next.
 *
 * The client is served analysed rows alone and the feed shows at most a 24-hour
 * window, so the order this query returns decides whether a backlog is worked
 * through from the end the operator can see or the end they cannot.
 */
describe('pending article order', () => {
  let db: Database.Database

  const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
  const HOUR = 3600_000

  function insertPending(id: string, publishedIso: string | null, fetchedAgoMs: number) {
    db.prepare(
      `INSERT INTO articles (id, source, title, url, published_at, fetched_at, is_analyzed)
       VALUES (?, 'rss', ?, ?, ?, ?, 0)`
    ).run(id, `Title ${id}`, `https://example.com/${id}`, publishedIso,
          toSqliteDt(new Date(Date.now() - fetchedAgoMs)))
  }

  const pendingIds = () =>
    (db.prepare(`SELECT id FROM articles WHERE is_analyzed = 0 ${PENDING_ORDER_BY}`)
       .all() as { id: string }[]).map(r => r.id)

  beforeEach(() => { db = createTestDb() })

  it('puts articles the feed could show ahead of ones it could not', () => {
    insertPending('stale',  iso(50 * HOUR), 40 * HOUR)   // fetched first, unshowable
    insertPending('fresh',  iso(2 * HOUR),  1 * HOUR)
    expect(pendingIds()).toEqual(['fresh', 'stale'])
  })

  it('stays first-in-first-out inside each class', () => {
    insertPending('fresh-older', iso(5 * HOUR),  4 * HOUR)
    insertPending('fresh-newer', iso(1 * HOUR),  1 * HOUR)
    insertPending('stale-older', iso(60 * HOUR), 50 * HOUR)
    insertPending('stale-newer', iso(30 * HOUR), 20 * HOUR)
    // Nothing is starved: the tail is still analysed, just after the material
    // that has somewhere to go.
    expect(pendingIds()).toEqual(['fresh-older', 'fresh-newer', 'stale-older', 'stale-newer'])
  })

  // The bug the datetime() call exists to prevent. published_at is stored ISO
  // with a T and a Z; compared as text against SQLite's own format, a row from
  // 05:00 today reads as newer than 09:38 yesterday and jumps the queue.
  it('does not read a same-day article as in-window when it is 28 hours old', () => {
    insertPending('older-than-a-day', iso(28 * HOUR), 2 * HOUR)
    insertPending('within-the-day',   iso(20 * HOUR), 1 * HOUR)
    expect(pendingIds()).toEqual(['within-the-day', 'older-than-a-day'])
  })

  it('does not lose a row whose date is missing or unparseable', () => {
    insertPending('no-date',  null,        3 * HOUR)
    insertPending('bad-date', 'not a date', 2 * HOUR)
    insertPending('fresh',    iso(1 * HOUR), 1 * HOUR)
    // Behind the showable ones, but still in the queue rather than dropped.
    expect(pendingIds()[0]).toBe('fresh')
    expect(pendingIds()).toHaveLength(3)
  })
})
