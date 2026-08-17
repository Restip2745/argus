/**
 * The model answers "key parties involved" in whatever words fit, so the actor
 * list mixes real names with descriptions of categories. Only the former can
 * be looked up; the latter became chips that could do nothing but report
 * finding nothing.
 *
 * These fix the boundary in both directions, because the two mistakes are not
 * equal: a descriptor left in costs a chip that says "no article", while a
 * real name filtered out removes a link that worked.
 */
import { describe, it, expect } from 'vitest'
import { linkableEntityNames, isGenericDescriptor } from '../entityLinker'

describe('isGenericDescriptor', () => {
  it('recognises a category of people or firms', () => {
    for (const s of [
      'Security Officials', 'Technology Providers', 'Chinese tech firms',
      'Immigrant Students', 'Civilian Population', 'Environmental Groups',
      'Affected Communities',
      'Workers', 'Scientists', 'Migrants', 'Survivors', 'Startups',
      'Washington State Authorities', 'Lebanese families', 'Settler Groups',
    ]) {
      expect(isGenericDescriptor(s), s).toBe(true)
    }
  })

  // Each of these ends in a word that looks generic in isolation but is part
  // of a name. They are the reason those heads are absent from the list.
  it('leaves alone real names that end in a generic-looking word', () => {
    for (const s of [
      'Sudanese Armed Forces',   // forces
      'Foo Fighters',            // fighters
      'United Airlines',         // airlines
      'Ford Motor Company',      // company
      'First Nations',           // nations
      'Deutsche Bank',           // bank
    ]) {
      expect(isGenericDescriptor(s), s).toBe(false)
    }
  })

  it('leaves proper names alone', () => {
    for (const s of ['Elon Musk', 'Bombay High Court', 'SpaceX', 'Rihanna', 'Palestinians']) {
      expect(isGenericDescriptor(s), s).toBe(false)
    }
  })

  it('is case- and punctuation-insensitive on the head word', () => {
    expect(isGenericDescriptor("Students' Families")).toBe(true)
    expect(isGenericDescriptor('philippines WORKERS')).toBe(true)
    expect(isGenericDescriptor('Factory  Workers')).toBe(true)   // doubled space
  })

  it('does not choke on empty or odd input', () => {
    for (const s of ['', '   ', '...', '123']) {
      expect(() => isGenericDescriptor(s)).not.toThrow()
    }
  })
})

describe('linkableEntityNames', () => {
  it('drops descriptors while keeping the names beside them', () => {
    const actors = ['Elon Musk', 'Security Officials', 'SpaceX', 'Technology Providers']
    expect(linkableEntityNames(actors)).toEqual(['Elon Musk', 'SpaceX'])
  })

  it('still drops countries and organisations', () => {
    const actors = ['Ukraine', 'NATO', 'Ministry of Defence', 'Tarun Tejpal']
    expect(linkableEntityNames(actors)).toEqual(['Tarun Tejpal'])
  })

  it('handles a missing or empty list', () => {
    expect(linkableEntityNames([])).toEqual([])
    expect(linkableEntityNames(undefined as unknown as string[])).toEqual([])
  })
})
