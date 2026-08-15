import { useTranslation } from 'react-i18next'
import { useQuotes } from '../../hooks/useQuotes'
import { useAppStore } from '../../store'
import { quoteColor, formatChange, formatPrice, formatAsOf, isPriorSession } from '../../utils/quote'
import { dropDuplicateCurrencies } from '../../utils/listing'
import type { Listing } from '../../utils/listing'

interface Props {
  listings: Listing[]
  accentColor: string
}

/**
 * Where a company's shares last closed, one row per market.
 *
 * Every row carries its own date, and that is not decoration. A company listed
 * in London and New York shows two different changes on a Monday morning —
 * London trading today, New York still holding Friday's close — and AstraZeneca
 * has been seen at +3.5% and -4.9% side by side. Both were correct. Undated,
 * the pair reads as an error in the panel; dated, it reads as the difference
 * between two sessions, which is the actual information.
 *
 * Renders nothing when no quote comes back. A company whose price cannot be
 * reached looks exactly like an entity that has no price, on purpose: the
 * reader is not owed an error for something they did not ask for.
 */
export function ListingChip({ listings, accentColor }: Props) {
  const { t } = useTranslation()
  const upColor = useAppStore((s) => s.upColor)
  const { quotes: fetched } = useQuotes(listings.map((l) => l.symbol))

  // A second listing in a currency already shown is the same price twice — see
  // `dropDuplicateCurrencies`, which exists for Toyota's London line.
  const quotes = dropDuplicateCurrencies(fetched)

  if (quotes.length === 0) return null

  const tickerOf = (symbol: string) =>
    listings.find((l) => l.symbol === symbol)?.ticker ?? symbol
  const exchangeOf = (symbol: string) =>
    listings.find((l) => l.symbol === symbol)?.exchange ?? ''

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{
        color: '#2a4060', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '4px',
      }}>
        {t('wiki.market.title', 'MARKET')}
      </div>

      <div style={{
        border: `1px solid ${accentColor}18`,
        borderRadius: '2px',
        background: `${accentColor}06`,
        padding: '4px 6px',
      }}>
        {quotes.map((q) => {
          const prior = isPriorSession(q.asOf)
          return (
            <div
              key={q.symbol}
              style={{
                display: 'flex', alignItems: 'baseline', gap: '5px',
                fontSize: '10px', lineHeight: 1.9, whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                color: '#5d7c92', letterSpacing: '0.06em', flexShrink: 0,
                width: '50px', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {exchangeOf(q.symbol)}
              </span>

              <span style={{ color: '#7a9ab0', flexShrink: 0, width: '46px' }}>
                {tickerOf(q.symbol)}
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

              {/* Dimmed when it is a previous session's close, so the reader
                  can see at a glance which rows are not from today. */}
              <span
                title={new Date(q.asOf).toLocaleString()}
                style={{
                  color: prior ? '#3d5568' : '#5d7c92', flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatAsOf(q.asOf)}
              </span>
            </div>
          )
        })}
      </div>

      <p style={{ color: '#2a4a63', fontSize: '10px', margin: '3px 0 0', lineHeight: 1.4 }}>
        {t('wiki.market.hint', 'Last close at each exchange, with the time it was priced.')}
      </p>
    </div>
  )
}
