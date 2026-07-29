import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { WikiPanelBody } from '../WikiPanelBody'
import { ENTITY_GLYPH } from '../../../data/entityKind'

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

describe('WikiPanelBody kind badge', () => {
  beforeEach(() => cleanup())

  it('shows PERSON for someone with an occupation', () => {
    renderWith('American politician')
    expect(screen.getByText('PERSON')).toBeTruthy()
    expect(screen.getByText(ENTITY_GLYPH.person)).toBeTruthy()
  })

  it('shows ORGANISATION for an institution', () => {
    renderWith('intergovernmental military alliance', 'NATO')
    expect(screen.getByText('ORGANISATION')).toBeTruthy()
    expect(screen.getByText(ENTITY_GLYPH.org)).toBeTruthy()
  })

  it('shows PLACE for a country', () => {
    renderWith('country in East Asia', 'Taiwan')
    expect(screen.getByText('PLACE')).toBeTruthy()
    expect(screen.getByText(ENTITY_GLYPH.place)).toBeTruthy()
  })

  it('shows the event kind for a treaty', () => {
    renderWith('peace treaty between Egypt and Israel', 'Camp David Accords')
    expect(screen.getByText('EVENT / DOCUMENT')).toBeTruthy()
    expect(screen.getByText(ENTITY_GLYPH.work)).toBeTruthy()
  })

  it('falls back to a neutral kind rather than claiming PERSON', () => {
    // The whole point: an unclassifiable entity must not be labelled a person,
    // which is what the panel used to assert unconditionally.
    renderWith(undefined, 'Something')
    expect(screen.getByText('ENTITY')).toBeTruthy()
    expect(screen.queryByText('PERSON')).toBeNull()
  })

  it("surfaces Wikipedia's own description alongside the kind", () => {
    renderWith('Palestinian militant group', 'Hamas')
    expect(screen.getByText(/Palestinian militant group/)).toBeTruthy()
  })
})
