import { describe, it, expect } from 'vitest'
import { extractContent, stripPromoTail } from '../services/scraper'
import type { RawFeedItem } from '../types'

/** Minimal YouTube-shaped item: media:group nesting, no contentSnippet. */
function ytItem(description: string): RawFeedItem {
  return {
    title: 'Typhoon Dolphin hits China',
    link:  'https://www.youtube.com/watch?v=ihHVOFqL_ew',
    mediaGroup: { 'media:description': [description] },
  }
}

describe('stripPromoTail', () => {
  it('cuts at the hashtag pile that opens the promo block', () => {
    const real = 'Typhoon Dolphin makes landfall on China\'s eastern coast.'
    const out = stripPromoTail(
      `${real}\n\n#TyphoonDolphin #China #typhoon\n\nKeep up with the latest news: https://www.reuters.com/`,
    )
    expect(out).toBe(real)
  })

  it('cuts at a bare link line when no hashtags precede it', () => {
    const out = stripPromoTail('Report body.\n\nSubscribe: https://example.com/sub')
    expect(out).toBe('Report body.')
  })

  it('keeps hashtags that sit inline in a sentence', () => {
    const inline = 'Protests continue in #Paris for a third night.'
    expect(stripPromoTail(inline)).toBe(inline)
  })

  it('falls back to the original when the first line is already promo', () => {
    const allPromo = '#breaking #news\n\nhttps://example.com'
    expect(stripPromoTail(allPromo)).toBe(allPromo)
  })

  it('leaves a description with no promo block untouched', () => {
    const plain = 'Two paragraphs.\n\nNo promo here.'
    expect(stripPromoTail(plain)).toBe(plain)
  })
})

describe('extractContent', () => {
  it('reads media:group description when contentSnippet is absent', () => {
    expect(extractContent(ytItem('Landfall confirmed.'))).toBe('Landfall confirmed.')
  })

  it('prefers contentSnippet when the feed provides one', () => {
    const item = { ...ytItem('from media group'), contentSnippet: 'from snippet' }
    expect(extractContent(item)).toBe('from snippet')
  })

  it('falls through to media:group when contentSnippet is present but blank', () => {
    const item = { ...ytItem('from media group'), contentSnippet: '   ' }
    expect(extractContent(item)).toBe('from media group')
  })

  it('caps content at the 800-char budget the classifier sees', () => {
    expect(extractContent(ytItem('x'.repeat(1200)))?.length).toBe(800)
  })

  it('returns null when the item carries no usable text', () => {
    expect(extractContent({ title: 't', link: 'https://example.com' })).toBeNull()
  })
})
