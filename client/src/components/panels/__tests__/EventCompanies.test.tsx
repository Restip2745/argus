import { describe, it, expect } from 'vitest'
import { companyCandidates } from '../EventCompanies'

describe('companyCandidates', () => {
  it('keeps an organisation name, which is the only kind worth asking about', () => {
    expect(companyCandidates(['Nvidia'])).toEqual(['Nvidia'])
    expect(companyCandidates(['Lockheed Martin'])).toEqual(['Lockheed Martin'])
  })

  it('drops countries, the largest group in the actor vocabulary', () => {
    // 59 "United States", 54 "Colombia", 36 "Iran" in the stored corpus — every
    // one of them would have cost a Wikipedia round trip to learn nothing.
    expect(companyCandidates(['United States', 'Iran', 'Ukraine', 'Japan'])).toEqual([])
  })

  it('lets people through, because nothing local tells them from companies', () => {
    // linkableEntityNames looks like the filter for this and is not: it is a
    // residue, so "Nvidia" survives it for want of a "corp" in the name.
    // Wikidata settles it a summary later, and never calls out for a person.
    expect(companyCandidates(['Donald Trump'])).toEqual(['Donald Trump'])
  })

  it('keeps the company out of a mixed cast', () => {
    expect(companyCandidates(['United States', 'Lockheed Martin']))
      .toEqual(['Lockheed Martin'])
  })

  it('caps the list, because a story with a dozen actors is a round-up', () => {
    // And a round-up is the kind of story a market row least belongs on.
    const many = ['Alpha Corp', 'Beta Corp', 'Gamma Corp', 'Delta Corp', 'Epsilon Corp', 'Zeta Corp']
    expect(companyCandidates(many)).toHaveLength(4)
  })

  it('drops fragments too short to identify anything', () => {
    // A bare initial resolves to something confidently wrong more often than
    // to nothing at all.
    expect(companyCandidates(['A', ' ', 'XY'])).toEqual([])
  })

  it('returns nothing for an event with no actors', () => {
    expect(companyCandidates([])).toEqual([])
  })
})
