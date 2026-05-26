import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

// Import dynamically so LOG_LEVEL env is read at test time
async function getLogger() {
  vi.resetModules()
  return (await import('../utils/logger')).logger
}

describe('logger', () => {
  it('emits info messages at default log level', async () => {
    vi.stubEnv('LOG_LEVEL', 'info')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = await getLogger()
    logger.info('[Test]', 'hello')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0].join(' ')).toContain('[INFO]')
  })

  it('suppresses debug messages at info level', async () => {
    vi.stubEnv('LOG_LEVEL', 'info')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = await getLogger()
    logger.debug('[Test]', 'verbose')
    expect(spy).not.toHaveBeenCalled()
  })

  it('emits debug messages at debug level', async () => {
    vi.stubEnv('LOG_LEVEL', 'debug')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = await getLogger()
    logger.debug('[Test]', 'verbose')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0].join(' ')).toContain('[DEBUG]')
  })

  it('uses console.warn for warn level', async () => {
    vi.stubEnv('LOG_LEVEL', 'warn')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = await getLogger()
    logger.warn('[Test]', 'warning')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0].join(' ')).toContain('[WARN]')
  })

  it('uses console.error for error level', async () => {
    vi.stubEnv('LOG_LEVEL', 'error')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = await getLogger()
    logger.error('[Test]', 'boom')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0].join(' ')).toContain('[ERROR]')
  })

  it('suppresses all output at silent level', async () => {
    vi.stubEnv('LOG_LEVEL', 'silent')
    const spyLog   = vi.spyOn(console, 'log').mockImplementation(() => {})
    const spyWarn  = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = await getLogger()
    logger.info('[Test]', 'nope')
    logger.warn('[Test]', 'nope')
    logger.error('[Test]', 'nope')
    expect(spyLog).not.toHaveBeenCalled()
    expect(spyWarn).not.toHaveBeenCalled()
    expect(spyError).not.toHaveBeenCalled()
  })

  it('includes the tag in the output', async () => {
    vi.stubEnv('LOG_LEVEL', 'info')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = await getLogger()
    logger.info('[MyModule]', 'message')
    expect(spy.mock.calls[0].join(' ')).toContain('[MyModule]')
  })
})
