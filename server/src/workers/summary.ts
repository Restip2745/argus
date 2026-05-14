import cron from 'node-cron'
import { randomUUID } from 'crypto'
import type { Server } from 'socket.io'
import { Ollama } from 'ollama'
import { getTopHeatEvents } from '../db/sqlite'
import { broadcastBrief } from '../services/socket'
import { getLlmConfig } from '../config/llmConfig'
import { logger } from '../utils/logger'

const SYSTEM_PROMPT = `You are a senior intelligence analyst. Based on the top intelligence events provided, write a concise situational brief (3-5 sentences maximum).
Focus on the most critical developments, emerging patterns, and operational significance.
Respond in HTML format only. Use only these tags: <p> <b> <i>. No markdown, no code blocks.
If the user context is in Chinese, respond in Traditional Chinese (繁體中文).`

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
      { role: 'system', content: SYSTEM_PROMPT },
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
