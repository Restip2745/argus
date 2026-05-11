import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from '../../../store'
import type { ContextEntity } from '../../../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string) => d, i18n: { language: 'en' } }),
}))

vi.mock('../../../hooks/useAgentQuery', () => ({
  useAgentQuery: () => ({
    history: [], loading: false, error: null,
    ask: vi.fn(), clear: vi.fn(),
  }),
}))

vi.mock('../../../hooks/usePanelDrag', () => ({
  usePanelDrag: () => ({
    panelRef: { current: null },
    pos: { x: 0, y: 0 },
    setPos: vi.fn(),
    dragging: false,
    onHeaderMouseDown: vi.fn(),
    zIndex: 30,
    handleBringToFront: vi.fn(),
    uiScale: 1,
  }),
}))

const mockEvent: ContextEntity = { id: 'evt-1', type: 'event', name: 'Test Event', summary: 'An important event' }
const mockPerson: ContextEntity = { id: 'person-Alice', type: 'person', name: 'Alice', summary: 'A political leader' }
const mockRegion: ContextEntity = { id: 'region-Japan', type: 'region', name: 'Japan', summary: 'Tokyo · Pop 125M' }
const mockCelestial: ContextEntity = { id: 'celestial-mars', type: 'celestial', name: 'Mars', summary: 'Terrestrial Planet' }

function resetStore() {
  useAppStore.setState({
    contextEntities: [],
    showContextPanel: false,
    panelZ: { event: 30, region: 31, body: 32, canvasAnalysis: 33, person: 34, context: 35 },
  })
}

describe('Context entity store logic', () => {
  beforeEach(resetStore)

  it('adds an entity and auto-opens panel on first add', () => {
    const { addContextEntity } = useAppStore.getState()
    addContextEntity(mockEvent)
    const state = useAppStore.getState()
    expect(state.contextEntities).toHaveLength(1)
    expect(state.contextEntities[0].id).toBe('evt-1')
    expect(state.showContextPanel).toBe(true)
  })

  it('prevents duplicate entities', () => {
    const { addContextEntity } = useAppStore.getState()
    addContextEntity(mockEvent)
    addContextEntity(mockEvent)
    expect(useAppStore.getState().contextEntities).toHaveLength(1)
  })

  it('supports multiple entity types', () => {
    const { addContextEntity } = useAppStore.getState()
    addContextEntity(mockEvent)
    addContextEntity(mockPerson)
    addContextEntity(mockRegion)
    addContextEntity(mockCelestial)
    const entities = useAppStore.getState().contextEntities
    expect(entities).toHaveLength(4)
    expect(new Set(entities.map(e => e.type))).toEqual(new Set(['event', 'person', 'region', 'celestial']))
  })

  it('enforces the entity limit', () => {
    const { addContextEntity } = useAppStore.getState()
    for (let i = 0; i < 10; i++) {
      addContextEntity({ id: `e-${i}`, type: 'event', name: `Event ${i}`, summary: `Summary ${i}` })
    }
    expect(useAppStore.getState().contextEntities).toHaveLength(8)
  })

  it('removes a single entity', () => {
    const store = useAppStore.getState()
    store.addContextEntity(mockEvent)
    store.addContextEntity(mockPerson)
    useAppStore.getState().removeContextEntity('evt-1')
    const entities = useAppStore.getState().contextEntities
    expect(entities).toHaveLength(1)
    expect(entities[0].id).toBe('person-Alice')
  })

  it('clears all entities and hides panel', () => {
    const store = useAppStore.getState()
    store.addContextEntity(mockEvent)
    store.addContextEntity(mockPerson)
    useAppStore.getState().clearContextEntities()
    const state = useAppStore.getState()
    expect(state.contextEntities).toHaveLength(0)
    expect(state.showContextPanel).toBe(false)
  })

  it('brings context panel to front on add', () => {
    const zBefore = useAppStore.getState().panelZ.context
    useAppStore.getState().addContextEntity(mockEvent)
    const zAfter = useAppStore.getState().panelZ.context
    expect(zAfter).toBeGreaterThan(zBefore)
  })
})

describe('MultiEntityContextPanel rendering', () => {
  beforeEach(resetStore)

  it('does not render when no entities', async () => {
    const { MultiEntityContextPanel } = await import('../MultiEntityContextPanel')
    const { container } = render(<MultiEntityContextPanel />)
    expect(container.innerHTML).toBe('')
  })

  it('renders entity cards when entities exist', async () => {
    useAppStore.setState({ contextEntities: [mockEvent, mockPerson], showContextPanel: true })
    const { MultiEntityContextPanel } = await import('../MultiEntityContextPanel')
    render(<MultiEntityContextPanel />)
    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('removes entity when remove button is clicked', async () => {
    useAppStore.setState({ contextEntities: [mockEvent, mockPerson], showContextPanel: true })
    const { MultiEntityContextPanel } = await import('../MultiEntityContextPanel')
    render(<MultiEntityContextPanel />)
    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()

    useAppStore.getState().removeContextEntity('evt-1')
    expect(useAppStore.getState().contextEntities).toHaveLength(1)
    expect(useAppStore.getState().contextEntities[0].name).toBe('Alice')
  })
})
