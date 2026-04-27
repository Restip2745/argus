/**
 * Dynamic LLM configuration store.
 * Settings are persisted in memory at runtime and can be updated via REST API.
 * On restart, defaults are re-applied (values from .env take precedence).
 */

export interface LlmConfig {
  host:        string   // Ollama base URL
  model:       string   // Model name, e.g. "gemma4:e4b"
  temperature: number   // 0.0 – 1.0
  contextSize: number   // num_ctx tokens
}

const config: LlmConfig = {
  host:        process.env.OLLAMA_HOST  ?? 'http://localhost:11434',
  model:       process.env.OLLAMA_MODEL ?? 'gemma4:e4b',
  temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0.1),
  contextSize: Number(process.env.OLLAMA_CTX         ?? 2048),
}

export function getLlmConfig(): Readonly<LlmConfig> {
  return { ...config }
}

export function setLlmConfig(patch: Partial<LlmConfig>): LlmConfig {
  if (patch.host        !== undefined) config.host        = patch.host
  if (patch.model       !== undefined) config.model       = patch.model
  if (patch.temperature !== undefined) config.temperature = Math.max(0, Math.min(1, patch.temperature))
  if (patch.contextSize !== undefined) config.contextSize = Math.max(512, Math.min(32768, patch.contextSize))
  console.log('[Config] LLM config updated:', config)
  return { ...config }
}
