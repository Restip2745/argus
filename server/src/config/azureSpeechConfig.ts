/**
 * Azure Speech (TTS) credentials, used to read the intel brief aloud.
 * Persisted via secretsStore rather than configStore — see that module's
 * comment for why the key can't live in data/config.json.
 */
import { loadPersistedSecrets, persistSecrets } from './secretsStore'
import { logger } from '../utils/logger'

export interface AzureSpeechConfig {
  key:    string   // Azure Cognitive Services Speech subscription key
  region: string   // e.g. "eastasia"
  voice:  string   // e.g. "zh-TW-HsiaoChenNeural"
}

const defaults: AzureSpeechConfig = {
  key:    process.env.AZURE_SPEECH_KEY    ?? '',
  region: process.env.AZURE_SPEECH_REGION ?? '',
  voice:  process.env.AZURE_SPEECH_VOICE  ?? 'zh-TW-HsiaoChenNeural',
}

const saved = loadPersistedSecrets().azureSpeech ?? {}
const config: AzureSpeechConfig = { ...defaults, ...saved } as AzureSpeechConfig

export function getAzureSpeechConfig(): Readonly<AzureSpeechConfig> {
  return { ...config }
}

export function setAzureSpeechConfig(patch: Partial<AzureSpeechConfig>): AzureSpeechConfig {
  if (patch.key    !== undefined) config.key    = patch.key
  if (patch.region !== undefined) config.region = patch.region
  if (patch.voice  !== undefined) config.voice  = patch.voice
  persistSecrets({ azureSpeech: config as unknown as Record<string, unknown> })
  logger.info('[Config]', `Azure Speech config updated (region=${config.region || '(unset)'}, voice=${config.voice}, key=${config.key ? 'set' : 'unset'})`)
  return { ...config }
}
