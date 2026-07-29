/**
 * ARGUS type scale.
 *
 * Five tiers, no sizes in between, and a hard floor of 10px. Enforced by
 * `src/styles/__tests__/type-scale.test.ts`, which fails the build if any
 * source file introduces a smaller size.
 *
 * The floor exists because sub-10px text makes the operator lean toward the
 * screen and squint — the posture of someone decoding, not someone overseeing.
 * Density is bought back by demoting information a tier, never by shrinking it.
 *
 *   MICRO  10  unit labels, meta, timestamps, uppercase + letterspaced only
 *   BODY   11  default UI text, list rows, controls
 *   READ   13  prose the operator actually reads — titles, summaries
 *   LEAD   15  section leads, clock
 *   HERO   21  the handful of numbers that carry the world state
 *
 * HERO is deliberately scarce. It is currently spent on exactly one thing: the
 * four severity counts in the status bar. Adding a sixth hero number means
 * taking the tier away from something else.
 */
export const FS = {
  MICRO: 10,
  BODY:  11,
  READ:  13,
  LEAD:  15,
  HERO:  21,
} as const

export type TypeTier = keyof typeof FS

/** Smallest permitted font size anywhere in the app. */
export const MIN_FONT_PX = 10

/** `px` string form, for inline styles. */
export const fs = (tier: TypeTier): string => `${FS[tier]}px`
