/**
 * National stock indices, keyed by the country names `countryData.ts` uses.
 *
 * A country's index belongs on the region panel for the same reason its GDP and
 * stability score do: it is a reading of that country, not of an entity someone
 * clicked. The panel already answers "what is the state of this place"; a market
 * level is one more instrument on the same dashboard.
 *
 * National only. The Philadelphia Semiconductor index was considered and left
 * out — it is a sector index that happens to be listed in the United States, so
 * filing it under a country would be a category error, and it belongs to a
 * "related indices" idea that does not exist yet.
 *
 * Every symbol here was fetched and confirmed before being written down. The
 * list is short for that reason rather than by design: a guessed symbol either
 * fails silently or, worse, prices something else, which is the same rule the
 * exchange table follows.
 *
 * Hong Kong (^HSI) and Singapore (^STI) resolve but have no entry in
 * `countryData.ts`, so there is no key to hang them on yet.
 */

export interface MarketIndex {
  /** Yahoo symbol. Indices lead with a caret; a few are exchange-suffixed. */
  symbol: string
  /** Short display name, in English. */
  label:  string
}

/**
 * Several entries per country where the country genuinely has several headline
 * indices. The United States has three that a reader would expect to see, and
 * India two; everywhere else has one. The imbalance is real rather than an
 * artefact — it would be worse to drop the Nasdaq for the sake of a tidy table.
 */
export const INDICES_BY_COUNTRY: Record<string, MarketIndex[]> = {
  'United States of America': [
    { symbol: '^DJI',  label: 'DOW JONES' },
    { symbol: '^GSPC', label: 'S&P 500' },
    { symbol: '^IXIC', label: 'NASDAQ' },
  ],
  'India': [
    { symbol: '^BSESN', label: 'SENSEX' },
    { symbol: '^NSEI',  label: 'NIFTY 50' },
  ],

  'Taiwan':         [{ symbol: '^TWII',      label: 'TAIEX' }],
  'South Korea':    [{ symbol: '^KS11',      label: 'KOSPI' }],
  'Japan':          [{ symbol: '^N225',      label: 'NIKKEI 225' }],
  'China':          [{ symbol: '000001.SS',  label: 'SSE COMPOSITE' }],
  'United Kingdom': [{ symbol: '^FTSE',      label: 'FTSE 100' }],
  'Germany':        [{ symbol: '^GDAXI',     label: 'DAX' }],
  'France':         [{ symbol: '^FCHI',      label: 'CAC 40' }],
  'Spain':          [{ symbol: '^IBEX',      label: 'IBEX 35' }],
  'Italy':          [{ symbol: 'FTSEMIB.MI', label: 'FTSE MIB' }],
  'Netherlands':    [{ symbol: '^AEX',       label: 'AEX' }],
  'Switzerland':    [{ symbol: '^SSMI',      label: 'SMI' }],
  'Canada':         [{ symbol: '^GSPTSE',    label: 'S&P/TSX' }],
  'Brazil':         [{ symbol: '^BVSP',      label: 'IBOVESPA' }],
  'Mexico':         [{ symbol: '^MXX',       label: 'S&P/BMV IPC' }],
  'Australia':      [{ symbol: '^AXJO',      label: 'S&P/ASX 200' }],
  'Indonesia':      [{ symbol: '^JKSE',      label: 'IDX COMPOSITE' }],
  'Thailand':       [{ symbol: '^SET.BK',    label: 'SET' }],
  'Israel':         [{ symbol: '^TA125.TA',  label: 'TA-125' }],
  'Turkey':         [{ symbol: 'XU100.IS',   label: 'BIST 100' }],
  'Saudi Arabia':   [{ symbol: '^TASI.SR',   label: 'TASI' }],
}

export function indicesFor(country: string): MarketIndex[] {
  return INDICES_BY_COUNTRY[country] ?? []
}
