import type { SelectedEntity } from '../store'
import { resolveCountryName } from '../data/countryData'

const PERSON_LINK_STYLE: React.CSSProperties = {
  color: '#c084fc',
  cursor: 'pointer',
  borderBottom: '1px dotted #c084fc66',
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  letterSpacing: 'inherit',
  transition: 'color 0.15s',
}

interface EntityLinkProps {
  text: string
  knownEntities: string[]
  onEntityClick: (person: SelectedEntity) => void
  style?: React.CSSProperties
}

/**
 * Renders text with detected person names as clickable links.
 * `knownEntities` is the list of names to detect (e.g. event actors).
 * Names are matched case-insensitively as whole words.
 */
export function LinkedText({ text, knownEntities, onEntityClick, style }: EntityLinkProps) {
  if (!text || knownEntities.length === 0) {
    return <span style={style}>{text}</span>
  }

  const escaped = knownEntities
    .filter(n => n.length >= 2)
    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escaped.length === 0) return <span style={style}>{text}</span>

  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <span style={style}>
      {parts.map((part, i) => {
        const matched = knownEntities.find(n => n.toLowerCase() === part.toLowerCase())
        if (matched) {
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onEntityClick({ name: matched, wikiTitle: matched }) }}
              style={PERSON_LINK_STYLE}
              title={`View person: ${matched}`}
              onMouseEnter={e => { e.currentTarget.style.color = '#d8b4fe' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#c084fc' }}
            >
              {part}
            </button>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

/**
 * Head nouns that name a *class* of actor rather than a particular one.
 *
 * The model is asked for "key parties involved" and answers in whatever words
 * fit — "Security Officials", "Technology Providers", "Chinese tech firms".
 * Those are fair answers to that question and useless as links: no
 * encyclopedia has an entry for them, so they become chips that can only
 * report having nothing behind them.
 *
 * The list leaves out every head that a real name also ends in — "forces"
 * (Sudanese Armed Forces), "fighters" (Foo Fighters), "airlines" (United
 * Airlines), "company" (Ford Motor Company), "nations", "states", "banks".
 * The two mistakes are not equal: letting a descriptor through costs a chip
 * that honestly says it found nothing, while dropping a real entity removes a
 * link that worked. So the doubtful cases stay.
 */
const GENERIC_HEADS = new Set([
  'officials', 'official', 'authorities', 'leaders', 'leadership', 'representatives',
  'workers', 'employees', 'staff', 'personnel', 'contractors', 'providers', 'suppliers',
  'manufacturers', 'developers', 'operators', 'producers', 'investors', 'shareholders',
  'customers', 'consumers', 'users', 'subscribers', 'clients',
  'residents', 'citizens', 'civilians', 'villagers', 'locals', 'population', 'populations',
  'students', 'teachers', 'doctors', 'nurses', 'scientists', 'researchers', 'experts',
  'analysts', 'observers', 'journalists', 'reporters', 'lawyers', 'engineers',
  'activists', 'protesters', 'demonstrators', 'militants', 'insurgents',
  'rebels', 'gunmen', 'attackers', 'suspects', 'victims', 'survivors', 'witnesses',
  'migrants', 'refugees', 'families', 'communities', 'groups', 'members', 'participants',
  'companies', 'firms', 'businesses', 'startups',
])

/** True when the phrase describes a category of actor rather than naming one. */
export function isGenericDescriptor(name: string): boolean {
  const head = (name.trim().split(/\s+/).pop() ?? '').toLowerCase().replace(/[^a-z]/g, '')
  return GENERIC_HEADS.has(head)
}

/**
 * Extract likely person names from event actors list.
 * Filters out obvious non-person entries (organizations, countries, etc.).
 */
export function extractPersonNames(actors: string[]): string[] {
  if (!actors?.length) return []

  const orgPatterns = [
    /^(the\s+)?united\s+(states|nations|kingdom)/i,
    /\b(government|ministry|department|agency|force|army|navy|military|police|council|commission|committee|organization|organisation|corporation|corp|inc|ltd|llc|party|group|alliance|union|federation|republic|embassy|institute|authority|bureau|office|service|command|guard|front)\b/i,
    /^(eu|un|nato|who|imf|opec|asean|g[0-9]+|fifa|unesco|unicef|cia|fbi|nsa|dod|dhs|irs)$/i,
    /^[A-Z]{2,6}$/, // All-caps acronyms
  ]

  return actors.filter(actor => {
    if (actor.length < 3) return false
    if (resolveCountryName(actor) !== null) return false
    if (isGenericDescriptor(actor)) return false
    return !orgPatterns.some(p => p.test(actor))
  })
}
