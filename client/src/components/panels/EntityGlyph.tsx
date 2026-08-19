import { useCachedEntityKind } from '../../hooks/useEntityKind'
import { ENTITY_ICON_SRC, ENTITY_KIND_LABEL, type EntityKind } from '../../data/entityKind'

/**
 * 16px, not the 10px of the type these sit beside.
 *
 * Measured, not guessed: rendered at 10 and 12 the four marks are dark blobs and
 * the building and the document are not tellable apart. 16 is the smallest size
 * at which all four still read, because a drawing needs pixels for its interior
 * where a glyph only has to be one shape. The artwork was also flattened against
 * its own glow before shipping for the same reason — downscaling averaged a
 * bright thin stroke into a wide dim halo and the halo won.
 */
const DEFAULT_SIZE = 16

interface KindProps {
  kind:  EntityKind
  size?: number
  /**
   * Set where the kind is already spelled out in text right next to the mark,
   * so a screen reader is not told the same thing twice.
   */
  decorative?: boolean
}

/**
 * The mark for a known kind.
 *
 * Every place that shows an entity kind goes through here, so how a kind is
 * drawn is decided in one place rather than at each call site.
 */
export function EntityKindGlyph({ kind, size = DEFAULT_SIZE, decorative }: KindProps) {
  return (
    <img
      src={ENTITY_ICON_SRC[kind]}
      alt={decorative ? '' : ENTITY_KIND_LABEL[kind]}
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    />
  )
}

interface NameProps {
  name:  string
  size?: number
}

/**
 * The mark for a name whose kind has to be looked up first.
 *
 * A component rather than a bare call because the callers are `.map` bodies over
 * actor names, and a hook cannot run in a loop.
 */
export function EntityGlyph({ name, size }: NameProps) {
  const kind = useCachedEntityKind(name)
  return <EntityKindGlyph kind={kind} size={size} />
}
