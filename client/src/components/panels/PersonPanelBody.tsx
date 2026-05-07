import { useWikiSummary } from '../../hooks/useWikiSummary'
import type { SelectedPerson } from '../../store'

interface Props {
  person: SelectedPerson
  accentColor: string
  onRemove?: () => void
}

export function PersonPanelBody({ person, accentColor, onRemove }: Props) {
  const wikiTitle = person.wikiTitle ?? person.name
  const { data, loading, error } = useWikiSummary(wikiTitle)

  const extract = data?.extract
    ? (data.extract.length > 500 ? data.extract.slice(0, 500).replace(/\s+\S*$/, '') + '…' : data.extract)
    : null

  const wikiUrl = data?.content_urls?.desktop?.page

  return (
    <div style={{ padding: '10px 12px 14px', borderBottom: '1px solid rgba(0,180,255,0.07)' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
        {data?.thumbnail && (
          <img
            src={data.thumbnail.source}
            alt={person.name}
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
              {data?.title ?? person.name}
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                style={{
                  background: 'none', border: 'none', color: '#4a6070',
                  cursor: 'pointer', fontSize: '9px', padding: '1px 3px',
                }}
              >✕</button>
            )}
          </div>
          {data && (
            <div style={{ color: accentColor, fontSize: '8px', letterSpacing: '0.08em', marginTop: '2px', opacity: 0.8 }}>
              PERSON
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ color: '#2a4060', fontSize: '8px', letterSpacing: '0.08em', textAlign: 'center', padding: '12px 0' }}>
          ↻ Loading…
        </div>
      )}

      {error && (
        <div style={{ color: '#ff4d4d', fontSize: '8px', letterSpacing: '0.06em' }}>⚠ {error}</div>
      )}

      {extract && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '4px' }}>BIOGRAPHY</div>
          <p style={{ color: '#7a9ab0', fontSize: '9px', lineHeight: 1.55, margin: 0 }}>
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
            color: '#4a6fa5', fontSize: '8px', letterSpacing: '0.08em', textDecoration: 'none',
            padding: '4px 8px', borderRadius: '2px',
            background: `${accentColor}06`, border: `1px solid ${accentColor}18`,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = accentColor; e.currentTarget.style.background = `${accentColor}12` }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4a6fa5'; e.currentTarget.style.background = `${accentColor}06` }}
        >
          <span style={{ fontSize: '10px', opacity: 0.7 }}>↗</span>
          <span>Wikipedia</span>
        </a>
      )}
    </div>
  )
}
