import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { eventSymbol, severityRank } from '../../data/symbology'
import { tick } from '../../lib/sound'
import { isCategoryVisible } from '../../lib/eventFilter'
import type { ArgusEvent } from '../../types'

const TOAST_DURATION_MS = 3000

interface Toast {
  id: string
  event: ArgusEvent
  count: number
  exiting: boolean
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
  onOpen: (toast: Toast) => void
  onHoldStart: (id: string) => void
  onHoldEnd: (id: string) => void
}

function ToastItem({ toast, onDismiss, onOpen, onHoldStart, onHoldEnd }: ToastItemProps) {
  const { t } = useTranslation()
  const sym   = eventSymbol(toast.event)
  const color = sym.color
  const icon  = sym.glyph
  const intensityLabel = t(`event.intensity.${toast.event.intensity}`, toast.event.intensity)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${intensityLabel} — ${toast.event.title}`}
      title={t('toast.openHint', 'Open this event')}
      onClick={() => onOpen(toast)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(toast) }
        if (e.key === 'Escape') onDismiss(toast.id)
      }}
      // Hovering holds the toast open. Three seconds is not long enough to
      // notice an alert, decide it matters and reach it — without this, the
      // thing would vanish from under the cursor on the way to clicking it.
      onMouseEnter={() => onHoldStart(toast.id)}
      onMouseLeave={() => onHoldEnd(toast.id)}
      onFocus={() => onHoldStart(toast.id)}
      onBlur={() => onHoldEnd(toast.id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        padding: '8px 10px',
        background: 'rgba(4,9,22,0.96)',
        border: `1px solid ${color}44`,
        borderLeft: `2px solid ${color}`,
        borderRadius: '4px',
        boxShadow: `0 2px 16px rgba(0,0,0,0.8), 0 0 0 1px ${color}18`,
        backdropFilter: 'blur(8px)',
        maxWidth: '240px',
        minWidth: '180px',
        animation: toast.exiting
          ? 'toastExit 0.25s ease-in forwards'
          : 'toastEnter 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        position: 'relative',
        cursor: 'pointer',
        pointerEvents: 'all',
        textAlign: 'left',
      }}
    >
      {/* Category icon */}
      <span style={{ color, fontSize: '12px', flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.12em', fontWeight: 700, color }}>
            {intensityLabel}
          </span>
          <span style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#5d7c92' }}>
            {sym.label}
          </span>
          {toast.count > 1 && (
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
              padding: '0 3px', borderRadius: '2px',
              background: `${color}22`, color,
            }}>
              ×{toast.count}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#c8dde8',
            lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {toast.count > 1 ? `${toast.event.category.replace(/_/g, ' ')} EVENTS` : toast.event.title}
        </div>
      </div>

      {/* Dismiss — must not also open, so it stops the bubble to the card */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id) }}
        aria-label={t('toast.dismiss', 'Dismiss')}
        style={{
          flexShrink: 0,
          color: '#2a4060',
          fontSize: '11px',
          lineHeight: 1,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: '0 2px',
          marginTop: '-1px',
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const events           = useAppStore((s) => s.events)
  const setActivePanelId = useAppStore((s) => s.setActivePanelId)
  const hiddenCategories = useAppStore((s) => s.hiddenCategories)
  const [toasts, setToasts] = useState<Toast[]>([])
  const prevIdsRef    = useRef<Set<string>>(new Set())
  // true once we have seen the first non-empty event array (REST hydration complete)
  const isHydratedRef = useRef(false)
  const timersRef     = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  /** Toasts the pointer or focus is currently resting on — their clock is paused. */
  const heldRef       = useRef<Set<string>>(new Set())

  const scheduleExit = useCallback((id: string) => {
    if (heldRef.current.has(id)) return          // paused under the cursor
    // Always reset timer (allows deduplication to extend dismiss window)
    const existing = timersRef.current.get(id)
    if (existing) clearTimeout(existing)
    const t = setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t))
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        timersRef.current.delete(id)
      }, 280)
    }, TOAST_DURATION_MS)
    timersRef.current.set(id, t)
  }, [])

  const dismiss = useCallback((id: string) => {
    const existing = timersRef.current.get(id)
    if (existing) { clearTimeout(existing); timersRef.current.delete(id) }
    heldRef.current.delete(id)
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 280)
  }, [])

  // ── Hold on hover / focus ──────────────────────────────────────────────────
  const holdStart = useCallback((id: string) => {
    heldRef.current.add(id)
    const existing = timersRef.current.get(id)
    if (existing) { clearTimeout(existing); timersRef.current.delete(id) }
  }, [])

  const holdEnd = useCallback((id: string) => {
    heldRef.current.delete(id)
    // Only restart the clock if the toast is still on screen.
    setToasts((prev) => {
      if (prev.some((t) => t.id === id && !t.exiting)) scheduleExit(id)
      return prev
    })
  }, [scheduleExit])

  /** Acting on an alert both opens it and clears it — it has been dealt with. */
  const open = useCallback((toast: Toast) => {
    tick()
    setActivePanelId(toast.event.id)
    dismiss(toast.id)
  }, [setActivePanelId, dismiss])

  useEffect(() => {
    const currentIds = new Set(events.map((e) => e.id))

    if (!isHydratedRef.current) {
      // Seed prevIdsRef from whatever is in the store (empty set initially, then
      // the full REST response). Only mark hydrated once we've seen a non-empty
      // set — this ensures the bulk setEvents() load is never treated as arrivals.
      prevIdsRef.current = currentIds
      if (events.length > 0) isHydratedRef.current = true
      return
    }

    const arriving = events.filter(
      (e) => !prevIdsRef.current.has(e.id) &&
             (e.intensity === 'CRITICAL' || e.intensity === 'HIGH') &&
             // Category only — not the full filter. A toast announces something
             // that just happened, so the time window says nothing about it, and
             // a transient search or a watchlist view must not silence alerts on
             // a monitoring tool. Hiding a category is a standing instruction.
             isCategoryVisible(e, hiddenCategories)
    )
    prevIdsRef.current = currentIds

    if (arriving.length === 0) return

    setToasts((prev) => {
      let updated = [...prev]
      for (const e of arriving) {
        // Merge into same-category non-exiting toast if one exists
        const existingIdx = updated.findIndex(
          (t) => t.event.category === e.category && !t.exiting
        )
        if (existingIdx !== -1) {
          // A merged toast represents the worst thing in its group, not the
          // latest. It is both what the card shows and what clicking it opens,
          // and an alert must take you to the most severe item it stands for.
          updated = updated.map((t, i) =>
            i === existingIdx
              ? {
                  ...t,
                  event: severityRank(e.intensity) > severityRank(t.event.intensity) ? e : t.event,
                  count: t.count + 1,
                }
              : t,
          )
          scheduleExit(updated[existingIdx].id)
        } else {
          updated = [...updated, { id: e.id, event: e, count: 1, exiting: false }]
          scheduleExit(e.id)
        }
      }
      return updated
    })
  }, [events, scheduleExit, hiddenCategories])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes toastEnter {
          from { opacity: 0; transform: translateX(20px) scale(0.92); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes toastExit {
          from { opacity: 1; transform: translateX(0) scale(1);    }
          to   { opacity: 0; transform: translateX(20px) scale(0.9); }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          bottom: '48px',
          right: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 200,
          pointerEvents: 'none',
          fontFamily: 'monospace',
          alignItems: 'flex-end',
        }}
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={dismiss}
            onOpen={open}
            onHoldStart={holdStart}
            onHoldEnd={holdEnd}
          />
        ))}
      </div>
    </>
  )
}
