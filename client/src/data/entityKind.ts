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
 * Classify from a Wikidata short description.
 *
 * Person is tested first because occupations are the least ambiguous signal;
 * a description that mentions both an occupation and an institution ("American
 * politician who served in the Senate") is about the person.
 */
export function classifyEntity(description?: string | null): EntityKind {
  if (!description) return 'unknown'
  const d = description.toLowerCase()

  if (anyWord(d, PERSON_WORDS)) return 'person'
  if (anyWord(d, ORG_WORDS))    return 'org'
  if (anyWord(d, PLACE_WORDS))  return 'place'
  if (anyWord(d, WORK_WORDS))   return 'work'
  return 'unknown'
}

export function entityGlyph(description?: string | null): string {
  return ENTITY_GLYPH[classifyEntity(description)]
}
