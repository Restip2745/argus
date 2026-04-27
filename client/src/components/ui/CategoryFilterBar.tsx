import { useRef, useState, useCallback } from 'react'
import { useAppStore } from '../../store'
import { CATEGORY_ICON, CATEGORY_COLOR, CATEGORY_LABEL } from '../../data/categoryConfig'

const ALL_CATEGORIES = Object.keys(CATEGORY_COLOR)

// ── Single filter button with mouse-tracking sheen ──────────────────────────

interface FilterButtonProps {
  cat: string
  count: number
  hidden: boolean
  color: string
  icon: string
  label: string
  onToggle: () => void
}

function FilterButton({ cat, count, hidden, color, icon, label, onToggle }: FilterButtonProps) {
  const btnRef  = useRef<HTMLButtonElement>(null)
  const [hovered, setHovered] = useState(false)
  const [mouse, setMouse]     = useState({ nx: 0, ny: 0 })       // normalised -1…1
  const [sheenPos, setSheenPos] = useState({ x: 50, y: 50 })     // percent for gradient

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = ((e.clientX - rect.left) / rect.width)  * 2 - 1  // -1…1
    const ny = ((e.clientY - rect.top)  / rect.height) * 2 - 1
    const sx = ((e.clientX - rect.left) / rect.width)  * 100
    const sy = ((e.clientY - rect.top)  / rect.height) * 100
    setMouse({ nx, ny })
    setSheenPos({ x: sx, y: sy })
  }, [])

  const MAX_TILT = 12
  const rotX = hovered ? -mouse.ny * MAX_TILT : 0
  const rotY = hovered ?  mouse.nx * MAX_TILT : 0
  const scale = hovered ? 1.08 : 1

  return (
    <button
      ref={btnRef}
      key={cat}
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMouse({ nx: 0, ny: 0 }) }}
      onMouseMove={onMouseMove}
      title={`${label} (${count})`}
      className="relative flex items-center gap-1 border rounded overflow-hidden"
      style={{
        padding:      '3px 7px',
        fontSize:     '8px',
        color:        hidden ? '#2a4060' : color,
        borderColor:  hidden ? 'rgba(0,180,255,0.1)' : color + '44',
        background:   hidden ? 'rgba(4,9,22,0.7)'    : color + '14',
        opacity:      count === 0 ? 0.35 : 1,
        backdropFilter: 'blur(4px)',
        transform:    `perspective(300px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`,
        transition:   hovered
          ? 'transform 0.06s ease-out, color 0.15s, border-color 0.15s, background 0.15s, opacity 0.15s'
          : 'transform 0.35s cubic-bezier(0.23,1,0.32,1), color 0.15s, border-color 0.15s, background 0.15s, opacity 0.15s',
        willChange:   'transform',
        cursor:       'pointer',
        userSelect:   'none',
      }}
    >
      {/* Mouse-tracking sheen overlay */}
      {hovered && !hidden && (
        <div
          aria-hidden
          style={{
            position:      'absolute',
            inset:         0,
            pointerEvents: 'none',
            background:    `radial-gradient(ellipse 80% 60% at ${sheenPos.x}% ${sheenPos.y}%, ${color}28 0%, transparent 70%)`,
            borderRadius:  'inherit',
            transition:    'background 0.04s',
          }}
        />
      )}

      {/* Icon */}
      <span style={{ position: 'relative', fontSize: '9px' }}>{icon}</span>

      {/* Label */}
      <span
        style={{
          position:      'relative',
          letterSpacing: '0.08em',
          fontWeight:    600,
          color:         hidden ? '#2a4060' : color + 'dd',
        }}
      >
        {label}
      </span>

      {/* Count badge */}
      {count > 0 && (
        <span
          style={{
            position:      'relative',
            fontSize:      '7px',
            padding:       '0 3px',
            borderRadius:  '2px',
            background:    hidden ? 'rgba(0,180,255,0.05)' : color + '22',
            color:         hidden ? '#2a4060' : color + 'cc',
            letterSpacing: '0.04em',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ── Bar ─────────────────────────────────────────────────────────────────────

export function CategoryFilterBar() {
  const events               = useAppStore((s) => s.events)
  const hiddenCategories     = useAppStore((s) => s.hiddenCategories)
  const toggleHiddenCategory = useAppStore((s) => s.toggleHiddenCategory)

  return (
    <div
      className="absolute top-2 z-20 flex items-center gap-1 font-mono"
      style={{ left: '50%', transform: 'translateX(-50%)' }}
    >
      {ALL_CATEGORIES.map((cat) => (
        <FilterButton
          key={cat}
          cat={cat}
          count={events.filter((e) => e.category === cat).length}
          hidden={hiddenCategories.includes(cat)}
          color={CATEGORY_COLOR[cat]}
          icon={CATEGORY_ICON[cat]}
          label={CATEGORY_LABEL[cat]}
          onToggle={() => toggleHiddenCategory(cat)}
        />
      ))}
    </div>
  )
}
