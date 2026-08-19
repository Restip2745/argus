/**
 * What kind of thing is this Wikipedia entry about?
 *
 * The panel used to assume every linked entity was a person — it was called
 * PersonPanel, showed a person glyph and offered questions like "political
 * stance" and "key achievements". In practice the entities pulled out of news
 * copy are just as often organisations, countries, treaties or wars, and asking
 * about the career of a peace accord is nonsense.
 *
 * Wikipedia's REST summary carries a short Wikidata `description` ("American
 * politician", "intergovernmental military alliance", "country in East Asia").
 * Classifying on that is a heuristic, not a lookup — Wikidata's actual
 * instance-of is not in this endpoint. So the fallback is a neutral kind rather
 * than a wrong guess, and nothing downstream depends on being right.
 *
 * The description arrives in whatever language `useWikiSummary` resolved, which
 * for a Chinese interface is Chinese first. An English-only word list therefore
 * classified nothing at all there — every entity fell through to `unknown`. So
 * there are two vocabularies, and they need different matching rules: English
 * needs word boundaries, Chinese has none.
 */

export type EntityKind = 'person' | 'org' | 'place' | 'work' | 'unknown'

/**
 * Kind glyphs are a separate channel from the event category glyphs in
 * `symbology.ts` — they mark what an entity *is*, and never appear beside an
 * event marker, so there is no collision to resolve between the two sets.
 */
export const ENTITY_GLYPH: Record<EntityKind, string> = {
  person:  '👤',
  org:     '⬢',
  place:   '⊙',
  work:    '▣',
  unknown: '◇',
}

/**
 * Custom artwork for each kind, served from `public/icons/entity`.
 *
 * Drawn as one set so they read as siblings: violet HUD linework on a
 * transparent ground, one cyan accent each. They exist because 👤 was a colour
 * emoji sitting among geometric glyphs and could not be redrawn to match —
 * Unicode's geometric block has no person shape whose silhouette differs from
 * ⬢ ⊙ ▣ ◇, which is presumably why the emoji was reached for in the first place.
 *
 * Total rather than partial, so adding a kind will not compile until someone
 * decides what it looks like. `ENTITY_GLYPH` stays as the text vocabulary these
 * were drawn from, and as what the tests and the symbology cross-check read.
 *
 * `unknown` gets a mark too, and it carries more weight than the others: the
 * chips show it for every name nothing has been looked up for yet, which is
 * most of them on first paint. It is drawn as an open bracket — a diamond with
 * a gap at each corner — so it reads as an unresolved contact rather than as a
 * claim about what the thing is.
 */
export const ENTITY_ICON_SRC: Record<EntityKind, string> = {
  person:  '/icons/entity/person.png',
  org:     '/icons/entity/org.png',
  place:   '/icons/entity/place.png',
  work:    '/icons/entity/work.png',
  unknown: '/icons/entity/unknown.png',
}

export const ENTITY_KIND_LABEL: Record<EntityKind, string> = {
  person:  'PERSON',
  org:     'ORGANISATION',
  place:   'PLACE',
  work:    'EVENT / DOCUMENT',
  unknown: 'ENTITY',
}

/**
 * Occupation words. Checked first because they are the most specific: a
 * description containing "politician" is about a person regardless of what
 * else it mentions. Word boundaries matter — "president" must not fire on
 * "presidential election", and "monarch" must not fire on "monarchy".
 */
const PERSON_WORDS = [
  'politician', 'president', 'prime minister', 'minister', 'chancellor',
  'senator', 'governor', 'mayor', 'diplomat', 'ambassador',
  'actor', 'actress', 'singer', 'musician', 'composer', 'artist',
  'author', 'writer', 'novelist', 'poet', 'journalist', 'broadcaster',
  'athlete', 'footballer', 'player', 'coach', 'boxer', 'driver',
  'scientist', 'physicist', 'chemist', 'biologist', 'economist', 'historian',
  'businessman', 'businesswoman', 'entrepreneur', 'executive', 'banker',
  'activist', 'lawyer', 'judge', 'jurist', 'philosopher', 'theologian',
  'general', 'admiral', 'officer', 'soldier', 'commander',
  'monarch', 'king', 'queen', 'emperor', 'prince', 'princess', 'pope',
  'bishop', 'cleric', 'imam', 'rabbi', 'engineer', 'architect', 'designer',
  'director', 'producer', 'presenter', 'model', 'chef', 'astronaut',
]

const ORG_WORDS = [
  'organization', 'organisation', 'company', 'corporation', 'conglomerate',
  'agency', 'bureau', 'authority', 'commission', 'committee', 'council',
  'party', 'coalition', 'alliance', 'bloc', 'union', 'federation',
  'association', 'institution', 'institute', 'university', 'college',
  'school', 'foundation', 'charity', 'ngo', 'bank', 'firm', 'startup',
  'ministry', 'department', 'directorate', 'court', 'parliament', 'congress',
  'assembly', 'senate', 'club', 'team', 'squad', 'network', 'broadcaster',
  'newspaper', 'publisher', 'militia', 'militant group', 'armed group',
  'paramilitary', 'cartel', 'syndicate', 'consortium', 'manufacturer',
]

const PLACE_WORDS = [
  'country', 'nation', 'state in', 'sovereign state', 'city', 'town',
  'village', 'municipality', 'capital', 'province', 'prefecture', 'region',
  'territory', 'district', 'county', 'borough', 'island', 'archipelago',
  'peninsula', 'river', 'lake', 'sea', 'ocean', 'strait', 'gulf', 'bay',
  'mountain', 'volcano', 'desert', 'valley', 'canyon', 'forest',
  'continent', 'settlement', 'port', 'airport', 'neighbourhood',
  'neighborhood', 'landlocked', 'metropolis',
]

const WORK_WORDS = [
  'treaty', 'agreement', 'accord', 'protocol', 'convention', 'pact',
  'war', 'conflict', 'battle', 'siege', 'offensive', 'invasion', 'uprising',
  'revolution', 'genocide', 'massacre', 'attack', 'bombing', 'assassination',
  'election', 'referendum', 'summit', 'conference', 'negotiation',
  'law', 'act of', 'bill', 'resolution', 'sanctions', 'doctrine',
  'earthquake', 'hurricane', 'cyclone', 'typhoon', 'flood', 'wildfire',
  'pandemic', 'epidemic', 'outbreak', 'disaster', 'crisis',
  'film', 'novel', 'album', 'song', 'video game', 'television series',
  'tournament', 'championship', 'olympics', 'world cup', 'mission',
  'spacecraft', 'satellite', 'rocket', 'telescope',
]

// ── Chinese vocabulary ───────────────────────────────────────────────────────
//
// Both script variants are listed for every word that has two. zh.wikipedia
// serves the description in whichever variant the request resolved to, and a
// zh-TW interface still routinely gets Simplified back, so covering one script
// would leave half the cases unclassified — the same failure this vocabulary
// exists to fix.
//
// Suffixes do a lot of work here: 學家 catches 科學家 / 物理學家 / 經濟學家 /
// 歷史學家 in one entry, and 總統 catches 副總統. Single characters (省, 島, 市)
// are listed deliberately and used head-only; see `classifyByHead`.

const PERSON_WORDS_ZH = [
  '政治人物', '政治家', '總統', '总统', '總理', '总理', '首相', '主席',
  '部長', '部长', '大臣', '議員', '议员', '州長', '州长', '省長', '省长',
  '市長', '市长', '外交官', '大使',
  '總書記', '总书记', '書記', '书记', '領導人', '领导人', '發言人', '发言人',
  '演員', '演员', '歌手', '音樂家', '音乐家', '作曲家', '藝術家', '艺术家',
  '畫家', '画家', '作家', '小說家', '小说家', '詩人', '诗人',
  '記者', '记者', '主持人', '導演', '导演', '製片人', '制片人',
  '運動員', '运动员', '選手', '选手', '教練', '教练', '運動家', '运动家',
  '學家', '学家', '學者', '学者', '教授',
  '企業家', '企业家', '商人', '銀行家', '银行家',
  '律師', '律师', '法官', '檢察官', '检察官',
  '將軍', '将军', '軍人', '军人', '指揮官', '指挥官', '士兵', '飛行員', '飞行员',
  '君主', '國王', '国王', '女王', '皇帝', '王子', '公主',
  '教宗', '主教', '神職人員', '神职人员',
  '工程師', '工程师', '建築師', '建筑师', '設計師', '设计师',
  '模特兒', '模特儿', '廚師', '厨师', '太空人', '宇航員', '宇航员',
  '活動家', '活动家', '運動者', '运动者',
]

const ORG_WORDS_ZH = [
  '組織', '组织', '公司', '企業', '企业', '集團', '集团', '財團', '财团',
  '機構', '机构', '機關', '机关', '部門', '部门',
  '委員會', '委员会', '理事會', '理事会', '議會', '议会', '國會', '国会',
  '政黨', '政党', '黨', '党',
  '聯盟', '联盟', '同盟', '聯合會', '联合会', '協會', '协会', '學會', '学会',
  '基金會', '基金会', '大學', '大学', '學院', '学院', '學校', '学校',
  '銀行', '银行', '交易所', '法院',
  '軍隊', '军队', '武裝團體', '武装团体',
  '媒體', '媒体', '電視台', '电视台', '報紙', '报纸', '出版社',
  '俱樂部', '俱乐部', '球隊', '球队', '車隊', '车队',
  '智庫', '智库', '工會', '工会',
]

const PLACE_WORDS_ZH = [
  '國家', '国家', '王國', '王国', '帝國', '帝国', '共和國', '共和国', '城邦',
  '城市', '都市', '城鎮', '城镇', '村莊', '村庄', '首都', '聚落', '城',
  '行政區', '行政区', '地區', '地区', '領土', '领土',
  '省', '州', '縣', '县', '市', '區', '区',
  '島嶼', '岛屿', '群島', '群岛', '半島', '半岛', '島', '岛',
  '河流', '湖泊', '海峽', '海峡', '海灣', '海湾', '大洋',
  '河', '湖', '海', '洋',
  '山脈', '山脉', '火山', '山谷', '峽谷', '峡谷', '沙漠', '森林', '山',
  '大陸', '大陆', '洲', '港口', '機場', '机场', '定居點', '定居点',
]

const WORK_WORDS_ZH = [
  '條約', '条约', '協議', '协议', '協定', '协定', '公約', '公约',
  '議定書', '议定书',
  '戰爭', '战争', '大戰', '大战', '內戰', '内战',
  '衝突', '冲突', '戰役', '战役', '攻勢', '攻势', '入侵',
  '起義', '起义', '革命', '政變', '政变', '種族滅絕', '种族灭绝',
  '屠殺', '屠杀', '襲擊', '袭击', '爆炸案', '暗殺', '暗杀',
  '抗議', '抗议', '示威', '罷工', '罢工',
  '選舉', '选举', '公投', '公民投票', '峰會', '峰会', '談判', '谈判',
  '法律', '法案', '決議', '决议', '制裁', '主義', '主义',
  '地震', '颶風', '飓风', '氣旋', '气旋', '颱風', '台风',
  '洪水', '野火', '大火', '大流行', '疫情', '傳染病', '传染病',
  '災難', '灾难', '危機', '危机',
  '電影', '电影', '小說', '小说', '專輯', '专辑', '歌曲',
  '電子遊戲', '电子游戏', '電視劇', '电视剧', '影集',
  '錦標賽', '锦标赛', '聯賽', '联赛', '奧運', '奥运', '運動會', '运动会',
  '世界盃', '世界杯',
  '任務', '任务', '太空船', '太空梭', '衛星', '卫星', '火箭',
  '望遠鏡', '望远镜',
]

/** The four lists, in the order they are tested. */
const ZH_VOCABULARY: Array<[Exclude<EntityKind, 'unknown'>, string[]]> = [
  ['person', PERSON_WORDS_ZH],
  ['org',    ORG_WORDS_ZH],
  ['place',  PLACE_WORDS_ZH],
  ['work',   WORK_WORDS_ZH],
]

function hasWord(haystack: string, needle: string): boolean {
  // Escape regex metacharacters, then require boundaries so "president" does
  // not match inside "presidential".
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(haystack)
}

function anyWord(haystack: string, words: string[]): boolean {
  return words.some((w) => hasWord(haystack, w))
}

/**
 * Classify a Chinese description by its final word.
 *
 * Chinese has no word boundaries, so the trick that keeps "president" out of
 * "presidential election" is unavailable — a plain substring test reads
 * 總統選舉 (a presidential *election*) as a person. What replaces it is word
 * order: these descriptions are head-final, so the last word says what the
 * thing is and every word before it merely modifies. 秘魯總統選舉 ends in 選舉
 * and is an election; 美國政治人物 ends in 政治人物 and is a person.
 *
 * Every kind is tested against the head before any of them is tested against
 * the body, which is what makes the ordering safe: the person list is checked
 * first, but only ever against the head, so it cannot claim a description whose
 * head belongs to another kind.
 */
function classifyByHead(text: string): EntityKind | null {
  const d = withoutTrailingAside(text)
  for (const [kind, words] of ZH_VOCABULARY) {
    if (words.some((w) => d.endsWith(w))) return kind
  }
  return null
}

/**
 * Strip what sits between a description and its head word.
 *
 * A term of office or a romanisation is routinely parked in brackets at the end
 * — 「中共中央委員會總書記（2012年至今）」, 「德國聯邦總理（Angela Merkel）」 — and
 * every one of those hides the very word this is reading for. Repeated because
 * both can appear, and trailing punctuation between them.
 */
function withoutTrailingAside(text: string): string {
  let s = text.trim()
  for (;;) {
    const next = s
      .replace(/[（(][^（()）]*[)）]\s*$/, '')
      .replace(/[。．.,，、;；:：\s]+$/, '')
    if (next === s) return s
    s = next
  }
}

/**
 * Chinese fallback for descriptions whose head is not in the vocabulary —
 * 「日本的一位知名演員,活躍於1980年代」trails off past its head noun.
 *
 * Single characters are excluded here. 省 / 島 / 市 / 黨 are reliable as a head
 * and disastrous as a substring: 市 alone would read 市場監管 as a place.
 */
function classifyByBody(d: string): EntityKind | null {
  for (const [kind, words] of ZH_VOCABULARY) {
    if (words.some((w) => w.length > 1 && d.includes(w))) return kind
  }
  return null
}

/**
 * Classify from a Wikidata short description.
 *
 * Three passes, each a no-op for the language it does not belong to: a Chinese
 * needle never matches an English description and vice versa, so they can share
 * one function without either having to detect which language it is looking at.
 *
 * Within the English pass, person is tested first because occupations are the
 * least ambiguous signal; a description that mentions both an occupation and an
 * institution ("American politician who served in the Senate") is about the
 * person. The Chinese passes reach the same result by a different route — see
 * `classifyByHead`.
 *
 * `title` is the last resort, and only ever read head-first. The description is
 * an optional field and zh.wikipedia does not always return one — a sweep of
 * twenty real entities against the live API came back complete on one run and
 * missing eight on another, so it cannot be relied on. A Chinese title carries
 * its own head noun (俄烏戰爭, 巴黎協定, 荷姆茲海峽), which covers most of what a
 * missing description would have said.
 *
 * Deliberately not run through the English word lists: head-final is a property
 * of Chinese, not of titles, and "General Motors" would come back a person.
 */
export function classifyEntity(description?: string | null, title?: string | null): EntityKind {
  const d = description?.toLowerCase() ?? ''

  if (d) {
    const byHead = classifyByHead(d)
    if (byHead) return byHead

    if (anyWord(d, PERSON_WORDS)) return 'person'
    if (anyWord(d, ORG_WORDS))    return 'org'
    if (anyWord(d, PLACE_WORDS))  return 'place'
    if (anyWord(d, WORK_WORDS))   return 'work'

    const byBody = classifyByBody(d)
    if (byBody) return byBody
  }

  return (title ? classifyByHead(title.toLowerCase()) : null) ?? 'unknown'
}

export function entityGlyph(description?: string | null): string {
  return ENTITY_GLYPH[classifyEntity(description)]
}
