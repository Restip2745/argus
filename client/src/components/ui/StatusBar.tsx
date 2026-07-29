/**
 * StatusBar — always-on global situational readout.
 *
 * The one HUD element that answers "what is the state of the world right now?"
 * without the operator clicking anything. Four modules, left to right:
 *
 *   POSTURE   severity census across every event currently held
 *   TREND     which categories are moving, last 6h vs the 6h before it
 *   TEMPO     24-bar hourly arrival histogram, tinted by severity share
 *   COVERAGE  are we actually seeing the world — sources, model, ingest age
 *
 * Deliberately reads from the *unfiltered* event set: this is a world-state
 * readout, not a view of the operator's current filter. The GLOBAL label in
 * the POSTURE header says so.
 */
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { useEventArrivals } from '../../hooks/useEventArrivals'
import { useSceneTime } from '../../hooks/useSceneTime'
import { tick } from '../../lib/sound'
import {
  ALL_CATEGORIES, CATEGORY_GLYPH, CATEGORY_LABEL, CATEGORY_TINT,
  SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER, severityColor, severityRank,
} from '../../data/symbology'
import type { ArgusEvent, EventIntensity } from '../../types'

export const STATUS_BAR_H = 60

const HOUR = 3_600_000
const TREND_WINDOW = 6 * HOUR

function ts(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return isNaN(t) ? 0 : t
}

/** Most recent event matching `pred` — never an arbitrary array-order pick. */
function newestMatching(events: ArgusEvent[], pred: (e: ArgusEvent) => boolean): ArgusEvent | null {
  let best: ArgusEvent | null = null
  let bestTs = -1
  for (const e of events) {
    if (!pred(e)) continue
    const t = ts(e.published_at)
    if (t > bestTs) { bestTs = t; best = e }
  }
  return best
}

function ageLabel(ms: number): string {
  if (ms < 60_000) return `${Math.max(0, Math.floor(ms / 1000))}s`
  if (ms < HOUR)   return `${Math.floor(ms / 60_000)}m`
  if (ms < 24 * HOUR) return `${Math.floor(ms / HOUR)}h`
  return `${Math.floor(ms / (24 * HOUR))}d`
}

// ── Shared module chrome ─────────────────────────────────────────────────────

function Module({ label, children, className }: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  // Never shrink: a module is either fully present or hidden by the responsive
  // classes below. A half-squeezed readout is worse than an absent one.
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{
        fontSize: '10px', letterSpacing: '0.18em', color: '#2a4a63',
        lineHeight: 1.2, whiteSpace: 'nowrap', userSelect: 'none',
      }}>
        {label}
      </span>
      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

/** Carries the same responsive class as the module it precedes, so a hidden
 *  module never leaves an orphaned rule behind. */
function Divider({ className }: { className?: string }) {
  return <div className={className} style={{ width: '1px', alignSelf: 'stretch', margin: '10px 0', background: 'rgba(0,180,255,0.10)', flexShrink: 0 }} />
}

// ── Posture cell — big number + unit label, flashes when it rises ────────────

function PostureCell({ count, label, color, onClick, title }: {
  count: number
  label: string
  color: string
  onClick: () => void
  title: string
}) {
  const [flash, setFlash] = useState(false)
  const [prev, setPrev] = useState(count)

  useEffect(() => {
    if (count > prev) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 900)
      setPrev(count)
      return () => clearTimeout(t)
    }
    if (count !== prev) setPrev(count)
  }, [count, prev])

  const dim = count === 0
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={dim}
      style={{
        display: 'flex', alignItems: 'baseline', gap: '4px',
        padding: '1px 5px', borderRadius: '3px',
        background: 'transparent', border: '1px solid transparent',
        cursor: dim ? 'default' : 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        animation: flash ? 'statFlash 0.9s ease-out both' : undefined,
      }}
      onMouseEnter={(e) => { if (!dim) e.currentTarget.style.background = color + '14' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{
        fontSize: '21px', fontWeight: 700, lineHeight: 1,
        color: dim ? '#243a4e' : color,
        textShadow: dim ? 'none' : `0 0 12px ${color}55`,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {count}
      </span>
      <span style={{
        fontSize: '10px', letterSpacing: '0.1em',
        color: dim ? '#243a4e' : color + 'aa',
      }}>
        {label}
      </span>
    </button>
  )
}

// ── Bar ──────────────────────────────────────────────────────────────────────

interface Props {
  onOpenConfig: () => void
  onToggleCanvasAnalysis: () => void
  canvasAnalysisOpen: boolean
  onEnterImmersive: () => void
  languageSwitcher: React.ReactNode
}

export function StatusBar({
  onOpenConfig, onToggleCanvasAnalysis, canvasAnalysisOpen, onEnterImmersive, languageSwitcher,
}: Props) {
  const { t } = useTranslation()
  const events           = useAppStore((s) => s.events)
  const socketConnected  = useAppStore((s) => s.socketConnected)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const health           = useServiceHealth()

  // Scene time, not the wall clock — scrubbing back must move the whole
  // readout, or the census would describe a different instant to the feed.
  const { now: sceneNow, isLive } = useSceneTime()
  const now = new Date(sceneNow)
  const minuteTick = Math.floor(sceneNow / 60_000)

  // ── Arrival sweep ──────────────────────────────────────────────────────────
  // The one place the HUD is allowed a whole-bar gesture, and only for the
  // severities that justify interrupting.
  const arrival = useEventArrivals()
  const [sweep, setSweep] = useState<string | null>(null)
  useEffect(() => {
    if (arrival.gen === 0) return
    // Reviewing the past: an arrival cue would be announcing the present into
    // a view of an instant the operator is not looking at.
    if (!isLive) return
    if (severityRank(arrival.peak) < severityRank('HIGH')) return
    setSweep(severityColor(arrival.peak))
    const id = setTimeout(() => setSweep(null), 1100)
    return () => clearTimeout(id)
  }, [arrival, isLive])

  // ── POSTURE ────────────────────────────────────────────────────────────────
  const posture = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 }
    for (const e of events) {
      // Unfiltered by category on purpose — but never unfiltered by time. An
      // event that had not happened yet at the viewed instant cannot be part
      // of that instant's posture.
      if (!isLive && ts(e.published_at) > sceneNow) continue
      counts[e.intensity] = (counts[e.intensity] ?? 0) + 1
    }
    return counts
  }, [events, isLive, sceneNow])

  // ── TREND — 6h vs the preceding 6h, ranked by absolute movement ────────────
  const trend = useMemo(() => {
    const t1 = minuteTick * 60_000
    const curFrom  = t1 - TREND_WINDOW
    const prevFrom = t1 - 2 * TREND_WINDOW
    const cur: Record<string, number>  = {}
    const prev: Record<string, number> = {}

    for (const e of events) {
      const p = ts(e.published_at)
      if (p <= 0) continue
      if (p > t1) continue                    // still in the future here
      if (p >= curFrom)                       cur[e.category]  = (cur[e.category]  ?? 0) + 1
      else if (p >= prevFrom && p < curFrom)   prev[e.category] = (prev[e.category] ?? 0) + 1
    }

    return ALL_CATEGORIES
      .map((cat) => {
        const c = cur[cat] ?? 0
        const p = prev[cat] ?? 0
        const delta = c - p
        const pct = p > 0 ? Math.round((delta / p) * 100) : (c > 0 ? 100 : 0)
        return { cat, cur: c, prev: p, delta, pct }
      })
      .filter((r) => r.cur > 0 || r.prev > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.cur - a.cur)
      .slice(0, 3)
  }, [events, minuteTick])

  // ── TEMPO — 24 hourly buckets, tinted by severity share ────────────────────
  const tempo = useMemo(() => {
    const t1 = minuteTick * 60_000
    const total  = new Array(24).fill(0)
    const severe = new Array(24).fill(0)

    for (const e of events) {
      const p = ts(e.published_at)
      if (p <= 0) continue
      const hoursAgo = (t1 - p) / HOUR
      if (hoursAgo < 0 || hoursAgo >= 24) continue
      const i = 23 - Math.floor(hoursAgo)
      total[i]++
      if (e.intensity === 'CRITICAL' || e.intensity === 'HIGH') severe[i]++
    }

    const peak = Math.max(1, ...total)
    return {
      peak,
      bars: total.map((n, i) => ({
        n,
        h: n / peak,
        severeShare: n > 0 ? severe[i] / n : 0,
        hoursAgo: 23 - i,
      })),
    }
  }, [events, minuteTick])

  // ── COVERAGE ───────────────────────────────────────────────────────────────
  const coverage = useMemo(() => {
    const t1 = minuteTick * 60_000
    const sources = new Set<string>()
    let newestFetch = 0
    for (const e of events) {
      const f = ts(e.fetched_at)
      if (f > t1) continue                    // not ingested yet at this instant
      if (e.source) sources.add(e.source)
      if (f > newestFetch) newestFetch = f
    }
    return {
      sourceCount: sources.size,
      ingestAgeMs: newestFetch > 0 ? Math.max(0, t1 - newestFetch) : null,
    }
  }, [events, minuteTick])

  const ingestColor = coverage.ingestAgeMs == null ? '#4a6070'
    : coverage.ingestAgeMs < 15 * 60_000 ? '#39ff8a'
    : coverage.ingestAgeMs < 45 * 60_000 ? '#ff9c2a'
    : '#ff4d4d'

  function openSeverity(intensity: EventIntensity) {
    const ev = newestMatching(events, (e) => e.intensity === intensity)
    if (ev) { tick(); setActivePanelId(ev.id) }
  }

  function openCategory(cat: string) {
    const ev = newestMatching(events, (e) => e.category === cat)
    if (ev) { tick(); setActivePanelId(ev.id) }
  }

  const utc = now.toISOString()

  return (
    <header
      className="absolute top-0 left-0 right-0 z-40 font-mono"
      style={{
        height: `${STATUS_BAR_H}px`,
        display: 'flex', alignItems: 'stretch', gap: '14px',
        padding: '0 12px',
        background: 'rgba(4,9,22,0.94)',
        borderBottom: '1px solid rgba(0,180,255,0.14)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Arrival sweep — rides the bar's bottom edge, then clears */}
      {sweep && (
        <div
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px',
            background: `linear-gradient(90deg, transparent, ${sweep}, transparent)`,
            animation: 'arrivalSweep 1.1s cubic-bezier(0.4,0,0.2,1) both',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* ── Identity + UTC clock ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            title={socketConnected ? 'LINK ACTIVE' : 'RECONNECTING'}
            style={{
              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
              background: socketConnected ? '#39ff8a' : '#ff8c00',
              boxShadow: `0 0 7px ${socketConnected ? '#39ff8a' : '#ff8c00'}`,
              animation: socketConnected ? 'pulse 2.4s infinite' : 'pulse 0.8s infinite',
            }}
          />
          <span style={{ fontSize: '12px', letterSpacing: '0.24em', color: '#00d4ff', fontWeight: 700 }}>
            ARGUS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginTop: '3px' }}>
          <span style={{ fontSize: '15px', color: '#c8dde8', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {utc.slice(11, 19)}
          </span>
          <span style={{ fontSize: '10px', color: '#2a4a63', letterSpacing: '0.1em' }}>UTC</span>
          <span style={{ fontSize: '10px', color: '#2a4a63', letterSpacing: '0.06em', marginLeft: '2px' }}>
            {utc.slice(0, 10)}
          </span>
        </div>
      </div>

      <Divider />

      {/* ── POSTURE ──────────────────────────────────────────────────────── */}
      <Module label={t('statusBar.posture', 'GLOBAL POSTURE')}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          {SEVERITY_ORDER.map((key) => (
            <PostureCell
              key={key}
              count={posture[key] ?? 0}
              label={SEVERITY_LABEL[key]}
              color={SEVERITY_COLOR[key]}
              onClick={() => openSeverity(key)}
              title={`${posture[key] ?? 0} × ${key} — ${t('statusBar.jumpNewest', 'open newest')}`}
            />
          ))}
        </div>
      </Module>

      <Divider className="sb-hide-mdlg" />

      {/* ── TREND ────────────────────────────────────────────────────────── */}
      <Module label={t('statusBar.trend', 'TREND · 6H')} className="sb-hide-mdlg">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {trend.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#243a4e' }}>—</span>
          ) : trend.map(({ cat, cur, delta, pct }) => {
            const color = CATEGORY_TINT[cat] ?? '#4a6070'
            const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '—'
            const arrowColor = delta > 0 ? '#ff9c2a' : delta < 0 ? '#5a8fa8' : '#3a5060'
            return (
              <button
                key={cat}
                onClick={() => openCategory(cat)}
                title={`${CATEGORY_LABEL[cat]} — ${cur} ${t('statusBar.inLast6h', 'in last 6h')} (${delta >= 0 ? '+' : ''}${delta})`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '3px 6px', borderRadius: '3px',
                  border: `1px solid ${color}30`, background: color + '10',
                  cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = color + '22'; e.currentTarget.style.borderColor = color + '66' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = color + '10'; e.currentTarget.style.borderColor = color + '30' }}
              >
                <span style={{ fontSize: '12px', color }}>{CATEGORY_GLYPH[cat] ?? '◇'}</span>
                <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: color + 'dd' }}>
                  {CATEGORY_LABEL[cat] ?? cat}
                </span>
                <span style={{ fontSize: '11px', color: arrowColor, fontVariantNumeric: 'tabular-nums' }}>
                  {arrow}{pct !== 0 && `${Math.abs(pct)}%`}
                </span>
              </button>
            )
          })}
        </div>
      </Module>

      <Divider className="sb-hide-lg" />

      {/* ── TEMPO ────────────────────────────────────────────────────────── */}
      <Module label={t('statusBar.tempo', 'TEMPO · 24H')} className="sb-hide-lg">
        <svg width="216" height="26" style={{ display: 'block', overflow: 'visible' }} role="img"
          aria-label={t('statusBar.tempoAria', 'Hourly event arrival, last 24 hours')}>
          {/* Baseline */}
          <line x1="0" y1="25.5" x2="216" y2="25.5" stroke="rgba(0,180,255,0.12)" strokeWidth="1" />
          {tempo.bars.map((b, i) => {
            const w = 216 / 24
            const h = Math.max(b.n > 0 ? 2 : 1, b.h * 24)
            const fill = b.n === 0 ? 'rgba(0,180,255,0.10)'
              : b.severeShare > 0.5 ? '#ff4d4d'
              : b.severeShare > 0.25 ? '#ff9c2a'
              : `rgba(0,190,235,${0.45 + b.h * 0.55})`
            return (
              <rect
                key={i}
                x={i * w + 0.75}
                y={25.5 - h}
                width={w - 1.5}
                height={h}
                fill={fill}
                rx="1"
              >
                <title>{`-${b.hoursAgo}h · ${b.n}`}</title>
              </rect>
            )
          })}
        </svg>
        <span style={{ fontSize: '10px', color: '#2a4a63', marginLeft: '7px', whiteSpace: 'nowrap' }}>
          {t('statusBar.peak', 'PEAK')} {tempo.peak}
        </span>
      </Module>

      <Divider className="sb-hide-md" />

      {/* ── COVERAGE ─────────────────────────────────────────────────────── */}
      <Module label={t('statusBar.coverage', 'COVERAGE')} className="sb-hide-md">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
          <Pip
            color={coverage.sourceCount > 0 ? '#39ff8a' : '#4a6070'}
            text={`${coverage.sourceCount} ${t('statusBar.sources', 'SRC')}`}
            title={t('statusBar.sourcesTitle', 'Distinct sources represented in the current feed')}
          />
          <Pip
            color={health.ollamaOnline ? '#39ff8a' : '#ff4d4d'}
            text="OLLAMA"
            title={health.ollamaOnline ? 'Local model online' : 'Local model offline — analysis stalled'}
          />
          <Pip
            color={ingestColor}
            text={coverage.ingestAgeMs == null ? 'INGEST —' : `INGEST ${ageLabel(coverage.ingestAgeMs)}`}
            title={t('statusBar.ingestTitle', 'Age of the most recent ingested item')}
          />
        </div>
      </Module>

      {/* ── Right control cluster ────────────────────────────────────────── */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        {languageSwitcher}
        <BarBtn
          icon="⊙"
          title={t('ui.aiAnalysis', 'AI Canvas Analysis')}
          active={canvasAnalysisOpen}
          activeColor="#9b6dff"
          onClick={onToggleCanvasAnalysis}
        />
        <BarBtn icon="⚙" title={t('ui.config', 'Configuration')} onClick={onOpenConfig} />
        <BarBtn icon="⊠" title={`${t('ui.immersive', 'Immersive mode')} (I)`} onClick={onEnterImmersive} />
      </div>
    </header>
  )
}

// ── Small parts ──────────────────────────────────────────────────────────────

function Pip({ color, text, title }: { color: string; text: string; title: string }) {
  return (
    <span title={title} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: color, boxShadow: `0 0 6px ${color}88`, flexShrink: 0,
      }} />
      <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#7a97ab' }}>{text}</span>
    </span>
  )
}

function BarBtn({ icon, title, onClick, active, activeColor = '#00d4ff' }: {
  icon: string
  title: string
  onClick: () => void
  active?: boolean
  activeColor?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: '30px', height: '30px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', borderRadius: '3px',
        background: active ? activeColor + '18' : 'rgba(4,9,22,0.8)',
        border: `1px solid ${active ? activeColor + '55' : 'rgba(0,180,255,0.15)'}`,
        color: active ? activeColor : '#4a6070',
        cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = activeColor; e.currentTarget.style.borderColor = activeColor + '66' }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? activeColor : '#4a6070'
        e.currentTarget.style.borderColor = active ? activeColor + '55' : 'rgba(0,180,255,0.15)'
      }}
    >
      {icon}
    </button>
  )
}
