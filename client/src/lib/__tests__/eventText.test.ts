import { describe, it, expect } from 'vitest'
import { eventTitle, eventSummary, isZhLang } from '../eventText'
import type { ArgusEvent } from '../../types'

const evt = (over: Partial<ArgusEvent> = {}): ArgusEvent => ({
  id: 'e1',
  title: 'Original English Headline',
  title_zh: null,
  content: null,
  summary_zh: null,
  summary_en: null,
  source: 'BBC', url: 'https://x/y',
  published_at: '2026-08-03T00:00:00Z', fetched_at: '2026-08-03T00:00:00Z',
  category: 'POLITICAL', intensity: 'MODERATE',
  location_type: 'geo', location_label: 'X', lat: 0, lng: 0, geo_precision: 'exact', body: null,
  actors: [], tags: [], sources_count: 1, reliability: 'UNVERIFIED',
  image_url: null, heat_score: 0, expires_at: null, last_referenced: null,
  ...over,
})

describe('isZhLang', () => {
  it('matches zh variants and nothing else', () => {
    for (const l of ['zh', 'zh-TW', 'ZH-tw', 'zh-CN']) expect(isZhLang(l)).toBe(true)
    for (const l of ['en', 'en-GB', '', undefined, null]) expect(isZhLang(l)).toBe(false)
  })
})

describe('eventTitle', () => {
  it('gives English readers the source headline, never a translation', () => {
    const e = evt({ title_zh: '中文標題' })
    expect(eventTitle(e, 'en')).toBe('Original English Headline')
  })

  it('gives Chinese readers the translated headline', () => {
    const e = evt({ title_zh: '中文標題' })
    expect(eventTitle(e, 'zh-TW')).toBe('中文標題')
  })

  // The bug this guards: markAnalyzed stores '' (not null) when the model
  // returns nothing usable, so `??` would hand back an empty headline.
  it('falls back to the original when the translation is empty or blank', () => {
    for (const v of [null, '', '   ']) {
      expect(eventTitle(evt({ title_zh: v }), 'zh-TW')).toBe('Original English Headline')
    }
  })
})

describe('eventSummary', () => {
  it('picks the reader\'s language', () => {
    const e = evt({ summary_zh: '中文摘要', summary_en: 'English summary' })
    expect(eventSummary(e, 'zh-TW')).toBe('中文摘要')
    expect(eventSummary(e, 'en')).toBe('English summary')
  })

  it('falls back across languages rather than showing a blank row', () => {
    expect(eventSummary(evt({ summary_en: 'Only English' }), 'zh-TW')).toBe('Only English')
    expect(eventSummary(evt({ summary_zh: '只有中文' }), 'en')).toBe('只有中文')
  })

  it('is empty when neither language has one, so callers can hide the block', () => {
    expect(eventSummary(evt(), 'zh-TW')).toBe('')
    expect(eventSummary(evt({ summary_zh: '  ', summary_en: '' }), 'en')).toBe('')
  })
})
