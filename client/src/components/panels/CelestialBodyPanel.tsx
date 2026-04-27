import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { useWikiSummary } from '../../hooks/useWikiSummary'
import { BODIES } from '../../data/celestialBodies'

// ── Wikipedia title disambiguation ────────────────────────────────────────────
const WIKI_TITLE: Record<string, string> = {
  sun:        'Sun',
  mercury:    'Mercury_(planet)',
  venus:      'Venus',
  earth:      'Earth',
  mars:       'Mars',
  jupiter:    'Jupiter',
  saturn:     'Saturn',
  uranus:     'Uranus_(planet)',
  neptune:    'Neptune',
  pluto:      'Pluto',
  moon:       'Moon',
  ceres:      'Ceres_(dwarf_planet)',
  vesta:      '4_Vesta',
  pallas:     '2_Pallas',
  juno:       '3_Juno',
  halley:     "Halley's_comet",
  encke:      'Comet_Encke',
  tempel1:    'Tempel_1',
  phobos:     'Phobos_(moon)',
  deimos:     'Deimos_(moon)',
  io:         'Io_(moon)',
  europa:     'Europa_(moon)',
  ganymede:   'Ganymede_(moon)',
  callisto:   'Callisto_(moon)',
  titan:      'Titan_(moon)',
  enceladus:  'Enceladus_(moon)',
  mimas:      'Mimas_(moon)',
  rhea:       'Rhea_(moon)',
  dione:      'Dione_(moon)',
  tethys:     'Tethys_(moon)',
  iapetus:    'Iapetus_(moon)',
  triton:     'Triton_(moon)',
  miranda:    'Miranda_(moon)',
  ariel:      'Ariel_(moon)',
  umbriel:    'Umbriel_(moon)',
  titania:    'Titania_(moon)',
  oberon:     'Oberon_(moon)',
  charon:     'Charon_(moon)',
}

// ── Known physical stats (real-world values) ──────────────────────────────────
interface BodyStats {
  type:       string
  diameter:   string
  mass:       string
  gravity?:   string
  distSun?:   string
  dayLength:  string
  moons?:     string
  tempRange?: string
}

const BODY_STATS: Record<string, BodyStats> = {
  sun:      { type: 'Star (G-type)', diameter: '1,392,700 km', mass: '1.989 × 10³⁰ kg', gravity: '274 m/s²', dayLength: '25.4 d (equatorial)', tempRange: '5,778 K surface' },
  mercury:  { type: 'Terrestrial Planet', diameter: '4,879 km', mass: '3.285 × 10²³ kg', gravity: '3.7 m/s²', distSun: '0.39 AU', dayLength: '58.6 d', moons: '0', tempRange: '−180 to 430 °C' },
  venus:    { type: 'Terrestrial Planet', diameter: '12,104 km', mass: '4.867 × 10²⁴ kg', gravity: '8.87 m/s²', distSun: '0.72 AU', dayLength: '243 d (retrograde)', moons: '0', tempRange: '462 °C avg' },
  earth:    { type: 'Terrestrial Planet', diameter: '12,742 km', mass: '5.972 × 10²⁴ kg', gravity: '9.81 m/s²', distSun: '1.00 AU', dayLength: '23.93 h', moons: '1', tempRange: '−89 to 58 °C' },
  mars:     { type: 'Terrestrial Planet', diameter: '6,779 km', mass: '6.417 × 10²³ kg', gravity: '3.72 m/s²', distSun: '1.52 AU', dayLength: '24.62 h', moons: '2', tempRange: '−143 to 35 °C' },
  jupiter:  { type: 'Gas Giant', diameter: '139,820 km', mass: '1.898 × 10²⁷ kg', gravity: '24.8 m/s²', distSun: '5.20 AU', dayLength: '9.93 h', moons: '95', tempRange: '−145 °C cloud tops' },
  saturn:   { type: 'Gas Giant', diameter: '116,460 km', mass: '5.683 × 10²⁶ kg', gravity: '10.4 m/s²', distSun: '9.58 AU', dayLength: '10.66 h', moons: '146', tempRange: '−178 °C cloud tops' },
  uranus:   { type: 'Ice Giant', diameter: '50,724 km', mass: '8.681 × 10²⁵ kg', gravity: '8.87 m/s²', distSun: '19.22 AU', dayLength: '17.24 h (retrograde)', moons: '28', tempRange: '−224 °C' },
  neptune:  { type: 'Ice Giant', diameter: '49,244 km', mass: '1.024 × 10²⁶ kg', gravity: '11.15 m/s²', distSun: '30.05 AU', dayLength: '16.11 h', moons: '16', tempRange: '−218 °C' },
  pluto:    { type: 'Dwarf Planet', diameter: '2,376 km', mass: '1.303 × 10²² kg', gravity: '0.62 m/s²', distSun: '39.48 AU avg', dayLength: '153.3 h (retrograde)', moons: '5', tempRange: '−229 to −213 °C' },
  ceres:    { type: 'Dwarf Planet', diameter: '945 km', mass: '9.38 × 10²⁰ kg', gravity: '0.28 m/s²', distSun: '2.77 AU', dayLength: '9.07 h', moons: '0' },
  moon:     { type: 'Natural Satellite', diameter: '3,474 km', mass: '7.342 × 10²² kg', gravity: '1.62 m/s²', distSun: '1.00 AU (with Earth)', dayLength: '29.5 d (synodic)', moons: '0', tempRange: '−173 to 127 °C' },
  io:       { type: 'Jovian Moon', diameter: '3,643 km', mass: '8.93 × 10²² kg', gravity: '1.80 m/s²', dayLength: '1.77 d (tidally locked)' },
  europa:   { type: 'Jovian Moon', diameter: '3,122 km', mass: '4.80 × 10²² kg', gravity: '1.31 m/s²', dayLength: '3.55 d (tidally locked)' },
  ganymede: { type: 'Jovian Moon (largest moon)', diameter: '5,268 km', mass: '1.48 × 10²³ kg', gravity: '1.43 m/s²', dayLength: '7.15 d (tidally locked)' },
  callisto: { type: 'Jovian Moon', diameter: '4,821 km', mass: '1.08 × 10²³ kg', gravity: '1.24 m/s²', dayLength: '16.69 d (tidally locked)' },
  titan:    { type: 'Saturnian Moon', diameter: '5,151 km', mass: '1.34 × 10²³ kg', gravity: '1.35 m/s²', dayLength: '15.95 d (tidally locked)' },
  triton:   { type: 'Neptunian Moon', diameter: '2,707 km', mass: '2.14 × 10²² kg', gravity: '0.78 m/s²', dayLength: '5.88 d (retrograde)' },
}

// ── Type badge colour ─────────────────────────────────────────────────────────
function typeColor(type: string): string {
  if (type.includes('Star'))       return '#ffd700'
  if (type.includes('Gas Giant'))  return '#ff9c2a'
  if (type.includes('Ice Giant'))  return '#7de8e8'
  if (type.includes('Dwarf'))      return '#9b6dff'
  if (type.includes('Satellite') || type.includes('Moon')) return '#a0c4ff'
  if (type.includes('Asteroid'))   return '#6a8090'
  if (type.includes('Comet'))      return '#39ff8a'
  return '#00d4ff'  // Terrestrial
}

// ── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', borderBottom: '1px solid rgba(0,180,255,0.05)' }}>
      <span style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ color: '#a8c4d8', fontSize: '9px', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

// ── Wikipedia section ─────────────────────────────────────────────────────────
function WikiSection({ wikiTitle }: { wikiTitle: string }) {
  const { data, loading, error } = useWikiSummary(wikiTitle)

  if (loading) return (
    <div style={{ color: '#2a4060', fontSize: '8px', padding: '6px 0', letterSpacing: '0.08em', textAlign: 'center' }}>
      ↻ Loading Wikipedia…
    </div>
  )
  if (error || !data) return null

  // Trim extract to ~300 chars (approx 2–3 sentences)
  const extract = data.extract.length > 320
    ? data.extract.slice(0, 320).replace(/\s+\S*$/, '') + '…'
    : data.extract

  const wikiUrl = data.content_urls?.desktop?.page

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em' }}>WIKIPEDIA</span>
        {wikiUrl && (
          <a
            href={wikiUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#4a6fa5', fontSize: '7px', letterSpacing: '0.08em', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00d4ff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4a6fa5')}
          >
            ↗ Read more
          </a>
        )}
      </div>
      {data.thumbnail && (
        <img
          src={data.thumbnail.source}
          alt={data.title}
          style={{
            width: '100%', maxHeight: '90px', objectFit: 'cover',
            borderRadius: '3px', marginBottom: '6px',
            border: '1px solid rgba(0,180,255,0.1)',
          }}
        />
      )}
      <p style={{ color: '#7a9ab0', fontSize: '9px', lineHeight: 1.55, margin: 0 }}>
        {extract}
      </p>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function CelestialBodyPanel() {
  const selectedBody    = useAppStore((s) => s.selectedBody)
  const setSelectedBody = useAppStore((s) => s.setSelectedBody)
  const panelZ          = useAppStore((s) => s.panelZ)
  const bringToFront    = useAppStore((s) => s.bringToFront)

  const panelRef   = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [pos,      setPos]      = useState({ x: window.innerWidth - 340, y: 80 })
  const [dragging, setDragging] = useState(false)

  // Keep initial X sane on resize
  useEffect(() => {
    const onResize = () => setPos((p) => ({ ...p, x: Math.min(p.x, window.innerWidth - 340) }))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!selectedBody) return null

  const def   = BODIES.find((b) => b.id === selectedBody)
  const stats = BODY_STATS[selectedBody]
  const wikiTitle = WIKI_TITLE[selectedBody] ?? def?.label ?? selectedBody
  const accentColor = stats ? typeColor(stats.type) : '#00d4ff'

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
    const onMove = (mv: MouseEvent) => {
      const pw = panelRef.current?.offsetWidth  ?? 300
      const ph = panelRef.current?.offsetHeight ?? 400
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - pw, mv.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - ph, mv.clientY - dragOffset.current.y)),
      })
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={panelRef}
      onMouseDown={() => bringToFront('body')}
      style={{
        position:   'fixed',
        left:       pos.x,
        top:        pos.y,
        zIndex:     panelZ['body'] ?? 32,
        width:      '300px',
        maxHeight:  'calc(100vh - 100px)',
        display:    'flex',
        flexDirection: 'column',
        background: 'rgba(4,9,22,0.94)',
        border:     `1px solid rgba(0,180,255,0.18)`,
        borderTop:  `2px solid ${accentColor}60`,
        borderRadius: '4px',
        fontFamily: 'JetBrains Mono, monospace',
        userSelect: dragging ? 'none' : 'auto',
        boxShadow:  '0 0 32px rgba(0,100,180,0.18)',
      }}
    >
      {/* Left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: `linear-gradient(180deg, transparent, ${accentColor}60, transparent)`, pointerEvents: 'none' }} />

      {/* Corner accents */}
      {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
        <div key={`${v}${h}`} style={{ position:'absolute', [v]:0, [h]:0, width:8, height:8,
          borderTop:    v==='top'    ? `1px solid ${accentColor}60` : 'none',
          borderBottom: v==='bottom' ? `1px solid ${accentColor}60` : 'none',
          borderLeft:   h==='left'   ? `1px solid ${accentColor}60` : 'none',
          borderRight:  h==='right'  ? `1px solid ${accentColor}60` : 'none',
          pointerEvents: 'none' }} />
      ))}

      {/* Header */}
      <div
        onMouseDown={onMouseDown}
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          padding: '7px 10px',
          borderBottom: '1px solid rgba(0,180,255,0.12)',
          background: `linear-gradient(90deg, ${accentColor}0a 0%, transparent 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ color: accentColor, fontSize: '8px', letterSpacing: '0.15em' }}>◈ CELESTIAL BODY</span>
          {stats && (
            <span style={{
              fontSize: '6px', letterSpacing: '0.08em', padding: '1px 5px',
              border: `1px solid ${accentColor}35`,
              background: `${accentColor}10`,
              color: accentColor, borderRadius: '2px',
            }}>{stats.type.split(' ')[0].toUpperCase()}</span>
          )}
        </div>
        <button
          onClick={() => setSelectedBody(null)}
          style={{ background: 'none', border: 'none', color: '#4a6070', cursor: 'pointer', fontSize: '11px', lineHeight: 1 }}
        >✕</button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>
        <div style={{ padding: '10px 12px 14px' }}>

          {/* Body name */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ color: '#c8dde8', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em' }}>
              {def?.label.toUpperCase() ?? selectedBody.toUpperCase()}
            </div>
            {stats && (
              <div style={{ color: accentColor, fontSize: '8px', letterSpacing: '0.1em', marginTop: '2px', opacity: 0.8 }}>
                {stats.type}
              </div>
            )}
          </div>

          {/* Physical stats */}
          {stats && (
            <div style={{
              background: 'rgba(0,180,255,0.04)',
              border: '1px solid rgba(0,180,255,0.08)',
              borderRadius: '3px',
              padding: '6px 8px',
              marginBottom: '10px',
            }}>
              <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '4px' }}>PHYSICAL DATA</div>
              <StatRow label="DIAMETER"    value={stats.diameter} />
              <StatRow label="MASS"        value={stats.mass} />
              {stats.gravity   && <StatRow label="SURFACE GRAVITY" value={stats.gravity} />}
              {stats.distSun   && <StatRow label="DISTANCE FROM SUN" value={stats.distSun} />}
              <StatRow label="DAY LENGTH"  value={stats.dayLength} />
              {stats.moons     && <StatRow label="KNOWN MOONS"     value={stats.moons} />}
              {stats.tempRange && <StatRow label="TEMPERATURE"      value={stats.tempRange} />}
            </div>
          )}

          {/* Axial tilt + rotation from BodyDef */}
          {def && !stats && (
            <div style={{
              background: 'rgba(0,180,255,0.04)',
              border: '1px solid rgba(0,180,255,0.08)',
              borderRadius: '3px',
              padding: '6px 8px',
              marginBottom: '10px',
            }}>
              <div style={{ color: '#2a4060', fontSize: '7px', letterSpacing: '0.15em', marginBottom: '4px' }}>ORBITAL DATA</div>
              <StatRow label="AXIAL TILT"      value={`${def.axialTiltDeg}°`} />
              <StatRow label="ROTATION PERIOD" value={
                def.rotationPeriodHours === 0 ? 'Tidally locked'
                  : `${Math.abs(def.rotationPeriodHours).toFixed(1)} h${def.rotationPeriodHours < 0 ? ' (retrograde)' : ''}`
              } />
              {def.orbitParent && <StatRow label="ORBITS"  value={def.orbitParent} />}
            </div>
          )}

          {/* Wikipedia */}
          <WikiSection wikiTitle={wikiTitle} />

        </div>
      </div>
    </div>
  )
}
