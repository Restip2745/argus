import { Ollama } from 'ollama'
import { getLlmConfig } from '../config/llmConfig'
import { getAnalyzedArticles } from '../db/sqlite'

let ollamaOnline = false
let lastScraperRun: string | null = null

export interface FeedStatus {
  name:         string
  lastSuccess:  string | null
  lastError:    string | null
  errorMessage: string | null
}

const feedStatuses = new Map<string, FeedStatus>()

export function recordFeedSuccess(name: string): void {
  feedStatuses.set(name, {
    name,
    lastSuccess:  new Date().toISOString(),
    lastError:    feedStatuses.get(name)?.lastError ?? null,
    errorMessage: null,
  })
}

export function recordFeedError(name: string, message: string): void {
  feedStatuses.set(name, {
    name,
    lastSuccess:  feedStatuses.get(name)?.lastSuccess ?? null,
    lastError:    new Date().toISOString(),
    errorMessage: message,
  })
}

export function setLastScraperRun(iso: string): void {
  lastScraperRun = iso
}

export function getHealthSnapshot(): {
  status: string
  timestamp: string
  ollamaOnline: boolean
  lastScraperRun: string | null
  analyzedCount: number
  feedStatuses: FeedStatus[]
} {
  let analyzedCount = 0
  try { analyzedCount = getAnalyzedArticles().length } catch { /* db not ready */ }
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollamaOnline,
    lastScraperRun,
    analyzedCount,
    feedStatuses: [...feedStatuses.values()],
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
