import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useWikiSummary } from '../../hooks/useWikiSummary'
import { useListing } from '../../hooks/useListing'
import { useQuotes } from '../../hooks/useQuotes'
import { useAppStore } from '../../store'
import { classifyEntity } from '../../data/entityKind'
import { resolveCountryName } from '../../data/countryData'
import { quoteColor, formatChange, formatPrice, formatAsOf } from '../../utils/quote'

/**
 * Actors worth asking Wikidata about.
 *
 * Every candidate costs a Wikipedia summary, so the cheap local tests are worth
 * having: countries are the largest single group in the actor vocabulary — 59
 * "United States", 54 "Colombia", 36 "Iran" across the stored corpus — and none
 * of them will ever be a listed company.
 *
 * People are deliberately *not* filtered here, though they are the other large
 * group. `linkableEntityNames` looks like the tool for it and is not: it returns
 * the residue after removing countries, generic descriptors and names carrying
 * an organisation word, so "Nvidia" and "Lockheed Martin" both survive it,
 * having no "corp" or "ltd" about them. Nothing local separates a
 * one-word company from a one-word surname. The cost of letting people through
 * is one summary each, after which `classifyEntity` reads the description,
 * `useListing` sees a person and never touches Wikidata — and the summary cache
 * is shared with the entity panel, where these same names are looked up anyway.
 *
 * The cap is the backstop. An event with a dozen actors is a round-up, and a
 * round-up is exactly the kind of story a market row least belongs on.
 */
const MAX_CANDIDATES = 4

export function companyCandidates(actors: string[]): string[] {
  return actors
    .map((a) => a.trim())
    // Two characters cannot identify a company, and a bare initial resolves to
    // something confidently wrong more often than to nothing.
    .filter((a) => a.length >= 3)
    .filter((a) => resolveCountryName(a) === null)
    .slice(0, MAX_CANDIDATES)
}

interface RowProps {
  name:       string
  onResolved: (name: string) => void
}

/**
 * One actor, priced if it turns out to be a listed company.
 *
 * A component rather than a loop because each name needs its own hooks: a
 * summary to reach the Wikidata id, the listing lookup, then a quote. Renders
 * null the overwhelming majority of the time, and says so to its parent so the
 * section header can stay hidden until something has actually resolved.
 */
function CompanyRow({ name, onResolved }: RowProps) {
  const upColor = useAppStore((s) => s.upColor)

  const { data } = useWikiSummary(name)
  const kind = classifyEntity(data?.description, data?.title)
  const { listings } = useListing(data?.wikibase_item ?? null, kind)

  // The home listing only. An event panel is saying "this company is in the
  // story"; which of its venues a reader prefers is a question the entity panel
  // exists to answer.
  const { quotes } = useQuotes(listings.length > 0 ? [listings[0].symbol] : [])
  const quote = quotes[0]

  // Reported from an effect, not from render: the parent uses this to decide
  // whether its header exists, and telling it mid-render would be a state
  // update inside another component's render pass.
  const resolved = Boolean(quote)
  useEffect(() => { if (resolved) onResolved(name) }, [resolved, name, onResolved])

  if (!quote) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '5px',
      fontSize: '10px', lineHeight: 1.9, whiteSpace: 'nowrap',
    }}>
      <span style={{
        color: '#7a9ab0', flexShrink: 0, width: '86px',
        letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {data?.title ?? name}
      </span>

      <span style={{ color: '#c8dde8', flex: 1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {formatPrice(quote.price)}
      </span>

      <span style={{ color: '#4a6070', flexShrink: 0, width: '28px' }}>
        {quote.currency}
      </span>

      <span style={{
        color: quoteColor(quote.changePct, upColor), flexShrink: 0,
        width: '48px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
      }}>
        {formatChange(quote.changePct)}
      </span>

      <span
        title={`${listings[0]?.exchange} ${listings[0]?.ticker} · ${new Date(quote.asOf).toLocaleString()}`}
        style={{ color: '#3d5568', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
      >
        {formatAsOf(quote.asOf)}
      </span>
    </div>
  )
}

interface Props {
  actors:      string[]
  accentColor: string
}

/**
 * Listed companies named among an event's actors.
 *
 * Derived from `actors` rather than from a field of its own. The analysis pass
 * could have been asked which companies a story is about, but "which company"
 * is open vocabulary and the model already proved it cannot hold a finer
 * distinction — the commodity link's `relation` field had to be removed for
 * exactly that. The actors are extracted anyway, and running them through the
 * same deterministic Wikidata path the entity panel uses costs no model
 * accuracy at all.
 *
 * Measured on the stored corpus: of fifteen real actor names, three resolved —
 * Nvidia, Lockheed Martin, Northrop Grumman — and none resolved wrongly. "ICE"
 * is the case worth knowing about: it shares a ticker with Intercontinental
 * Exchange, and the language ladder took it to the law enforcement agency
 * instead, which has no listing. Wikidata's own gaps are the limit here, not
 * false positives — Rocket Lab and CoreWeave are public and carry no exchange
 * claim.
 */
export function EventCompanies({ actors, accentColor }: Props) {
  const { t } = useTranslation()
  const [resolved, setResolved] = useState<Set<string>>(new Set())

  const noteResolved = useCallback((name: string) => {
    setResolved((prev) => (prev.has(name) ? prev : new Set(prev).add(name)))
  }, [])

  const candidates = companyCandidates(actors)
  if (candidates.length === 0) return null

  return (
    <div style={{ marginTop: '10px', display: resolved.size > 0 ? undefined : 'none' }}>
      <div style={{
        color: '#2a4060', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '4px',
      }}>
        {t('event.companies', 'COMPANIES')}
      </div>

      <div style={{
        border: `1px solid ${accentColor}18`,
        borderRadius: '2px',
        background: `${accentColor}06`,
        padding: '4px 6px',
      }}>
        {candidates.map((name) => (
          <CompanyRow key={name} name={name} onResolved={noteResolved} />
        ))}
      </div>
    </div>
  )
}
