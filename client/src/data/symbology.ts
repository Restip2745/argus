/**
 * ARGUS symbology — the single source of truth for how an event looks.
 *
 * Three orthogonal channels, each owning exactly one meaning. This is the rule
 * that makes the map scannable without reading text:
 *
 *   COLOUR  → severity      how alarmed should I be
 *   GLYPH   → category      what kind of thing is it
 *   FRAME   → reliability   how much should I trust it
 *
 * The previous scheme had category and severity sharing the colour channel
 * (ARMED_CONFLICT and CRITICAL were both #ff4d4d), so a red dot meant two
 * different things depending on which widget you were looking at. Colour is
 * now reserved for severity everywhere an event is rendered; category is
 * carried by silhouette alone.
 *
 * Category still has a hue (CATEGORY_TINT) but it is used ONLY in
 * category-selection chrome — the filter bar, trend chips — where no severity
 * is on screen to collide with, and only at low alpha as a tint, never as a
 * foreground colour on an event.
 */
import type { EventCategory, EventIntensity, SourceReliability } from '../types'

// ── COLOUR = severity ────────────────────────────────────────────────────────
// Reserved band. Nothing else in the app may use these hues at full strength.

export const SEVERITY_COLOR: Record<EventIntensity, string> = {
  CRITICAL: '#ff3b30',
  HIGH:     '#ff9500',
  MODERATE: '#ffd426',
  LOW:      '#5b7f9e',   // deliberately recessive — low severity should sink
}

export const SEVERITY_LABEL: Record<EventIntensity, string> = {
  CRITICAL: 'CRIT',
  HIGH:     'HIGH',
  MODERATE: 'MOD',
  LOW:      'LOW',
}

export const SEVERITY_RANK: Record<EventIntensity, number> = {
  CRITICAL: 4, HIGH: 3, MODERATE: 2, LOW: 1,
}

/** Marker diameter (px) — size reinforces severity redundantly with colour. */
export const SEVERITY_SIZE: Record<EventIntensity, number> = {
  CRITICAL: 26, HIGH: 22, MODERATE: 19, LOW: 16,
}

export const SEVERITY_ORDER: EventIntensity[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW']

export function severityColor(intensity: string | null | undefined): string {
  return SEVERITY_COLOR[intensity as EventIntensity] ?? SEVERITY_COLOR.LOW
}

export function severityRank(intensity: string | null | undefined): number {
  return SEVERITY_RANK[intensity as EventIntensity] ?? 0
}

/** Highest severity present in a set — used for cluster markers. */
export function peakSeverity(items: { intensity: string }[]): EventIntensity {
  let best: EventIntensity = 'LOW'
  for (const i of items) {
    if (severityRank(i.intensity) > severityRank(best)) best = i.intensity as EventIntensity
  }
  return best
}

// ── GLYPH = category ─────────────────────────────────────────────────────────
// Chosen for silhouette separation at 11px. Avoid adding two glyphs that share
// an outline (the old set had ◈ / ◉ / ◎ which were indistinguishable small).

export const CATEGORY_GLYPH: Record<EventCategory, string> = {
  ARMED_CONFLICT: '⚔',   // crossed blades
  POLITICAL:      '⚑',   // flag
  ECONOMIC:       '◆',   // solid diamond
  SOCIAL:         '☰',   // stacked bars
  SCIENCE_TECH:   '⚛',   // atom
  // Not a triangle: ▲/▼ are the trend-direction arrows in the status bar, and a
  // category glyph must never be readable as a direction.
  ENVIRONMENT:    '❋',   // six-spoke rosette
  HEALTH:         '✚',   // cross
  CRIME_SECURITY: '⬡',   // hollow hexagon
  SPACE:          '✦',   // four-point star
}

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  ARMED_CONFLICT: 'CONFLICT',
  POLITICAL:      'POLITICAL',
  ECONOMIC:       'ECONOMIC',
  SOCIAL:         'SOCIAL',
  SCIENCE_TECH:   'SCI/TECH',
  ENVIRONMENT:    'ENVIRON',
  HEALTH:         'HEALTH',
  CRIME_SECURITY: 'CRIME',
  SPACE:          'SPACE',
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_GLYPH) as EventCategory[]

export function categoryGlyph(cat: string | null | undefined): string {
  return CATEGORY_GLYPH[cat as EventCategory] ?? '◇'
}

export function categoryLabel(cat: string | null | undefined): string {
  return CATEGORY_LABEL[cat as EventCategory] ?? String(cat ?? '—')
}

/**
 * Category hue — filter/selection chrome ONLY, never an event's foreground.
 * Cool-leaning band, kept clear of the severity reds and oranges so that a warm
 * colour anywhere on screen always means "severity".
 */
export const CATEGORY_TINT: Record<EventCategory, string> = {
  ARMED_CONFLICT: '#e05a7a',
  POLITICAL:      '#c48cff',
  ECONOMIC:       '#7fd4c1',
  SOCIAL:         '#9fb3c8',
  SCIENCE_TECH:   '#9b6dff',
  ENVIRONMENT:    '#4fd18b',
  HEALTH:         '#7fb0ff',
  CRIME_SECURITY: '#7d94a8',
  SPACE:          '#3fc8e0',
}

export function categoryTint(cat: string | null | undefined): string {
  return CATEGORY_TINT[cat as EventCategory] ?? '#4a6070'
}

// ── FRAME = reliability ──────────────────────────────────────────────────────
// Border treatment. Uses neither hue nor silhouette, so it stacks cleanly on
// top of the other two channels.

export interface ReliabilityFrame {
  borderStyle: 'solid' | 'dashed' | 'dotted'
  /** Multiplier applied to the severity colour's alpha on the ring. */
  ringAlpha: number
  /** Fill alpha behind the glyph. */
  fillAlpha: number
  label: string
}

export const RELIABILITY_FRAME: Record<SourceReliability, ReliabilityFrame> = {
  HIGH:       { borderStyle: 'solid',  ringAlpha: 1.0,  fillAlpha: 0.22, label: 'CONFIRMED'  },
  MEDIUM:     { borderStyle: 'solid',  ringAlpha: 0.7,  fillAlpha: 0.14, label: 'PROBABLE'   },
  LOW:        { borderStyle: 'dashed', ringAlpha: 0.6,  fillAlpha: 0.08, label: 'SINGLE SRC' },
  UNVERIFIED: { borderStyle: 'dotted', ringAlpha: 0.45, fillAlpha: 0.0,  label: 'UNVERIFIED' },
}

export function reliabilityFrame(r: string | null | undefined): ReliabilityFrame {
  return RELIABILITY_FRAME[r as SourceReliability] ?? RELIABILITY_FRAME.UNVERIFIED
}

// ── Composite ────────────────────────────────────────────────────────────────

/** Hex colour + 0–1 alpha → 8-digit hex. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')
  return `${hex}${a}`
}

export interface EventSymbol {
  color:       string
  glyph:       string
  size:        number
  borderStyle: 'solid' | 'dashed' | 'dotted'
  borderColor: string
  background:  string
  label:       string
  reliabilityLabel: string
}

/** Everything needed to draw one event, from the three channels. */
export function eventSymbol(e: {
  category: string
  intensity: string
  reliability?: string | null
}): EventSymbol {
  const color = severityColor(e.intensity)
  const frame = reliabilityFrame(e.reliability)
  return {
    color,
    glyph:       categoryGlyph(e.category),
    size:        SEVERITY_SIZE[e.intensity as EventIntensity] ?? SEVERITY_SIZE.LOW,
    borderStyle: frame.borderStyle,
    borderColor: withAlpha(color, frame.ringAlpha),
    background:  withAlpha(color, frame.fillAlpha),
    label:       categoryLabel(e.category),
    reliabilityLabel: frame.label,
  }
}
