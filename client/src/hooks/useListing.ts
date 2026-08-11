import { useState, useEffect, useRef } from 'react'
import { extractListings, type Claims, type Listing } from '../utils/listing'
import type { EntityKind } from '../data/entityKind'

/**
 * The stock listings for an entity, or none — which is the usual answer.
 *
 * Kept deliberately quiet: an entity with no listing is not an error, it is
 * almost everything. Callers render nothing rather than reporting a miss.
 */
interface State {
  listings: Listing[]
  loading:  boolean
}

const EMPTY: State = { listings: [], loading: false }

/**
 * Shared across hook instances and keyed by QID.
 *
 * Negative results are cached too, and that is the point: the same handful of
 * people and places get opened over and over in a session, and each one would
 * otherwise re-ask Wikidata a question whose answer is permanently "no".
 */
const listingCache = new Map<string, Listing[]>()

/**
 * Kinds that are never a listed company, from the description heuristic in
 * `entityKind.ts`.
 *
 * This is a cost filter, not the correctness gate — the claims are what decide
 * whether something is listed. `unknown` is deliberately allowed through: the
 * heuristic reads a free-text Wikidata description and misses plenty of real
 * companies, and letting those fall back to the actual claims is cheaper than
 * being wrong about them.
 */
const NEVER_LISTED: EntityKind[] = ['person', 'place', 'work']

const CLAIMS_API = 'https://www.wikidata.org/w/api.php'

/**
 * One property's statements.
 *
 * `wbgetclaims` rather than a whole-entity fetch because the difference is
 * enormous: TSMC's full claim set is ~71 KB, its `P414` alone is ~2.6 KB, and
 * for an entity that is not a company at all the reply is an empty object. A
 * panel opening on a politician should not pull down a dump.
 */
async function fetchClaims(qid: string, property: string, signal: AbortSignal): Promise<Claims> {
  const url = `${CLAIMS_API}?action=wbgetclaims&entity=${encodeURIComponent(qid)}` +
              `&property=${property}&format=json&origin=*`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Wikidata ${res.status}`)
  const data = await res.json() as { claims?: Claims }
  return data.claims ?? {}
}

/**
 * Listings for `qid`, in three small requests at most.
 *
 * Exchange statements come first because their absence ends the question, and
 * that absence is the common case. Only once an entity is known to trade
 * somewhere is it worth asking for its country (to rank multiple listings) and
 * its bare ticker (the fallback for entries that record one without a venue).
 */
async function resolveListings(qid: string, signal: AbortSignal): Promise<Listing[]> {
  const exchangeClaims = await fetchClaims(qid, 'P414', signal)
  if (!exchangeClaims.P414?.length) return []

  const [country, ticker] = await Promise.all([
    fetchClaims(qid, 'P17', signal).catch(() => ({} as Claims)),
    fetchClaims(qid, 'P249', signal).catch(() => ({} as Claims)),
  ])

  return extractListings({ ...exchangeClaims, ...country, ...ticker })
}

/**
 * Stock listings for a Wikidata entity.
 *
 * `qid` comes from the `wikibase_item` field the Wikipedia summary already
 * returns, so nothing extra is needed to find the entity — only to ask what it
 * trades as. Pass null to skip.
 */
export function useListing(qid: string | null, kind: EntityKind): State {
  const [state, setState] = useState<State>(EMPTY)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!qid || NEVER_LISTED.includes(kind)) {
      setState(EMPTY)
      return
    }

    const cached = listingCache.get(qid)
    if (cached) {
      setState({ listings: cached, loading: false })
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState({ listings: [], loading: true })

    resolveListings(qid, ctrl.signal)
      .then((listings) => {
        if (ctrl.signal.aborted) return
        listingCache.set(qid, listings)
        setState({ listings, loading: false })
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        // Nothing to report to the reader: a listing that cannot be resolved
        // and an entity that has none look identical on screen, by design.
        setState(EMPTY)
      })

    return () => ctrl.abort()
  }, [qid, kind])

  return state
}
