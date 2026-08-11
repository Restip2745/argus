import { describe, it, expect } from 'vitest'
import { youtubeVideoId, youtubeEmbedUrl } from '../videoEmbed'

describe('youtubeVideoId', () => {
  it('reads the id from a watch link, the form feeds actually deliver', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=ihHVOFqL_ew')).toBe('ihHVOFqL_ew')
  })

  it('keeps the id when the watch link carries extra params', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=ihHVOFqL_ew&t=42s')).toBe('ihHVOFqL_ew')
  })

  it('handles share links and shorts', () => {
    expect(youtubeVideoId('https://youtu.be/ihHVOFqL_ew')).toBe('ihHVOFqL_ew')
    expect(youtubeVideoId('https://www.youtube.com/shorts/FfkMNwmjxPY')).toBe('FfkMNwmjxPY')
  })

  it('returns null for non-video news URLs so they keep the plain thumbnail', () => {
    expect(youtubeVideoId('https://feeds.bbci.co.uk/news/world/story')).toBeNull()
    expect(youtubeVideoId('https://www.youtube.com/@Reuters')).toBeNull()
  })

  it('rejects a host that merely ends in youtube.com', () => {
    expect(youtubeVideoId('https://evil-youtube.com/watch?v=ihHVOFqL_ew')).toBeNull()
  })

  it('rejects ids that are not the 11-char youtube form', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=../../etc')).toBeNull()
    expect(youtubeVideoId('https://www.youtube.com/watch?v=short')).toBeNull()
  })

  it('returns null rather than throwing on a malformed URL', () => {
    expect(youtubeVideoId('not a url')).toBeNull()
    expect(youtubeVideoId('')).toBeNull()
  })
})

describe('youtubeEmbedUrl', () => {
  it('uses the nocookie host, since ARGUS promises nothing leaves the machine', () => {
    expect(youtubeEmbedUrl('ihHVOFqL_ew')).toContain('youtube-nocookie.com/embed/ihHVOFqL_ew')
  })
})
