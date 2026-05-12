import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
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
