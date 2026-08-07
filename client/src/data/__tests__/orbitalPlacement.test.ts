/**
 * Every off-Earth event used to be invisible: the marker layer looked up
 * `event.body` in a map keyed by lowercase ids, while the model writes prose
 * ("Moon", "Saturn's B Ring"), so the lookup missed and the renderer returned
 * null for all 35 of them.
 *
 * These pin the resolution rules, including the precedence, which is the part
 * that is easy to get subtly wrong.
 */
import { describe, it, expect } from 'vitest'
import { resolveOrbitalPlacement } from '../orbitalPlacement'

const place = (body: string | null, label: string | null) => resolveOrbitalPlacement(body, label)

describe('resolveOrbitalPlacement', () => {
  it('matches a body name whatever its casing', () => {
    expect(place('Moon', null)).toEqual({ kind: 'body', body: 'moon' })
    expect(place('MARS', null)).toEqual({ kind: 'body', body: 'mars' })
    expect(place('sun', null)).toEqual({ kind: 'body', body: 'sun' })
  })

  it('finds the body inside a longer phrase', () => {
    expect(place("Saturn's B Ring", null)).toEqual({ kind: 'body', body: 'saturn' })
    expect(place(null, 'Mars System')).toEqual({ kind: 'body', body: 'mars' })
    expect(place(null, 'The Moon')).toEqual({ kind: 'body', body: 'moon' })
  })

  it('reads the label when body is absent, which is the common case', () => {
    // 15 of 35 orbital events carry a body; the label names a place on more.
    expect(place(null, 'Moon')).toEqual({ kind: 'body', body: 'moon' })
    expect(place('', 'Low Earth Orbit')).toEqual({ kind: 'earthOrbit' })
  })

  // The precedence that matters: mentioning Earth to say which orbit you are
  // in must not pin the event to Earth's surface among the ground events.
  it('treats Earth-orbit phrasing as orbit, not as the planet', () => {
    for (const l of [
      'Low Earth Orbit', 'Near Earth Orbit', 'Earth Orbit', 'Earth Orbit / Space',
      'Near Earth Space', 'Non-Geostationary Orbit (NGSO)', 'International Space Station',
    ]) {
      expect(place(null, l), l).toEqual({ kind: 'earthOrbit' })
    }
  })

  it('still places an event that is genuinely about the planet', () => {
    expect(place('Earth', null)).toEqual({ kind: 'body', body: 'earth' })
  })

  it('keeps another body ahead of orbit wording', () => {
    // "Lunar orbit" is the Moon, not Earth orbit, even though "orbit" appears.
    expect(place(null, 'Lunar orbit')).toEqual({ kind: 'body', body: 'moon' })
    expect(place(null, 'Mars orbit')).toEqual({ kind: 'body', body: 'mars' })
  })

  it('sends things outside the solar system to deep space', () => {
    expect(place('Helix Nebula', null)).toEqual({ kind: 'deepSpace' })
    expect(place(null, 'Deep Space')).toEqual({ kind: 'deepSpace' })
    expect(place(null, 'interstellar object survey')).toEqual({ kind: 'deepSpace' })
  })

  it('places nothing when neither field names a location', () => {
    // These keep their feed entry; there is simply nowhere to put a marker.
    for (const [b, l] of [
      [null, 'Space Industry'],
      [null, 'New Glenn Rocket / BE-4 Engine'],
      [null, 'European Space Domain'],
      [null, 'Roman Space Telescope'],
      [null, null], ['', ''],
    ] as Array<[string | null, string | null]>) {
      expect(place(b, l), String(l)).toBeNull()
    }
  })

  it('does not match a body name buried inside another word', () => {
    // "Io" inside "station", "Mars" inside "marshalling".
    expect(place(null, 'marshalling yard')).toBeNull()
    expect(place(null, 'Space Industry')).toBeNull()
  })

  it('resolves aliases the newswire uses', () => {
    expect(place(null, 'cislunar space')).toEqual({ kind: 'body', body: 'moon' })
    expect(place(null, 'the Red Planet')).toEqual({ kind: 'body', body: 'mars' })
  })
})
