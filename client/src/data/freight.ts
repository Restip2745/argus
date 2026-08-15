import type { MarketCommodity } from '../types'

/**
 * Freight, as the confirmation a spot commodity price cannot give.
 *
 * Crude reacts to a strait closing within hours. Freight takes two or three
 * weeks and answers the more valuable question — whether the disruption held.
 * That is why these appear on the event panel measured *since* the story rather
 * than as a level: a freight number on its own says nothing a reader can use.
 *
 * What is on offer is a compromise, and the row has to say so. The indices
 * themselves are not obtainable: the Baltic Exchange licenses BDI, and Drewry's
 * WCI and the SCFI are weekly figures published as web pages. These two are
 * exchange-traded funds holding freight futures, so fund roll and tracking
 * error drift them away from the rate they stand in for. Labelling them ETFs is
 * not a disclaimer, it is the difference between a proxy and a claim.
 *
 * Segment matters more than it looks. `BDRY` covers dry bulk — iron ore, coal,
 * grain — and was very nearly the only instrument used here, which would have
 * priced a tanker disruption off the wrong market entirely. The Hormuz events
 * that motivated this feature are about crude on tankers, not ore on bulkers.
 */
export interface FreightInstrument {
  symbol: string
  key:    string
  label:  string
}

const TANKER: FreightInstrument = { symbol: 'BWET', key: 'tanker', label: 'TANKER FREIGHT' }
const DRY_BULK: FreightInstrument = { symbol: 'BDRY', key: 'dryBulk', label: 'DRY BULK FREIGHT' }

/**
 * Which freight market carries each commodity.
 *
 * Metals are absent on purpose. Gold and silver move by air and in quantities
 * no freight market prices; a shipping rate beside a bullion story would be
 * noise wearing the costume of a signal.
 */
const BY_COMMODITY: Partial<Record<MarketCommodity, FreightInstrument>> = {
  CRUDE_OIL:   TANKER,
  NATURAL_GAS: TANKER,
  WHEAT:       DRY_BULK,
  COPPER:      DRY_BULK,
}

/**
 * The freight market an event's commodities are carried on, or null.
 *
 * Null when the commodities disagree about segment. An event linked to both
 * crude and wheat spans tankers and bulkers, and picking one would assert a
 * focus the link does not have — better to show no freight row than the wrong
 * half of one.
 */
export function freightFor(commodities: MarketCommodity[]): FreightInstrument | null {
  const matched = commodities
    .map((c) => BY_COMMODITY[c])
    .filter((f): f is FreightInstrument => f !== undefined)

  if (matched.length === 0) return null
  const first = matched[0]
  return matched.every((f) => f.symbol === first.symbol) ? first : null
}
