/**
 * The model now classifies, translates and summarises in a single call. The
 * translation half is the fragile one — these cover the ways a small model
 * fails at it, and assert that none of them cost us the classification.
 */
import { describe, it, expect } from 'vitest'
import { validateClassification } from '../services/ollama'

const good = {
  category: 'ARMED_CONFLICT',
  intensity: 'HIGH',
  title_zh: '烏克蘭東部發生激烈戰鬥',
  summary_en: 'Heavy fighting was reported in eastern Ukraine overnight.',
  summary_zh: '烏東地區昨夜傳出激烈交火。',
  location: { type: 'geo', label: 'Ukraine', lat: 48.4, lng: 37.8, body: null },
  actors: ['Ukraine', 'Russia'],
  sources_count: 2,
  tags: ['military', 'frontline'],
  reliability: 'MEDIUM',
}

describe('validateClassification — bilingual fields', () => {
  it('keeps well-formed output intact', () => {
    const r = validateClassification(good)
    expect(r.title_zh).toBe('烏克蘭東部發生激烈戰鬥')
    expect(r.summary_zh).toBe('烏東地區昨夜傳出激烈交火。')
    expect(r.summary_en).toBe('Heavy fighting was reported in eastern Ukraine overnight.')
    expect(r.category).toBe('ARMED_CONFLICT')
  })

  // A small model asked for Chinese will sometimes just echo English. Storing
  // that would show the same sentence for both languages while looking correct.
  it('drops Chinese fields that contain no Chinese', () => {
    const r = validateClassification({
      ...good, title_zh: 'Fighting in eastern Ukraine', summary_zh: 'Heavy fighting reported.',
    })
    expect(r.title_zh).toBe('')
    expect(r.summary_zh).toBe('')
    expect(r.summary_en).toBe(good.summary_en)   // English side unaffected
  })

  it('drops non-string and rambling output instead of storing it', () => {
    expect(validateClassification({ ...good, title_zh: 42 }).title_zh).toBe('')
    expect(validateClassification({ ...good, summary_en: null }).summary_en).toBe('')
    expect(validateClassification({ ...good, summary_en: 'x'.repeat(500) }).summary_en).toBe('')
  })

  it('truncates merely-overlong text rather than discarding it', () => {
    const long = '這是一段中文摘要。'.repeat(20)          // 180 chars: over 120, under 240
    const r = validateClassification({ ...good, summary_zh: long })
    expect(r.summary_zh.length).toBe(120)
  })

  it('collapses whitespace so multi-line output does not break layout', () => {
    const r = validateClassification({ ...good, summary_en: '  Two   lines\n  of text  ' })
    expect(r.summary_en).toBe('Two lines of text')
  })

  // The whole point of the guards: a failed translation must not take the
  // classification down with it.
  it('still classifies when every text field is garbage', () => {
    const r = validateClassification({
      ...good, title_zh: null, summary_zh: 12, summary_en: undefined,
    })
    expect(r.title_zh).toBe('')
    expect(r.summary_zh).toBe('')
    expect(r.summary_en).toBe('')
    expect(r.category).toBe('ARMED_CONFLICT')
    expect(r.intensity).toBe('HIGH')
    expect(r.actors).toEqual(['Ukraine', 'Russia'])
  })
})
