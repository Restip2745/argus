/**
 * The commodities the status bar carries.
 *
 * Deliberately four. A status bar answers "what is the world doing" at a
 * glance, and a dozen readouts stops being that and becomes a terminal — the
 * same reasoning that caps the entity panel at three listings.
 *
 * Unlike a share price, these do not belong to anyone. That is why they sit in
 * the global bar rather than in a panel: "Brent +10%" is about the world, not
 * about an entity someone has to click first. The events that move them —
 * a strait closing, a producer cartel meeting, a hurricane in the Gulf — are
 * the same ones ARGUS already tracks under ARMED_CONFLICT, POLITICAL and
 * ENVIRONMENT.
 *
 * Brent and WTI are both here on purpose. The spread between them separates a
 * regional supply problem from a global one, and carrying only one loses that.
 */

import type { MarketCommodity } from '../types'

export interface Commodity {
  /** Yahoo continuous front-month symbol. */
  symbol: string
  /** i18n key suffix under `statusBar.commodity`. */
  key: string
  /** Fallback label when the locale file has no entry. */
  label: string
}

export const COMMODITIES: Commodity[] = [
  { symbol: 'BZ=F', key: 'brent',  label: 'BRENT' },
  { symbol: 'CL=F', key: 'wti',    label: 'WTI' },
  { symbol: 'GC=F', key: 'gold',   label: 'GOLD' },
  { symbol: 'HG=F', key: 'copper', label: 'COPPER' },
]

export const COMMODITY_SYMBOLS = COMMODITIES.map((c) => c.symbol)

/**
 * The contract that stands for each commodity class an event can be tagged with.
 *
 * The analysis pass records classes, not tickers — an article is about crude,
 * not about Brent — so the choice of instrument is made here, where the price is
 * drawn.
 *
 * One instrument per class, unlike the status bar which carries both crude
 * benchmarks. The bar is comparing them: the Brent/WTI spread separates a
 * regional supply problem from a global one, and that is a reading of the world.
 * An event panel is answering a narrower question — which market does this
 * story touch — and two crude rows on one event would invite a comparison the
 * event does not support. Brent is the global benchmark, so it takes the slot.
 *
 * Silver and wheat appear here but not in the bar: the model may name them, and
 * a class the reader cannot see a price for is worse than one row more.
 */
export const COMMODITY_INSTRUMENT: Record<MarketCommodity, Commodity> = {
  CRUDE_OIL:   { symbol: 'BZ=F', key: 'brent',  label: 'BRENT' },
  NATURAL_GAS: { symbol: 'NG=F', key: 'gas',    label: 'NAT GAS' },
  GOLD:        { symbol: 'GC=F', key: 'gold',   label: 'GOLD' },
  SILVER:      { symbol: 'SI=F', key: 'silver', label: 'SILVER' },
  COPPER:      { symbol: 'HG=F', key: 'copper', label: 'COPPER' },
  WHEAT:       { symbol: 'ZW=F', key: 'wheat',  label: 'WHEAT' },
}

/**
 * How often the strip re-reads.
 *
 * The server caches a quote for ten minutes, so asking more often than this
 * mostly re-serves the same numbers; asking less often lets the bar drift far
 * enough from the market that it stops being a live readout.
 */
export const COMMODITY_REFRESH_MS = 5 * 60 * 1000
