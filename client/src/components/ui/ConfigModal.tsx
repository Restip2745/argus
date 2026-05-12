import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useAppStore } from '../../store'
import { useDraggable } from '../../hooks/useDraggable'
import { useFilteredEvents } from '../../hooks/useFilteredEvents'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface LlmConfig {
  host:        string
  model:       string
  temperature: number
  contextSize: number
}

interface FeedConfigItem {
  name:    string
  url:     string
  lang:    'en' | 'zh' | 'ar' | 'fr'
  region:  string | null
  enabled: boolean
}

interface FeedStatus {
  name:         string
  lastSuccess:  string | null
  lastError:    string | null
  errorMessage: string | null
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-[rgba(0,180,255,0.12)]" />
      <span className="text-[#9b6dff] tracking-[0.12em] text-[9px] uppercase">{label}</span>
      <div className="h-px flex-1 bg-[rgba(0,180,255,0.12)]" />
    </div>
  )
}

// ── Input row label ───────────────────────────────────────────────────────────
function FieldLabel({ text, value }: { text: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between mb-1">
      <span className="text-[#4a6070] text-[10px] tracking-widest">{text}</span>
      {value !== undefined && <span className="text-[#00d4ff] text-[10px]">{value}</span>}
    </div>
  )
}

export function ConfigModal() {
  const filteredEvents = useFilteredEvents()
  const allEvents      = useAppStore((s) => s.events)
  const setShowConfig  = useAppStore((s) => s.setShowConfig)
  const uiScale       = useAppStore((s) => s.uiScale)
  const setUiScale    = useAppStore((s) => s.setUiScale)
  const cardRef       = useRef<HTMLDivElement>(null)

  const [config,   setConfig]   = useState<LlmConfig | null>(null)
  const [models,   setModels]   = useState<string[]>([])
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'saving' | 'error'>('loading')
  const [errMsg,   setErrMsg]   = useState('')
  const [dirty,    setDirty]    = useState(false)
  const [hovered,  setHovered]  = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragOffsetRef = useRef(dragOffset)
  dragOffsetRef.current = dragOffset
  const { onMouseDown: startDrag, dragging } = useDraggable()

  const [feeds,       setFeeds]       = useState<FeedConfigItem[]>([])
  const [feedStatuses, setFeedStatuses] = useState<Record<string, FeedStatus>>({})
  const [newFeedName, setNewFeedName] = useState('')
  const [newFeedUrl,  setNewFeedUrl]  = useState('')
  const [localScale,  setLocalScale]  = useState(uiScale)

  // Snapshot of last-saved state — used by Cancel to revert
  const savedConfig = useRef<LlmConfig | null>(null)
  const savedFeeds  = useRef<FeedConfigItem[]>([])
  const savedScale  = useRef(uiScale)

  // ── Drag ──────────────────────────────────────────────────
  function handleHeaderMouseDown(e: React.MouseEvent) {
    const rect = cardRef.current?.getBoundingClientRect()
    const W = window.innerWidth, H = window.innerHeight
    const { x: initX, y: initY } = dragOffsetRef.current
    const startX = e.clientX, startY = e.clientY
    const minX = rect ? initX - rect.left        : -Infinity
    const maxX = rect ? initX + (W - rect.right)  :  Infinity
    const minY = rect ? initY - rect.top          : -Infinity
    const maxY = rect ? initY + (H - rect.bottom) :  Infinity
    startDrag(e, (mv) => {
      setDragOffset({
        x: Math.max(minX, Math.min(maxX, initX + mv.clientX - startX)),
        y: Math.max(minY, Math.min(maxY, initY + mv.clientY - startY)),
      })
    })
  }

  // ── Fetch ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setStatus('loading')
    setErrMsg('')
    try {
      const [cfgRes, modRes, feedsRes, healthRes] = await Promise.all([
        fetch(`${API}/api/config/llm`),
        fetch(`${API}/api/ollama/models`),
        fetch(`${API}/api/config/feeds`),
        fetch(`${API}/api/health`),
      ])
      if (!cfgRes.ok) throw new Error(`Config fetch failed: ${cfgRes.status}`)
      const cfg: LlmConfig = await cfgRes.json()
      const fds: FeedConfigItem[] = feedsRes.ok ? await feedsRes.json() : []
      if (healthRes.ok) {
        const h = await healthRes.json() as { feedStatuses?: FeedStatus[] }
        const statusMap: Record<string, FeedStatus> = {}
        for (const s of (h.feedStatuses ?? [])) statusMap[s.name] = s
        setFeedStatuses(statusMap)
      }
      setConfig(cfg);       savedConfig.current = cfg
      setFeeds(fds);        savedFeeds.current  = fds
      setLocalScale(uiScale); savedScale.current = uiScale
      setModels(modRes.ok ? await modRes.json() : [])
      setDirty(false)
      setStatus('idle')
    } catch (err) {
      setErrMsg((err as Error).message)
      setStatus('error')
    }
  }, [uiScale])

  useEffect(() => { void fetchAll() }, [fetchAll])

  // ── Apply (save + close) ──────────────────────────────────
  async function handleApply() {
    if (!config) return
    setStatus('saving')
    setErrMsg('')
    try {
      const [llmRes, feedsRes] = await Promise.all([
        fetch(`${API}/api/config/llm`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        }),
        fetch(`${API}/api/config/feeds`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feeds),
        }),
      ])
      if (!llmRes.ok) throw new Error(`Save failed: ${llmRes.status}`)
      const saved: LlmConfig = await llmRes.json()
      const savedFds: FeedConfigItem[] = feedsRes.ok ? await feedsRes.json() : feeds
      savedConfig.current = saved
      savedFeeds.current  = savedFds
      savedScale.current  = localScale
      setUiScale(localScale)
      setConfig(saved)
      setFeeds(savedFds)
      setDirty(false)
      setStatus('idle')
      setShowConfig(false)   // close after successful save
    } catch (err) {
      setErrMsg((err as Error).message)
      setStatus('error')
    }
  }

  // ── Cancel (revert + close) ────────────────────────────────
  function handleCancel() {
    if (savedConfig.current) setConfig(savedConfig.current)
    setFeeds(savedFeeds.current)
    setLocalScale(savedScale.current)
    setUiScale(savedScale.current)
    setDirty(false)
    setShowConfig(false)
  }

  function patch(field: keyof LlmConfig, value: string | number) {
    setConfig((prev) => prev ? { ...prev, [field]: value } : prev)
    setDirty(true)
  }

  function toggleFeed(i: number) {
    setFeeds((p) => p.map((f, idx) => idx === i ? { ...f, enabled: !f.enabled } : f))
    setDirty(true)
  }
  function deleteFeed(i: number) {
    setFeeds((p) => p.filter((_, idx) => idx !== i))
    setDirty(true)
  }
  function addFeed() {
    const name = newFeedName.trim(), url = newFeedUrl.trim()
    if (!name || !url) return
    setFeeds((p) => [...p, { name, url, lang: 'en', region: null, enabled: true }])
    setNewFeedName(''); setNewFeedUrl('')
    setDirty(true)
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !dragging) handleCancel()
  }

  const isLoading = status === 'loading' || status === 'saving'

  const filteredIds = useMemo(
    () => filteredEvents.map((e) => e.id).join(','),
    [filteredEvents],
  )
  const hasActiveFilter = filteredEvents.length < allEvents.length

  const cardStyle: React.CSSProperties = {
    transform:  `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
    transition: dragging ? 'none' : 'box-shadow 0.2s',
    boxShadow:  hovered
      ? '0 0 0 1px rgba(0,212,255,0.22), 0 12px 48px rgba(0,0,0,0.8), 0 0 32px rgba(0,180,255,0.1)'
      : '0 0 0 1px rgba(0,180,255,0.12), 0 8px 40px rgba(0,0,0,0.7)',
    cursor: dragging ? 'grabbing' : 'default',
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
      style={{ zIndex: 200 }}
    >
      <div
        ref={cardRef}
        style={{ ...cardStyle, backgroundColor: '#04090e' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-[760px] max-w-[96vw] max-h-[90vh] overflow-hidden border border-[rgba(0,180,255,0.18)] rounded font-mono text-[11px] mx-4"
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[rgba(0,212,255,0.5)] rounded-tl pointer-events-none z-10" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[rgba(0,212,255,0.5)] rounded-tr pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[rgba(0,212,255,0.5)] rounded-bl pointer-events-none z-10" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[rgba(0,212,255,0.5)] rounded-br pointer-events-none z-10" />

        {/* Scrollable wrapper */}
        <div className="max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.15) transparent' }}>

          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-3.5 border-b border-[rgba(0,180,255,0.12)] select-none sticky top-0 z-20"
            style={{ background: '#04090e', cursor: dragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleHeaderMouseDown}
          >
            <span className="text-[#00d4ff] tracking-[0.15em] text-[10px] uppercase font-semibold">⚙ Configuration</span>
            <button
              onClick={handleCancel}
              className="text-[#4a6070] hover:text-[#00d4ff] transition-colors text-base leading-none"
              aria-label="Close"
            >✕</button>
          </div>

          {/* ── Two-column body ── */}
          <div className="grid grid-cols-2 gap-x-6 px-6 py-5" style={{ alignItems: 'start' }}>

            {/* ── LEFT: LLM Settings ── */}
            <div className="space-y-4">
              <SectionTitle label="LLM Settings" />

              {status === 'loading' && !config ? (
                <div className="text-[#2a4060] py-4 text-center tracking-widest">LOADING…</div>
              ) : status === 'error' && !config ? (
                <div className="text-[#ff4d4d] py-2">{errMsg}</div>
              ) : config ? (<>

                <label className="block">
                  <FieldLabel text="OLLAMA HOST" />
                  <input
                    type="text" value={config.host}
                    onChange={(e) => patch('host', e.target.value)}
                    className="argus-input w-full border rounded px-2 py-1.5 transition-colors"
                    placeholder="http://localhost:11434"
                    disabled={isLoading}
                  />
                </label>

                <label className="block">
                  <div className="flex justify-between mb-1">
                    <FieldLabel text="MODEL" />
                    <button
                      onClick={fetchAll} disabled={isLoading}
                      className="text-[#4a6070] hover:text-[#00d4ff] transition-colors text-[9px]"
                    >↻ Refresh</button>
                  </div>
                  {models.length > 0 ? (
                    <select
                      value={config.model}
                      onChange={(e) => patch('model', e.target.value)}
                      className="argus-input w-full border rounded px-2 py-1.5 transition-colors appearance-none cursor-pointer"
                      disabled={isLoading}
                    >
                      {models.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text" value={config.model}
                      onChange={(e) => patch('model', e.target.value)}
                      className="argus-input w-full border rounded px-2 py-1.5 transition-colors"
                      placeholder="gemma4:e4b" disabled={isLoading}
                    />
                  )}
                  <span className="text-[#2a4060] text-[9px] mt-1 block">
                    {models.length > 0 ? `${models.length} model(s) available` : 'No models detected — enter manually'}
                  </span>
                </label>

                <label className="block">
                  <FieldLabel text="TEMPERATURE" value={config.temperature.toFixed(2)} />
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={config.temperature}
                    onChange={(e) => patch('temperature', parseFloat(e.target.value))}
                    className="w-full cursor-pointer" disabled={isLoading}
                  />
                  <div className="flex justify-between text-[#2a4060] text-[9px] mt-0.5">
                    <span>0.0 precise</span><span>1.0 creative</span>
                  </div>
                </label>

                <label className="block">
                  <FieldLabel text="CONTEXT SIZE (tokens)" value={config.contextSize.toLocaleString()} />
                  <input
                    type="range" min={512} max={32768} step={512}
                    value={config.contextSize}
                    onChange={(e) => patch('contextSize', parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer"
                    style={{ '--thumb-color': '#9b6dff', '--thumb-glow': 'rgba(155,109,255,0.6)' } as React.CSSProperties}
                    disabled={isLoading}
                  />
                  <div className="flex justify-between text-[#2a4060] text-[9px] mt-0.5">
                    <span>512</span><span>32 768</span>
                  </div>
                </label>

              </>) : null}
            </div>

            {/* ── RIGHT: Display + RSS Feeds ── */}
            <div className="space-y-6">

              {/* Display */}
              <div>
                <SectionTitle label="Display" />
                <label className="block">
                  <FieldLabel text="UI SCALE" value={`${Math.round(localScale * 100)}%`} />
                  <input
                    type="range" min={0.75} max={1.5} step={0.05}
                    value={localScale}
                    onChange={(e) => { setLocalScale(parseFloat(e.target.value)); setDirty(true) }}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[#2a4060] text-[9px] mt-0.5">
                    <span>75%</span><span>100%</span><span>150%</span>
                  </div>
                </label>
              </div>

              {/* RSS Feeds */}
              <div>
                <SectionTitle label="RSS Feeds" />

                <div
                  className="space-y-0.5 mb-3 overflow-y-auto"
                  style={{ maxHeight: 200, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.12) transparent' }}
                >
                  {feeds.length === 0 && (
                    <div className="text-[#2a4060] py-2 text-center">No feeds configured</div>
                  )}
                  {feeds.map((feed, i) => {
                    const fs = feedStatuses[feed.name]
                    const dotColor = !fs ? '#2a4060'
                      : fs.lastError && (!fs.lastSuccess || fs.lastError > fs.lastSuccess) ? '#ff4d4d'
                      : '#39ff8a'
                    const dotTitle = !fs ? 'No data yet'
                      : fs.errorMessage ? `Error: ${fs.errorMessage}`
                      : fs.lastSuccess ? `Last OK: ${new Date(fs.lastSuccess).toLocaleTimeString()}` : ''
                    return (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-[rgba(0,180,255,0.06)]">
                        <button
                          onClick={() => toggleFeed(i)} disabled={isLoading}
                          className={`w-4 h-4 flex-shrink-0 border rounded-sm transition-colors text-[9px] flex items-center justify-center
                            ${feed.enabled
                              ? 'border-[rgba(0,212,255,0.6)] bg-[rgba(0,212,255,0.15)] text-[#00d4ff]'
                              : 'border-[rgba(0,180,255,0.2)] text-[#2a4060]'}`}
                          title={feed.enabled ? 'Disable' : 'Enable'}
                        >
                          {feed.enabled ? '✓' : ''}
                        </button>
                        {/* Feed health status dot */}
                        <span
                          title={dotTitle}
                          style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: dotColor,
                            flexShrink: 0,
                            boxShadow: dotColor !== '#2a4060' ? `0 0 4px ${dotColor}88` : 'none',
                          }}
                        />
                        <span
                          className={`flex-1 truncate cursor-pointer text-[10px] transition-colors
                            ${feed.enabled ? 'text-[#a8c4d8]' : 'text-[#2a4060]'}`}
                          onClick={() => toggleFeed(i)} title={feed.url}
                        >
                          {feed.name}
                        </span>
                        <button
                          onClick={() => deleteFeed(i)} disabled={isLoading}
                          className="text-[#4a6070] hover:text-[#ff4d4d] transition-colors text-[10px] flex-shrink-0"
                          title="Remove"
                        >✕</button>
                      </div>
                    )
                  })}
                </div>

                {/* Add feed */}
                <div className="flex gap-2">
                  <input
                    type="text" value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    placeholder="Name"
                    className="argus-input border rounded px-2 py-1.5 transition-colors w-[30%] text-[10px]"
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === 'Enter' && addFeed()}
                  />
                  <input
                    type="text" value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    placeholder="https://…/feed"
                    className="argus-input border rounded px-2 py-1.5 transition-colors flex-1 text-[10px]"
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === 'Enter' && addFeed()}
                  />
                  <button
                    onClick={addFeed}
                    disabled={isLoading || !newFeedName.trim() || !newFeedUrl.trim()}
                    className="px-2 py-1.5 border rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-[rgba(0,212,255,0.4)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] text-[10px] flex-shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>

            </div>{/* end right column */}
          </div>{/* end grid */}

          {errMsg && status === 'error' && (
            <p className="mx-6 mb-4 text-[#ff4d4d] text-[10px] border border-[rgba(255,77,77,0.2)] rounded px-3 py-2">
              ⚠ {errMsg}
            </p>
          )}

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-3.5 border-t border-[rgba(0,180,255,0.12)] sticky bottom-0 z-20"
            style={{ background: '#04090e' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[9px] tracking-widest">
                {status === 'saving' && <span className="text-[#00d4ff]">SAVING…</span>}
                {status === 'idle' && !dirty && <span className="text-[#2a4060]">NO UNSAVED CHANGES</span>}
                {status === 'idle' &&  dirty && <span className="text-[#ff9c2a]">● UNSAVED CHANGES</span>}
              </span>
              <a
                href={`${API}/api/events/export?format=json`}
                download
                className="text-[#2a4060] hover:text-[#4a6070] transition-colors text-[9px] tracking-widest"
                title={`Download all ${allEvents.length} events as JSON`}
              >↓ JSON</a>
              <a
                href={`${API}/api/events/export?format=csv`}
                download
                className="text-[#2a4060] hover:text-[#4a6070] transition-colors text-[9px] tracking-widest"
                title={`Download all ${allEvents.length} events as CSV`}
              >↓ CSV</a>
              {hasActiveFilter && (
                <>
                  <a
                    href={`${API}/api/events/export?format=json&ids=${encodeURIComponent(filteredIds)}`}
                    download
                    className="text-[#2a4060] hover:text-[#4a6070] transition-colors text-[9px] tracking-widest"
                    title={`Download filtered ${filteredEvents.length} events as JSON`}
                  >↓ JSON ({filteredEvents.length})</a>
                  <a
                    href={`${API}/api/events/export?format=csv&ids=${encodeURIComponent(filteredIds)}`}
                    download
                    className="text-[#2a4060] hover:text-[#4a6070] transition-colors text-[9px] tracking-widest"
                    title={`Download filtered ${filteredEvents.length} events as CSV`}
                  >↓ CSV ({filteredEvents.length})</a>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 text-[10px] tracking-widest text-[#4a6070] border border-[rgba(0,180,255,0.15)] rounded hover:text-[#a8c4d8] hover:border-[rgba(0,180,255,0.3)] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleApply}
                disabled={!dirty || isLoading}
                className="px-4 py-1.5 text-[10px] tracking-widest border rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-[rgba(0,212,255,0.45)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.1)]"
              >
                APPLY
              </button>
            </div>
          </div>

        </div>{/* end scrollable */}
      </div>
    </div>
  )
}
