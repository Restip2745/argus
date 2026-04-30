import { useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { CATEGORY_ICON, CATEGORY_COLOR, CATEGORY_LABEL } from '../../data/categoryConfig'

const ALL_CATEGORIES = Object.keys(CATEGORY_COLOR)

type TimeRange = '6h' | '12h' | '24h' | 'all'
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '6h',  label: '6h'  },
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
  { value: 'all', label: 'All' },
]

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
  const { t }                = useTranslation()
  const events               = useAppStore((s) => s.events)
  const hiddenCategories     = useAppStore((s) => s.hiddenCategories)
  const toggleHiddenCategory = useAppStore((s) => s.toggleHiddenCategory)
  const timeRangeFilter      = useAppStore((s) => s.timeRangeFilter)
  const setTimeRangeFilter   = useAppStore((s) => s.setTimeRangeFilter)
  const searchQuery          = useAppStore((s) => s.searchQuery)
  const setSearchQuery       = useAppStore((s) => s.setSearchQuery)

  return (
    <div
      className="absolute top-2 z-20 flex items-center gap-1 font-mono"
      style={{ left: '50%', transform: 'translateX(-50%)' }}
    >
      {/* Keyword search */}
      <div
        className="flex items-center rounded border overflow-hidden"
        style={{
          borderColor: searchQuery ? 'rgba(0,212,255,0.35)' : 'rgba(0,180,255,0.15)',
          background: 'rgba(4,9,22,0.75)',
          backdropFilter: 'blur(4px)',
          marginRight: '4px',
          transition: 'border-color 0.2s',
        }}
      >
        <span style={{ color: '#2a5070', fontSize: '9px', padding: '0 5px', userSelect: 'none' }}>⌕</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('event.search.placeholder', 'SEARCH')}
          className="font-mono outline-none bg-transparent"
          style={{
            fontSize: '8px',
            letterSpacing: '0.07em',
            color: searchQuery ? '#a8c4d8' : '#2a5070',
            width: searchQuery ? '80px' : '52px',
            padding: '3px 0',
            transition: 'width 0.2s, color 0.15s',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              color: '#4a6070', fontSize: '9px', padding: '0 5px',
              background: 'none', border: 'none', cursor: 'pointer',
              lineHeight: 1, transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#00d4ff' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a6070' }}
          >✕</button>
        )}
      </div>

      {/* Time-range quick-filter */}
      <div
        className="flex items-center rounded border overflow-hidden"
        style={{
          borderColor: 'rgba(0,180,255,0.15)',
          background: 'rgba(4,9,22,0.75)',
          backdropFilter: 'blur(4px)',
          marginRight: '4px',
        }}
      >
        {TIME_RANGES.map(({ value, label }) => {
          const active = timeRangeFilter === value
          return (
            <button
              key={value}
              onClick={() => setTimeRangeFilter(value)}
              className="font-mono"
              style={{
                padding: '3px 7px',
                fontSize: '8px',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.08em',
                color: active ? '#00d4ff' : '#2a5070',
                background: active ? 'rgba(0,212,255,0.12)' : 'transparent',
                borderRight: value !== 'all' ? '1px solid rgba(0,180,255,0.1)' : 'none',
                transition: 'color 0.15s, background 0.15s',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {t(`event.timeRange.${value}`, label)}
            </button>
          )
        })}
      </div>

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
