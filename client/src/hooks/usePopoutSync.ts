import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import type { ArgusEvent } from '../types'
import type { SelectedCountry } from '../store'

const CHANNEL = 'argus-popout'

type SyncMsg =
  | { type: 'events';          data: ArgusEvent[] }
  | { type: 'selectedCountry'; data: SelectedCountry | null }
  | { type: 'activePanelId';   data: string | null }
  | { type: 'compareMode';     data: boolean }
  | { type: 'comparedCountries'; data: SelectedCountry[] }

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
  const compareMode        = useAppStore((s) => s.compareMode)
  const comparedCountries  = useAppStore((s) => s.comparedCountries)

  const setEvents            = useAppStore((s) => s.setEvents)
  const setSelectedCountry   = useAppStore((s) => s.setSelectedCountry)
  const setActivePanelId     = useAppStore((s) => s.setActivePanelId)
  const setCompareMode       = useAppStore((s) => s.setCompareMode)

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
        if (msg.type === 'compareMode')       setCompareMode(msg.data)
        if (msg.type === 'comparedCountries') {
          // Apply via store's addComparedCountry isn't ideal; just batch-set
          const store = useAppStore.getState()
          msg.data.forEach(c => store.addComparedCountry(c))
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
    channelRef.current.postMessage({ type: 'compareMode', data: compareMode } satisfies SyncMsg)
    channelRef.current.postMessage({ type: 'comparedCountries', data: comparedCountries } satisfies SyncMsg)
  }, [role, compareMode, comparedCountries])

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
        ch.postMessage({ type: 'compareMode',       data: s.compareMode })
        ch.postMessage({ type: 'comparedCountries', data: s.comparedCountries })
      }
    }
    ch.addEventListener('message', handler)
    return () => ch.removeEventListener('message', handler)
  }, [role])
}
