/**
 * RegionPanelOverview — single-country content block:
 *   flag · name · coords · gov tags · stats grid · stability bar
 *   industries · recent events (24h) · focus button · Wikipedia summary
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_COLOR } from '../../data/categoryConfig'
import type { CountryInfo } from '../../data/countryData'
import { useAppStore } from '../../store'
import type { SelectedCountry } from '../../store'
import type { ArgusEvent } from '../../types'
import { extractPersonNames } from '../../utils/entityLinker'

// ── helpers ──────────────────────────────────────────────────────────────────

const TAG_COLOR: Record<string, string> = {
  'ACTIVE CONFLICT':       '#ff4d4d',
  'CRITICAL ALERT':        '#ff6b35',
  'ECONOMIC STRESS':       '#ffd700',
  'DEMOCRACY':             '#39ff8a',
  'AUTHORITARIAN':         '#ff9c2a',
  'MILITARY JUNTA':        '#ff4d4d',
  'TOTALITARIAN':          '#ff4d4d',
  'COMMUNIST':             '#ff4d4d',
  'SINGLE-PARTY STATE':    '#ff6b35',
  'HYBRID REGIME':         '#ff9c2a',
  'THEOCRACY':             '#ff9c2a',
  'FRAGILE STATE':         '#ff9c2a',
  'HIGH TENSION':          '#ff9c2a',
  'OCCUPIED TERRITORY':    '#ff4d4d',
  'POST-CONFLICT':         '#ffd700',
  'TRANSITIONAL':          '#ffd700',
  'PARTIAL RECOGNITION':   '#c8cdd2',
  'DIVIDED GOVERNMENT':    '#ff9c2a',
  'REPUBLIC':              '#4a6fa5',
  'FEDERAL':               '#4a6fa5',
  'FEDERAL REPUBLIC':      '#4a6fa5',
  'CONSTITUTIONAL MONARCHY':'#4a6fa5',
  'ABSOLUTE MONARCHY':     '#c8a030',
}
function tagColor(tag: string): string { return TAG_COLOR[tag] ?? '#4a6070' }

function formatGdp(gdpB: number): string {
  if (gdpB >= 1000) return `$${(gdpB / 1000).toFixed(1)}T`
  return `$${Math.round(gdpB)}B`
}
function formatPop(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}B`
  return `${m.toFixed(1)}M`
}

const BAR_COLORS = ['#00d4ff', '#4a6fa5', '#9b6dff', '#ff9c2a', '#39ff8a']

function IndustryBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ color: '#6a8090', fontSize: '8px', letterSpacing: '0.08em' }}>{label.toUpperCase()}</span>
        <span style={{ color: '#4a6fa5', fontSize: '8px' }}>{pct}%</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(0,180,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ── Key Figures section ───────────────────────────────────────────────────────

function RegionKeyFigures({ recentEvents, addSelectedPerson }: {
  recentEvents: ArgusEvent[]
  addSelectedPerson: (p: import('../../store').SelectedPerson) => void
}) {
  const persons = useMemo(() => {
    const counts = new Map<string, number>()
    for (const ev of recentEvents) {
      for (const name of extractPersonNames(ev.actors ?? [])) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [recentEvents])

  if (persons.length === 0) return null

  return (
    <div style={{ borderTop: '1px solid rgba(0,180,255,0.07)', padding: '8px 12px 6px' }}>
      <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '5px' }}>KEY FIGURES</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {persons.map(([name, count]) => (
          <button
            key={name}
            onClick={() => addSelectedPerson({ name, wikiTitle: name })}
            title={`View person: ${name}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              background: '#c084fc08', border: '1px solid #c084fc22',
              borderRadius: '2px', color: '#c084fccc', fontSize: '8px',
              padding: '2px 6px', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#c084fc18'; e.currentTarget.style.color = '#c084fc' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#c084fc08'; e.currentTarget.style.color = '#c084fccc' }}
          >
            👤 {name}
            {count > 1 && <span style={{ opacity: 0.6, fontSize: '7px' }}>×{count}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  country: SelectedCountry
  info: CountryInfo | null
  allTags: string[]
  recentEvents: ArgusEvent[]
  focusOnEarthSurface: ((lat: number, lng: number) => void) | null | undefined
  // Wikipedia
  wikiData: {
    extract: string
    thumbnail?: { source: string }
    content_urls?: { desktop?: { page?: string } }
  } | null
  wikiLoading: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegionPanelOverview({
  country, info, allTags, recentEvents, focusOnEarthSurface,
  wikiData, wikiLoading,
}: Props) {
  const { t } = useTranslation()
  const addSelectedPerson = useAppStore(s => s.addSelectedPerson)

  const stabilityColor = !info ? '#4a6070'
    : info.stability >= 70 ? '#39ff8a'
    : info.stability >= 45 ? '#ff9c2a' : '#ff4d4d'

  const gdpPerCapita = info && info.populationM > 0
    ? `$${Math.round((info.gdpB * 1e9) / (info.populationM * 1e6) / 1000)}k`
    : '—'

  return (
    <>
      {/* ── Flag + Name ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
          {info && (
            <img
              src={`https://flagcdn.com/40x30/${info.code.toLowerCase()}.png`}
              srcSet={`https://flagcdn.com/80x60/${info.code.toLowerCase()}.png 2x`}
              width="40" height="30"
              alt={country.name}
              style={{ flexShrink: 0, borderRadius: '2px', objectFit: 'cover', border: '1px solid rgba(0,180,255,0.12)' }}
            />
          )}
          <div>
            <div style={{ color: '#c8dde8', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em' }}>
              {country.name.toUpperCase()}
            </div>
            {info && (
              <div style={{ color: '#4a6070', fontSize: '8px', letterSpacing: '0.1em', marginTop: '2px' }}>
                ⊙ {info.capital}
              </div>
            )}
            <div style={{ color: '#2a4060', fontSize: '8px', letterSpacing: '0.1em', marginTop: '1px' }}>
              {country.lat.toFixed(2)}° {country.lat >= 0 ? 'N' : 'S'} &nbsp;
              {Math.abs(country.lng).toFixed(2)}° {country.lng >= 0 ? 'E' : 'W'}
            </div>
          </div>
        </div>

        {/* Gov type + dynamic tags */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {allTags.map(tag => (
              <span key={tag} style={{
                fontSize: '7px', letterSpacing: '0.1em', padding: '2px 5px',
                border: `1px solid ${tagColor(tag)}40`,
                background: `${tagColor(tag)}12`,
                color: tagColor(tag), borderRadius: '2px',
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Stats grid */}
        {info && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '1px', background: 'rgba(0,180,255,0.06)',
            border: '1px solid rgba(0,180,255,0.08)', borderRadius: '3px',
            marginBottom: '10px', overflow: 'hidden',
          }}>
            {[
              { label: 'POPULATION', val: formatPop(info.populationM) },
              { label: 'GDP',        val: formatGdp(info.gdpB) },
              { label: 'GDP/CAPITA', val: gdpPerCapita },
              { label: 'STABILITY',  val: `${info.stability}/100` },
            ].map(({ label, val }) => (
              <div key={label} style={{ padding: '5px 8px', background: 'rgba(4,9,22,0.6)' }}>
                <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.1em', marginBottom: '2px' }}>{label}</div>
                <div style={{ color: '#a8c4d8', fontSize: '10px', fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stability bar */}
        {info && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.1em' }}>STABILITY INDEX</span>
              <span style={{ color: '#4a6fa5', fontSize: '7px' }}>{info.stability}/100</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(0,180,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${info.stability}%`, height: '100%', borderRadius: '2px',
                background: stabilityColor, transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Industries ──────────────────────────────────────────────────────── */}
      {info && info.industries.length > 0 && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid rgba(0,180,255,0.07)', paddingTop: '8px' }}>
          <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '6px' }}>ECONOMIC STRUCTURE</div>
          {info.industries.map((ind, i) => (
            <IndustryBar key={ind.label} label={ind.label} pct={ind.pct} color={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </div>
      )}

      {/* ── Recent Events (24h) ─────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(0,180,255,0.07)', padding: '8px 12px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em' }}>RECENT EVENTS (24H)</span>
          {recentEvents.length > 0 && (
            <span style={{
              color: '#ff9c2a', fontSize: '8px',
              background: 'rgba(255,156,42,0.12)', padding: '1px 5px',
              borderRadius: '2px', border: '1px solid rgba(255,156,42,0.3)',
            }}>
              {recentEvents.length}
            </span>
          )}
        </div>
        {recentEvents.length === 0 ? (
          <div style={{ color: '#2a4060', fontSize: '8px', letterSpacing: '0.08em', padding: '4px 0' }}>— 無近期事件 —</div>
        ) : (
          recentEvents.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '5px' }}>
              <span style={{
                flexShrink: 0, fontSize: '6px', letterSpacing: '0.08em', padding: '2px 4px', marginTop: '1px',
                border: `1px solid ${(CATEGORY_COLOR[e.category] ?? '#4a6070')}40`,
                background: `${(CATEGORY_COLOR[e.category] ?? '#4a6070')}12`,
                color: CATEGORY_COLOR[e.category] ?? '#4a6070', borderRadius: '2px',
              }}>
                {e.category.replace(/_/g, ' ').slice(0, 8)}
              </span>
              <span style={{ color: '#6a8090', fontSize: '8px', lineHeight: 1.4 }}>
                {(e.title_zh || e.title).slice(0, 40)}{(e.title_zh || e.title).length > 40 ? '…' : ''}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Key Figures ──────────────────────────────────────────────────────── */}
      <RegionKeyFigures recentEvents={recentEvents} addSelectedPerson={addSelectedPerson} />

      {/* ── Focus button ────────────────────────────────────────────────────── */}
      {focusOnEarthSurface && (
        <div style={{ padding: '0 12px 10px' }}>
          <button
            onClick={() => focusOnEarthSurface(country.lat, country.lng)}
            style={{
              width: '100%', padding: '5px', background: 'rgba(0,212,255,0.04)',
              border: '1px solid rgba(0,212,255,0.15)', borderRadius: '3px',
              color: '#2a5070', fontSize: '8px', letterSpacing: '0.12em',
              cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#00d4ff'; (e.target as HTMLElement).style.borderColor = 'rgba(0,212,255,0.3)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#2a5070'; (e.target as HTMLElement).style.borderColor = 'rgba(0,212,255,0.15)' }}
          >
            ⊙ {t('panel.focus_region', 'FOCUS REGION')}
          </button>
        </div>
      )}

      {/* ── Wikipedia Summary ───────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(0,180,255,0.07)', padding: '8px 12px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em' }}>WIKIPEDIA</span>
          {wikiData?.content_urls?.desktop?.page && (
            <a
              href={wikiData.content_urls.desktop.page}
              target="_blank" rel="noreferrer"
              style={{ color: '#4a6fa5', fontSize: '7px', letterSpacing: '0.08em', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00d4ff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a6fa5')}
            >
              ↗ Read more
            </a>
          )}
        </div>
        {wikiLoading && (
          <div style={{ color: '#2a4060', fontSize: '8px', letterSpacing: '0.08em' }}>↻ Loading…</div>
        )}
        {wikiData && !wikiLoading && (() => {
          const extract = wikiData.extract.length > 300
            ? wikiData.extract.slice(0, 300).replace(/\s+\S*$/, '') + '…'
            : wikiData.extract
          return (
            <>
              {wikiData.thumbnail && (
                <img
                  src={wikiData.thumbnail.source}
                  alt={country.name}
                  style={{
                    width: '100%', maxHeight: '80px', objectFit: 'cover',
                    borderRadius: '3px', marginBottom: '5px',
                    border: '1px solid rgba(0,180,255,0.1)',
                  }}
                />
              )}
              <p style={{ color: '#7a9ab0', fontSize: '9px', lineHeight: 1.55, margin: 0 }}>
                {extract}
              </p>
            </>
          )
        })()}
      </div>
    </>
  )
}
