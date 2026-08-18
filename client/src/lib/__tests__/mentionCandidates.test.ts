import { describe, it, expect } from 'vitest'
import { mentionCandidates, matchMentions, candidateEntity, searchedCandidates, withSearchResults } from '../mentionCandidates'
import { eventContextEntity, regionContextEntity, wikiContextEntity } from '../contextEntity'
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

const named = (list: { name: string }[]) => list.map(c => c.name)

describe('mentionCandidates', () => {
  it('offers the countries it holds figures for', () => {
    const all = mentionCandidates([], 'en')
    const usa = all.find(c => c.name === 'United States of America')
    expect(usa?.type).toBe('region')
    // Ready to add: a region's summary is local, so picking it costs no fetch.
    expect(usa?.entity?.summary).toContain('Washington D.C.')
  })

  it('offers the actors named by loaded events, once each', () => {
    const events = [
      evt({ id: 'a', actors: ['Nvidia', 'Security Officials'] }),
      evt({ id: 'b', actors: ['Nvidia'] }),
    ]
    const actors = mentionCandidates(events, 'en').filter(c => c.type === 'wiki')
    expect(named(actors)).toEqual(['Nvidia'])
    // A generic descriptor is not an entity — `linkableEntityNames` drops it.
    expect(named(actors)).not.toContain('Security Officials')
    // Its summary is the encyclopedia text, which nobody has fetched yet.
    expect(actors[0].entity).toBeNull()
  })

  it('produces the same ids the click path produces', () => {
    const event = evt({ id: 'evt-99', actors: ['Nvidia'] })
    const all   = mentionCandidates([event], 'en')

    const byType = (t: string) => all.find(c => c.type === t)!
    expect(byType('event').id).toBe(eventContextEntity(event, 'en').id)
    expect(byType('wiki').id).toBe(wikiContextEntity('Nvidia').id)
    expect(all.find(c => c.name === 'Taiwan')!.id).toBe(regionContextEntity('Taiwan').id)
  })
})

describe('matchMentions', () => {
  const all = mentionCandidates([evt({ id: 'evt-1', title: 'Taiwan strait drill', actors: ['Nvidia'] })], 'en')

  it('finds a country by its Chinese name', () => {
    const hits = matchMentions(all, '美國')
    expect(hits[0].name).toBe('United States of America')
    // The spelling that matched is reported, so the row explains why it is there.
    expect(hits[0].via).toBe('美國')
  })

  it('ranks a name that starts with the query above one that merely contains it', () => {
    const hits = named(matchMentions(all, 'ran'))
    expect(hits.indexOf('Iran')).toBeLessThan(hits.indexOf('France'))
  })

  it('ranks the region above the event when both match equally', () => {
    const hits = matchMentions(all, 'Taiwan')
    expect(hits[0].type).toBe('region')
  })

  // What the feed actually looks like: headlines are named after what they are
  // about, so typing a country matches a dozen of them by prefix. Ranking those
  // above the country made `@美國` answer with six articles about America and
  // no America.
  it('ranks a country above the headlines that begin with its name', () => {
    const feed = Array.from({ length: 8 }, (_, i) =>
      evt({ id: `zh-${i}`, title: `美國 headline ${i}`, title_zh: `美國新聞 ${i}` }))
    const hits = matchMentions(mentionCandidates(feed, 'zh-TW'), '美國')
    expect(hits[0].name).toBe('United States of America')
  })

  it('answers a bare @ with the head of the list', () => {
    // Pressing the key is how the feature gets found; an empty list would
    // read as though nothing can be named.
    expect(matchMentions(all, '').length).toBeGreaterThan(0)
  })

  it('is case-insensitive and bounded', () => {
    expect(named(matchMentions(all, 'tAiWaN'))).toContain('Taiwan')
    expect(matchMentions(all, 'a', 3)).toHaveLength(3)
  })

  it('returns nothing for a query that matches nothing', () => {
    expect(matchMentions(all, 'zzzznope')).toEqual([])
  })
})

describe('candidateEntity', () => {
  const actor = mentionCandidates([evt({ actors: ['Nvidia'] })], 'en').find(c => c.type === 'wiki')!

  it('carries the fetched extract into the collection', () => {
    expect(candidateEntity(actor, 'Nvidia is a chipmaker.').summary).toBe('Nvidia is a chipmaker.')
  })

  it('falls back to the name when there is no article', () => {
    // The same fallback the entity panel uses; the agent is told a name rather
    // than nothing at all.
    expect(candidateEntity(actor, null).summary).toBe('Nvidia')
  })

  it('uses the ready-made entity when there is one', () => {
    const region = mentionCandidates([], 'en').find(c => c.name === 'Japan')!
    expect(candidateEntity(region)).toBe(region.entity)
  })
})

describe('withSearchResults', () => {
  const local = mentionCandidates([evt({ id: 'e', actors: ['Nvidia'] })], 'en')
    .filter(c => c.name === 'Nvidia' || c.name === 'Japan')

  it('keeps local matches above searched ones', () => {
    const merged = withSearchResults(local, searchedCandidates(['Jane Roe']))
    expect(named(merged).slice(0, local.length)).toEqual(named(local))
    expect(merged[merged.length - 1].fromSearch).toBe(true)
  })

  it('drops a search hit the local list already covers', () => {
    // Same name means the same id means the same card; offering it twice would
    // let the operator pick the one with no data behind it.
    const merged = withSearchResults(local, searchedCandidates(['Nvidia', 'Jane Roe']))
    expect(named(merged).filter(n => n === 'Nvidia')).toHaveLength(1)
  })

  it('stops at the limit', () => {
    const many = searchedCandidates(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'])
    expect(withSearchResults(local, many, 5)).toHaveLength(5)
  })

  it('marks searched candidates as needing their summary fetched', () => {
    const [hit] = searchedCandidates(['Jane Roe'])
    expect(hit.entity).toBeNull()
    expect(hit.id).toBe(wikiContextEntity('Jane Roe').id)
  })
})

describe('Chinese coverage', () => {
  // The interface is Chinese and the data is keyed in English, so a country
  // with no alias cannot be reached by typing its name — which is the whole
  // point of the feature. This fails when a country is added without one.
  it('gives every country with data a Chinese name to be found by', () => {
    const regions = mentionCandidates([], 'zh-TW').filter(c => c.type === 'region')
    const unreachable = regions
      .filter(c => matchMentions(regions, c.via ?? '', 3).length === 0 || !c.via)
      .map(c => c.name)
    expect(unreachable).toEqual([])
  })

  it('finds each of them by that name', () => {
    const regions = mentionCandidates([], 'zh-TW').filter(c => c.type === 'region')
    const misses = regions.filter(c => matchMentions(regions, c.via!, 8)[0]?.name !== c.name)
    expect(misses.map(c => `${c.via} -> ${c.name}`)).toEqual([])
  })
})
