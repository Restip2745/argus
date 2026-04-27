import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import type { ArgusEvent } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface State {
  events: ArgusEvent[]
  loading: boolean
}

/** Quick client-side relatedness score between two events (mirrors server logic). */
function relatedScore(target: ArgusEvent, candidate: ArgusEvent): number {
  if (candidate.id === target.id) return 0
  const targetActors = new Set(target.actors ?? [])
  const targetTags   = new Set((target as unknown as Record<string, string[]>).tags ?? [])
  const candidateActors: string[] = candidate.actors ?? []
  const candidateTags:   string[] = (candidate as unknown as Record<string, string[]>).tags ?? []

  let score = 0
  for (const a of candidateActors) if (targetActors.has(a)) score += 2
  for (const t of candidateTags)   if (targetTags.has(t))   score += 1
  const loc = target.location_label?.toLowerCase() ?? ''
  if (loc && loc === candidate.location_label?.toLowerCase()) score += 1
  return score
}

function byDateDesc(a: ArgusEvent, b: ArgusEvent): number {
  return (b.published_at ?? '').localeCompare(a.published_at ?? '')
}

/**
 * Fetches events related to `eventId` from /api/events/:id/related.
 * Re-fetches whenever eventId changes. Results are sorted newest-first.
 * Watches the global event store for real-time arrivals and prepends any
 * new events that have actor/tag/location overlap with the target event.
 */
export function useRelatedEvents(eventId: string | null): State {
  const [state, setState] = useState<State>({ events: [], loading: false })
  const abortRef    = useRef<AbortController | null>(null)
  // Track which IDs are already in the list so we don't duplicate
  const knownIds    = useRef<Set<string>>(new Set())
  // Gate: real-time updates only run after the initial fetch completes
  const fetchDone   = useRef(false)
  // Keep a ref to the target event for the store-watcher closure
  const targetRef   = useRef<ArgusEvent | null>(null)

  // Subscribe to the global events array for real-time arrivals
  const storeEvents = useAppStore((s) => s.events)

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId) {
      setState({ events: [], loading: false })
      knownIds.current.clear()
      fetchDone.current = false
      targetRef.current = null
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setState({ events: [], loading: true })
    knownIds.current.clear()
    fetchDone.current = false

    fetch(`${API_BASE}/api/events/${eventId}/related`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: ArgusEvent[]) => {
        if (ctrl.signal.aborted) return
        const sorted = [...data].sort(byDateDesc)
        knownIds.current = new Set(sorted.map((e) => e.id))
        // Also seed knownIds with any store events that arrived while fetching,
        // so the real-time effect doesn't double-add them
        for (const ev of useAppStore.getState().events) knownIds.current.add(ev.id)
        fetchDone.current = true
        setState({ events: sorted, loading: false })
      })
      .catch((err) => {
        if (err.name !== 'AbortError') { fetchDone.current = true; setState({ events: [], loading: false }) }
      })

    return () => ctrl.abort()
  }, [eventId])

  // Keep targetRef in sync with the current focal event (from the global store)
  useEffect(() => {
    if (!eventId) return
    const found = storeEvents.find((e) => e.id === eventId) ?? null
    targetRef.current = found
  }, [eventId, storeEvents])

  // ── Real-time: prepend newly arrived related events ───────────────────────
  useEffect(() => {
    if (!eventId || !fetchDone.current) return   // wait for initial fetch
    const target = targetRef.current
    if (!target) return

    const incoming = storeEvents.filter((ev) => {
      if (knownIds.current.has(ev.id)) return false
      return relatedScore(target, ev) >= 2   // require meaningful overlap, not just 1 tag
    })

    if (incoming.length === 0) return

    for (const ev of incoming) knownIds.current.add(ev.id)

    const sorted = [...incoming].sort(byDateDesc)
    setState((s) => ({ ...s, events: [...sorted, ...s.events] }))
  }, [storeEvents, eventId])

  return state
}
