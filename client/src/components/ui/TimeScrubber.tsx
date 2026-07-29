/**
 * TimeScrubber — the operator's control over which instant they are looking at.
 *
 * Everything reads scene time (see `hooks/useSceneTime`), so dragging this
 * moves the feed, the severity census, the map-mode aggregations and the sky
 * together. Being able to rewind is what separates reading a monitor from
 * holding a record.
 *
 * The track doubles as the arrival histogram, so the shape you are scrubbing
 * across is the same shape the status bar's TEMPO module shows — you aim at a
 * spike rather than at a timestamp.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { useSceneTime } from '../../hooks/useSceneTime'
import { severityRank } from '../../data/symbology'
import { tick } from '../../lib/sound'

const HOUR = 3_600_000
/** How far back the scrubber can reach. Beyond retention there is nothing. */
const WINDOW_H = 24
const BUCKETS  = 48

export function TimeScrubber() {
  const { t } = useTranslation()
  const events       = useAppStore((s) => s.events)
  const setSceneTime = useAppStore((s) => s.setSceneTime)
  const returnToLive = useAppStore((s) => s.returnToLive)
  const { now, isLive } = useSceneTime()
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  // The window is anchored to the wall clock, not to scene time — otherwise
  // scrubbing back would drag its own axis along with it.
  //
  // It also must not re-read the clock on every render: each drag step changes
  // scene time, and recomputing the anchor from Date.now() each time would slide
  // the axis forward under the pointer while the user is still holding it. So
  // the anchor advances on its own slow timer, and never mid-drag.
  const [wallNow, setWallNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => {
      if (!draggingRef.current) setWallNow(Date.now())
    }, 15_000)
    return () => clearInterval(id)
  }, [])

  const from = wallNow - WINDOW_H * HOUR

  const buckets = useMemo(() => {
    const total  = new Array(BUCKETS).fill(0)
    const severe = new Array(BUCKETS).fill(0)
    const span   = WINDOW_H * HOUR / BUCKETS
    for (const e of events) {
      const ts = e.published_at ? new Date(e.published_at).getTime() : 0
      if (ts <= 0 || ts < from || ts > wallNow) continue
      const i = Math.min(BUCKETS - 1, Math.floor((ts - from) / span))
      total[i]++
      if (severityRank(e.intensity) >= severityRank('HIGH')) severe[i]++
    }
    const peak = Math.max(1, ...total)
    return total.map((n, i) => ({ n, h: n / peak, severe: n > 0 && severe[i] / n > 0.4 }))
  }, [events, from, wallNow])

  const fraction = Math.max(0, Math.min(1, (now - from) / (WINDOW_H * HOUR)))

  const seek = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const target = from + f * WINDOW_H * HOUR
    // Snapping the last few percent to live avoids a state where the operator
    // believes they are current but are actually a minute behind.
    if (f > 0.985) returnToLive()
    else setSceneTime(target)
  }, [from, setSceneTime, returnToLive])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    tick()
    seek(e.clientX)
  }, [seek])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current) seek(e.clientX)
  }, [seek])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? HOUR : 5 * 60_000
    // Read the current instant from the store rather than the render closure:
    // several key events can land in one batch, and a closed-over `now` would
    // make every one of them compute the same target from the same stale base.
    const current = useAppStore.getState().sceneTime ?? Date.now()
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setSceneTime(Math.max(from, current - step)) }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const next = current + step
      if (next >= Date.now()) returnToLive()
      else setSceneTime(next)
    }
    if (e.key === 'End') { e.preventDefault(); returnToLive() }
  }, [from, setSceneTime, returnToLive])

  const iso = new Date(now).toISOString()
  // Fixed shape (`−0h 00m`) so the label cannot change width as it counts.
  const behindMin = Math.max(0, Math.round((wallNow - now) / 60_000))
  const behindLabel = `−${Math.floor(behindMin / 60)}h ${String(behindMin % 60).padStart(2, '0')}m`

  return (
    <div
      style={{
        position: 'fixed', bottom: '48px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 45, display: 'flex', alignItems: 'center', gap: '10px',
        padding: '5px 10px', width: 'min(660px, calc(100vw - 32px))',
        background: 'rgba(4,9,22,0.9)',
        border: `1px solid ${isLive ? 'rgba(0,180,255,0.15)' : 'rgba(255,149,0,0.35)'}`,
        borderRadius: '5px', backdropFilter: 'blur(8px)',
        fontFamily: 'JetBrains Mono, monospace',
        transition: 'border-color 0.2s',
      }}
    >
      {/* State + instant.
          Fixed width, not min-width: everything flanking the track must be
          layout-stable. The track is flex:1, so any side element that changes
          width resizes the track, which moves the playhead — whose position is
          a percentage of that width — which changes the label again. Dragging
          fed that loop once per frame and the time visibly jittered. */}
      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: '92px' }}>
        <span style={{
          fontSize: '10px', letterSpacing: '0.16em',
          color: isLive ? '#39ff8a' : '#ff9500',
        }}>
          {isLive ? t('scrubber.live', 'LIVE') : t('scrubber.review', 'REVIEW')}
        </span>
        <span style={{ fontSize: '13px', color: '#c8dde8', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          {iso.slice(11, 16)}
          <span style={{ fontSize: '10px', color: '#2a4a63', marginLeft: '4px' }}>UTC</span>
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={t('scrubber.aria', 'Scene time')}
        aria-valuemin={from}
        aria-valuemax={wallNow}
        aria-valuenow={now}
        aria-valuetext={iso}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        style={{
          position: 'relative', flex: 1, height: '30px',
          cursor: 'ew-resize', touchAction: 'none',
          display: 'flex', alignItems: 'flex-end', gap: '1px',
        }}
      >
        {buckets.map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(b.n > 0 ? 8 : 3, b.h * 100)}%`,
              background: b.n === 0
                ? 'rgba(0,180,255,0.10)'
                : b.severe ? 'rgba(255,59,48,0.65)' : 'rgba(0,190,235,0.5)',
              borderRadius: '1px',
              // Everything after the playhead is the future relative to the
              // instant being viewed, so it reads as not-yet-happened.
              opacity: (i + 1) / BUCKETS > fraction ? 0.28 : 1,
              transition: 'opacity 0.15s',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Playhead */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${fraction * 100}%`,
          width: '2px', marginLeft: '-1px',
          background: isLive ? '#39ff8a' : '#ff9500',
          boxShadow: `0 0 8px ${isLive ? '#39ff8a' : '#ff9500'}`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Right cluster — a fixed-width slot that is always present, empty while
          live. Reserving the space unconditionally means entering and leaving
          review does not resize the track either. */}
      <div style={{
        flexShrink: 0, width: '132px',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px',
      }}>
        {!isLive && (
          <>
            <button
              onClick={() => { tick(); returnToLive() }}
              title={t('scrubber.returnHint', 'Jump back to the present (End)')}
              style={{
                fontSize: '10px', letterSpacing: '0.1em',
                padding: '3px 7px', borderRadius: '3px',
                color: '#39ff8a', background: 'rgba(57,255,138,0.10)',
                border: '1px solid rgba(57,255,138,0.35)', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {t('scrubber.return', 'LIVE')} ▶▏
            </button>
            <span style={{
              fontSize: '10px', color: '#5d7c92', whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
              width: '48px', textAlign: 'right',
            }}>
              {behindLabel}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
