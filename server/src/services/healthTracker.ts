import { Ollama } from 'ollama'
import { getLlmConfig } from '../config/llmConfig'
import { getAnalyzedArticles } from '../db/sqlite'

let ollamaOnline = false
let lastScraperRun: string | null = null

export function setLastScraperRun(iso: string): void {
  lastScraperRun = iso
}

export function getHealthSnapshot(): {
  status: string
  timestamp: string
  ollamaOnline: boolean
  lastScraperRun: string | null
  analyzedCount: number
} {
  let analyzedCount = 0
  try { analyzedCount = getAnalyzedArticles().length } catch { /* db not ready */ }
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollamaOnline,
    lastScraperRun,
    analyzedCount,
  }
}

export function startOllamaHealthPoll(): void {
  async function check() {
    try {
      const client = new Ollama({ host: getLlmConfig().host })
      await client.list()
      ollamaOnline = true
    } catch {
      ollamaOnline = false
    }
  }
  void check()
  setInterval(() => void check(), 30_000)
}
