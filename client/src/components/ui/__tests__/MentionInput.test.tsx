import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MentionInput, activeMention } from '../MentionInput'
import type { MentionCandidate } from '../../../lib/mentionCandidates'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

const CANDIDATES: MentionCandidate[] = [
  { id: 'region-United States of America', type: 'region', name: 'United States of America',
    entity: { id: 'region-United States of America', type: 'region', name: 'United States of America', summary: 'Washington D.C.' } },
  { id: 'wiki-Donald Trump', type: 'wiki', name: 'Donald Trump', entity: null },
  { id: 'region-Ukraine', type: 'region', name: 'Ukraine',
    entity: { id: 'region-Ukraine', type: 'region', name: 'Ukraine', summary: 'Kyiv' } },
]

function Harness(props: Partial<React.ComponentProps<typeof MentionInput>> = {}) {
  const [value, setValue] = useState('')
  return (
    <MentionInput
      value={value}
      onChange={setValue}
      onSubmit={() => {}}
      candidates={CANDIDATES}
      collected={new Set()}
      onPick={() => {}}
      placeholder="ask"
      accentColor="#00ffcc"
      {...props}
    />
  )
}

describe('activeMention', () => {
  it('reads the token being typed', () => {
    expect(activeMention('@Ukr', 4)).toEqual({ start: 0, query: 'Ukr' })
    expect(activeMention('compare @Ukr', 12)).toEqual({ start: 8, query: 'Ukr' })
  })

  it('is not started by the @ in an address', () => {
    expect(activeMention('mail@example', 12)).toBeNull()
    expect(activeMention('a.b+c@example', 13)).toBeNull()
  })

  // Chinese is written without spaces between words, so requiring whitespace
  // before the @ would shut the list out of the language the interface is in.
  it('starts after a Chinese word or a punctuation mark', () => {
    expect(activeMention('比較美國和@川普', 8)).toEqual({ start: 5, query: '川普' })
    expect(activeMention('扮演什麼角色？@烏克蘭', 11)).toEqual({ start: 7, query: '烏克蘭' })
  })

  it('closes once the name is finished with a space', () => {
    expect(activeMention('@Ukraine and', 12)).toBeNull()
  })

  it('is null when there is no @ before the caret', () => {
    expect(activeMention('compare', 7)).toBeNull()
    // The caret is behind the token: the operator has moved on.
    expect(activeMention('@Ukr', 0)).toBeNull()
  })
})

describe('MentionInput', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers matches once @ is typed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByPlaceholderText('ask'), '@Ukr')
    expect(screen.getByRole('option', { name: /Ukraine/ })).toBeInTheDocument()
  })

  it('picks with Enter and writes the name into the question', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<Harness onPick={onPick} />)
    const input = screen.getByPlaceholderText('ask')

    await user.type(input, 'compare @Ukr')
    await user.keyboard('{Enter}')

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ukraine' }))
    // The sentence still has to read like one, so the token becomes the name.
    expect(input).toHaveValue('compare Ukraine ')
  })

  it('does not send the question while the list is open', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSubmit={onSubmit} />)

    await user.type(screen.getByPlaceholderText('ask'), '@Ukr')
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()

    // Closed again: Enter means send.
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('moves through the list with the arrow keys', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<Harness onPick={onPick} />)

    await user.type(screen.getByPlaceholderText('ask'), '@')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: CANDIDATES[1].name }))
  })

  it('closes on Escape without picking', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<Harness onPick={onPick} />)
    const input = screen.getByPlaceholderText('ask')

    await user.type(input, '@Ukr')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()
  })

  it('refuses to pick something already collected', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<Harness onPick={onPick} collected={new Set(['region-Ukraine'])} />)

    await user.type(screen.getByPlaceholderText('ask'), '@Ukr')
    await user.keyboard('{Enter}')
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByText('Already in context')).toBeInTheDocument()
  })

  it('says why nothing can be added when the collection is full', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<Harness onPick={onPick} full />)

    await user.type(screen.getByPlaceholderText('ask'), '@Ukr')
    expect(screen.getByText('ENTITY LIMIT REACHED')).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(onPick).not.toHaveBeenCalled()
  })
})
