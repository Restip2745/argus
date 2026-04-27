import { useState, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const ALLOWED = new Set(['p','ul','ol','li','b','i','h4','br'])

function sanitizeHtml(raw: string): string {
  const div = document.createElement('div')
  div.innerHTML = raw
  sanitizeNode(div)
  return div.innerHTML
}

function sanitizeNode(el: Element) {
  for (const child of [...el.children]) {
    const tag = child.tagName.toLowerCase()
    for (const attr of [...child.attributes]) child.removeAttribute(attr.name)
    if (!ALLOWED.has(tag)) {
      const parent = child.parentNode!
      while (child.firstChild) parent.insertBefore(child.firstChild, child)
      parent.removeChild(child)
    } else {
      sanitizeNode(child)
    }
  }
}

/**
 * Captures the Three.js WebGL canvas (and optional annotation overlay),
 * composites them, and POSTs the base64 image to /api/agent-vision.
 */
export function useCanvasAnalysis() {
  const [html,    setHtml]    = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const analyze = useCallback(async (question?: string, context?: string) => {
    setLoading(true)
    setError(null)
    setHtml(null)
    try {
      // Find the Three.js WebGL canvas (first canvas in DOM)
      const glCanvas = document.querySelector<HTMLCanvasElement>('canvas[data-engine], canvas')
      if (!glCanvas) throw new Error('No canvas found')

      // Composite: WebGL canvas + annotation canvas (if present)
      const w = glCanvas.width
      const h = glCanvas.height
      const tmp = document.createElement('canvas')
      tmp.width  = w
      tmp.height = h
      const ctx = tmp.getContext('2d')!
      ctx.drawImage(glCanvas, 0, 0)

      // Try to find the annotation overlay canvas
      const allCanvases = document.querySelectorAll<HTMLCanvasElement>('canvas')
      if (allCanvases.length > 1) {
        const annotationCanvas = allCanvases[allCanvases.length - 1]
        if (annotationCanvas !== glCanvas) {
          ctx.drawImage(annotationCanvas, 0, 0, w, h)
        }
      }

      // Downscale to max 1280px wide to keep base64 payload manageable
      const MAX_W = 1280
      let outCanvas = tmp
      if (w > MAX_W) {
        const scaled = document.createElement('canvas')
        scaled.width  = MAX_W
        scaled.height = Math.round(h * MAX_W / w)
        const sctx = scaled.getContext('2d')!
        sctx.drawImage(tmp, 0, 0, scaled.width, scaled.height)
        outCanvas = scaled
      }

      // Strip the data URL prefix — Ollama expects raw base64
      const dataUrl = outCanvas.toDataURL('image/jpeg', 0.82)
      const base64  = dataUrl.replace(/^data:image\/\w+;base64,/, '')

      const res = await fetch(`${API_BASE}/api/agent-vision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, question: question ?? '', context: context ?? '' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { html?: string; error?: string }
      if (data.error) throw new Error(data.error)
      setHtml(sanitizeHtml(data.html ?? ''))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => { setHtml(null); setError(null) }, [])

  return { html, loading, error, analyze, clear }
}
