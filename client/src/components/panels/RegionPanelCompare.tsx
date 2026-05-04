import { useMemo } from 'react'
import { useAppStore } from '../../store'
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_LABEL } from '../../data/categoryConfig'
import { getCountryInfo } from '../../data/countryData'
import type { ArgusEvent } from '../../types'
import type { SelectedCountry } from '../../store'

// ── Formatting helpers (exported for use in RegionPanel agentContext) ─────────

export function formatGdp(gdpB: number): string {
  if (gdpB >= 1000) return `$${(gdpB / 1000).toFixed(1)}T`
  return `$${Math.round(gdpB)}B`
}

export function formatPop(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}B`
  return `${m.toFixed(1)}M`
}

// ── Color palette for compare cards ──────────────────────────────────────────

export const COMPARE_PALETTE = ['#00ffcc', '#ff9c2a', '#9b6dff', '#39ff8a', '#ff4d4d', '#00d4ff']

// ── Internal helpers ──────────────────────────────────────────────────────────

const TAG_COLOR: Record<string, string> = {
  'ACTIVE CONFLICT':        '#ff4d4d',
  'CRITICAL ALERT':         '#ff6b35',
  'ECONOMIC STRESS':        '#ffd700',
  'DEMOCRACY':              '#39ff8a',
  'AUTHORITARIAN':          '#ff9c2a',
  'MILITARY JUNTA':         '#ff4d4d',
  'TOTALITARIAN':           '#ff4d4d',
  'COMMUNIST':              '#ff4d4d',
  'SINGLE-PARTY STATE':     '#ff6b35',
  'HYBRID REGIME':          '#ff9c2a',
  'THEOCRACY':              '#ff9c2a',
  'FRAGILE STATE':          '#ff9c2a',
  'HIGH TENSION':           '#ff9c2a',
  'OCCUPIED TERRITORY':     '#ff4d4d',
  'POST-CONFLICT':          '#ffd700',
  'TRANSITIONAL':           '#ffd700',
  'PARTIAL RECOGNITION':    '#c8cdd2',
  'DIVIDED GOVERNMENT':     '#ff9c2a',
  'REPUBLIC':               '#4a6fa5',
  'FEDERAL':                '#4a6fa5',
  'FEDERAL REPUBLIC':       '#4a6fa5',
  'CONSTITUTIONAL MONARCHY':'#4a6fa5',
  'ABSOLUTE MONARCHY':      '#c8a030',
}

function tagColor(tag: string): string { return TAG_COLOR[tag] ?? '#4a6070' }

const BAR_COLORS = ['#00d4ff', '#4a6fa5', '#9b6dff', '#ff9c2a', '#39ff8a']

function compareMatchesCountry(e: ArgusEvent, countryName: string): boolean {
  const loc   = (e.location_label ?? '').toLowerCase()
  const cname = countryName.toLowerCase()
  return loc.includes(cname) || cname.includes(loc.replace(/[()]/g, '').trim())
}

// ── CompareCard ───────────────────────────────────────────────────────────────

export function CompareCard({
  country, color, onRemove,
}: {
  country: SelectedCountry
  color: string
  onRemove: () => void
}) {
  const events = useAppStore((s) => s.events)
  const info = getCountryInfo(country.name)
  const gdpPerCapita = info && info.populationM > 0
    ? Math.round((info.gdpB * 1e9) / (info.populationM * 1e6) / 1000)
    : null
  const stabilityColor = !info ? '#4a6070'
    : info.stability >= 70 ? '#39ff8a'
    : info.stability >= 45 ? '#ff9c2a' : '#ff4d4d'

  const countryEvents = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000
    return events.filter(e => {
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      return ts >= cutoff && compareMatchesCountry(e, country.name)
    })
  }, [events, country.name])

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of countryEvents) {
      counts[e.category] = (counts[e.category] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [countryEvents])

  return (
    <div style={{
      background: 'rgba(4,9,22,0.7)',
      border: `1px solid ${color}30`,
      borderTop: `2px solid ${color}`,
      borderRadius: '3px',
      padding: '8px 9px',
      position: 'relative',
    }}>
      <button
        onClick={onRemove}
        style={{
          position: 'absolute', top: '4px', right: '4px',
          background: 'none', border: 'none', color: '#4a6070',
          cursor: 'pointer', fontSize: '9px', lineHeight: 1, padding: '1px 3px',
        }}
      >✕</button>

      {/* Flag + name + capital */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', paddingRight: '14px' }}>
        {info && (
          <img
            src={`https://flagcdn.com/32x24/${info.code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/64x48/${info.code.toLowerCase()}.png 2x`}
            width="32" height="24" alt={country.name}
            style={{ flexShrink: 0, borderRadius: '2px', objectFit: 'cover', border: `1px solid ${color}25` }}
          />
        )}
        <div>
          <div style={{ color, fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.3 }}>
            {country.name.toUpperCase().slice(0, 20)}{country.name.length > 20 ? '…' : ''}
          </div>
          {info && (
            <div style={{ color: '#3a5060', fontSize: '7px', letterSpacing: '0.06em', marginTop: '1px' }}>
              ⊙ {info.capital}
            </div>
          )}
        </div>
      </div>

      {info ? (
        <>
          {/* Gov type tags */}
          {info.govType.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '6px' }}>
              {info.govType.slice(0, 2).map(tag => (
                <span key={tag} style={{
                  fontSize: '6px', letterSpacing: '0.06em', padding: '1px 4px',
                  border: `1px solid ${tagColor(tag)}35`,
                  background: `${tagColor(tag)}10`,
                  color: tagColor(tag), borderRadius: '2px',
                }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Stats grid — 2×2 */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px',
            background: 'rgba(0,180,255,0.05)', border: '1px solid rgba(0,180,255,0.07)',
            borderRadius: '2px', marginBottom: '6px', overflow: 'hidden',
          }}>
            {[
              { l: 'POPULATION', v: formatPop(info.populationM) },
              { l: 'GDP',        v: formatGdp(info.gdpB) },
              { l: 'GDP/CAPITA', v: gdpPerCapita != null ? `$${gdpPerCapita}k` : '—' },
              { l: 'STABILITY',  v: `${info.stability}/100` },
            ].map(({ l, v }) => (
              <div key={l} style={{ padding: '4px 6px', background: 'rgba(4,9,22,0.5)' }}>
                <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.08em', marginBottom: '1px' }}>{l}</div>
                <div style={{ color: '#a8c4d8', fontSize: '9px', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Stability bar */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.08em' }}>STABILITY</span>
              <span style={{ color: stabilityColor, fontSize: '6px' }}>{info.stability}/100</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(0,180,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${info.stability}%`, height: '100%', borderRadius: '2px', background: stabilityColor, transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {/* Top industries */}
          {info.industries.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.1em', marginBottom: '4px' }}>INDUSTRIES</div>
              {info.industries.slice(0, 3).map((ind, i) => (
                <div key={ind.label} style={{ marginBottom: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                    <span style={{ color: '#4a6070', fontSize: '7px' }}>{ind.label}</span>
                    <span style={{ color: '#4a6fa5', fontSize: '7px' }}>{ind.pct}%</span>
                  </div>
                  <div style={{ height: '2px', background: 'rgba(0,180,255,0.08)', borderRadius: '1px', overflow: 'hidden' }}>
                    <div style={{ width: `${ind.pct}%`, height: '100%', borderRadius: '1px', background: BAR_COLORS[i % BAR_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#2a4060', fontSize: '8px', marginBottom: '6px' }}>— no data —</div>
      )}

      {/* Event category breakdown (24h) */}
      {categoryBreakdown.length > 0 && (
        <div style={{ marginTop: '4px', borderTop: '1px solid rgba(0,180,255,0.07)', paddingTop: '5px' }}>
          <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.1em', marginBottom: '4px' }}>EVENTS (24H)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {categoryBreakdown.map(([cat, count]) => {
              const catColor = CATEGORY_COLOR[cat] ?? '#4a6070'
              const catIcon  = CATEGORY_ICON[cat]  ?? '◉'
              const catLabel = CATEGORY_LABEL[cat]  ?? cat
              return (
                <span key={cat} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '2px',
                  fontSize: '6px', padding: '1px 4px', borderRadius: '2px',
                  border: `1px solid ${catColor}30`,
                  background: `${catColor}0a`,
                  color: catColor,
                }}>
                  {catIcon} {catLabel} <span style={{ opacity: 0.7 }}>×{count}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent events list */}
      {countryEvents.length > 0 && (
        <div style={{ marginTop: '5px', borderTop: '1px solid rgba(0,180,255,0.07)', paddingTop: '5px' }}>
          <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.1em', marginBottom: '4px' }}>RECENT</div>
          {countryEvents.slice(0, 3).map(e => {
            const catColor = CATEGORY_COLOR[e.category] ?? '#4a6070'
            const catIcon  = CATEGORY_ICON[e.category]  ?? '◉'
            return (
              <div key={e.id} style={{ display: 'flex', gap: '4px', marginBottom: '3px', alignItems: 'flex-start' }}>
                <span style={{ color: catColor, fontSize: '7px', flexShrink: 0 }}>{catIcon}</span>
                <span style={{ color: '#4a6070', fontSize: '7px', lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {e.title}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
