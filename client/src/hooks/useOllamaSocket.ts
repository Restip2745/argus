import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '../store'
import type { ArgusEvent } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

let socket: Socket | null = null

interface IntelBriefPayload {
  id: string
  summary: string
  generatedAt: string
  topEventIds: string[]
}

export function useOllamaSocket() {
  const addEvent            = useAppStore((s) => s.addEvent)
  const setEvents           = useAppStore((s) => s.setEvents)
  const setIntelBrief       = useAppStore((s) => s.setIntelBrief)
  const setEventsLoaded     = useAppStore((s) => s.setEventsLoaded)
  const setSocketConnected  = useAppStore((s) => s.setSocketConnected)

  useEffect(() => {
    function fetchEvents() {
      return fetch(`${API_BASE}/api/events`)
        .then((res) => res.json())
        .then((data: ArgusEvent[]) => {
          if (Array.isArray(data)) setEvents(data)
        })
        .catch(() => {/* network errors surfaced via eventsLoaded; not actionable in client */})
    }

    // Fetch existing analyzed articles on mount
    fetchEvents().finally(() => setEventsLoaded(true))

    // Connect Socket.io for real-time updates
    socket = io(API_BASE, { path: '/socket.io' })

    socket.on('connect', () => {
      setSocketConnected(true)
    })

    socket.on('reconnect', () => {
      void fetchEvents()
    })

    socket.on('new_event', (event: ArgusEvent) => {
      addEvent(event)
    })

    socket.on('intel_brief', (brief: IntelBriefPayload) => {
      setIntelBrief(brief)
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [addEvent, setEvents, setIntelBrief, setEventsLoaded, setSocketConnected])
}
