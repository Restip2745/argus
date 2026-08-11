/**
 * Stock exchanges, keyed by the Wikidata item that `P414` (stock exchange)
 * points at.
 *
 * A company's Wikidata entry says *which exchange* it trades on as a QID and
 * *under what ticker* as a qualifier on that statement. Neither is a symbol any
 * quote API accepts: turning ("Q548621", "2330") into "2330.TW" needs this
 * table. The alternative — asking a model for the symbol — is the one thing
 * this path must never do, because a hallucinated ticker renders as a perfectly
 * normal price for the wrong company.
 *
 * `country` is the Wikidata QID of the country the exchange sits in. It exists
 * so a multi-listed company can be shown on its home market rather than on
 * whichever depositary receipt happens to come first in the claim list; see
 * `rankListings` in `utils/listing.ts`.
 *
 * Coverage is the venues that actually turn up in world news. An exchange
 * missing from here yields no listing at all, which is the intended failure —
 * a wrong suffix would silently price a different security.
 */

export interface ExchangeInfo {
  /** Short code shown to the reader, e.g. "TWSE". */
  code: string
  /** Yahoo symbol suffix, appended to the ticker. Empty for US venues. */
  suffix: string
  /** QID of the country the exchange operates in. */
  country: string
  /**
   * Width a numeric ticker is zero-padded to, where the venue has a fixed one.
   *
   * Wikidata records Tencent as "700" and the exchange itself writes 0700;
   * unpadded, the symbol simply does not resolve. Only set for venues whose
   * codes are fixed-width numbers — elsewhere padding would corrupt the ticker.
   */
  pad?: number
  /**
   * Venue that lists foreign companies in bulk as thin secondary receipts.
   *
   * Frankfurt carries a depositary line for a large share of the world's big
   * companies, and those lines barely trade: Samsung's Frankfurt receipt moved
   * -9.5% on a day Seoul moved -4.0%, and Nintendo's told a similarly different
   * story from Tokyo's. Quoted beside the home market they read as a
   * contradiction rather than a second opinion, so they are kept only for
   * companies the venue is actually the home market for — Rheinmetall keeps its
   * Frankfurt line, Samsung loses one.
   */
  foreignSecondary?: boolean
}

/** Country QIDs referenced below, named so the table stays readable. */
const US = 'Q30',   TW = 'Q865', JP = 'Q17',  HK = 'Q8646', GB = 'Q145'
const FR = 'Q142',  NL = 'Q55',  BE = 'Q31',  PT = 'Q45',   DE = 'Q183'
const CH = 'Q39',   KR = 'Q884', CN = 'Q148', CA = 'Q16',   AU = 'Q408'
const IN = 'Q668',  IT = 'Q38',  ES = 'Q29',  SE = 'Q34',   NO = 'Q20'
const DK = 'Q35',   FI = 'Q33',  ZA = 'Q258', SG = 'Q334',  IL = 'Q801'
const TH = 'Q869',  ID = 'Q252', AT = 'Q40',  PL = 'Q36',   TR = 'Q43'
const MX = 'Q96',   NZ = 'Q664', MY = 'Q833', PH = 'Q928', BR = 'Q155'

export const EXCHANGE_BY_QID: Record<string, ExchangeInfo> = {
  // North America
  Q13677:  { code: 'NYSE',   suffix: '',     country: US },
  Q82059:  { code: 'NASDAQ', suffix: '',     country: US },
  Q846626: { code: 'NYSE American', suffix: '', country: US },
  Q818723: { code: 'TSX',    suffix: '.TO',  country: CA },
  Q891559: { code: 'BMV',    suffix: '.MX',  country: MX },
  Q796297: { code: 'B3',     suffix: '.SA',  country: BR },

  // Asia-Pacific
  Q548621:  { code: 'TWSE', suffix: '.TW',  country: TW },
  Q5598539: { code: 'TPEx', suffix: '.TWO', country: TW },
  Q217475:  { code: 'TSE',  suffix: '.T',   country: JP },
  Q496672:  { code: 'HKEX', suffix: '.HK',  country: HK, pad: 4 },
  // Wikidata carries two items for the Korean venue and companies are split
  // between them — Samsung uses Q495372, so mapping only one loses it.
  Q495364:  { code: 'KRX',  suffix: '.KS',  country: KR, pad: 6 },
  Q495372:  { code: 'KRX',  suffix: '.KS',  country: KR, pad: 6 },
  Q739514:  { code: 'SSE',  suffix: '.SS',  country: CN, pad: 6 },
  Q517750:  { code: 'SZSE', suffix: '.SZ',  country: CN, pad: 6 },
  Q732670:  { code: 'ASX',  suffix: '.AX',  country: AU },
  Q627019:  { code: 'NZX',  suffix: '.NZ',  country: NZ },
  Q1515558: { code: 'SGX',  suffix: '.SI',  country: SG },
  Q638398:  { code: 'BSE',  suffix: '.BO',  country: IN, pad: 6 },
  Q638740:  { code: 'NSE',  suffix: '.NS',  country: IN },
  Q1330208: { code: 'SET',  suffix: '.BK',  country: TH },
  Q1661737: { code: 'IDX',  suffix: '.JK',  country: ID },
  Q43335:   { code: 'Bursa Malaysia', suffix: '.KL', country: MY },
  Q1526647: { code: 'PSE',  suffix: '.PS',  country: PH },

  // Europe
  Q171240:  { code: 'LSE',      suffix: '.L',  country: GB },
  Q2385849: { code: 'Euronext Paris',     suffix: '.PA', country: FR },
  Q478720:  { code: 'Euronext Amsterdam', suffix: '.AS', country: NL },
  Q1146518: { code: 'Euronext Brussels',  suffix: '.BR', country: BE },
  Q2415561: { code: 'Euronext Lisbon',    suffix: '.LS', country: PT },
  Q819468:  { code: 'XETRA',    suffix: '.DE', country: DE },
  Q151139:  { code: 'FSE',      suffix: '.F',  country: DE, foreignSecondary: true },
  Q661834:  { code: 'SIX',      suffix: '.SW', country: CH },
  Q936563:  { code: 'Borsa Italiana', suffix: '.MI', country: IT },
  Q617426:  { code: 'BME',      suffix: '.MC', country: ES },
  Q1019992: { code: 'Nasdaq Stockholm',  suffix: '.ST', country: SE },
  Q909158:  { code: 'Oslo Børs',         suffix: '.OL', country: NO },
  Q1019983: { code: 'Nasdaq Copenhagen', suffix: '.CO', country: DK },
  Q581755:  { code: 'Nasdaq Helsinki',   suffix: '.HE', country: FI },
  Q698535:  { code: 'Wiener Börse',      suffix: '.VI', country: AT },
  Q59551:   { code: 'GPW',      suffix: '.WA', country: PL },
  Q1407995: { code: 'BIST',     suffix: '.IS', country: TR },

  // Middle East / Africa
  Q1507974: { code: 'TASE', suffix: '.TA', country: IL },
  Q627514:  { code: 'JSE',  suffix: '.JO', country: ZA },
}

/** Country QID of the United States, for the fallback ordering rule. */
export const US_COUNTRY_QID = US

export function exchangeByQid(qid: string): ExchangeInfo | null {
  return EXCHANGE_BY_QID[qid] ?? null
}
