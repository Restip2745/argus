import { describe, it, expect } from 'vitest'
import { classifyEntity, entityGlyph, ENTITY_GLYPH } from '../entityKind'
import { CATEGORY_GLYPH } from '../symbology'

describe('classifyEntity', () => {
  it('recognises people from their occupation', () => {
    const people = [
      'American politician',
      'President of the United States',
      'Israeli prime minister',
      'British journalist and broadcaster',
      'Iranian cleric and politician',
      'Brazilian footballer',
      'French economist',
      'Egyptian film director',
    ]
    for (const d of people) expect(classifyEntity(d), d).toBe('person')
  })

  it('recognises organisations', () => {
    const orgs = [
      'intergovernmental military alliance',
      'political party in Germany',
      'United Nations specialised agency',
      'multinational technology company',
      'Palestinian militant group',
      'central bank of the eurozone',
      'international humanitarian organisation',
      'American news network',
    ]
    for (const d of orgs) expect(classifyEntity(d), d).toBe('org')
  })

  it('recognises places', () => {
    const places = [
      'country in East Asia',
      'capital of France',
      'landlocked country in Central Asia',
      'island in the Mediterranean',
      'city in northern Israel',
      'strait connecting the Persian Gulf',
      'autonomous territory',
    ]
    for (const d of places) expect(classifyEntity(d), d).toBe('place')
  })

  it('recognises events and documents', () => {
    const works = [
      'peace treaty between Egypt and Israel',
      'armed conflict in Sudan',
      '2026 presidential election',
      'nuclear non-proliferation agreement',
      'magnitude 7.1 earthquake in Japan',
      'ongoing pandemic',
      'NASA space telescope',
    ]
    for (const d of works) expect(classifyEntity(d), d).toBe('work')
  })

  it('falls back to unknown rather than guessing', () => {
    expect(classifyEntity(undefined)).toBe('unknown')
    expect(classifyEntity(null)).toBe('unknown')
    expect(classifyEntity('')).toBe('unknown')
    expect(classifyEntity('a thing that defies description')).toBe('unknown')
  })

  it('does not fire on words that merely contain a keyword', () => {
    // The reason matching is boundary-anchored rather than a substring test.
    expect(classifyEntity('presidential election in Peru')).toBe('work')
    expect(classifyEntity('constitutional monarchy in Europe')).not.toBe('person')
    expect(classifyEntity('kingdom in Northern Europe')).not.toBe('person')
  })

  it('prefers the person reading when an occupation is present', () => {
    // A politician who ran an institution is still a person.
    expect(classifyEntity('American politician who served in the Senate')).toBe('person')
    expect(classifyEntity('Israeli general and minister of defence')).toBe('person')
  })

  it('is case-insensitive', () => {
    expect(classifyEntity('AMERICAN POLITICIAN')).toBe('person')
    expect(classifyEntity('Country In East Asia')).toBe('place')
  })

  it('is not confused by punctuation around the keyword', () => {
    expect(classifyEntity('journalist, author and activist')).toBe('person')
    expect(classifyEntity('city (municipality) in Spain')).toBe('place')
  })
})

describe('entity glyphs', () => {
  it('gives every kind a distinct glyph', () => {
    const glyphs = Object.values(ENTITY_GLYPH)
    expect(new Set(glyphs).size).toBe(glyphs.length)
  })

  it('resolves a description straight to its glyph', () => {
    expect(entityGlyph('American politician')).toBe(ENTITY_GLYPH.person)
    expect(entityGlyph('country in East Asia')).toBe(ENTITY_GLYPH.place)
    expect(entityGlyph(undefined)).toBe(ENTITY_GLYPH.unknown)
  })

  it('does not reuse an event-category glyph for a filled shape', () => {
    // Entity kinds and event categories are separate channels. They never
    // appear side by side, but a same-shape-same-fill collision would still be
    // needless confusion — ⬢ (org) deliberately differs from ⬡ (CRIME).
    expect(Object.values(ENTITY_GLYPH)).not.toContain(CATEGORY_GLYPH.CRIME_SECURITY)
  })
})
