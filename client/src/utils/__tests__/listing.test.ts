import { describe, it, expect } from 'vitest'
import { extractListings, normaliseTicker, type Claims } from '../listing'
import { EXCHANGE_BY_QID } from '../../data/stockExchanges'

const NYSE = 'Q13677'
const TWSE = 'Q548621'
const XETRA = 'Q819468'
const LSE = 'Q171240'
const HKEX = 'Q496672'
const KRX = 'Q495372'
const AMS = 'Q478720'
const IDX = 'Q1661737'
const FSE = 'Q151139'
const TAIWAN = 'Q865'
const UNKNOWN_EXCHANGE = 'Q99999999'

/** A P414 statement in the shape Wikidata actually returns. */
function listedOn(
  exchangeQid: string,
  ticker: string | null,
  extra: { rank?: string; endTime?: boolean } = {},
) {
  const qualifiers: Record<string, unknown[]> = {}
  if (ticker !== null) {
    qualifiers.P249 = [{ snaktype: 'value', datavalue: { value: ticker } }]
  }
  if (extra.endTime) {
    qualifiers.P582 = [{ snaktype: 'value', datavalue: { value: { time: '+2019-01-01T00:00:00Z' } } }]
  }
  return {
    mainsnak: {
      snaktype:  'value',
      datavalue: { value: { 'entity-type': 'item', id: exchangeQid } },
    },
    qualifiers: Object.keys(qualifiers).length ? qualifiers : undefined,
    rank: extra.rank ?? 'normal',
  }
}

function country(qid: string) {
  return [{ mainsnak: { snaktype: 'value', datavalue: { value: { id: qid } } } }]
}

describe('normaliseTicker', () => {
  const nyse = EXCHANGE_BY_QID[NYSE]
  const twse = EXCHANGE_BY_QID[TWSE]

  it('passes a plain ticker through and appends nothing of its own', () => {
    expect(normaliseTicker('TSM', nyse)).toBe('TSM')
    expect(normaliseTicker('2330', twse)).toBe('2330')
  })

  it('drops the exchange prefix editors paste in front of the ticker', () => {
    expect(normaliseTicker('NYSE: TSM', nyse)).toBe('TSM')
    expect(normaliseTicker('TPE：2330', twse)).toBe('2330')
  })

  it('rewrites a US class share to the form quote APIs use', () => {
    expect(normaliseTicker('BRK.B', nyse)).toBe('BRK-B')
  })

  it('leaves dots alone off the US venues, where they are not class markers', () => {
    expect(normaliseTicker('A.B', twse)).toBe('A.B')
  })

  it('rejects a Bloomberg-style ticker rather than guessing which half is real', () => {
    expect(normaliseTicker('2330 TT', twse)).toBeNull()
  })

  it('restores the leading zeros a fixed-width venue expects', () => {
    // Wikidata records Tencent as "700"; the quote only resolves as "0700".
    const hkex = EXCHANGE_BY_QID['Q496672']
    expect(normaliseTicker('700', hkex)).toBe('0700')
    expect(normaliseTicker('0700', hkex)).toBe('0700')
    // Korea runs six wide.
    expect(normaliseTicker('5930', EXCHANGE_BY_QID['Q495364'])).toBe('005930')
  })

  it('does not pad a ticker that is not a bare number', () => {
    expect(normaliseTicker('AAC', EXCHANGE_BY_QID['Q496672'])).toBe('AAC')
  })

  it('rejects a numeric ticker too long for the venue rather than truncating it', () => {
    expect(normaliseTicker('123456', EXCHANGE_BY_QID['Q496672'])).toBeNull()
  })

  it('rejects empty and over-long strings', () => {
    expect(normaliseTicker('   ', nyse)).toBeNull()
    expect(normaliseTicker('ABCDEFGHIJKLMNOP', nyse)).toBeNull()
  })
})

describe('extractListings', () => {
  it('reads the ticker off the exchange statement and builds the quote symbol', () => {
    const claims = { P414: [listedOn(TWSE, '2330')] } as unknown as Claims
    expect(extractListings(claims)).toEqual([
      { exchange: 'TWSE', ticker: '2330', symbol: '2330.TW' },
    ])
  })

  it('prefers the home market over a foreign depositary receipt', () => {
    // TSMC's claim order really does put the NYSE receipt first.
    const claims = {
      P414: [listedOn(NYSE, 'TSM'), listedOn(TWSE, '2330')],
      P17:  country(TAIWAN),
    } as unknown as Claims
    expect(extractListings(claims).map((l) => l.symbol)).toEqual(['2330.TW', 'TSM'])
  })

  it('lets an explicit preferred rank outrank the home market', () => {
    const claims = {
      P414: [listedOn(NYSE, 'TSM', { rank: 'preferred' }), listedOn(TWSE, '2330')],
      P17:  country(TAIWAN),
    } as unknown as Claims
    expect(extractListings(claims)[0].symbol).toBe('TSM')
  })

  it('falls back to the US listing when the home country is unknown', () => {
    const claims = {
      P414: [listedOn(XETRA, 'TSFA'), listedOn(NYSE, 'TSM')],
    } as unknown as Claims
    expect(extractListings(claims)[0].symbol).toBe('TSM')
  })

  it('drops a delisted listing, which would otherwise quote a stale final price', () => {
    const claims = {
      P414: [listedOn(TWSE, '2330', { endTime: true }), listedOn(NYSE, 'TSM')],
    } as unknown as Claims
    expect(extractListings(claims).map((l) => l.symbol)).toEqual(['TSM'])
  })

  it('drops a deprecated statement', () => {
    const claims = { P414: [listedOn(NYSE, 'TSM', { rank: 'deprecated' })] } as unknown as Claims
    expect(extractListings(claims)).toEqual([])
  })

  it('drops an exchange the table does not cover rather than guessing a suffix', () => {
    const claims = { P414: [listedOn(UNKNOWN_EXCHANGE, 'ABC')] } as unknown as Claims
    expect(extractListings(claims)).toEqual([])
  })

  it('drops an exchange statement carrying no ticker', () => {
    const claims = { P414: [listedOn(TWSE, null)] } as unknown as Claims
    expect(extractListings(claims)).toEqual([])
  })

  it('uses a bare top-level ticker when exactly one exchange could own it', () => {
    const claims = {
      P414: [listedOn(TWSE, null)],
      P249: [{ mainsnak: { snaktype: 'value', datavalue: { value: '2330' } } }],
    } as unknown as Claims
    expect(extractListings(claims)).toEqual([
      { exchange: 'TWSE', ticker: '2330', symbol: '2330.TW' },
    ])
  })

  it('refuses a bare ticker when two exchanges could own it', () => {
    const claims = {
      P414: [listedOn(TWSE, null), listedOn(NYSE, null)],
      P249: [{ mainsnak: { snaktype: 'value', datavalue: { value: '2330' } } }],
    } as unknown as Claims
    expect(extractListings(claims)).toEqual([])
  })

  it('keeps one listing per country, which is what the ADR case needs', () => {
    // HSBC: London, New York and Hong Kong, all worth showing.
    const claims = {
      P414: [listedOn(LSE, 'HSBA'), listedOn(NYSE, 'HSBC'), listedOn(HKEX, '0005')],
      P17:  country('Q145'),
    } as unknown as Claims
    expect(extractListings(claims).map((l) => l.symbol))
      .toEqual(['HSBA.L', 'HSBC', '0005.HK'])
  })

  it('drops a second line in a market already shown', () => {
    // Samsung's preferred share trades alongside the common one in Seoul at a
    // different price; two Seoul rows read as a contradiction, not a comparison.
    const claims = {
      P414: [listedOn(KRX, '005930'), listedOn(KRX, '005935'), listedOn(NYSE, 'X')],
      P17:  country('Q884'),
    } as unknown as Claims
    expect(extractListings(claims).map((l) => l.symbol)).toEqual(['005930.KS', 'X'])
  })

  it('stops at three, dropping the tail where the subsidiaries live', () => {
    // Unilever's fourth is PT Unilever Indonesia — a different company.
    const claims = {
      P414: [listedOn(LSE, 'ULVR'), listedOn(NYSE, 'UL'), listedOn(AMS, 'UNA'), listedOn(IDX, 'UNVR')],
      P17:  country('Q145'),
    } as unknown as Claims
    const out = extractListings(claims)
    expect(out).toHaveLength(3)
    expect(out.map((l) => l.symbol)).not.toContain('UNVR.JK')
  })

  it('drops the Frankfurt receipt of a foreign company', () => {
    // It moved -9.5% on a day Seoul moved -4.0%; side by side that reads as a
    // contradiction rather than a second opinion.
    const claims = {
      P414: [listedOn(KRX, '005930'), listedOn(FSE, 'SSU')],
      P17:  country('Q884'),
    } as unknown as Claims
    expect(extractListings(claims).map((l) => l.symbol)).toEqual(['005930.KS'])
  })

  it('keeps Frankfurt for a German company, where it is the home market', () => {
    const claims = {
      P414: [listedOn(FSE, 'RHM')],
      P17:  country('Q183'),
    } as unknown as Claims
    expect(extractListings(claims).map((l) => l.symbol)).toEqual(['RHM.F'])
  })

  it('keeps a lone foreign receipt rather than reporting no listing at all', () => {
    const claims = {
      P414: [listedOn(FSE, 'SSU')],
      P17:  country('Q884'),
    } as unknown as Claims
    expect(extractListings(claims).map((l) => l.symbol)).toEqual(['SSU.F'])
  })

  it('collapses a venue recorded twice under the same symbol', () => {
    const claims = {
      P414: [listedOn(NYSE, 'TSM'), listedOn(NYSE, 'NYSE: TSM')],
    } as unknown as Claims
    expect(extractListings(claims)).toHaveLength(1)
  })

  it('returns nothing for the entities that make up most of the panel traffic', () => {
    expect(extractListings({} as Claims)).toEqual([])
    expect(extractListings(null)).toEqual([])
    expect(extractListings({ P17: country(TAIWAN) } as unknown as Claims)).toEqual([])
  })
})
