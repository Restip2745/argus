import cron from 'node-cron'
import {
  findAnalyzedArticles,
  updateHeatScore,
  deleteExpiredArticles,
} from '../db/sqlite'
import { calculateHeatScore, calculateExpiresAt } from '../services/ollama'
import type { Article, OllamaClassification, EventCategory, EventIntensity } from '../types'

/**
 * Reconstruct the base heat score from an article's stored fields
 * so we can cap the cross-reference bonus at base + 0.45
 */
function baseHeatScore(a: Article): number {
  return calculateHeatScore({
    category:      a.category as EventCategory ?? 'POLITICAL',
    intensity:     a.intensity as EventIntensity ?? 'LOW',
    sources_count: a.sources_count ?? 1,
    // Unused by calculateHeatScore but required by the interface:
    title_zh:    '',
    summary_zh:  '',
    location:    { type: 'geo', label: '', lat: null, lng: null, body: null },
    actors:      [],
    tags:        [],
    reliability: 'UNVERIFIED',
  } as OllamaClassification)
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

function hasIntersection(a: string[], b: string[]): boolean {
  const setB = new Set(b.map(s => s.toLowerCase()))
  return a.some(s => setB.has(s.toLowerCase()))
}

export function startRetention(): void {
  cron.schedule('*/15 * * * *', () => {
    try {
      runRetention()
    } catch (err) {
      console.error('[Retention] Error:', (err as Error).message)
    }
  })

  console.log('[Retention] Worker scheduled — every 15 min')
}

function runRetention(): void {
  const articles = findAnalyzedArticles()

  // Step A: Update heat scores for related articles
  // Find "new" articles (last_referenced is null = never been boosted yet, freshly analyzed)
  const freshArticles = articles.filter(a =>
    a.last_referenced === null && a.is_analyzed === 1
  )

  let boostCount = 0
  for (const fresh of freshArticles) {
    const freshActors = parseJsonArray(fresh.actors)
    const freshTags   = parseJsonArray(fresh.tags)
    if (freshActors.length === 0 && freshTags.length === 0) continue

    for (const older of articles) {
      if (older.id === fresh.id) continue

      const olderActors = parseJsonArray(older.actors)
      const olderTags   = parseJsonArray(older.tags)

      if (hasIntersection(freshActors, olderActors) || hasIntersection(freshTags, olderTags)) {
        const base = baseHeatScore(older)
        const maxAllowed = base + 0.45
        const newScore = Math.min(
          Math.round((older.heat_score + 0.15) * 100) / 100,
          maxAllowed,
        )

        if (newScore > older.heat_score) {
          const newExpires = calculateExpiresAt(newScore)
          updateHeatScore(older.id, newScore, newExpires)
          boostCount++
        }
      }
    }
  }

  // Step B: Delete expired + low-heat articles
  const deleted = deleteExpiredArticles()

  if (boostCount > 0 || deleted > 0) {
    console.log(`[Retention] Boosted ${boostCount} article(s), deleted ${deleted} expired`)
  }
}
