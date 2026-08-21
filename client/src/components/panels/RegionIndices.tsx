import { useTranslation } from 'react-i18next'
import { useQuotes } from '../../hooks/useQuotes'
import { useAppStore } from '../../store'
import { indicesFor } from '../../data/indices'
import { quoteColor, formatChange, formatPrice, formatAsOf } from '../../utils/quote'

interface Props {
  country: string
}

/**
 * The country's stock index or indices, beside its other national readings.
 *
 * Sits with GDP and the stability score rather than on an event, because that
 * is what it is: a number about a place. The panel is already answering "what
 * is the state of this country", and a market level is one more instrument on
 * the same dashboard.
 *
 * No currency column, unlike every other market row in the app. The upstream
 * reports one — "USD" for the S&P — but an index is points, not money, and the
 * S&P is not seven thousand dollars. Carrying the field through would be a
 * factual error rather than clutter, so the column is dropped and the space
 * given to the index's name.
 *
 * Renders nothing for a country with no index in the table, which is most of
 * them: the list holds only symbols that were fetched and confirmed, since a
 * guessed one either fails silently or prices something else entirely.
 */
export function RegionIndices({ country }: Props) {
  const { t } = useTranslation()
  const upColor = useAppStore((s) => s.upColor)

  const indices = indicesFor(country)
  const { quotes } = useQuotes(indices.map((i) => i.symbol))

  if (indices.length === 0 || quotes.length === 0) return null

  const labelOf = (symbol: string) =>
    indices.find((i) => i.symbol === symbol)?.label ?? symbol

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{
        color: '#2a4060', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '4px',
      }}>
        {t('region.indices', 'MARKET INDICES')}
      </div>

      <div style={{
        border: '1px solid rgba(0,180,255,0.10)',
        borderRadius: '2px',
        background: 'rgba(0,180,255,0.03)',
        padding: '4px 6px',
      }}>
        {quotes.map((q) => (
          <div
            key={q.symbol}
            style={{
              display: 'flex', alignItems: 'baseline', gap: '6px',
              fontSize: '10px', lineHeight: 1.9, whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              color: '#7a9ab0', flexShrink: 0, width: '92px',
              letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {labelOf(q.symbol)}
            </span>

            <span style={{
              color: '#c8dde8', flex: 1, textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatPrice(q.price)}
            </span>

            <span style={{
              color: quoteColor(q.changePct, upColor), flexShrink: 0,
              width: '52px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            }}>
              {formatChange(q.changePct)}
            </span>

            {/* Every market row in this app carries the date its number was
                set: outside trading hours a close is not "now", and for a
                country on the other side of the world it may not be today. */}
            <span
              title={new Date(q.asOf).toLocaleString()}
              style={{ color: '#3d5568', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatAsOf(q.asOf)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
