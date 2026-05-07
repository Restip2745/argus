/**
 * PanelTail — animated SVG dashed line from globe position to panel edge.
 *
 * Runs a requestAnimationFrame loop to imperatively update SVG element
 * attributes (no React re-renders), keeping the tail in sync with camera
 * and panel position every frame.
 */
import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { projectLatLng, panelEdgeAnchor } from '../../hooks/useGlobeProjection'

export interface PanelTailProps {
  /** Ref to the panel's outer DOM element (used for edge-anchor calculation). */
  panelRef:  React.RefObject<HTMLDivElement>
  /** Return current lat/lng target, or null to hide the tail. */
  getLatLng: () => { lat: number; lng: number } | null
  color:     string
  zIndex:    number
  /** Unique SVG filter ID — avoids collisions when multiple tails exist. */
  filterId:  string
}

export function PanelTail({ panelRef, getLatLng, color, zIndex, filterId }: PanelTailProps) {
  const lineRef = useRef<SVGLineElement>(null)
  const dotRef  = useRef<SVGCircleElement>(null)

  useEffect(() => {
    let rafId: number

    function tick() {
      const panel  = panelRef.current
      const line   = lineRef.current
      const dot    = dotRef.current
      const coords = getLatLng()

      const hide = () => {
        line?.setAttribute('opacity', '0')
        dot?.setAttribute('opacity', '0')
        rafId = requestAnimationFrame(tick)
      }

      if (!panel || !line || !dot || !coords) { hide(); return }

      const proj = projectLatLng(coords.lat, coords.lng)
      if (!proj || proj.behind) { hide(); return }

      const rect       = panel.getBoundingClientRect()
      const { ax, ay } = panelEdgeAnchor(rect, proj.x, proj.y)

      line.setAttribute('x1', String(ax));     line.setAttribute('y1', String(ay))
      line.setAttribute('x2', String(proj.x)); line.setAttribute('y2', String(proj.y))
      line.setAttribute('opacity', '0.45')

      dot.setAttribute('cx', String(proj.x)); dot.setAttribute('cy', String(proj.y))
      dot.setAttribute('opacity', '0.7')

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  // getLatLng is intentionally excluded — it reads live state via closure refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef, filterId])

  return createPortal(
    <svg style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: zIndex - 1, overflow: 'visible',
    }}>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <line
        ref={lineRef}
        stroke={color}
        strokeWidth="1"
        strokeDasharray="5 4"
        opacity="0"
        filter={`url(#${filterId})`}
      />
      <circle
        ref={dotRef}
        r="3.5"
        fill={color}
        opacity="0"
        filter={`url(#${filterId})`}
      />
    </svg>,
    document.body,
  )
}
