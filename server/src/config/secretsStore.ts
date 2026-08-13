/**
 * Atomic JSON persistence for credentials, mirroring configStore.ts but
 * writing to a separate, gitignored file (data/secrets.json) so an API key
 * set through the UI never ends up in the tracked data/config.json.
 */
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { logger } from '../utils/logger'

const SECRETS_PATH = join(__dirname, '../../../data/secrets.json')

interface PersistedSecrets {
  azureSpeech?: Record<string, unknown>
}

function ensureDir(): void {
  const dir = dirname(SECRETS_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export function loadPersistedSecrets(): PersistedSecrets {
  try {
    if (!existsSync(SECRETS_PATH)) return {}
    const raw = readFileSync(SECRETS_PATH, 'utf8')
    return JSON.parse(raw) as PersistedSecrets
  } catch {
    return {}
  }
}

export function persistSecrets(patch: Partial<PersistedSecrets>): void {
  try {
    ensureDir()
    const current = loadPersistedSecrets()
    const next: PersistedSecrets = { ...current, ...patch }
    const tmp = SECRETS_PATH + '.tmp'
    writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
    renameSync(tmp, SECRETS_PATH)
  } catch (err) {
    logger.warn('[Secrets]', 'Failed to persist secrets:', (err as Error).message)
  }
}
