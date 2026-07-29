import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppStore } from '../../store'
import { useTranslation } from 'react-i18next'
import {
  CATEGORY_GLYPH, CATEGORY_TINT, severityRank,
  SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER,
} from '../../data/symbology'
import type { MapMode } from '../../store'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { useFocusTrap } from '../../hooks/useFocusTrap'

const MAP_MODES: { id: MapMode; icon: string; label: string }[] = [
  { id: 'none',      icon: '○', label: 'NONE'      },
  { id: 'political', icon: '▦', label: 'POLITICAL' },
  { id: 'posture',   icon: '◈', label: 'POSTURE'   },
  { id: 'activity',  icon: '≋', label: 'ACTIVITY'  },
]

interface DockBtnProps {
  icon: string
  label: string
  badge?: number | string
  error?: boolean
  loading?: boolean
  color?: string
  active?: boolean
  onClick: () => void
}

function DockBtn({ icon, label, badge, error, loading, color = '#4a6070', active, onClick }: DockBtnProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Tooltip — appears above the button */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(4,9,22,0.95)', border: '1px solid rgba(0,180,255,0.2)',
          borderRadius: '3px', padding: '3px 7px', whiteSpace: 'nowrap',
          color: '#a8c4d8', fontSize: '10px', letterSpacing: '0.1em',
          pointerEvents: 'none', zIndex: 100,
        }}>
          {label}
        </div>
      )}
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: '28px', height: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? `${color}18` : 'transparent',
          border: active ? `1px solid ${color}50` : '1px solid transparent',
          borderRadius: '3px', cursor: 'pointer',
          color: hovered || active ? color : '#3a5060',
          fontSize: '12px', transition: loading ? 'none' : 'all 0.15s',
          position: 'relative',
          animation: loading ? 'loadingRing 0.9s ease-in-out infinite' : undefined,
        }}
      >
        {icon}
        {badge != null && (typeof badge === 'string' ? badge.length > 0 : Number(badge) > 0) && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: '#ff4d4d', color: '#fff',
            fontSize: '10px', fontWeight: 700,
            borderRadius: '2px', padding: '0 3px',
            lineHeight: '12px', minWidth: '12px', textAlign: 'center',
          }}>
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        )}
        {error && (
          <span style={{
            position: 'absolute', top: '2px', left: '2px',
            background: '#ff8c00', color: '#fff',
            fontSize: '10px', fontWeight: 700,
            borderRadius: '2px', padding: '0 3px',
            lineHeight: '12px', minWidth: '12px', textAlign: 'center',
          }}>!</span>
        )}
      </button>
    </div>
  )
}

export function FloatDock() {
  const { t } = useTranslation()
  const events            = useAppStore((s) => s.events)
  const intelBrief         = useAppStore((s) => s.intelBrief)
  const intelBriefHistory  = useAppStore((s) => s.intelBriefHistory)
  const briefRead          = useAppStore((s) => s.briefRead)
  const setBriefRead       = useAppStore((s) => s.setBriefRead)
  const [showBrief, setShowBrief] = useState(false)
  const briefRef = useRef<HTMLDivElement>(null)
  const briefModalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(briefModalRef, showBrief)
  const immersiveMode     = useAppStore((s) => s.immersiveMode)
  const setImmersiveMode  = useAppStore((s) => s.setImmersiveMode)
  const liteMode          = useAppStore((s) => s.liteMode)
  const setLiteMode       = useAppStore((s) => s.setLiteMode)
  const activePanelId     = useAppStore((s) => s.activePanelId)
  const setActivePanelId  = useAppStore((s) => s.setActivePanelId)
  const selectedCountry   = useAppStore((s) => s.selectedCountry)
  const showAnnotationCanvas = useAppStore((s) => s.showAnnotationCanvas)
  const setShowAnnotationCanvas = useAppStore((s) => s.setShowAnnotationCanvas)
  const showConfig        = useAppStore((s) => s.showConfig)
  const setShowConfig     = useAppStore((s) => s.setShowConfig)
  const hiddenCategories  = useAppStore((s) => s.hiddenCategories)

  const showEarthTexture    = useAppStore((s) => s.showEarthTexture)
  const setShowEarthTexture = useAppStore((s) => s.setShowEarthTexture)

  const showAircraftLayer    = useAppStore((s) => s.showAircraftLayer)
  const setShowAircraftLayer = useAppStore((s) => s.setShowAircraftLayer)
  const showSatellitesLayer    = useAppStore((s) => s.showSatellitesLayer)
  const setShowSatellitesLayer = useAppStore((s) => s.setShowSatellitesLayer)
  const showShipsLayer       = useAppStore((s) => s.showShipsLayer)
  const setShowShipsLayer    = useAppStore((s) => s.setShowShipsLayer)
  const showConflictLayer    = useAppStore((s) => s.showConflictLayer)
  const setShowConflictLayer = useAppStore((s) => s.setShowConflictLayer)
  const mapMode              = useAppStore((s) => s.mapMode)
  const setMapMode           = useAppStore((s) => s.setMapMode)
  const layerErrors          = useAppStore((s) => s.layerErrors)
  const layerLoading         = useAppStore((s) => s.layerLoading)


  const serviceHealth      = useServiceHealth()
  const socketConnected    = useAppStore((s) => s.socketConnected)

  // 12-bar hourly sparkline for event arrival rate
  const sparklineBars = useMemo(() => {
    const now   = Date.now()
    const bars  = new Array(12).fill(0)
    for (const e of events) {
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      if (ts <= 0) continue
      const hoursAgo = (now - ts) / 3_600_000
      if (hoursAgo >= 0 && hoursAgo < 12) {
        bars[11 - Math.floor(hoursAgo)]++
      }
    }
    const peak = Math.max(1, ...bars)
    return bars.map((v) => v / peak)  // 0..1 normalised heights
  }, [events])

  const topCats = useMemo(() => {
    const hidden = new Set(hiddenCategories)
    const counts: Record<string, number> = {}
    for (const e of events) {
      if (hidden.has(e.category)) continue
      counts[e.category] = (counts[e.category] ?? 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [events, hiddenCategories])

  // Close brief when clicking outside
  useEffect(() => {
    if (!showBrief) return
    const handler = (e: MouseEvent) => {
      if (briefRef.current && !briefRef.current.contains(e.target as Node)) {
        setShowBrief(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBrief])

  return (
    <div ref={briefRef} style={{ position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>

      {/* Intel Brief modal */}
      {showBrief && intelBrief && (
        <div
          ref={briefModalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Intel Brief"
          style={{
          position: 'absolute', bottom: '52px', left: '50%', transform: 'translateX(-50%)',
          width: '340px',
          background: 'rgba(4,9,22,0.97)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderTop: '2px solid #ffd700',
          borderRadius: '4px',
          padding: '10px 12px',
          boxShadow: '0 0 24px rgba(255,215,0,0.12)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'JetBrains Mono, monospace',
          animation: 'toastEnter 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
          maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
            <span style={{ color: '#ffd700', fontSize: '10px', letterSpacing: '0.15em', fontWeight: 700 }}>◇ INTEL BRIEF</span>
            <span style={{ color: '#2a4060', fontSize: '10px' }}>
              {new Date(intelBrief.generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div
            className="agent-response"
            style={{ color: '#a8c4d8', fontSize: '11px', lineHeight: 1.5, flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: intelBrief.summary }}
          />
          {/* Brief history — older entries collapsible */}
          {intelBriefHistory.length > 1 && (
            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,215,0,0.12)', paddingTop: '6px', overflowY: 'auto', flexShrink: 1 }}>
              <div style={{ color: '#4a5060', fontSize: '10px', letterSpacing: '0.12em', marginBottom: '5px' }}>PREVIOUS BRIEFS</div>
              {intelBriefHistory.slice(1).map((b) => (
                <details key={b.id} style={{ marginBottom: '5px' }}>
                  <summary style={{
                    color: '#3a5060', fontSize: '10px', letterSpacing: '0.1em',
                    cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <span style={{ color: '#2a3850' }}>▸</span>
                    {new Date(b.generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {new Date(b.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </summary>
                  <div
                    className="agent-response"
                    style={{ color: '#6a8090', fontSize: '10px', lineHeight: 1.5, marginTop: '4px', paddingLeft: '10px' }}
                    dangerouslySetInnerHTML={{ __html: b.summary }}
                  />
                </details>
              ))}
            </div>
          )}
        </div>
      )}

    {/* Map-mode legend — a fill scheme with no key is decoration. Political
        mode needs none: its colours deliberately mean nothing. */}
    {(mapMode === 'posture' || mapMode === 'activity') && (
      <div style={{
        position: 'absolute', bottom: '44px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '4px 9px', whiteSpace: 'nowrap',
        background: 'rgba(4,9,22,0.92)',
        border: '1px solid rgba(0,180,255,0.15)',
        borderRadius: '4px', backdropFilter: 'blur(8px)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#2a4a63' }}>
          {t(`mapMode.${mapMode}`, mapMode.toUpperCase())} · 24H
        </span>
        {mapMode === 'posture' ? (
          SEVERITY_ORDER.map((k) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                width: '9px', height: '9px', borderRadius: '2px',
                background: SEVERITY_COLOR[k], opacity: 0.85,
              }} />
              <span style={{ fontSize: '10px', color: SEVERITY_COLOR[k] }}>{SEVERITY_LABEL[k]}</span>
            </span>
          ))
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '10px', color: '#2a4a63' }}>{t('mapMode.less', 'LESS')}</span>
            <span style={{
              width: '76px', height: '9px', borderRadius: '2px',
              background: 'linear-gradient(90deg, rgba(63,200,224,0.10), rgba(63,200,224,0.55))',
            }} />
            <span style={{ fontSize: '10px', color: '#3fc8e0' }}>{t('mapMode.more', 'MORE')}</span>
          </span>
        )}
      </div>
    )}

    <div style={{
      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px',
      background: 'rgba(4,9,22,0.88)',
      border: '1px solid rgba(0,180,255,0.15)',
      borderRadius: '6px',
      padding: '4px 6px',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 0 20px rgba(0,60,120,0.3)',
      animation: 'navFadeIn 0.2s ease both',
      whiteSpace: 'nowrap',
    }}>
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 8, right: 8, height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)',
        borderRadius: '1px', pointerEvents: 'none',
      }} />

      {/* ARGUS logo / status */}
      <div style={{
        width: '20px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '1px solid rgba(0,180,255,0.1)', marginRight: '2px', paddingRight: '6px',
      }}>
        <div
          title={socketConnected ? 'Connected' : 'Reconnecting…'}
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: socketConnected ? '#39ff8a' : '#ff8c00',
            boxShadow: socketConnected ? '0 0 6px #39ff8a' : '0 0 6px #ff8c00',
            animation: socketConnected ? 'pulse 2s infinite' : 'pulse 0.8s infinite',
            transition: 'background 0.5s, box-shadow 0.5s',
          }}
        />
      </div>

      {/* The HIGH/CRITICAL alert count used to live here. The status bar's
          POSTURE module now owns it with more precision (per-severity, each
          cell jumping to its own newest event), and two alert counts computed
          from different sets is the ambiguity this pass exists to remove. */}

      {/* Service health badge — only shows when degraded */}
      {!serviceHealth.healthy && (
        <DockBtn
          icon="⚙"
          label={serviceHealth.ollamaOnline ? 'SCRAPER STALLED' : 'OLLAMA OFFLINE'}
          badge="!"
          color="#ff8c00"
          onClick={() => {/* informational only */}}
        />
      )}

      {/* Event feed with sparkline */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <DockBtn
          icon="◉"
          label={`INTEL FEED — ${events.length} ITEMS`}
          badge={events.length}
          color="#00d4ff"
          active={!liteMode && !immersiveMode}
          onClick={() => { setImmersiveMode(false); setLiteMode(false) }}
        />
        {/* 12-bar sparkline rendered beneath the button */}
        <svg width="28" height="6" style={{ position: 'absolute', bottom: '-5px', left: 0, opacity: 0.7, pointerEvents: 'none' }}>
          {sparklineBars.map((h, i) => (
            <rect
              key={i}
              x={i * (28 / 12) + 0.5}
              y={6 - h * 5}
              width={28 / 12 - 1}
              height={h * 5}
              fill={`rgba(0,212,255,${0.3 + h * 0.7})`}
              rx="0.5"
            />
          ))}
        </svg>
      </div>

      {/* Active event panel */}
      {activePanelId && (
        <DockBtn
          icon="◈"
          label="EVENT PANEL"
          color="#ff9c2a"
          active
          onClick={() => setActivePanelId(activePanelId)}
        />
      )}

      {/* Region panel */}
      {selectedCountry && (
        <DockBtn
          icon="⊙"
          label={`REGION: ${selectedCountry.name.toUpperCase()}`}
          color="#00ffcc"
          active
          onClick={() => {/* already visible */}}
        />
      )}

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(0,180,255,0.12)', margin: '0 2px' }} />

      {/* Top category quick-launch */}
      {topCats.map(([cat, count]) => (
        <DockBtn
          key={cat}
          icon={CATEGORY_GLYPH[cat as keyof typeof CATEGORY_GLYPH] ?? '◇'}
          label={`${cat.replace(/_/g,' ')} (${count})`}
          color={CATEGORY_TINT[cat as keyof typeof CATEGORY_TINT] ?? '#4a6070'}
          onClick={() => {
            // Most severe first, newest as tiebreak — never array order.
            const ev = events
              .filter(e => e.category === cat)
              .sort((a, b) =>
                severityRank(b.intensity) - severityRank(a.intensity) ||
                new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
              )[0]
            if (ev) setActivePanelId(ev.id)
          }}
        />
      ))}

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(0,180,255,0.12)', margin: '0 2px' }} />

      {/* ── Globe surface texture ── */}
      <DockBtn
        icon="◑"
        label="EARTH TEXTURE"
        color="#4a9eff"
        active={showEarthTexture}
        onClick={() => setShowEarthTexture(!showEarthTexture)}
      />

      {/* ── Map mode — exclusive. Only one variable may be painted across the
             globe at a time; the overlays after the next divider are additive
             because point and line data does not compete for the surface. ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1px',
        marginLeft: '4px', padding: '1px',
        border: '1px solid rgba(0,180,255,0.15)', borderRadius: '4px',
        background: 'rgba(0,20,40,0.35)',
      }}>
        {MAP_MODES.map(({ id, icon, label }) => {
          const active = mapMode === id
          return (
            <button
              key={id}
              onClick={() => setMapMode(id)}
              title={`${t('mapMode.label', 'MAP MODE')} — ${t(`mapMode.${id}`, label)}`}
              aria-pressed={active}
              style={{
                width: '24px', height: '24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', borderRadius: '3px', border: 'none',
                background: active ? 'rgba(0,212,255,0.18)' : 'transparent',
                color: active ? '#00d4ff' : '#3a5060',
                cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
              }}
            >{icon}</button>
          )
        })}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(0,180,255,0.12)', margin: '0 2px' }} />

      <DockBtn
        icon="✈"
        label="AIRCRAFT (ADS-B)"
        color="#a0c4ff"
        active={showAircraftLayer}
        error={showAircraftLayer && layerErrors.aircraft}
        loading={showAircraftLayer && layerLoading.aircraft}
        onClick={() => setShowAircraftLayer(!showAircraftLayer)}
      />
      <DockBtn
        icon="🛰"
        label="SATELLITES (TLE)"
        color="#00d4ff"
        active={showSatellitesLayer}
        error={showSatellitesLayer && layerErrors.satellites}
        loading={showSatellitesLayer && layerLoading.satellites}
        onClick={() => setShowSatellitesLayer(!showSatellitesLayer)}
      />
      <DockBtn
        icon="🚢"
        label="VESSELS (AIS)"
        color="#39ff8a"
        active={showShipsLayer}
        error={showShipsLayer && layerErrors.ships}
        loading={showShipsLayer && layerLoading.ships}
        onClick={() => setShowShipsLayer(!showShipsLayer)}
      />
      <DockBtn
        icon="⚔"
        label={t('conflictLayer.toggle', 'CONFLICT FRONTS')}
        color="#ff6600"
        active={showConflictLayer}
        error={showConflictLayer && layerErrors.conflict}
        loading={showConflictLayer && layerLoading.conflict}
        onClick={() => setShowConflictLayer(!showConflictLayer)}
      />
      {/* The old EVENT HEATMAP toggle became the ACTIVITY map mode. It was a
          surface fill competing with the other fills, so it belongs in the
          exclusive mode group, not among the additive overlays. */}

      {/* Annotation system toggle */}
      <DockBtn
        icon="📍"
        label={t('annotation.toggle', 'ANNOTATION')}
        color="#9b6dff"
        active={showAnnotationCanvas}
        onClick={() => setShowAnnotationCanvas(!showAnnotationCanvas)}
      />

      {/* Intel brief */}
      {intelBrief && (
        <DockBtn
          icon="◇"
          label="INTEL BRIEF"
          badge={briefRead ? undefined : '!'}
          color="#ffd700"
          active={showBrief}
          onClick={() => { setShowBrief(v => !v); setBriefRead(true) }}
        />
      )}

      {/* Config */}
      <DockBtn
        icon="⚙"
        label="CONFIGURATION"
        color="#4a6fa5"
        active={showConfig}
        onClick={() => setShowConfig(!showConfig)}
      />

      {/* Keyboard shortcuts */}
      <DockBtn
        icon="?"
        label="KEYBOARD SHORTCUTS"
        color="#4a6070"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
      />

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(0,180,255,0.12)', margin: '0 2px' }} />

      {/* Exit immersive */}
      {immersiveMode && (
        <DockBtn
          icon="⊟"
          label="EXIT IMMERSIVE (I)"
          color="#ff9c2a"
          onClick={() => setImmersiveMode(false)}
        />
      )}

      {/* Immersive toggle */}
      {!immersiveMode && (
        <DockBtn
          icon="⊞"
          label="IMMERSIVE MODE (I)"
          color="#4a6070"
          onClick={() => { setImmersiveMode(true); setLiteMode(false) }}
        />
      )}
    </div>
    </div>
  )
}
