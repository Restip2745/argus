import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../../store'
import { CATEGORY_COLOR, CATEGORY_ICON } from '../../data/categoryConfig'
import type { ArgusEvent } from '../../types'

const TOAST_DURATION_MS = 3000

interface Toast {
  id: string
  event: ArgusEvent
  exiting: boolean
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const color = CATEGORY_COLOR[toast.event.category] ?? '#4a6070'
  const icon  = CATEGORY_ICON[toast.event.category]  ?? '◉'
  const isCritical = toast.event.intensity === 'CRITICAL'

  return (
    <div
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
        cursor: 'default',
        pointerEvents: 'all',
      }}
    >
      {/* Category icon */}
      <span style={{ color, fontSize: '12px', flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: '7px',
            letterSpacing: '0.12em',
            fontWeight: 700,
            color: isCritical ? '#ff4d4d' : '#ff9c2a',
            marginBottom: '3px',
          }}
        >
          {toast.event.intensity}
        </div>
        <div
          style={{
            fontSize: '9px',
            color: '#c8dde8',
            lineHeight: 1.35,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {toast.event.title}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          flexShrink: 0,
          color: '#2a4060',
          fontSize: '9px',
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
  const events         = useAppStore((s) => s.events)
  const [toasts, setToasts] = useState<Toast[]>([])
  const prevIdsRef    = useRef<Set<string>>(new Set())
  // true once we have seen the first non-empty event array (REST hydration complete)
  const isHydratedRef = useRef(false)
  const timersRef     = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const scheduleExit = useCallback((id: string) => {
    const existing = timersRef.current.get(id)
    if (existing) return
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
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 280)
  }, [])

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
             (e.intensity === 'CRITICAL' || e.intensity === 'HIGH')
    )
    prevIdsRef.current = currentIds

    if (arriving.length === 0) return

    setToasts((prev) => [
      ...prev,
      ...arriving.map((e) => ({ id: e.id, event: e, exiting: false })),
    ])

    arriving.forEach((e) => scheduleExit(e.id))
  }, [events, scheduleExit])

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
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </>
  )
}
