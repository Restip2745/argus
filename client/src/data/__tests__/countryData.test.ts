/**
 * The client no longer positions events — the server resolves and persists
 * coordinates. What is left here is recognition: deciding whether a string
 * names a place, and which country page a label should open. Getting that
 * wrong is cheaper than a misplaced marker but still visible, so the same
 * directionality rule applies.
 */
import { describe, it, expect } from 'vitest'
import { resolveCountryName, getCountryInfo } from '../countryData'

describe('resolveCountryName', () => {
  it('matches exact names and aliases', () => {
    expect(resolveCountryName('Ukraine')).toBe('Ukraine')
    expect(resolveCountryName('ukraine')).toBe('Ukraine')
    expect(resolveCountryName('United States')).toBe('United States of America')
    expect(resolveCountryName('DR Congo')).toBe('Dem. Rep. Congo')
  })

  // The previous matcher tested containment in both directions, so a label
  // could resolve to a country that merely contained its letters.
  it('never resolves a label into a longer, unrelated name', () => {
    // 'somalia'.includes('mali') — Mali used to open the Somalia page.
    expect(resolveCountryName('Mali')).not.toBe('Somalia')
    // 'south africa'.includes('africa') — a continent used to become a country.
    expect(resolveCountryName('Africa')).toBeNull()
  })

  it('respects word boundaries', () => {
    expect(resolveCountryName('Niger')).not.toBe('Nigeria')
    expect(resolveCountryName('Nigeria')).toBe('Nigeria')
  })

  it('finds a country inside a qualified label', () => {
    expect(resolveCountryName('Eastern Ukraine')).toBe('Ukraine')
    expect(resolveCountryName('Jharkhand, India')).toBe('India')
    expect(resolveCountryName('Tatarstan region, Russia')).toBe('Russia')
  })

  it('returns null for labels that name no place', () => {
    expect(resolveCountryName('')).toBeNull()
    expect(resolveCountryName('Global Tech Sector')).toBeNull()
    expect(resolveCountryName('International Football Governance')).toBeNull()
  })

  it('resolves Chinese labels', () => {
    expect(resolveCountryName('台灣')).toBe('台灣')
    expect(resolveCountryName('烏克蘭')).toBe('烏克蘭')
  })

  it('resolved names that carry a country page can be looked up', () => {
    const key = resolveCountryName('Taiwan')
    expect(key).not.toBeNull()
    expect(getCountryInfo(key!)?.code).toBe('TW')
  })
})
