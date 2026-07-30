/**
 * EventRelationGraph — the events this one sits alongside.
 *
 * Labels used to be pinned under each node, which could not work at this size:
 * eight 60px labels need ~480px of circumference and the orbit only has
 * 2π·44 ≈ 276px, so adjacent labels overlapped by a factor of 1.8. The bottom
 * node's label also ran 20px past the SVG, and `overflow: visible` let it paint
 * over the rest of the panel.
 *
 * No arrangement fixes that — the space genuinely is not there. So the titles
 * move to a fixed caption line under the graph, revealed by hover or focus. The
 * graph keeps what it is actually good at (how many, and how severe, at a
 * glance) and the titles become readable for the first time, in a slot that
 * cannot collide with anything.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRelatedEvents } from '../../hooks/useRelatedEvents'
import { useAppStore } from '../../store'
import { eventSymbol, SEVERITY_LABEL } from '../../data/symbology'
import { relativeTime } from '../../utils/eventUtils'

const W = 280
const H = 108
const CX = W / 2
const CY = H / 2
const R_ORBIT = 40   // radius of satellite nodes
const R_CENTER = 10  // center node radius
const R_NODE   = 8   // satellite node radius
const R_HIT    = 14  // invisible hit area — 8px targets are too small to aim at

const MAX_NODES = 8

interface Props {
  eventId: string
  accentColor: string
}

export function EventRelationGraph({ eventId, accentColor }: Props) {
  const { t } = useTranslation()
  const { events: related, loading } = useRelatedEvents(eventId)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const [hovered, setHovered] = useState<string | null>(null)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', color: '#2a4060', fontSize: '10px', letterSpacing: '0.1em' }}>
      <span style={{ animation: 'markerPulse 1.2s ease-in-out infinite', display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: accentColor }} />
      {t('event.labels.loadingGraph', 'LOADING GRAPH…')}
    </div>
  )

  if (related.length === 0) return null

  const nodes = related.slice(0, MAX_NODES)
  const angleStep = (2 * Math.PI) / nodes.length
  const active = nodes.find((e) => e.id === hovered) ?? null

  return (
    <div style={{ marginTop: '6px', borderTop: '1px solid rgba(0,180,255,0.07)', paddingTop: '6px' }}>
      <div style={{ color: '#2a4060', fontSize: '10px', letterSpacing: '0.12em', marginBottom: '5px' }}>
        ◈ {t('event.labels.relatedEvents', 'RELATED EVENTS')} ({related.length})
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        // Not `visible`: the graph must never paint outside its own box.
        style={{ display: 'block', overflow: 'hidden', maxWidth: '100%' }}
      >
        {/* Orbit ring */}
        <circle
          cx={CX} cy={CY} r={R_ORBIT}
          fill="none"
          stroke={`${accentColor}18`}
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {nodes.map((ev, i) => {
          const angle = i * angleStep - Math.PI / 2
          const nx = CX + Math.cos(angle) * R_ORBIT
          const ny = CY + Math.sin(angle) * R_ORBIT
          const sym = eventSymbol(ev)
          const isOn = hovered === ev.id

          return (
            <g
              key={ev.id}
              role="button"
              tabIndex={0}
              aria-label={`${SEVERITY_LABEL[ev.intensity]} · ${ev.title}`}
              style={{ cursor: 'pointer', outline: 'none' }}
              onMouseEnter={() => setHovered(ev.id)}
              onMouseLeave={() => setHovered((h) => (h === ev.id ? null : h))}
              onFocus={() => setHovered(ev.id)}
              onBlur={() => setHovered((h) => (h === ev.id ? null : h))}
              onClick={() => setActivePanelId(ev.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePanelId(ev.id) }
              }}
            >
              {/* Native tooltip, so the title is reachable even without the caption */}
              <title>{ev.title}</title>

              <line
                x1={CX} y1={CY} x2={nx} y2={ny}
                stroke={isOn ? `${sym.color}90` : `${sym.color}28`}
                strokeWidth={isOn ? 1.5 : 1}
              />

              <circle
                cx={nx} cy={ny} r={R_NODE}
                fill={isOn ? `${sym.color}38` : `${sym.color}18`}
                stroke={isOn ? sym.color : `${sym.color}80`}
                strokeWidth={isOn ? 1.5 : 1}
              />

              <text
                x={nx} y={ny}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fill={sym.color}
                style={{ pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}
              >
                {sym.glyph}
              </text>

              {/* Hit area last so it sits on top of the painted node */}
              <circle cx={nx} cy={ny} r={R_HIT} fill="transparent" />
            </g>
          )
        })}

        {/* Center node */}
        <circle cx={CX} cy={CY} r={R_CENTER} fill={`${accentColor}20`} stroke={accentColor} strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={R_CENTER} fill="none" stroke={`${accentColor}40`} strokeWidth="6" />
      </svg>

      {/* Caption. Fixed height so revealing a title never shifts the layout,
          and a single slot so two titles can never collide. */}
      <div
        aria-live="polite"
        style={{
          minHeight: '30px', marginTop: '4px',
          fontSize: '10px', lineHeight: 1.4,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {active ? (
          <>
            <span style={{ color: eventSymbol(active).color, letterSpacing: '0.08em' }}>
              {eventSymbol(active).glyph} {SEVERITY_LABEL[active.intensity]}
            </span>
            <span style={{ color: '#2a4060' }}>
              {' · '}{relativeTime(active.published_at)}
            </span>
            <div style={{
              color: '#8aabbf', marginTop: '1px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {active.title}
            </div>
          </>
        ) : (
          <span style={{ color: '#2a4060', letterSpacing: '0.06em' }}>
            {t('event.labels.graphHint', 'Hover a node to read it · click to open')}
          </span>
        )}
      </div>
    </div>
  )
}
