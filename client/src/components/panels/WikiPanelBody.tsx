import { useTranslation } from 'react-i18next'
import { useWikiSummary } from '../../hooks/useWikiSummary'
import { useListing } from '../../hooks/useListing'
import { ListingChip } from './ListingChip'
import { classifyEntity, ENTITY_GLYPH, ENTITY_KIND_LABEL } from '../../data/entityKind'
import type { SelectedEntity } from '../../store'

interface Props {
  entity: SelectedEntity
  accentColor: string
  onRemove?: () => void
}

export function WikiPanelBody({ entity, accentColor, onRemove }: Props) {
  const { t } = useTranslation()
  const wikiTitle = entity.wikiTitle ?? entity.name
  const { data, loading, error } = useWikiSummary(wikiTitle)

  const extract = data?.extract
    ? (data.extract.length > 500 ? data.extract.slice(0, 500).replace(/\s+\S*$/, '') + '…' : data.extract)
    : null

  const wikiUrl = data?.content_urls?.desktop?.page

  // What kind of thing this is, derived from Wikidata's short description.
  // The panel used to assert PERSON regardless; entities pulled out of news
  // copy are just as often organisations, places or events.
  const kind = classifyEntity(data?.description)

  // Listed companies get their closing prices. The lookup answers "none" for
  // almost every entity that reaches this panel, and the section simply does
  // not render — no placeholder, no empty state.
  const { listings } = useListing(data?.wikibase_item ?? null, kind)

  return (
    <div style={{ padding: '10px 12px 14px', borderBottom: '1px solid rgba(0,180,255,0.07)' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
        {data?.thumbnail && (
          <img
            src={data.thumbnail.source}
            alt={entity.name}
            style={{
              width: '52px', height: '52px', objectFit: 'cover',
              borderRadius: '4px', flexShrink: 0,
              border: `1px solid ${accentColor}30`,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#c8dde8', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>
              {data?.title ?? entity.name}
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                style={{
                  background: 'none', border: 'none', color: '#4a6070',
                  cursor: 'pointer', fontSize: '11px', padding: '1px 3px',
                }}
              >✕</button>
            )}
          </div>
          {data && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginTop: '2px', minWidth: 0 }}>
              <span style={{ fontSize: '10px' }}>{ENTITY_GLYPH[kind]}</span>
              <span style={{
                color: accentColor, fontSize: '10px', letterSpacing: '0.08em',
                opacity: 0.8, flexShrink: 0,
              }}>
                {t(`wiki.kind.${kind}`, ENTITY_KIND_LABEL[kind])}
              </span>
              {/* Wikipedia's own one-liner says more than any label we invent */}
              {data.description && (
                <span style={{
                  color: '#5d7c92', fontSize: '10px', minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  · {data.description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ color: '#2a4060', fontSize: '10px', letterSpacing: '0.08em', textAlign: 'center', padding: '12px 0' }}>
          {t('wiki.loading', '↻ Loading…')}
        </div>
      )}

      {/* "No article" is the expected outcome for a good share of these names —
          the model names participants, and "Security Officials" is a fair
          answer that no encyclopedia covers. Showing that in alarm red beside
          a raw HTTP status framed a normal result as a malfunction. A genuine
          failure (network, throttling) still gets the warning treatment. */}
      {error === 'NO_ARTICLE' ? (
        <div style={{ color: '#4a6070', fontSize: '10px', letterSpacing: '0.06em' }}>
          {t('wiki.noArticle', 'No Wikipedia article for this name')}
        </div>
      ) : error ? (
        <div style={{ color: '#ff4d4d', fontSize: '10px', letterSpacing: '0.06em' }}>⚠ {error}</div>
      ) : null}

      {listings.length > 0 && <ListingChip listings={listings} accentColor={accentColor} />}

      {extract && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ color: '#2a4060', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '4px' }}>{t('wiki.summary', 'SUMMARY')}</div>
          <p style={{ color: '#7a9ab0', fontSize: '11px', lineHeight: 1.55, margin: 0 }}>
            {extract}
          </p>
        </div>
      )}

      {wikiUrl && (
        <a
          href={wikiUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            color: '#4a6fa5', fontSize: '10px', letterSpacing: '0.08em', textDecoration: 'none',
            padding: '4px 8px', borderRadius: '2px',
            background: `${accentColor}06`, border: `1px solid ${accentColor}18`,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = accentColor; e.currentTarget.style.background = `${accentColor}12` }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4a6fa5'; e.currentTarget.style.background = `${accentColor}06` }}
        >
          <span style={{ fontSize: '10px', opacity: 0.7 }}>↗</span>
          <span>{t('wiki.link', 'Wikipedia')}</span>
        </a>
      )}
    </div>
  )
}
