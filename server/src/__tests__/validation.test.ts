import { describe, it, expect } from 'vitest'
import {
  validateExportParams,
  validateEventId,
  validateLlmConfigBody,
  validateFeedsBody,
  validateConfigAuth,
} from '../utils/validation'

// ── validateExportParams ──────────────────────────────────────────────────────

describe('validateExportParams', () => {
  it('accepts json format', () => {
    expect(validateExportParams('json', undefined)).toBeNull()
  })

  it('accepts csv format', () => {
    expect(validateExportParams('csv', undefined)).toBeNull()
  })

  it('defaults missing format to json (no error)', () => {
    expect(validateExportParams(undefined, undefined)).toBeNull()
  })

  it('rejects unknown format', () => {
    expect(validateExportParams('xml', undefined)).toMatch(/format must be/)
  })

  it('rejects empty string format', () => {
    expect(validateExportParams('', undefined)).toMatch(/format must be/)
  })

  it('accepts ids within length limit', () => {
    expect(validateExportParams('json', 'id1,id2,id3')).toBeNull()
  })

  it('rejects ids string exceeding 10 000 chars', () => {
    expect(validateExportParams('json', 'x'.repeat(10_001))).toMatch(/too long/)
  })

  it('allows ids exactly at 10 000 chars', () => {
    expect(validateExportParams('json', 'x'.repeat(10_000))).toBeNull()
  })
})

// ── validateEventId ───────────────────────────────────────────────────────────

describe('validateEventId', () => {
  it('accepts alphanumeric ids', () => {
    expect(validateEventId('abc123')).toBeNull()
  })

  it('accepts ids with hyphens and underscores', () => {
    expect(validateEventId('evt-2024_01-abc')).toBeNull()
  })

  it('accepts webhook-style ids', () => {
    expect(validateEventId('wh-1716000000000-abc123')).toBeNull()
  })

  it('rejects id with path traversal characters', () => {
    expect(validateEventId('../etc/passwd')).toMatch(/invalid/)
  })

  it('rejects id with spaces', () => {
    expect(validateEventId('bad id')).toMatch(/invalid/)
  })

  it('rejects empty string', () => {
    expect(validateEventId('')).toMatch(/invalid/)
  })

  it('rejects id longer than 120 characters', () => {
    expect(validateEventId('a'.repeat(121))).toMatch(/invalid/)
  })

  it('accepts id exactly 120 characters', () => {
    expect(validateEventId('a'.repeat(120))).toBeNull()
  })
})

// ── validateLlmConfigBody ─────────────────────────────────────────────────────

describe('validateLlmConfigBody', () => {
  it('accepts a valid full config object', () => {
    expect(validateLlmConfigBody({
      host: 'http://localhost:11434',
      model: 'gemma4:e4b',
      temperature: 0.1,
      contextSize: 2048,
    })).toBeNull()
  })

  it('accepts an empty patch object', () => {
    expect(validateLlmConfigBody({})).toBeNull()
  })

  it('accepts partial patch with only model', () => {
    expect(validateLlmConfigBody({ model: 'llama3' })).toBeNull()
  })

  it('rejects null body', () => {
    expect(validateLlmConfigBody(null)).toMatch(/object/)
  })

  it('rejects array body', () => {
    expect(validateLlmConfigBody([{ host: 'x' }])).toMatch(/object/)
  })

  it('rejects non-string host', () => {
    expect(validateLlmConfigBody({ host: 123 })).toMatch(/host/)
  })

  it('rejects non-string model', () => {
    expect(validateLlmConfigBody({ model: true })).toMatch(/model/)
  })

  it('rejects non-number temperature', () => {
    expect(validateLlmConfigBody({ temperature: '0.5' })).toMatch(/temperature/)
  })

  it('rejects non-number contextSize', () => {
    expect(validateLlmConfigBody({ contextSize: '2048' })).toMatch(/contextSize/)
  })
})

// ── validateFeedsBody ─────────────────────────────────────────────────────────

describe('validateFeedsBody', () => {
  const validFeed = { url: 'https://example.com/feed', enabled: true, name: 'Test', lang: 'en', region: null }

  it('accepts a valid feeds array', () => {
    expect(validateFeedsBody([validFeed])).toBeNull()
  })

  it('accepts an empty array', () => {
    expect(validateFeedsBody([])).toBeNull()
  })

  it('rejects non-array body', () => {
    expect(validateFeedsBody({ url: 'x', enabled: true })).toMatch(/array/)
  })

  it('rejects null body', () => {
    expect(validateFeedsBody(null)).toMatch(/array/)
  })

  it('rejects array with a non-object item', () => {
    expect(validateFeedsBody(['string'])).toMatch(/object/)
  })

  it('rejects feed missing url', () => {
    expect(validateFeedsBody([{ enabled: true }])).toMatch(/url/)
  })

  it('rejects feed with empty url', () => {
    expect(validateFeedsBody([{ url: '', enabled: true }])).toMatch(/url/)
  })

  it('rejects feed missing enabled', () => {
    expect(validateFeedsBody([{ url: 'https://example.com' }])).toMatch(/enabled/)
  })

  it('rejects feed with non-boolean enabled', () => {
    expect(validateFeedsBody([{ url: 'https://example.com', enabled: 'true' }])).toMatch(/enabled/)
  })
})

// ── validateConfigAuth ────────────────────────────────────────────────────────

describe('validateConfigAuth', () => {
  it('passes when no secret configured (undefined)', () => {
    expect(validateConfigAuth(undefined, undefined)).toBeNull()
  })

  it('passes when no secret configured (empty string)', () => {
    expect(validateConfigAuth('anything', '')).toBeNull()
  })

  it('passes when header matches secret', () => {
    expect(validateConfigAuth('my-secret', 'my-secret')).toBeNull()
  })

  it('rejects when header is wrong', () => {
    expect(validateConfigAuth('wrong-key', 'my-secret')).toMatch(/X-Config-Key/)
  })

  it('rejects when header is missing', () => {
    expect(validateConfigAuth(undefined, 'my-secret')).toMatch(/X-Config-Key/)
  })

  it('rejects when header is empty string', () => {
    expect(validateConfigAuth('', 'my-secret')).toMatch(/X-Config-Key/)
  })
})
