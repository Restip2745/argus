import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { useFilteredEvents } from '../../hooks/useFilteredEvents'
import {
  eventSymbol, SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER,
} from '../../data/symbology'
import { STATUS_BAR_H } from './StatusBar'
import { tick } from '../../lib/sound'

// ── Active constraint chip ───────────────────────────────────────────────────
// Each chip names one thing narrowing the feed and clears it on click. The feed
// must never be narrowed by something the operator cannot see and undo.

function FilterChip({ label, onClear, color = '#00d4ff' }: {
  label: string
  onClear: () => void
  color?: string
}) {
  return (
    <button
      onClick={onClear}
      title={`Clear: ${label}`}
      className="flex items-center gap-1 rounded"
      style={{
        fontSize: '10px', letterSpacing: '0.06em',
        padding: '1px 4px',
        color,
        background: color + '14',
        border: `1px solid ${color}38`,
        cursor: 'pointer',
        maxWidth: '100%',
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ opacity: 0.6 }}>✕</span>
    </button>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const events           = useAppStore((s) => s.events)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const focusedBody      = useAppStore((s) => s.focusedBody)
  const setLiteMode      = useAppStore((s) => s.setLiteMode)

  // Same source of truth as the 3-D markers and the lite-mode stack. The feed,
  // the globe and the filter bar are now guaranteed to agree.
  const filtered = useFilteredEvents()

  const hiddenCategories     = useAppStore((s) => s.hiddenCategories)
  const timeRangeFilter      = useAppStore((s) => s.timeRangeFilter)
  const setTimeRangeFilter   = useAppStore((s) => s.setTimeRangeFilter)
  const searchQuery          = useAppStore((s) => s.searchQuery)
  const setSearchQuery       = useAppStore((s) => s.setSearchQuery)
  const showWatchlistOnly    = useAppStore((s) => s.showWatchlistOnly)
  const setShowWatchlistOnly = useAppStore((s) => s.setShowWatchlistOnly)
  const eventSortOrder       = useAppStore((s) => s.eventSortOrder)
  const setEventSortOrder    = useAppStore((s) => s.setEventSortOrder)
  const toggleHiddenCategory = useAppStore((s) => s.toggleHiddenCategory)

  const hiddenCount  = hiddenCategories.length
  const isNarrowed   = showWatchlistOnly || timeRangeFilter !== 'all'
                     || searchQuery.trim() !== '' || hiddenCount > 0
  const isReordered  = eventSortOrder !== 'newest'

  function clearAll() {
    setShowWatchlistOnly(false)
    setTimeRangeFilter('all')
    setSearchQuery('')
    hiddenCategories.forEach(toggleHiddenCategory)
  }

  return (
    <aside className="absolute left-0 w-64 bg-[rgba(4,9,22,0.9)] border-r border-[rgba(0,180,255,0.12)] flex flex-col z-30"
      style={{
        top:         `${STATUS_BAR_H}px`,
        height:      `calc(100% - ${STATUS_BAR_H}px)`,
        borderRight: '1px solid rgba(0,180,255,0.12)',
      }}>

      {/* Feed count + why the feed looks the way it does.
          No wordmark and no clock here — the status bar owns the app's identity
          and the time, and repeating them costs a header block of feed space
          to say nothing new. What survives is what is local to this panel: the
          count, the active constraints, and the camera's current focus.

          There is no search box here on purpose either — the filter bar at the
          top of the screen owns every filter control (and the / shortcut).
          This strip reports the resulting state rather than duplicating it. */}
      <div className="border-b border-[rgba(0,180,255,0.08)]">
        <div className="px-3 py-1.5 flex items-center gap-2">
          <span className="text-[11px] text-[#2a4060]">
            {t('feed.title', 'INTEL FEED')} —{' '}
            <span style={{ color: isNarrowed ? '#00d4ff' : '#4a6070' }}>{filtered.length}</span>
            {isNarrowed && <span className="text-[#1e3040]"> / {events.length}</span>}
          </span>

          {/* Camera focus — local to the scene, not shown anywhere else */}
          {focusedBody && (
            <span className="text-[10px] text-[#9b6dff] uppercase tracking-[0.14em] truncate">
              ▶ {focusedBody}
            </span>
          )}

          <button
            onClick={() => setLiteMode(true)}
            title={t('ui.liteMode', 'Lite mode')}
            className="ml-auto flex-shrink-0 flex items-center justify-center text-[#4a6070] hover:text-[#00d4ff] border border-[rgba(0,180,255,0.15)] hover:border-[rgba(0,180,255,0.4)] rounded transition-colors"
            style={{ width: '20px', height: '20px', fontSize: '11px', background: 'rgba(4,9,22,0.6)' }}
          >
            ⊟
          </button>
        </div>
        {(isNarrowed || isReordered) && (
          <div className="px-3 pb-2 flex flex-wrap items-center gap-1">
            {showWatchlistOnly && (
              <FilterChip
                label={`★ ${t('feed.watchlist', 'WATCHLIST')}`}
                color="#ffd426"
                onClear={() => setShowWatchlistOnly(false)}
              />
            )}
            {timeRangeFilter !== 'all' && (
              <FilterChip
                label={timeRangeFilter.toUpperCase()}
                onClear={() => setTimeRangeFilter('all')}
              />
            )}
            {searchQuery.trim() !== '' && (
              <FilterChip
                label={`⌕ ${searchQuery.trim()}`}
                onClear={() => setSearchQuery('')}
              />
            )}
            {hiddenCount > 0 && (
              <FilterChip
                label={`−${hiddenCount} ${t('feed.categories', 'CAT')}`}
                onClear={() => hiddenCategories.forEach(toggleHiddenCategory)}
              />
            )}
            {isReordered && (
              <FilterChip
                label={eventSortOrder === 'heat' ? 'HEAT ↓' : 'INTENSITY ↓'}
                color="#9b6dff"
                onClear={() => setEventSortOrder('newest')}
              />
            )}

            {/* Clear-all sits with the chips it clears, not in a row of its own */}
            {isNarrowed && (
              <button
                onClick={clearAll}
                className="ml-auto text-[10px] tracking-[0.08em] text-[#4a6070] hover:text-[#00d4ff] transition-colors"
                title={t('feed.clearAll', 'Clear all filters')}
              >
                {t('feed.clear', 'CLEAR')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-[11px] leading-relaxed">
            {/* Distinguish "nothing matched your filters" from "nothing here" —
                otherwise an over-filtered feed looks like a dead backend. */}
            {isNarrowed ? (
              <>
                <div className="text-[#4a6070]">
                  {t('feed.emptyFiltered', 'No events match the active filters.')}
                </div>
                <button
                  onClick={clearAll}
                  className="mt-2 text-[#00d4ff] hover:underline text-[10px] tracking-[0.08em]"
                >
                  {t('feed.clearAll', 'Clear all filters')} →
                </button>
              </>
            ) : (
              <span className="text-[#2a4060]">{t('panel.noData')}</span>
            )}
          </div>
        ) : (
          filtered.map((event) => {
            const sym = eventSymbol(event)

            return (
              <button
                key={event.id}
                onClick={() => { tick(); setActivePanelId(event.id) }}
                title={`${SEVERITY_LABEL[event.intensity]} · ${sym.label} · ${sym.reliabilityLabel}`}
                className="w-full text-left px-3 py-2 border-b border-[rgba(0,180,255,0.06)] hover:bg-[rgba(0,180,255,0.04)] transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {/* Severity frame + category glyph — same symbol as on the globe */}
                  <span
                    style={{
                      width: '16px', height: '16px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%', fontSize: '10px',
                      color: sym.color,
                      background: sym.background,
                      border: `1px ${sym.borderStyle} ${sym.borderColor}`,
                    }}
                  >{sym.glyph}</span>
                  <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: '#5d7c92' }}>
                    {sym.label}
                  </span>
                  <span className="text-[10px] tracking-[0.1em]" style={{ color: sym.color }}>
                    {SEVERITY_LABEL[event.intensity]}
                  </span>
                  {event.body && (
                    <span className="text-[10px] text-[#2a4060] uppercase ml-auto">{event.body}</span>
                  )}
                </div>
                <p className="text-[#a8c4d8] text-[11px] leading-snug line-clamp-2">{event.title}</p>
                <p className="text-[#2a4060] text-[10px] mt-0.5">{event.source}</p>
              </button>
            )
          })
        )}
      </div>

      {/* Footer: symbology legend — colour is the only channel that needs one,
          the glyphs are labelled inline on every row. */}
      <div className="px-3 py-2 border-t border-[rgba(0,180,255,0.08)]">
        <div className="text-[10px] tracking-[0.16em] text-[#2a4a63] mb-1.5">
          {t('legend.severity', 'SEVERITY')}
        </div>
        <div className="flex items-center gap-2.5">
          {SEVERITY_ORDER.map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: SEVERITY_COLOR[k], boxShadow: `0 0 6px ${SEVERITY_COLOR[k]}77`,
              }} />
              <span className="text-[10px]" style={{ color: SEVERITY_COLOR[k] }}>{SEVERITY_LABEL[k]}</span>
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
