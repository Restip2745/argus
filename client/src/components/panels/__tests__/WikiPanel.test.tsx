import { describe, it, expect } from 'vitest'
import { linkableEntityNames, LinkedText } from '../../../utils/entityLinker'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

describe('linkableEntityNames', () => {
  it('returns lookup-worthy names, filtering out organizations', () => {
    const actors = [
      'Joe Biden',
      'United States Government',
      'NATO',
      'Xi Jinping',
      'EU',
      'Ministry of Defense',
      'Angela Merkel',
    ]
    const result = linkableEntityNames(actors)
    expect(result).toContain('Joe Biden')
    expect(result).toContain('Xi Jinping')
    expect(result).toContain('Angela Merkel')
    expect(result).not.toContain('NATO')
    expect(result).not.toContain('EU')
    expect(result).not.toContain('United States Government')
    expect(result).not.toContain('Ministry of Defense')
  })

  it('returns empty array for empty input', () => {
    expect(linkableEntityNames([])).toEqual([])
  })

  it('filters out short names', () => {
    expect(linkableEntityNames(['AB', 'X'])).toEqual([])
  })
})

describe('LinkedText', () => {
  it('renders plain text when no persons match', () => {
    const { container } = render(
      <LinkedText text="Hello world" knownEntities={[]} onEntityClick={() => {}} />
    )
    expect(container.textContent).toBe('Hello world')
  })

  it('renders person names as buttons', () => {
    render(
      <LinkedText
        text="Meeting with Joe Biden in Washington"
        knownEntities={['Joe Biden']}
        onEntityClick={() => {}}
      />
    )
    const btn = screen.getByRole('button', { name: /Joe Biden/i })
    expect(btn).toBeInTheDocument()
  })

  it('calls onEntityClick with correct data when clicked', () => {
    const onClick = vi.fn()
    render(
      <LinkedText
        text="Report by Angela Merkel"
        knownEntities={['Angela Merkel']}
        onEntityClick={onClick}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Angela Merkel/i }))
    expect(onClick).toHaveBeenCalledWith({ name: 'Angela Merkel', wikiTitle: 'Angela Merkel' })
  })

  it('handles multiple persons in the same text', () => {
    render(
      <LinkedText
        text="Biden met with Xi Jinping"
        knownEntities={['Biden', 'Xi Jinping']}
        onEntityClick={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /Biden/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xi Jinping/i })).toBeInTheDocument()
  })

  it('is case-insensitive when matching', () => {
    render(
      <LinkedText
        text="Statement from joe biden"
        knownEntities={['Joe Biden']}
        onEntityClick={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /joe biden/i })).toBeInTheDocument()
  })
})
