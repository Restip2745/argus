/**
 * Env-gated structured logger.
 *
 * LOG_LEVEL env var controls verbosity (default: 'info'):
 *   debug  — all messages
 *   info   — info, warn, error
 *   warn   — warn, error only
 *   error  — error only
 *   silent — nothing
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const
type Level = keyof typeof LEVELS

function getLevel(): number {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as Level
  return LEVELS[raw] ?? LEVELS.info
}

function log(level: Exclude<Level, 'silent'>, tag: string, ...args: unknown[]): void {
  if (LEVELS[level] < getLevel()) return
  const ts = new Date().toISOString()
  const prefix = `[${ts}] [${level.toUpperCase()}] ${tag}`
  if (level === 'error') console.error(prefix, ...args)
  else if (level === 'warn')  console.warn(prefix, ...args)
  else                        console.log(prefix, ...args)
}

export const logger = {
  debug: (tag: string, ...args: unknown[]) => log('debug', tag, ...args),
  info:  (tag: string, ...args: unknown[]) => log('info',  tag, ...args),
  warn:  (tag: string, ...args: unknown[]) => log('warn',  tag, ...args),
  error: (tag: string, ...args: unknown[]) => log('error', tag, ...args),
}
