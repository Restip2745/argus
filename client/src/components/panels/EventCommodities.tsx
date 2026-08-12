import { useTranslation } from 'react-i18next'
import { useQuotes } from '../../hooks/useQuotes'
import { useAppStore } from '../../store'
import { COMMODITY_INSTRUMENT } from '../../data/commodities'
import { quoteColor, formatChange, formatPrice, formatAsOf } from '../../utils/quote'
import type { MarketCommodity } from '../../types'

interface Props {
  commodities: MarketCommodity[]
  accentColor: string
}

/**
 * The commodity markets an event touches, with where they last closed.
 *
 * Says "this story bears on crude" and shows what crude is doing. It does not
 * say the story moved the price, and the wording has to keep it that way: the
 * link is a judgement the analysis pass made about subject matter, the price is
 * a fact about the market, and the panel must not weld them into a claim of
 * cause. That is also why the price carries its own date — the close shown may
 * be from before the event, and a reader comparing the two deserves to see it.
 *
 * The links are not always right. The pass that produces them tags roughly six
 * events in a hundred and gets one in seven of those wrong, usually by
 * associating a market commentary piece with oil. A wrong row here costs a
 * reader a moment's confusion, which is the reason this shows a market and not
 * a conclusion.
 */
export function EventCommodities({ commodities, accentColor }: Props) {
  const { t } = useTranslation()
  const upColor = useAppStore((s) => s.upColor)

  const instruments = commodities.map((c) => COMMODITY_INSTRUMENT[c]).filter(Boolean)
  const { quotes } = useQuotes(instruments.map((i) => i.symbol))

  if (instruments.length === 0 || quotes.length === 0) return null

  const labelOf = (symbol: string) => {
    const inst = instruments.find((i) => i.symbol === symbol)
    return inst ? t(`statusBar.commodity.${inst.key}`, inst.label) : symbol
  }

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{
        color: '#2a4060', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '4px',
      }}>
        {t('event.commodities', 'COMMODITY EXPOSURE')}
      </div>

      <div style={{
        border: `1px solid ${accentColor}18`,
        borderRadius: '2px',
        background: `${accentColor}06`,
        padding: '4px 6px',
      }}>
        {quotes.map((q) => (
          <div
            key={q.symbol}
            style={{
              display: 'flex', alignItems: 'baseline', gap: '5px',
              fontSize: '10px', lineHeight: 1.9, whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: '#7a9ab0', flexShrink: 0, width: '62px', letterSpacing: '0.06em' }}>
              {labelOf(q.symbol)}
            </span>

            <span style={{
              color: '#c8dde8', flex: 1, textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatPrice(q.price)}
            </span>

            <span style={{ color: '#4a6070', flexShrink: 0, width: '28px' }}>
              {q.currency}
            </span>

            <span style={{
              color: quoteColor(q.changePct, upColor), flexShrink: 0,
              width: '48px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            }}>
              {formatChange(q.changePct)}
            </span>

            <span
              title={new Date(q.asOf).toLocaleString()}
              style={{ color: '#3d5568', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatAsOf(q.asOf)}
            </span>
          </div>
        ))}
      </div>

      <p style={{ color: '#2a4a63', fontSize: '10px', margin: '3px 0 0', lineHeight: 1.4 }}>
        {t('event.commoditiesHint', 'Markets this story bears on. Last close, not a reaction to it.')}
      </p>
    </div>
  )
}
