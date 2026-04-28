import { useRelatedEvents } from '../../hooks/useRelatedEvents'
import { useAppStore } from '../../store'
import { CATEGORY_COLOR, CATEGORY_ICON } from '../../data/categoryConfig'

const W = 280
const H = 110
const CX = W / 2
const CY = H / 2
const R_ORBIT = 44   // radius of satellite nodes
const R_CENTER = 10  // center node radius
const R_NODE   = 7   // satellite node radius

interface Props {
  eventId: string
  accentColor: string
}

export function EventRelationGraph({ eventId, accentColor }: Props) {
  const { events: related, loading } = useRelatedEvents(eventId)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const onNavigate = setActivePanelId

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', color: '#2a4060', fontSize: '7px', letterSpacing: '0.1em' }}>
      <span style={{ animation: 'markerPulse 1.2s ease-in-out infinite', display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: accentColor }} />
      LOADING GRAPH…
    </div>
  )

  if (related.length === 0) return null

  const nodes = related.slice(0, 8)
  const angleStep = (2 * Math.PI) / nodes.length

  return (
    <div style={{ marginTop: '6px', borderTop: '1px solid rgba(0,180,255,0.07)', paddingTop: '6px' }}>
      <div style={{ color: '#2a4060', fontSize: '6px', letterSpacing: '0.12em', marginBottom: '5px' }}>
        ◈ RELATED EVENTS ({nodes.length})
      </div>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}
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
          const color = CATEGORY_COLOR[ev.category] ?? '#4a6070'
          const icon  = CATEGORY_ICON[ev.category]  ?? '◉'

          return (
            <g key={ev.id}>
              {/* Edge */}
              <line
                x1={CX} y1={CY}
                x2={nx}  y2={ny}
                stroke={`${color}28`}
                strokeWidth="1"
              />

              {/* Node circle */}
              <circle
                cx={nx} cy={ny} r={R_NODE}
                fill={`${color}18`}
                stroke={`${color}80`}
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
                onClick={() => onNavigate(ev.id)}
              />

              {/* Node icon */}
              <text
                x={nx} y={ny}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="8"
                fill={color}
                style={{ cursor: 'pointer', pointerEvents: 'none', userSelect: 'none', fontFamily: 'monospace' }}
              >
                {icon}
              </text>

              {/* Label below node */}
              <foreignObject
                x={nx - 30} y={ny + R_NODE + 2}
                width={60} height={22}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    fontSize: '6px', color: '#4a5060', textAlign: 'center',
                    lineHeight: 1.2, overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {ev.title.slice(0, 28)}{ev.title.length > 28 ? '…' : ''}
                </div>
              </foreignObject>
            </g>
          )
        })}

        {/* Center node */}
        <circle
          cx={CX} cy={CY} r={R_CENTER}
          fill={`${accentColor}20`}
          stroke={accentColor}
          strokeWidth="1.5"
        />
        <circle
          cx={CX} cy={CY} r={R_CENTER}
          fill="none"
          stroke={`${accentColor}40`}
          strokeWidth="6"
        />
      </svg>
    </div>
  )
}
