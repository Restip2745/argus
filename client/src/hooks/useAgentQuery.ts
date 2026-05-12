import { useState, useCallback, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// Whitelist-based HTML sanitizer — strips all attributes and non-whitelisted tags
const ALLOWED = new Set(['p','ul','ol','li','table','thead','tbody','tr','td','th','b','i','h4','br','span'])

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

export interface AgentEntry {
  id:        string
  question:  string
  html:      string   // sanitized HTML (final) or raw partial text (while streaming)
  streaming: boolean  // true while tokens are arriving
}

const MAX_CONTEXT_CHARS = 8000

export function useAgentQuery() {
  const [history, setHistory] = useState<AgentEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ask = useCallback(async (question: string, context: string) => {
    if (!question.trim() || loading) return

    // Cancel any in-flight stream
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    // Guard context size — truncate and note for the user
    const contextTruncated = context.length > MAX_CONTEXT_CHARS
    const effectiveContext = contextTruncated ? context.slice(0, MAX_CONTEXT_CHARS) : context

    // Add a streaming placeholder entry; use a stable ID to avoid index collisions
    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setHistory(h => [...h, { id: entryId, question: question.trim(), html: '', streaming: true }])

    try {
      const res = await fetch(`${API_BASE}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), context: effectiveContext }),
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''
      let   rawText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''   // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string }
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              rawText += parsed.text
              setHistory(h => h.map((e) =>
                e.id === entryId ? { ...e, html: rawText } : e
              ))
            }
          } catch { /* malformed chunk — skip */ }
        }
      }

      // Stream done: sanitize full HTML and mark complete
      const truncationNotice = contextTruncated
        ? '<div class="context-truncated-notice">⚠ Context truncated to 8 000 chars</div>'
        : ''
      const safe = truncationNotice + sanitizeHtml(rawText)
      setHistory(h => h.map((e) =>
        e.id === entryId ? { ...e, html: safe, streaming: false } : e
      ))
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message)
      // Remove the empty placeholder on error
      setHistory(h => h.filter((e) => e.id !== entryId))
    } finally {
      setLoading(false)
    }
  }, [loading])

  const clear = useCallback(() => { setHistory([]); setError(null) }, [])

  return { history, loading, error, ask, clear }
}
