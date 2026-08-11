/**
 * Turning a Wikidata entity into a tradable symbol.
 *
 * Wikipedia's REST summary — the thing every entity panel already fetches —
 * carries `wikibase_item`, so the QID is free. What it does not carry is
 * anything about listings, so the claims have to be fetched separately and read
 * here.
 *
 * The modelling is: `P414` (stock exchange) is a statement whose value is the
 * exchange item, and the ticker hangs off it as a `P249` qualifier. A minority
 * of entries instead put `P249` at the top level with no exchange attached.
 * Both shapes appear in practice and both are handled, but the second is only
 * trusted when there is exactly one exchange to attach it to — a bare ticker
 * with two candidate venues is ambiguous, and guessing is how you end up
 * pricing the wrong security.
 *
 * Every step here fails closed. No exchange in the table, no ticker, a shape
 * that does not parse — all produce no listing rather than a plausible-looking
 * one, because a wrong price is indistinguishable from a right one on screen.
 */

import { exchangeByQid, US_COUNTRY_QID, type ExchangeInfo } from '../data/stockExchanges'

export interface Listing {
  /** Exchange display code, e.g. "TWSE". */
  exchange: string
  /** Ticker as listed on that exchange, e.g. "2330". */
  ticker: string
  /** Quote-API symbol, e.g. "2330.TW". */
  symbol: string
}

// ── Wikidata claim shapes (only the parts that are read) ─────────────────────

interface Snak {
  snaktype?: string
  datavalue?: { value?: unknown }
}

interface Statement {
  mainsnak?: Snak
  qualifiers?: Record<string, Snak[]>
  rank?: string
}

export type Claims = Record<string, Statement[]>

const P_EXCHANGE = 'P414'
const P_TICKER   = 'P249'
const P_END_TIME = 'P582'
const P_COUNTRY  = 'P17'

function itemId(snak: Snak | undefined): string | null {
  const v = snak?.datavalue?.value as { id?: string } | undefined
  return typeof v?.id === 'string' ? v.id : null
}

function stringValue(snak: Snak | undefined): string | null {
  const v = snak?.datavalue?.value
  return typeof v === 'string' ? v : null
}

/**
 * Normalise a ticker as Wikidata records it into one a quote API will take.
 *
 * Editors write tickers in whatever form the source used: "NYSE: TSM",
 * "2330 TT", "BRK.B". The exchange prefix is redundant here (the statement
 * already says which exchange) and the Bloomberg-style country suffix is not
 * part of the ticker, so anything left holding a space is rejected rather than
 * repaired — a half-understood string is not worth pricing.
 */
export function normaliseTicker(raw: string, exchange: ExchangeInfo): string | null {
  let t = raw.trim()

  // "NYSE: TSM" / "TPE：2330" — drop the venue the editor prefixed.
  t = t.replace(/^[A-Za-z.\s]{2,12}[:：]\s*/, '')

  t = t.replace(/\s+/g, ' ').trim().toUpperCase()
  if (!t || t.includes(' ')) return null

  // US class shares are written "BRK.B" but quoted as "BRK-B". Only US venues
  // are rewritten: elsewhere a dot inside a ticker is not a class marker.
  if (exchange.suffix === '') t = t.replace(/\./g, '-')

  // Venues with fixed-width numeric codes: Wikidata drops the leading zeros
  // that the exchange itself keeps, and the short form resolves nowhere.
  if (exchange.pad && /^\d+$/.test(t)) {
    if (t.length > exchange.pad) return null   // too long to be a code here
    t = t.padStart(exchange.pad, '0')
  }

  return /^[A-Z0-9][A-Z0-9.\-]{0,9}$/.test(t) ? t : null
}

/** A listing still open on the exchange, with the ordering inputs kept. */
interface Candidate extends Listing {
  preferred: boolean
  country: string
  foreignSecondary: boolean
  order: number
}

/**
 * Which listing to show when a company has several.
 *
 * Multi-listed companies are the normal case for anything that reaches world
 * news, and the claim order is arbitrary — TSMC's NYSE depositary receipt sits
 * ahead of its Taiwan listing. Home market wins, because that is where the
 * security actually trades and where the price the news is about was set. A
 * Wikidata `preferred` rank is respected above even that, since it is an
 * explicit editorial statement about which listing is primary.
 */
export function rankListings(candidates: Candidate[], homeCountry: string | null): Candidate[] {
  const score = (c: Candidate): number => {
    if (c.preferred) return 0
    if (homeCountry && c.country === homeCountry) return 1
    if (c.country === US_COUNTRY_QID) return 2
    return 3
  }
  return [...candidates].sort((a, b) => score(a) - score(b) || a.order - b.order)
}

/**
 * Every current listing in `claims`, best first.
 *
 * Empty for the overwhelming majority of entities, which are people, places and
 * treaties rather than public companies. That emptiness is the feature: it is
 * what decides the panel shows nothing at all.
 */
export function extractListings(claims: Claims | null | undefined): Listing[] {
  if (!claims) return []

  const homeCountry = itemId(claims[P_COUNTRY]?.[0]?.mainsnak)
  const exchangeStatements = claims[P_EXCHANGE] ?? []
  const candidates: Candidate[] = []
  const isNoiseVenue = (c: Candidate) => c.foreignSecondary && c.country !== homeCountry

  exchangeStatements.forEach((st, order) => {
    // Deprecated means the community marked the statement wrong.
    if (st.rank === 'deprecated') return
    // An end time on a listing means it was delisted. Quoting a delisted
    // symbol either fails or, worse, returns a stale final price.
    if (st.qualifiers?.[P_END_TIME]?.length) return

    const qid = itemId(st.mainsnak)
    if (!qid) return
    const exchange = exchangeByQid(qid)
    if (!exchange) return

    const rawTicker = stringValue(st.qualifiers?.[P_TICKER]?.[0])
    if (!rawTicker) return
    const ticker = normaliseTicker(rawTicker, exchange)
    if (!ticker) return

    candidates.push({
      exchange:  exchange.code,
      ticker,
      symbol:    ticker + exchange.suffix,
      preferred: st.rank === 'preferred',
      country:   exchange.country,
      foreignSecondary: exchange.foreignSecondary === true,
      order,
    })
  })

  // Fallback for entries that record the ticker on its own. Safe only when a
  // single exchange is in play, so the ticker has exactly one venue it could
  // belong to.
  if (candidates.length === 0) {
    const bare = stringValue(claims[P_TICKER]?.[0]?.mainsnak)
    const exchanges = exchangeStatements
      .map((st) => itemId(st.mainsnak))
      .map((qid) => (qid ? exchangeByQid(qid) : null))
      .filter((e): e is ExchangeInfo => e !== null)

    if (bare && exchanges.length === 1) {
      const ticker = normaliseTicker(bare, exchanges[0])
      if (ticker) {
        candidates.push({
          exchange:  exchanges[0].code,
          ticker,
          symbol:    ticker + exchanges[0].suffix,
          preferred: false,
          country:   exchanges[0].country,
          foreignSecondary: exchanges[0].foreignSecondary === true,
          order:     0,
        })
      }
    }
  }

  // A bulk foreign-listing venue is dropped rather than merely ranked last: it
  // would still win a country slot no other listing was competing for. Unless
  // it is all there is — a thin line, labelled with its exchange and the date
  // it was priced, still beats telling the reader the company is not listed.
  const kept = candidates.filter((c) => !isNoiseVenue(c))
  return capListings(rankListings(kept.length ? kept : candidates, homeCountry))
}

/**
 * At most one listing per country, and at most `MAX_LISTINGS` in total.
 *
 * The panel shows every listing a company has, because a reader looking at
 * TSMC wants both the Taipei line and the ADR. What they do not want is the
 * long tail underneath: Samsung resolves to five, of which one is a preferred
 * share at a different price, two are thin Frankfurt receipts whose daily
 * change disagrees with Seoul's by six points, and one is a London GDR that
 * stopped printing in 2022. Unilever's fifth is PT Unilever Indonesia, which
 * is a different company.
 *
 * One per country is what separates the two groups. The cases worth showing —
 * HSBC in London, New York and Hong Kong; TSMC in Taipei and New York — are
 * each in a different market, while the noise is almost always a second line in
 * a market already represented. Ordering has already put the best listing of
 * each country first, so keeping the first of each is keeping the right one.
 */
const MAX_LISTINGS = 3

function capListings(ranked: Candidate[]): Listing[] {
  const seenSymbol = new Set<string>()
  const seenCountry = new Set<string>()
  const out: Listing[] = []

  for (const c of ranked) {
    if (out.length >= MAX_LISTINGS) break
    // The same symbol appears twice when an entry records both a current and a
    // historical statement for one venue.
    if (seenSymbol.has(c.symbol) || seenCountry.has(c.country)) continue
    seenSymbol.add(c.symbol)
    seenCountry.add(c.country)
    out.push({ exchange: c.exchange, ticker: c.ticker, symbol: c.symbol })
  }
  return out
}
