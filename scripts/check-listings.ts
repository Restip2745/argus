/**
 * Resolution report for the entity → ticker → quote path.
 *
 * Runs the real pipeline over a fixed list of entity names and prints what each
 * one resolved to, so the failure modes can be counted before any of this
 * reaches a panel. What matters in the output is not the hit rate — most
 * entities are people and places and are meant to miss — but the two columns
 * that would embarrass us: an entity that is obviously a listed company and
 * resolved to nothing, and an entity that resolved to a ticker belonging to
 * someone else.
 *
 *   cd server && npx tsx ../scripts/check-listings.ts
 *   cd server && npx tsx ../scripts/check-listings.ts "Nintendo" "Rheinmetall"
 */

import { classifyEntity } from '../client/src/data/entityKind'
import { extractListings, type Claims } from '../client/src/utils/listing'
import { fetchQuotes } from '../server/src/services/market'

/**
 * Names chosen to look like what the panel actually receives: companies that
 * dominate business coverage, the multi-listed ones where venue choice is
 * decided, Chinese-language names because the UI is bilingual, and a majority
 * of non-companies because that is the real traffic mix.
 */
const DEFAULT_NAMES = [
  // Multi-listed — the ranking rule has to pick a venue
  'TSMC', '台積電', 'Sony', 'Toyota', 'HSBC', 'Alibaba', 'Shell plc',
  // Single home market
  'Apple Inc.', 'Nvidia', 'Rheinmetall', 'ASML', 'Samsung Electronics',
  'Tencent', 'Saudi Aramco', 'Nintendo', 'Foxconn', '聯發科', '中華電信',
  // Listed but usually written loosely in news copy
  'Boeing', 'Lockheed Martin', 'BlackRock', 'Volkswagen', 'BYD',
  // Not listed — must resolve to nothing
  'Angela Merkel', 'NATO', 'Taiwan', '台灣', 'United Nations', 'Gaza Strip',
  'Paris Agreement', 'World Health Organization', 'SpaceX', 'OpenAI',
  'European Central Bank', 'Hamas', 'Security Officials', '烏克蘭',
]

const UA = 'argus-dev-listing-check/0.1'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * A transport failure is not a negative result.
 *
 * The first run of this script conflated the two and produced a confident,
 * entirely false report: eighteen "no article" rows and a "no listing" for
 * Apple, all of them rate-limit replies being read as absence. Throwing here
 * keeps the report honest. Note that the panel's own hook does the opposite on
 * purpose — there, a failed lookup and an entity with no listing should look
 * identical, because both mean "show nothing".
 */
async function getJson(url: string): Promise<any> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.ok) return res.json()
    if (res.status === 404) return null          // a real absence
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt)
      continue
    }
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  throw new Error(`gave up after retries: ${url}`)
}

/** Same language ladder the panel uses: preferred language, then English. */
async function summary(name: string): Promise<{ title: string; qid?: string; description?: string } | null> {
  const langs = /[一-鿿]/.test(name) ? ['zh', 'en'] : ['en']
  for (const lang of langs) {
    const d = await getJson(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.replace(/ /g, '_'))}`,
    )
    if (d?.extract?.trim() && d.type !== 'disambiguation') {
      return { title: d.title, qid: d.wikibase_item, description: d.description }
    }
  }
  return null
}

async function claimsFor(qid: string): Promise<Claims> {
  const out: Claims = {}
  for (const property of ['P414', 'P17', 'P249']) {
    const d = await getJson(
      `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}` +
      `&property=${property}&format=json`,
    )
    Object.assign(out, d?.claims ?? {})
    // Wikidata answers 429 to an unthrottled loop; the panel makes three
    // requests once, this script makes hundreds.
    await sleep(1500)
    if (property === 'P414' && !out.P414?.length) break
  }
  return out
}

const NEVER_LISTED = ['person', 'place', 'work']

async function main() {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_NAMES

  const rows: string[] = []
  let resolved = 0, noArticle = 0, skippedByKind = 0, noListing = 0, quoteMissing = 0
  const listingCounts: number[] = []

  for (const name of names) {
    await sleep(500)
    let s: Awaited<ReturnType<typeof summary>>
    try {
      s = await summary(name)
    } catch (err) {
      rows.push(`${name.padEnd(24)} ✗  lookup failed: ${(err as Error).message}`)
      continue
    }
    if (!s || !s.qid) {
      noArticle++
      rows.push(`${name.padEnd(24)} —  no article`)
      continue
    }

    const kind = classifyEntity(s.description)
    if (NEVER_LISTED.includes(kind)) {
      skippedByKind++
      rows.push(`${name.padEnd(24)} ·  skipped as ${kind.padEnd(6)} (${s.description ?? ''})`)
      continue
    }

    let listings
    try {
      listings = extractListings(await claimsFor(s.qid))
    } catch (err) {
      rows.push(`${name.padEnd(24)} ✗  claims failed: ${(err as Error).message}`)
      continue
    }
    if (listings.length === 0) {
      noListing++
      rows.push(`${name.padEnd(24)} ·  no listing   [${kind}] (${s.description ?? ''})`)
      continue
    }

    // Every listing, not just the best one: the panel shows them all, so the
    // report has to show what "all" actually looks like — how many rows, in how
    // many currencies, priced as of how many different days.
    const quotes = await fetchQuotes(listings.map((l) => l.symbol))
    const bySymbol = new Map(quotes.map((q) => [q.symbol, q]))

    if (quotes.length === 0) {
      quoteMissing++
      rows.push(`${name.padEnd(24)} !  no quote for any of ${listings.map((l) => l.symbol).join(', ')}`)
      continue
    }

    resolved++
    listings.forEach((l, i) => {
      const q = bySymbol.get(l.symbol)
      const label = i === 0 ? name : ''
      if (!q) {
        rows.push(`${label.padEnd(24)} !  ${l.symbol.padEnd(10)} ${' '.repeat(24)}dropped     ${l.exchange}`)
        return
      }
      const chg = `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`
      rows.push(
        `${label.padEnd(24)} ${i === 0 ? '✓' : '·'}  ${q.symbol.padEnd(10)} ${String(q.price).padStart(9)} ` +
        `${q.currency.padEnd(4)} ${chg.padStart(7)}  ${q.asOf.slice(0, 16).replace('T', ' ')}  ${l.exchange}`,
      )
    })
    listingCounts.push(listings.length)
  }

  const sorted = [...listingCounts].sort((a, b) => a - b)
  const spread = sorted.length
    ? `; listings shown per company ${sorted[0]}–${sorted[sorted.length - 1]}, ` +
      `median ${sorted[sorted.length >> 1]}`
    : ''

  console.log(rows.join('\n'))
  console.log(
    `\n${names.length} names — ${resolved} quoted, ${quoteMissing} listing-but-no-quote, ` +
    `${noListing} no listing, ${skippedByKind} skipped by kind, ${noArticle} no article${spread}`,
  )
}

main().catch((err) => { console.error(err); process.exit(1) })
