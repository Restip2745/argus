import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import type { FilterPreset } from '../../store'
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
      aria-pressed={!hidden}
      aria-label={`${label} — ${count} events${hidden ? ' (hidden)' : ''}`}
      data-cat-chip
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

function handleChipArrowKey(e: React.KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  const chips = Array.from(
    (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>('[data-cat-chip]')
  )
  const idx = chips.indexOf(document.activeElement as HTMLButtonElement)
  if (idx === -1) return
  e.preventDefault()
  const next = e.key === 'ArrowRight'
    ? chips[(idx + 1) % chips.length]
    : chips[(idx - 1 + chips.length) % chips.length]
  next.focus()
}

export function CategoryFilterBar() {
  const { t }                = useTranslation()
  const events               = useAppStore((s) => s.events)
  const hiddenCategories     = useAppStore((s) => s.hiddenCategories)
  const toggleHiddenCategory = useAppStore((s) => s.toggleHiddenCategory)
  const timeRangeFilter      = useAppStore((s) => s.timeRangeFilter)
  const setTimeRangeFilter   = useAppStore((s) => s.setTimeRangeFilter)
  const searchQuery          = useAppStore((s) => s.searchQuery)
  const setSearchQuery       = useAppStore((s) => s.setSearchQuery)
  const bookmarkedIds        = useAppStore((s) => s.bookmarkedIds)
  const showWatchlistOnly    = useAppStore((s) => s.showWatchlistOnly)
  const setShowWatchlistOnly = useAppStore((s) => s.setShowWatchlistOnly)
  const eventSortOrder       = useAppStore((s) => s.eventSortOrder)
  const setEventSortOrder    = useAppStore((s) => s.setEventSortOrder)
  const filterPresets        = useAppStore((s) => s.filterPresets)
  const saveFilterPreset     = useAppStore((s) => s.saveFilterPreset)
  const applyFilterPreset    = useAppStore((s) => s.applyFilterPreset)
  const deleteFilterPreset   = useAppStore((s) => s.deleteFilterPreset)
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetName,   setPresetName]   = useState('')
  const presetInputRef = useRef<HTMLInputElement>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = () => searchInputRef.current?.focus()
    window.addEventListener('argus:focus-search', handler)
    return () => window.removeEventListener('argus:focus-search', handler)
  }, [])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of events) counts[e.category] = (counts[e.category] ?? 0) + 1
    return counts
  }, [events])

  const isNonDefault = hiddenCategories.length > 0 || timeRangeFilter !== 'all' || searchQuery !== ''

  function handleSavePreset() {
    if (!presetName.trim()) return
    saveFilterPreset(presetName.trim())
    setPresetName(''); setSavingPreset(false)
  }

  return (
    <div
      className="absolute top-2 z-20 flex flex-col items-center gap-1 font-mono"
      style={{ left: '50%', transform: 'translateX(-50%)', alignItems: 'center' }}
    >
    <div className="flex items-center gap-1">
      {/* Watchlist toggle — ★ with bookmark count */}
      <button
        onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
        title={showWatchlistOnly ? 'Show all events' : 'Show bookmarked only'}
        className="flex items-center gap-1 rounded border font-mono"
        style={{
          padding: '3px 7px',
          fontSize: '9px',
          borderColor: showWatchlistOnly ? 'rgba(255,215,0,0.45)' : 'rgba(0,180,255,0.15)',
          background:  showWatchlistOnly ? 'rgba(255,215,0,0.10)' : 'rgba(4,9,22,0.75)',
          color:       showWatchlistOnly ? '#ffd700' : '#2a5070',
          backdropFilter: 'blur(4px)',
          cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s, background 0.15s',
          marginRight: '4px',
        }}
      >
        <span>{showWatchlistOnly ? '★' : '☆'}</span>
        {bookmarkedIds.length > 0 && (
          <span style={{ fontSize: '7px' }}>{bookmarkedIds.length}</span>
        )}
      </button>

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

      {/* Sort order selector */}
      <select
        value={eventSortOrder}
        onChange={(e) => setEventSortOrder(e.target.value as 'newest' | 'heat' | 'intensity')}
        className="font-mono"
        style={{
          fontSize: '8px', color: '#2a5070',
          background: 'rgba(4,9,22,0.75)',
          border: '1px solid rgba(0,180,255,0.15)',
          borderRadius: '3px',
          padding: '3px 16px 3px 6px',
          backdropFilter: 'blur(4px)',
          marginRight: '4px',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='4'%3E%3Cpath d='M0 0l4 4 4-4z' fill='%232a5070'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 4px center',
        }}
        title="Sort order"
      >
        <option value="newest">NEWEST</option>
        <option value="heat">HEAT ↓</option>
        <option value="intensity">INTENSITY ↓</option>
      </select>

      {/* Full-text search input */}
      <div
        className="flex items-center rounded border overflow-hidden"
        style={{
          borderColor: searchQuery ? 'rgba(0,212,255,0.35)' : 'rgba(0,180,255,0.15)',
          background: 'rgba(4,9,22,0.75)',
          backdropFilter: 'blur(4px)',
          marginRight: '4px',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ fontSize: '8px', color: '#2a5070', padding: '3px 4px 3px 6px' }}>⌕</span>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('ui.search', 'Search events…')}
          className="font-mono bg-transparent outline-none"
          style={{
            fontSize: '8px',
            color: searchQuery ? '#a0c8d8' : '#2a5070',
            width: searchQuery ? '90px' : '70px',
            padding: '3px 2px',
            letterSpacing: '0.04em',
            transition: 'width 0.2s, color 0.15s',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              fontSize: '8px',
              color: '#00d4ff',
              padding: '3px 5px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Category filters"
        className="flex items-center gap-1"
        onKeyDown={handleChipArrowKey}
      >
        {ALL_CATEGORIES.map((cat) => (
          <FilterButton
            key={cat}
            cat={cat}
            count={categoryCounts[cat] ?? 0}
            hidden={hiddenCategories.includes(cat)}
            color={CATEGORY_COLOR[cat]}
            icon={CATEGORY_ICON[cat]}
            label={CATEGORY_LABEL[cat]}
            onToggle={() => toggleHiddenCategory(cat)}
          />
        ))}
      </div>
    </div>{/* end filter row */}

    {/* ── Preset row (shown when presets exist or filters are non-default) ── */}
    {(filterPresets.length > 0 || isNonDefault) && (
      <div className="flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: '600px' }}>
        {/* Saved preset chips */}
        {filterPresets.map((preset: FilterPreset) => (
          <div key={preset.id} className="flex items-center rounded border overflow-hidden" style={{
            borderColor: 'rgba(155,109,255,0.3)',
            background: 'rgba(155,109,255,0.06)',
            backdropFilter: 'blur(4px)',
          }}>
            <button
              onClick={() => applyFilterPreset(preset.id)}
              style={{ fontSize: '8px', color: '#c084fc', padding: '2px 6px', letterSpacing: '0.06em', cursor: 'pointer' }}
              title={`Apply preset: ${preset.name}`}
            >⊙ {preset.name}</button>
            <button
              onClick={() => deleteFilterPreset(preset.id)}
              style={{ fontSize: '7px', color: '#4a3060', padding: '2px 4px', cursor: 'pointer', borderLeft: '1px solid rgba(155,109,255,0.2)' }}
              title="Delete preset"
            >✕</button>
          </div>
        ))}

        {/* Save preset flow */}
        {isNonDefault && filterPresets.length < 5 && !savingPreset && (
          <button
            onClick={() => { setSavingPreset(true); setTimeout(() => presetInputRef.current?.focus(), 50) }}
            style={{
              fontSize: '7px', color: '#4a3060', padding: '2px 6px',
              border: '1px solid rgba(155,109,255,0.2)', borderRadius: '3px',
              background: 'transparent', cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >+ SAVE PRESET</button>
        )}
        {savingPreset && (
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: 'rgba(155,109,255,0.4)', background: 'rgba(155,109,255,0.08)' }}>
            <input
              ref={presetInputRef}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') { setSavingPreset(false); setPresetName('') } }}
              placeholder="Preset name…"
              maxLength={30}
              style={{ fontSize: '8px', color: '#c084fc', background: 'transparent', border: 'none', outline: 'none', padding: '2px 6px', width: '90px', letterSpacing: '0.04em' }}
            />
            <button onClick={handleSavePreset} style={{ fontSize: '7px', color: '#9b6dff', padding: '2px 5px', cursor: 'pointer', borderLeft: '1px solid rgba(155,109,255,0.2)' }}>✓</button>
            <button onClick={() => { setSavingPreset(false); setPresetName('') }} style={{ fontSize: '7px', color: '#4a3060', padding: '2px 4px', cursor: 'pointer' }}>✕</button>
          </div>
        )}
      </div>
    )}
    </div>
  )
}
