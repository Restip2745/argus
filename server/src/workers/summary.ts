import cron from 'node-cron'
import { randomUUID } from 'crypto'
import type { Server } from 'socket.io'
import { Ollama } from 'ollama'
import { getTopHeatEvents } from '../db/sqlite'
import { broadcastBrief } from '../services/socket'
import { getLlmConfig } from '../config/llmConfig'
import { getUiLanguage } from '../config/uiConfig'
import { logger } from '../utils/logger'

const BASE_SYSTEM_PROMPT = `You are a senior intelligence analyst. Based on the top intelligence events provided, write a concise situational brief (3-5 sentences maximum).
Focus on the most critical developments, emerging patterns, and operational significance.
Respond in HTML format only. Use only these tags: <p> <b> <i>. No markdown, no code blocks.`

// The brief is broadcast to every connected client with no per-request
// question to infer a language from (unlike the agent chat endpoints), so it
// has to be told explicitly which language the viewer's UI is set to.
const LANGUAGE_DIRECTIVE: Record<string, string> = {
  'zh-TW': 'Respond only in Traditional Chinese (繁體中文), regardless of the language the source events are written in.',
  en:      'Respond only in English, regardless of the language the source events are written in.',
}

function buildSystemPrompt(): string {
  const directive = LANGUAGE_DIRECTIVE[getUiLanguage()] ?? LANGUAGE_DIRECTIVE.en
  return `${BASE_SYSTEM_PROMPT}\n${directive}`
}

async function generateBrief(io: Server): Promise<void> {
  const topEvents = getTopHeatEvents(5)
  if (topEvents.length === 0) return

  const eventLines = topEvents.map((e, i) =>
    `${i + 1}. [${e.category}/${e.intensity}] ${e.title} — heat: ${e.heat_score.toFixed(2)}` +
    (e.location_label ? ` — ${e.location_label}` : '')
  )
  const userMsg = `Current top intelligence events:\n\n${eventLines.join('\n')}\n\nProvide a situational brief.`

  const cfg    = getLlmConfig()
  const client = new Ollama({ host: cfg.host })

  const response = await client.chat({
    model: cfg.model,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: userMsg },
    ],
    options: { temperature: 0.6, num_ctx: Math.min(cfg.contextSize, 2048) },
  })

  const summary = response.message.content?.trim()
  if (!summary) return

  broadcastBrief(io, {
    id:           randomUUID(),
    summary,
    generatedAt:  new Date().toISOString(),
    topEventIds:  topEvents.map(e => e.id),
  })

  logger.info('[Summary]', `Intel brief generated (${topEvents.length} events)`)
}

export function startSummaryWorker(io: Server): void {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    generateBrief(io).catch(err =>
      logger.warn('[Summary]', 'Brief generation failed:', (err as Error).message)
    )
  })

  // Run once after 60 seconds to populate on first startup
  setTimeout(() => {
    generateBrief(io).catch(err =>
      logger.warn('[Summary]', 'Initial brief failed:', (err as Error).message)
    )
  }, 60_000)

  logger.info('[Summary]', 'Worker scheduled — every 30 min')
}
