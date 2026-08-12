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

/** One dated close from `/api/market/history`. */
export interface HistoryPoint {
  t:     string
  close: number
}

export interface ChangeSince {
  changePct:    number
  /** The close the change is measured from. */
  baseline:     number
  /** When that close was set — the date the reader is being shown, and rarely
   *  the same day as the event. */
  baselineDate: string
  latest:       number
}

/**
 * How far a market has moved since an instant, or null when it cannot be said.
 *
 * The baseline is the last close *at or before* `sinceIso`, never a lookup of
 * that exact date. An event published on a Saturday, or during a holiday, or
 * after a market's close has no print of its own to anchor to, and reaching
 * forward to the next one would measure from a price that did not exist when
 * the story broke.
 *
 * Returns null rather than a number in the two cases where a change would be
 * an invention: an event older than the fetched window, where anchoring to the
 * start of the range would silently answer a different question than the one
 * asked; and an event with no trading since it published, where the honest
 * answer is that nothing has happened yet rather than 0.00%.
 */
export function changeSince(points: HistoryPoint[], sinceIso: string): ChangeSince | null {
  const since = Date.parse(sinceIso)
  if (!Number.isFinite(since) || points.length === 0) return null

  // Sorted defensively: the endpoint hands these over in upstream order, and
  // nothing downstream should depend on that staying true.
  const ordered = [...points].sort((a, b) => Date.parse(a.t) - Date.parse(b.t))

  let baselineIdx = -1
  for (let i = 0; i < ordered.length; i++) {
    if (Date.parse(ordered[i].t) <= since) baselineIdx = i
    else break
  }
  if (baselineIdx === -1) return null                  // event predates the window
  if (baselineIdx === ordered.length - 1) return null   // nothing has traded since

  const baseline = ordered[baselineIdx]
  const latest = ordered[ordered.length - 1]
  if (baseline.close <= 0) return null

  return {
    changePct:    ((latest.close - baseline.close) / baseline.close) * 100,
    baseline:     baseline.close,
    baselineDate: baseline.t,
    latest:       latest.close,
  }
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
