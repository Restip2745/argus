import type { SelectedPerson } from '../store'

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
  knownPersons: string[]
  onPersonClick: (person: SelectedPerson) => void
  style?: React.CSSProperties
}

/**
 * Renders text with detected person names as clickable links.
 * `knownPersons` is the list of names to detect (e.g. event actors).
 * Names are matched case-insensitively as whole words.
 */
export function LinkedText({ text, knownPersons, onPersonClick, style }: EntityLinkProps) {
  if (!text || knownPersons.length === 0) {
    return <span style={style}>{text}</span>
  }

  const escaped = knownPersons
    .filter(n => n.length >= 2)
    .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (escaped.length === 0) return <span style={style}>{text}</span>

  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <span style={style}>
      {parts.map((part, i) => {
        const matched = knownPersons.find(n => n.toLowerCase() === part.toLowerCase())
        if (matched) {
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onPersonClick({ name: matched, wikiTitle: matched }) }}
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
    return !orgPatterns.some(p => p.test(actor))
  })
}
