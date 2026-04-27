import { useState, useMemo } from 'react'
import { useAppStore } from '../../store'
import { useTranslation } from 'react-i18next'
import { CATEGORY_COLOR, CATEGORY_ICON } from '../../data/categoryConfig'

interface DockBtnProps {
  icon: string
  label: string
  badge?: number | string
  color?: string
  active?: boolean
  onClick: () => void
}

function DockBtn({ icon, label, badge, color = '#4a6070', active, onClick }: DockBtnProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Tooltip — appears above the button */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(4,9,22,0.95)', border: '1px solid rgba(0,180,255,0.2)',
          borderRadius: '3px', padding: '3px 7px', whiteSpace: 'nowrap',
          color: '#a8c4d8', fontSize: '8px', letterSpacing: '0.1em',
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
          fontSize: '12px', transition: 'all 0.15s',
          position: 'relative',
        }}
      >
        {icon}
        {badge != null && Number(badge) > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: '#ff4d4d', color: '#fff',
            fontSize: '6px', fontWeight: 700,
            borderRadius: '2px', padding: '0 2px',
            lineHeight: '9px', minWidth: '9px', textAlign: 'center',
          }}>
            {Number(badge) > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    </div>
  )
}

export function FloatDock() {
  const { t } = useTranslation()
  const events            = useAppStore((s) => s.events)
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


  const { alertCount, topCats } = useMemo(() => {
    const hidden = new Set(hiddenCategories)
    let critical = 0, high = 0
    const counts: Record<string, number> = {}
    for (const e of events) {
      if (hidden.has(e.category)) continue
      if (e.intensity === 'CRITICAL') critical++
      else if (e.intensity === 'HIGH') high++
      counts[e.category] = (counts[e.category] ?? 0) + 1
    }
    return {
      alertCount: critical + high,
      topCats: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4),
    }
  }, [events, hiddenCategories])

  return (
    <div style={{
      position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 50,
      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px',
      background: 'rgba(4,9,22,0.88)',
      border: '1px solid rgba(0,180,255,0.15)',
      borderRadius: '6px',
      padding: '4px 6px',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 0 20px rgba(0,60,120,0.3)',
      animation: 'navFadeIn 0.2s ease both',
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
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39ff8a', boxShadow: '0 0 6px #39ff8a', animation: 'pulse 2s infinite' }} />
      </div>

      {/* Alert badge */}
      {alertCount > 0 && (
        <DockBtn
          icon="⚠"
          label={`${alertCount} HIGH/CRITICAL ALERTS`}
          badge={alertCount}
          color="#ff4d4d"
          onClick={() => {
            const first = events.find(e => e.intensity === 'CRITICAL' || e.intensity === 'HIGH')
            if (first) setActivePanelId(first.id)
          }}
        />
      )}

      {/* Event feed */}
      <DockBtn
        icon="◉"
        label={`INTEL FEED — ${events.length} ITEMS`}
        badge={events.length}
        color="#00d4ff"
        active={!liteMode && !immersiveMode}
        onClick={() => { setImmersiveMode(false); setLiteMode(false) }}
      />

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
          icon={CATEGORY_ICON[cat] ?? '◉'}
          label={`${cat.replace(/_/g,' ')} (${count})`}
          color={CATEGORY_COLOR[cat] ?? '#4a6070'}
          onClick={() => {
            const ev = events.find(e => e.category === cat)
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

      {/* Divider */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(0,180,255,0.12)', margin: '0 2px' }} />

      {/* ── Tracking layers ── */}
      <div style={{ width: '1px', height: '16px', background: 'rgba(0,180,255,0.12)', margin: '0 2px' }} />

      <DockBtn
        icon="✈"
        label="AIRCRAFT (ADS-B)"
        color="#a0c4ff"
        active={showAircraftLayer}
        onClick={() => setShowAircraftLayer(!showAircraftLayer)}
      />
      <DockBtn
        icon="🛰"
        label="SATELLITES (TLE)"
        color="#00d4ff"
        active={showSatellitesLayer}
        onClick={() => setShowSatellitesLayer(!showSatellitesLayer)}
      />
      <DockBtn
        icon="🚢"
        label="VESSELS (AIS) — not yet implemented"
        color="#2a4060"
        active={false}
        onClick={() => {/* AIS feed not yet implemented */}}
      />

      {/* Annotation canvas toggle */}
      <DockBtn
        icon="✏"
        label={t('canvas.toggle', 'ANNOTATION CANVAS')}
        color="#9b6dff"
        active={showAnnotationCanvas}
        onClick={() => setShowAnnotationCanvas(!showAnnotationCanvas)}
      />

      {/* Config */}
      <DockBtn
        icon="⚙"
        label="CONFIGURATION"
        color="#4a6fa5"
        active={showConfig}
        onClick={() => setShowConfig(!showConfig)}
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
  )
}
