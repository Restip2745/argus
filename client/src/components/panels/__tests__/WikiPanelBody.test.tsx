import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { WikiPanelBody } from '../WikiPanelBody'
import { ENTITY_ICON_SRC } from '../../../data/entityKind'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, d?: unknown) => (typeof d === 'string' ? d : k),
    i18n: { language: 'en' },
  }),
}))

const summary = vi.hoisted(() => ({ value: null as unknown }))

vi.mock('../../../hooks/useWikiSummary', () => ({
  useWikiSummary: () => ({ data: summary.value, loading: false, error: null }),
}))

function renderWith(description: string | undefined, title = 'Subject') {
  summary.value = { title, description, extract: 'Some extract.', content_urls: undefined }
  return render(<WikiPanelBody entity={{ name: title }} accentColor="#c084fc" />)
}

/** The kind mark is artwork, so it is found by its source, not by its text. */
function markSrc(container: HTMLElement): string | null {
  return container.querySelector('img[src^="/icons/entity/"]')?.getAttribute('src') ?? null
}

describe('WikiPanelBody kind badge', () => {
  beforeEach(() => cleanup())

  it('shows PERSON for someone with an occupation', () => {
    const { container } = renderWith('American politician')
    expect(screen.getByText('PERSON')).toBeTruthy()
    expect(markSrc(container)).toBe(ENTITY_ICON_SRC.person)
  })

  it('shows ORGANISATION for an institution', () => {
    const { container } = renderWith('intergovernmental military alliance', 'NATO')
    expect(screen.getByText('ORGANISATION')).toBeTruthy()
    expect(markSrc(container)).toBe(ENTITY_ICON_SRC.org)
  })

  it('shows PLACE for a country', () => {
    const { container } = renderWith('country in East Asia', 'Taiwan')
    expect(screen.getByText('PLACE')).toBeTruthy()
    expect(markSrc(container)).toBe(ENTITY_ICON_SRC.place)
  })

  it('shows the event kind for a treaty', () => {
    const { container } = renderWith('peace treaty between Egypt and Israel', 'Camp David Accords')
    expect(screen.getByText('EVENT / DOCUMENT')).toBeTruthy()
    expect(markSrc(container)).toBe(ENTITY_ICON_SRC.work)
  })

  it('falls back to a neutral kind rather than claiming PERSON', () => {
    // The whole point: an unclassifiable entity must not be labelled a person,
    // which is what the panel used to assert unconditionally.
    const { container } = renderWith(undefined, 'Something')
    expect(screen.getByText('ENTITY')).toBeTruthy()
    expect(screen.queryByText('PERSON')).toBeNull()
    // Its own mark, not a person's — the bug this whole badge exists to fix.
    expect(markSrc(container)).toBe(ENTITY_ICON_SRC.unknown)
  })

  it("surfaces Wikipedia's own description alongside the kind", () => {
    renderWith('Palestinian militant group', 'Hamas')
    expect(screen.getByText(/Palestinian militant group/)).toBeTruthy()
  })
})
