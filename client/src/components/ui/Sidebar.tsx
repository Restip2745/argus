import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { CATEGORY_COLOR, CATEGORY_ICON, CATEGORY_LABEL } from '../../data/categoryConfig'

const INTENSITY_DOT: Record<string, string> = {
  CRITICAL: '#ff4d4d',
  HIGH:     '#ff9c2a',
  MODERATE: '#ffd700',
  LOW:      '#4a6fa5',
}

export function Sidebar() {
  const { t } = useTranslation()
  const events           = useAppStore((s) => s.events)
  const hiddenCategories = useAppStore((s) => s.hiddenCategories)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const focusedBody      = useAppStore((s) => s.focusedBody)
  const setLiteMode      = useAppStore((s) => s.setLiteMode)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events
      .filter(e => !hiddenCategories.includes(e.category))
      .filter(e => {
        if (!q) return true
        return (
          e.title.toLowerCase().includes(q) ||
          (e.source ?? '').toLowerCase().includes(q) ||
          (e.location_label ?? '').toLowerCase().includes(q) ||
          (e.actors ?? []).some(a => a.toLowerCase().includes(q)) ||
          (e.tags ?? []).some(t => t.toLowerCase().includes(q))
        )
      })
  }, [events, hiddenCategories, query])

  return (
    <aside className="absolute left-0 top-0 h-full w-64 bg-[rgba(4,9,22,0.9)] border-r border-[rgba(0,180,255,0.12)] flex flex-col z-30"
      style={{ borderRight: '1px solid rgba(0,180,255,0.12)' }}>

      {/* Header */}
      <div className="px-3 py-2 border-b border-[rgba(0,180,255,0.12)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#39ff8a] animate-pulse" />
          <span className="text-[#00d4ff] text-[9px] tracking-[0.18em] uppercase font-semibold">ARGUS</span>
          <button
            onClick={() => setLiteMode(true)}
            title="Lite mode"
            className="ml-auto flex items-center justify-center text-[#4a6070] hover:text-[#00d4ff] border border-[rgba(0,180,255,0.15)] hover:border-[rgba(0,180,255,0.4)] rounded transition-colors"
            style={{ width: '20px', height: '20px', fontSize: '11px', background: 'rgba(4,9,22,0.6)' }}
          >
            ⊟
          </button>
        </div>
        <p className="text-[#4a6070] text-[9px] mt-0.5">{t('app.title')}</p>
        {focusedBody && (
          <p className="text-[#9b6dff] text-[9px] mt-1 uppercase tracking-widest">
            ▶ {focusedBody}
          </p>
        )}
      </div>

      {/* Event count + search */}
      <div className="border-b border-[rgba(0,180,255,0.08)]">
        <div className="px-3 py-1.5 text-[9px] text-[#2a4060] flex items-center justify-between">
          <span>INTEL FEED — {filtered.length} ITEMS</span>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#4a6070] hover:text-[#00d4ff] transition-colors"
              style={{ fontSize: '10px', lineHeight: 1 }}
            >✕</button>
          )}
        </div>
        {/* Search input */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <span className="absolute left-2 text-[#2a4060] text-[9px] pointer-events-none">⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full text-[9px] pl-6 pr-2 py-1 rounded outline-none transition-colors"
              style={{
                background: 'rgba(0,180,255,0.04)',
                border: '1px solid rgba(0,180,255,0.12)',
                color: '#a8c4d8',
                fontFamily: 'JetBrains Mono, monospace',
                caretColor: '#00d4ff',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(0,180,255,0.35)' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(0,180,255,0.12)' }}
            />
          </div>
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-[#2a4060] text-[10px]">
            {query ? `No results for "${query}"` : t('panel.noData')}
          </div>
        ) : (
          filtered.map((event) => {
            const catColor = CATEGORY_COLOR[event.category] ?? '#4a6070'
            const dot      = INTENSITY_DOT[event.intensity] ?? '#4a6070'
            const icon     = CATEGORY_ICON[event.category] ?? '◉'
            const cat      = CATEGORY_LABEL[event.category] ?? event.category
            const title    = event.title

            return (
              <button
                key={event.id}
                onClick={() => setActivePanelId(event.id)}
                className="w-full text-left px-3 py-2 border-b border-[rgba(0,180,255,0.06)] hover:bg-[rgba(0,180,255,0.04)] transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span style={{ color: catColor }} className="text-[10px]">{icon}</span>
                  <span style={{ color: dot }} className="text-[8px] tracking-widest uppercase">{cat}</span>
                  {event.body && (
                    <span className="text-[8px] text-[#2a4060] uppercase ml-auto">{event.body}</span>
                  )}
                </div>
                <p className="text-[#a8c4d8] text-[10px] leading-snug line-clamp-2">{title}</p>
                <p className="text-[#2a4060] text-[9px] mt-0.5">{event.source}</p>
              </button>
            )
          })
        )}
      </div>

      {/* Footer: heat score legend */}
      <div className="px-3 py-2 border-t border-[rgba(0,180,255,0.08)] text-[8px] text-[#2a4060]">
        <div className="flex gap-2">
          {Object.entries(INTENSITY_DOT).map(([k, c]) => (
            <span key={k} style={{ color: c }}>● {k[0]}</span>
          ))}
        </div>
      </div>
    </aside>
  )
}
