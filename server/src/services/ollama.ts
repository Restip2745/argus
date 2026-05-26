import { Ollama } from 'ollama'
import cron from 'node-cron'
import type { Server } from 'socket.io'
import type { Article, OllamaClassification, EventCategory, EventIntensity, SourceReliability } from '../types'
import { VALID_CATEGORIES, VALID_INTENSITIES } from '../types'
import { logger } from '../utils/logger'

const VALID_RELIABILITIES: SourceReliability[] = ['HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED']
import {
  getPendingArticles,
  markAnalyzed,
  markAnalysisFailed,
  resetFailedArticles,
  getArticleById,
  articleToClientEvent,
} from '../db/sqlite'
import { broadcastEvent } from './socket'
import { getLlmConfig } from '../config/llmConfig'

// Ollama client is recreated per-call so host changes take effect immediately
function getClient(): Ollama {
  return new Ollama({ host: getLlmConfig().host })
}

// ── System prompt (from README spec) ────────────────────

const SYSTEM_PROMPT = `You are an intelligence analysis system. Your task is to classify a news article and extract structured geopolitical or astronomical data from it.

You MUST respond with a single valid JSON object only. No explanation, no markdown, no extra text — only raw JSON.

Follow this schema exactly:
{
  "category": string,         // One of: ARMED_CONFLICT | POLITICAL | ECONOMIC | SOCIAL | SCIENCE_TECH | ENVIRONMENT | HEALTH | CRIME_SECURITY | SPACE
  "title_zh": string,         // Article title translated or summarised in Traditional Chinese, max 40 characters
  "summary_zh": string,       // Neutral summary in Traditional Chinese, max 120 characters
  "intensity": string,        // One of: LOW | MODERATE | HIGH | CRITICAL
  "location": {
    "type": string,           // "geo" for Earth surface events | "orbital" for space events
    "label": string,          // Human-readable location name, e.g. "Ukraine" or "Inner Solar System"
    "lat": number | null,     // Latitude (-90 to 90), null if type is "orbital"
    "lng": number | null,     // Longitude (-180 to 180), null if type is "orbital"
    "body": string | null     // Celestial body name if type is "orbital", e.g. "3I/ATLAS", "Mars", null if type is "geo"
  },
  "actors": string[],         // Key parties involved, e.g. ["Ukraine", "Russia"] or ["NASA", "ESA"]
  "sources_count": number,    // Number of corroborating sources mentioned in the article (estimate 1 if unknown)
  "tags": string[],           // 2–4 short keyword tags in English, e.g. ["military", "frontline", "artillery"]
  "reliability": string       // Perceived source reliability: HIGH | MEDIUM | LOW | UNVERIFIED
}`

// ── Heat score calculation ──────────────────────────────

export function calculateHeatScore(data: OllamaClassification): number {
  let score = 0

  // Intensity base
  switch (data.intensity) {
    case 'CRITICAL':  score += 1.0; break
    case 'HIGH':      score += 0.6; break
    case 'MODERATE':  score += 0.3; break
    // LOW: +0.0
  }

  // Sources count: +0.1 each, max +0.5
  score += Math.min((data.sources_count ?? 1) * 0.1, 0.5)

  // Category bonus
  if (data.category === 'ARMED_CONFLICT' || data.category === 'SPACE') {
    score += 0.2
  } else if (data.category === 'POLITICAL' || data.category === 'ECONOMIC') {
    score += 0.1
  }

  return Math.round(score * 100) / 100
}

export function calculateExpiresAt(heatScore: number): string {
  const now = Date.now()
  let ms: number
  if (heatScore >= 1.5)      ms = 7 * 24 * 3600_000      // 7 days
  else if (heatScore >= 1.0) ms = 3 * 24 * 3600_000      // 3 days
  else if (heatScore >= 0.5) ms = 48 * 3600_000           // 48 hours
  else                       ms = 24 * 3600_000           // 24 hours
  // Use SQLite-compatible format (space separator, no trailing Z)
  // so datetime comparisons with datetime('now') work correctly
  return new Date(now + ms).toISOString().replace('T', ' ').replace('Z', '')
}

// ── Ollama call + validation ────────────────────────────

async function callOllama(title: string, content: string | null): Promise<OllamaClassification> {
  const userPrompt = `Classify the following news article:\n\nTitle: ${title}\n\nContent: ${(content ?? '').slice(0, 800)}\n\nRespond with JSON only.`

  const cfg = getLlmConfig()
  const response = await getClient().chat({
    model: cfg.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
    format: 'json',
    options: { temperature: cfg.temperature, num_ctx: cfg.contextSize },
  })

  const parsed = JSON.parse(response.message.content)
  return validateClassification(parsed)
}

function validateClassification(raw: Record<string, unknown>): OllamaClassification {
  // Validate category
  let category = raw.category as string
  if (!VALID_CATEGORIES.includes(category as EventCategory)) {
    category = 'POLITICAL' // default per README spec
  }

  // Validate intensity
  let intensity = raw.intensity as string
  if (!VALID_INTENSITIES.includes(intensity as EventIntensity)) {
    intensity = 'LOW'
  }

  // Validate location
  const loc = (raw.location ?? {}) as Record<string, unknown>
  const locType = loc.type === 'orbital' ? 'orbital' : 'geo'

  return {
    category: category as EventCategory,
    title_zh:    String(raw.title_zh ?? '').slice(0, 40),
    summary_zh:  String(raw.summary_zh ?? '').slice(0, 120),
    intensity: intensity as EventIntensity,
    location: {
      type:  locType,
      label: String(loc.label ?? ''),
      lat:   locType === 'geo' ? (typeof loc.lat === 'number' ? loc.lat : null) : null,
      lng:   locType === 'geo' ? (typeof loc.lng === 'number' ? loc.lng : null) : null,
      body:  locType === 'orbital' ? String(loc.body ?? '') || null : null,
    },
    actors:        Array.isArray(raw.actors) ? raw.actors.map(String) : [],
    sources_count: typeof raw.sources_count === 'number' ? raw.sources_count : 1,
    tags:          Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    reliability:   VALID_RELIABILITIES.includes(raw.reliability as SourceReliability)
                     ? (raw.reliability as SourceReliability)
                     : 'UNVERIFIED',
  }
}

// ── Worker loop ─────────────────────────────────────────

async function processOne(article: Article, io: Server): Promise<void> {
  let attempts = 0
  while (attempts < 2) {
    try {
      const data = await callOllama(article.title, article.content)
      const heatScore = calculateHeatScore(data)
      const expiresAt = calculateExpiresAt(heatScore)

      markAnalyzed(article.id, data, heatScore, expiresAt)

      // Re-read from DB to get the full row, then broadcast
      const updated = getArticleById(article.id)
      if (updated) {
        broadcastEvent(io, articleToClientEvent(updated))
      }

      logger.debug('[Ollama]', `Classified: "${article.title.slice(0, 50)}…" → ${data.category} (heat=${heatScore})`)
      return
    } catch (err) {
      attempts++
      if (attempts >= 2) {
        logger.error('[Ollama]', `Failed 2x for "${article.title.slice(0, 50)}…":`, (err as Error).message)
      }
    }
  }

  // Both attempts failed
  markAnalysisFailed(article.id)
}

async function processPendingArticles(io: Server): Promise<void> {
  const pending = getPendingArticles(20)
  if (pending.length === 0) return

  logger.info('[Ollama]', `Processing ${pending.length} pending article(s)`)
  for (const article of pending) {
    await processOne(article, io)
  }
}

export function startOllamaWorker(io: Server): void {
  // On startup: reset failed articles so they get another chance
  const retried = resetFailedArticles()
  if (retried > 0) {
    logger.info('[Ollama]', `Reset ${retried} previously-failed article(s) for retry`)
  }

  // Poll every 30 seconds
  cron.schedule('*/30 * * * * *', () => {
    void processPendingArticles(io)
  })

  // Also run once after a short delay
  setTimeout(() => void processPendingArticles(io), 5000)

  logger.info('[Ollama]', 'Worker scheduled — polling every 30s')
}
