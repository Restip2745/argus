import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import type { ArgusEvent, ContextEntity } from '../types'
import type { SelectedCountry, SelectedPerson } from '../store'

const CHANNEL = 'argus-popout'

type SyncMsg =
  | { type: 'events';           data: ArgusEvent[] }
  | { type: 'selectedCountry';  data: SelectedCountry | null }
  | { type: 'activePanelId';    data: string | null }
  | { type: 'selectedPersons';  data: SelectedPerson[] }
  | { type: 'contextEntities'; data: ContextEntity[] }

/**
 * Broadcast store slices to popout windows and receive updates from the main window.
 * Call in both the main app and the popout page.
 * @param role 'host' = main window (broadcasts changes, listens for ack)
 *             'guest' = popout window (receives and applies)
 */
export function usePopoutSync(role: 'host' | 'guest') {
  const channelRef = useRef<BroadcastChannel | null>(null)

  const events             = useAppStore((s) => s.events)
  const selectedCountry    = useAppStore((s) => s.selectedCountry)
  const activePanelId      = useAppStore((s) => s.activePanelId)
  const selectedPersons    = useAppStore((s) => s.selectedPersons)
  const contextEntities    = useAppStore((s) => s.contextEntities)

  const setEvents            = useAppStore((s) => s.setEvents)
  const setSelectedCountry   = useAppStore((s) => s.setSelectedCountry)
  const setActivePanelId     = useAppStore((s) => s.setActivePanelId)
  const clearSelectedPersons = useAppStore((s) => s.clearSelectedPersons)
  const addSelectedPerson    = useAppStore((s) => s.addSelectedPerson)

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL)
    channelRef.current = ch

    if (role === 'guest') {
      // Guest: apply messages from host
      ch.onmessage = (e: MessageEvent<SyncMsg>) => {
        const msg = e.data
        if (msg.type === 'events')            setEvents(msg.data)
        if (msg.type === 'selectedCountry')   setSelectedCountry(msg.data)
        if (msg.type === 'activePanelId')     setActivePanelId(msg.data)
        if (msg.type === 'selectedPersons') {
          clearSelectedPersons()
          msg.data.forEach(p => addSelectedPerson(p))
        }
        if (msg.type === 'contextEntities') {
          const store = useAppStore.getState()
          store.clearContextEntities()
          msg.data.forEach(e => store.addContextEntity(e))
          store.setShowContextPanel(msg.data.length > 0)
        }
      }
      // Ask host to re-broadcast current state
      ch.postMessage({ type: 'requestSync' })
    }

    return () => ch.close()
  }, [role])

  // Host: broadcast on state changes
  useEffect(() => {
    if (role !== 'host' || !channelRef.current) return
    channelRef.current.postMessage({ type: 'events', data: events } satisfies SyncMsg)
  }, [role, events])

  useEffect(() => {
    if (role !== 'host' || !channelRef.current) return
    channelRef.current.postMessage({ type: 'selectedCountry', data: selectedCountry } satisfies SyncMsg)
  }, [role, selectedCountry])

  useEffect(() => {
    if (role !== 'host' || !channelRef.current) return
    channelRef.current.postMessage({ type: 'activePanelId', data: activePanelId } satisfies SyncMsg)
  }, [role, activePanelId])

  useEffect(() => {
    if (role !== 'host' || !channelRef.current) return
    channelRef.current.postMessage({ type: 'selectedPersons', data: selectedPersons } satisfies SyncMsg)
  }, [role, selectedPersons])

  useEffect(() => {
    if (role !== 'host' || !channelRef.current) return
    channelRef.current.postMessage({ type: 'contextEntities', data: contextEntities } satisfies SyncMsg)
  }, [role, contextEntities])

  // Host: handle re-sync requests from guest
  useEffect(() => {
    if (role !== 'host' || !channelRef.current) return
    const ch = channelRef.current
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'requestSync') {
        const s = useAppStore.getState()
        ch.postMessage({ type: 'events',            data: s.events })
        ch.postMessage({ type: 'selectedCountry',   data: s.selectedCountry })
        ch.postMessage({ type: 'activePanelId',     data: s.activePanelId })
        ch.postMessage({ type: 'selectedPersons',   data: s.selectedPersons })
        ch.postMessage({ type: 'contextEntities',  data: s.contextEntities })
      }
    }
    ch.addEventListener('message', handler)
    return () => ch.removeEventListener('message', handler)
  }, [role])
}
