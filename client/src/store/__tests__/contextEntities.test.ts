/**
 * The context basket had a trap: the panel opened only when the collection had
 * been empty, so closing it stranded whatever was already collected — the
 * per-panel add buttons disable themselves once an entity is in, leaving no
 * route back until a page reload. These lock the escape routes open.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '../index'
import type { ContextEntity } from '../../types'

const ent = (id: string): ContextEntity => ({
  id, type: 'wiki', name: `Entity ${id}`, summary: `About ${id}`,
})

const reset = () => {
  localStorage.clear()
  useAppStore.setState({ contextEntities: [], showContextPanel: false })
}

describe('context entity collection', () => {
  beforeEach(reset)

  it('opens the panel on the first add', () => {
    useAppStore.getState().addContextEntity(ent('a'))
    expect(useAppStore.getState().showContextPanel).toBe(true)
    expect(useAppStore.getState().contextEntities).toHaveLength(1)
  })

  // The regression itself.
  it('reopens the panel when adding after it was closed', () => {
    const s = () => useAppStore.getState()
    s().addContextEntity(ent('a'))
    s().setShowContextPanel(false)
    expect(s().showContextPanel).toBe(false)

    s().addContextEntity(ent('b'))
    expect(s().showContextPanel).toBe(true)
    expect(s().contextEntities).toHaveLength(2)
  })

  it('ignores duplicates and respects the limit without opening spuriously', () => {
    const s = () => useAppStore.getState()
    s().addContextEntity(ent('a'))
    s().addContextEntity(ent('a'))
    expect(s().contextEntities).toHaveLength(1)

    for (let i = 0; i < 20; i++) s().addContextEntity(ent(`e${i}`))
    expect(s().contextEntities.length).toBeLessThanOrEqual(8)
  })

  it('clearing empties the collection and closes the panel', () => {
    const s = () => useAppStore.getState()
    s().addContextEntity(ent('a'))
    s().clearContextEntities()
    expect(s().contextEntities).toEqual([])
    expect(s().showContextPanel).toBe(false)
  })
})

describe('context entity persistence', () => {
  beforeEach(reset)

  it('writes the collection to storage on add, remove and clear', () => {
    const stored = () => JSON.parse(localStorage.getItem('argus-context-entities') ?? '[]')
    const s = () => useAppStore.getState()

    s().addContextEntity(ent('a'))
    s().addContextEntity(ent('b'))
    expect(stored().map((e: ContextEntity) => e.id)).toEqual(['a', 'b'])

    s().removeContextEntity('a')
    expect(stored().map((e: ContextEntity) => e.id)).toEqual(['b'])

    s().clearContextEntities()
    expect(stored()).toEqual([])
  })

  // Exercises the real initial-state path by re-importing the store with the
  // value already in storage, rather than re-implementing the filter here.
  it('restores a stored collection on load', async () => {
    localStorage.setItem('argus-context-entities', JSON.stringify([ent('a'), ent('b')]))
    vi.resetModules()
    const { useAppStore: fresh } = await import('../index')
    expect(fresh.getState().contextEntities.map(e => e.id)).toEqual(['a', 'b'])
    // Restoring the collection must not force the panel open on every load.
    expect(fresh.getState().showContextPanel).toBe(false)
  })

  it.each([
    ['malformed JSON',        'not json'],
    ['a non-array',           '{"not":"an array"}'],
    ['rows of the wrong shape', '[null, 42, "x", {"no":"id"}]'],
  ])('starts empty rather than breaking the panel on %s', async (_label, bad) => {
    // Storage outlives the code that wrote it and the user can edit it.
    localStorage.setItem('argus-context-entities', bad)
    vi.resetModules()
    const { useAppStore: fresh } = await import('../index')
    expect(fresh.getState().contextEntities).toEqual([])
  })

  it('keeps the well-formed rows out of a partially corrupt list', async () => {
    localStorage.setItem('argus-context-entities',
      JSON.stringify([null, 42, ent('good'), { no: 'id' }]))
    vi.resetModules()
    const { useAppStore: fresh } = await import('../index')
    expect(fresh.getState().contextEntities.map(e => e.id)).toEqual(['good'])
  })
})
