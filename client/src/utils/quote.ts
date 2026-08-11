/**
 * Presentation rules for a quote: what colour it is, and when it was priced.
 *
 * Both are here rather than inline in the chip because both are decisions
 * rather than formatting. The colour depends on a convention the reader picks;
 * the timestamp is the thing that stops two honest rows from looking like a
 * contradiction.
 */

export type UpColor = 'green' | 'red'

/**
 * Rise and fall colours.
 *
 * Offset from the scene palette on purpose. `SEVERITY_COLOR.CRITICAL` is
 * #ff3b30 and `CATEGORY_TINT.ENVIRONMENT` is #4fd18b, and `symbology.ts`
 * records what happened the last time two channels shared a colour — a red dot
 * meant two different things. These only ever render inside a panel, never
 * beside a marker, but they are still kept visibly distinct from both.
 */
const RISE = '#2fcf8f'
const FALL = '#ef5a5a'

/** No meaningful move. Matches the panel's muted text rather than shouting. */
const FLAT = '#5d7c92'

/**
 * A change small enough to print as 0.00%.
 *
 * Colouring a row that reads "+0.00%" green claims a direction the number does
 * not support.
 */
const FLAT_THRESHOLD = 0.005

export function quoteColor(changePct: number, upColor: UpColor): string {
  if (!Number.isFinite(changePct) || Math.abs(changePct) < FLAT_THRESHOLD) return FLAT
  // Rising is the reader's up-colour; falling is the other one.
  return (changePct > 0) === (upColor === 'green') ? RISE : FALL
}

/** Signed percentage, always with its sign so the direction survives a glance. */
export function formatChange(changePct: number): string {
  if (!Number.isFinite(changePct)) return '—'
  const rounded = changePct.toFixed(2)
  // "-0.00" is arithmetic noise, not a fall.
  if (Math.abs(changePct) < FLAT_THRESHOLD) return '0.00%'
  return `${changePct > 0 ? '+' : ''}${rounded}%`
}

/**
 * The day the price was set, as something the reader cannot mistake for "now".
 *
 * This is the whole reason the row is trustworthy. AstraZeneca closed +3.5% in
 * London and -4.9% in New York on the same screen, and both were right: London
 * was that day, New York was the previous session. Undated, those two rows are
 * a contradiction; dated, they are a comparison.
 *
 * Day, not minute. The clock time was tried first and did not survive contact
 * with the panel — at three listings the row overflowed and the date column,
 * the one part that had to be legible, was what got clipped. The exact instant
 * is still available on hover; which session a price belongs to is what has to
 * be readable without asking.
 *
 * The year appears only when it is not the current one, which keeps the common
 * case short while making a genuinely old print impossible to miss.
 */
export function formatAsOf(iso: string, now: number = Date.now()): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''

  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${p(d.getMonth() + 1)}-${p(d.getDate())}`

  return d.getFullYear() === new Date(now).getFullYear()
    ? stamp
    : `${d.getFullYear()}-${stamp}`
}

/** Whether the price was set on a day before today, i.e. it is a prior close. */
export function isPriorSession(iso: string, now: number = Date.now()): boolean {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  const today = new Date(now)
  return d.getFullYear() !== today.getFullYear()
      || d.getMonth() !== today.getMonth()
      || d.getDate() !== today.getDate()
}

/**
 * Price with a sane number of decimals for its magnitude.
 *
 * Quotes arrive spanning five orders of magnitude — Samsung prints 230000 KRW,
 * Nintendo's ADR prints 12.72 USD — and one fixed precision serves neither.
 */
export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '—'
  const decimals = price >= 1000 ? 0 : price >= 1 ? 2 : 4
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
