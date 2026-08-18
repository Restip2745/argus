/**
 * What `@` can name.
 *
 * Most candidates come from data already on the client — the events in the
 * feed, the actors those events name, the countries this app holds figures for.
 * Nothing here asks the network, because a list that arrives 300 ms after the
 * keystroke is a list the operator has already typed past. Two things are
 * fetched, and both are deferred past the keystroke: an actor's encyclopedia
 * text, which waits for the pick, and the search results that cover names the
 * feed never mentioned, which arrive late and rank below everything local.
 */
import type { ArgusEvent, ContextEntity, ContextEntityType } from '../types'
import { countriesWithData } from '../data/countryData'
import { linkableEntityNames } from '../utils/entityLinker'
import { eventContextEntity, regionContextEntity, wikiContextEntity } from './contextEntity'

export interface MentionCandidate {
  /** The id of the `ContextEntity` this would produce. */
  id:   string
  type: ContextEntityType
  /** Canonical name — what gets written into the question and onto the card. */
  name: string
  /** The spelling that matched, when it was not the name itself. */
  via?: string
  /** True when this came from a Wikipedia search rather than from local data. */
  fromSearch?: boolean
  /**
   * Ready to add. Null for an actor, whose summary is the Wikipedia extract and
   * is not known until someone fetches it.
   */
  entity: ContextEntity | null
}

/**
 * Chinese names for the countries above, for matching only.
 *
 * `countryData` already recognises these spellings, but it recognises them as
 * places in their own right rather than as the keys it stores figures under —
 * `resolveCountryName('美國')` answers '美國', and nothing is filed there. The
 * interface is Chinese and the data is keyed in English, so the gap has to be
 * bridged somewhere; doing it here keeps it to the mention list instead of
 * changing what every existing caller of that resolver gets back.
 */
const ZH_COUNTRY_NAMES: Record<string, string> = {
  '美國': 'United States of America', '美国': 'United States of America',
  '中國': 'China',        '中国': 'China',
  '俄羅斯': 'Russia',     '俄罗斯': 'Russia',
  '烏克蘭': 'Ukraine',    '乌克兰': 'Ukraine',
  '台灣': 'Taiwan',       '台湾': 'Taiwan',
  '日本': 'Japan',
  '南韓': 'South Korea',  '韓國': 'South Korea',  '韩国': 'South Korea',
  '北韓': 'North Korea',  '朝鮮': 'North Korea',  '北朝鲜': 'North Korea',
  '德國': 'Germany',      '德国': 'Germany',
  '法國': 'France',       '法国': 'France',
  '英國': 'United Kingdom', '英国': 'United Kingdom',
  '印度': 'India',
  '巴基斯坦': 'Pakistan',
  '伊朗': 'Iran',
  '以色列': 'Israel',
  '巴勒斯坦': 'Palestine',
  '沙烏地阿拉伯': 'Saudi Arabia', '沙特阿拉伯': 'Saudi Arabia',
  '土耳其': 'Turkey',
  '敘利亞': 'Syria',      '叙利亚': 'Syria',
  '伊拉克': 'Iraq',
  '阿富汗': 'Afghanistan',
  '巴西': 'Brazil',
  '墨西哥': 'Mexico',
  '奈及利亞': 'Nigeria',  '尼日利亚': 'Nigeria',
  '蘇丹': 'Sudan',        '苏丹': 'Sudan',
  '埃及': 'Egypt',
  '南非': 'South Africa',
  '波蘭': 'Poland',       '波兰': 'Poland',
  '印尼': 'Indonesia',
  '越南': 'Vietnam',
  '泰國': 'Thailand',     '泰国': 'Thailand',
  '緬甸': 'Myanmar',      '缅甸': 'Myanmar',
  '菲律賓': 'Philippines', '菲律宾': 'Philippines',
  '澳洲': 'Australia',    '澳大利亚': 'Australia',
  '加拿大': 'Canada',
  '西班牙': 'Spain',
  '義大利': 'Italy',      '意大利': 'Italy',
  '希臘': 'Greece',       '希腊': 'Greece',
  '白俄羅斯': 'Belarus',  '白俄罗斯': 'Belarus',
  '阿根廷': 'Argentina',
  '委內瑞拉': 'Venezuela', '委内瑞拉': 'Venezuela',
  '哥倫比亞': 'Colombia', '哥伦比亚': 'Colombia',
  '衣索比亞': 'Ethiopia', '埃塞俄比亚': 'Ethiopia',
  '利比亞': 'Libya',    '利比亚': 'Libya',
  '索馬利亞': 'Somalia', '索马里': 'Somalia',
  '肯亞': 'Kenya',      '肯尼亚': 'Kenya',
  '馬來西亞': 'Malaysia', '马来西亚': 'Malaysia',
  '哈薩克': 'Kazakhstan', '哈萨克斯坦': 'Kazakhstan',
  '烏茲別克': 'Uzbekistan', '乌兹别克斯坦': 'Uzbekistan',
  '羅馬尼亞': 'Romania', '罗马尼亚': 'Romania',
  '塞爾維亞': 'Serbia', '塞尔维亚': 'Serbia',
  '科索沃': 'Kosovo',
  '摩洛哥': 'Morocco',
  '阿爾及利亞': 'Algeria', '阿尔及利亚': 'Algeria',
  '查德': 'Chad',        '乍得': 'Chad',
  '剛果民主共和國': 'Dem. Rep. Congo', '刚果民主共和国': 'Dem. Rep. Congo', '民主剛果': 'Dem. Rep. Congo',
  '瑞典': 'Sweden',
  '芬蘭': 'Finland',    '芬兰': 'Finland',
  '挪威': 'Norway',
  '荷蘭': 'Netherlands', '荷兰': 'Netherlands',
  '瑞士': 'Switzerland',
}

const ZH_BY_COUNTRY = new Map<string, string[]>()
for (const [zh, key] of Object.entries(ZH_COUNTRY_NAMES)) {
  ZH_BY_COUNTRY.set(key, [...(ZH_BY_COUNTRY.get(key) ?? []), zh])
}

const zhFor = (name: string): string[] => ZH_BY_COUNTRY.get(name) ?? []

/**
 * Everything `@` could name right now, in the order it is worth offering.
 *
 * Regions come first because they are the names an operator types from memory;
 * actors and events are things already on screen, which the click path already
 * serves well.
 */
export function mentionCandidates(events: ArgusEvent[], lang: string): MentionCandidate[] {
  const out: MentionCandidate[] = []

  for (const name of countriesWithData()) {
    const entity = regionContextEntity(name)
    out.push({ id: entity.id, type: 'region', name, entity, via: zhFor(name)[0] })
  }

  const seenActor = new Set<string>()
  for (const event of events) {
    for (const actor of linkableEntityNames(event.actors ?? [])) {
      if (seenActor.has(actor)) continue
      seenActor.add(actor)
      out.push({ id: `wiki-${actor}`, type: 'wiki', name: actor, entity: null })
    }
  }

  for (const event of events) {
    const entity = eventContextEntity(event, lang)
    out.push({ id: entity.id, type: 'event', name: entity.name, entity })
  }

  return out
}

const TYPE_RANK: Record<ContextEntityType, number> = { region: 0, wiki: 1, event: 2, celestial: 3 }

/** Every spelling a candidate answers to. */
const formsOf = (candidate: MentionCandidate): string[] =>
  [candidate.name, ...zhFor(candidate.name)].map(s => s.toLowerCase())

/**
 * How well `query` matched, lower being better. -1 for no match at all.
 *
 * Whole name, then prefix, then anywhere — and deliberately not prefix-first.
 * Headlines are named after what they are about, so a dozen of them start with
 * the country the operator just typed; ranking every one of those above the
 * country itself is how `@美國` came back with six articles about America and no
 * America.
 */
function score(candidate: MentionCandidate, query: string): number {
  const q = query.toLowerCase()
  let best = -1
  for (const form of formsOf(candidate)) {
    const s = form === q ? 0 : form.startsWith(q) ? 1 : form.includes(q) ? 2 : -1
    if (s >= 0 && (best === -1 || s < best)) best = s
  }
  return best
}

/**
 * The candidates worth showing for what has been typed so far.
 *
 * An empty query is not an empty answer: `@` on its own offers the head of the
 * list, so the feature can be found by pressing the key rather than by knowing
 * in advance what is in there.
 */
export function matchMentions(
  candidates: MentionCandidate[],
  query: string,
  limit = 6,
): MentionCandidate[] {
  if (!query) return candidates.slice(0, limit)

  const scored: Array<{ c: MentionCandidate; s: number }> = []
  for (const c of candidates) {
    const s = score(c, query)
    if (s >= 0) scored.push({ c, s })
  }

  scored.sort((a, b) =>
    a.s - b.s ||
    TYPE_RANK[a.c.type] - TYPE_RANK[b.c.type] ||
    a.c.name.length - b.c.name.length ||
    a.c.name.localeCompare(b.c.name),
  )

  return scored.slice(0, limit).map(x => {
    const zh = zhFor(x.c.name).find(z => z.includes(query))
    return zh ? { ...x.c, via: zh } : x.c
  })
}

/** The entity a picked candidate adds, once its summary is in hand. */
export function candidateEntity(
  candidate: MentionCandidate,
  extract?: string | null,
): ContextEntity {
  return candidate.entity ?? wikiContextEntity(candidate.name, extract)
}

/**
 * Candidates for names the feed has never mentioned.
 *
 * The local list can only offer what is already on the client, which is a
 * closed world: an operator asking about someone this hour's headlines happen
 * not to name would type the name and be told there is no such thing. These
 * come from a Wikipedia title search, so they are guesses rather than data —
 * marked as such, and placed under the local matches.
 */
export function searchedCandidates(titles: string[]): MentionCandidate[] {
  return titles.map(title => ({
    id:         `wiki-${title}`,
    type:       'wiki' as const,
    name:       title,
    entity:     null,
    fromSearch: true,
  }))
}

/**
 * Local matches first, then whatever the search turned up that they did not
 * already cover.
 *
 * Local before searched on purpose: a country this app holds figures for is a
 * better answer than an article about that country, and it is the one that
 * costs no fetch.
 */
export function withSearchResults(
  local: MentionCandidate[],
  searched: MentionCandidate[],
  limit = 8,
): MentionCandidate[] {
  const seen = new Set(local.map(c => c.id))
  const out  = [...local]
  for (const c of searched) {
    if (out.length >= limit) break
    if (seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
  }
  return out
}
