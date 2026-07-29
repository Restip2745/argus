import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { useEventArrivals } from './useEventArrivals'
import { severityRank } from '../data/symbology'
import { configureSound, installUnlockHandlers, alert as playAlert } from '../lib/sound'

/**
 * Binds the audio engine to app state and to the arrival moment.
 *
 * Only CRITICAL and HIGH arrivals make a sound. Everything quieter stays
 * silent — a cue that fires for every item is ambience, not an alert, and the
 * operator stops hearing it within a day.
 */
export function useArgusSound(): void {
  const soundEnabled = useAppStore((s) => s.soundEnabled)
  const soundVolume  = useAppStore((s) => s.soundVolume)
  const arrival      = useEventArrivals()
  const lastGenRef   = useRef(0)

  // Keep the engine's copy of the settings current.
  useEffect(() => {
    configureSound({ enabled: soundEnabled, volume: soundVolume })
  }, [soundEnabled, soundVolume])

  // Browsers will not start an AudioContext until the user has interacted.
  useEffect(() => installUnlockHandlers(), [])

  useEffect(() => {
    if (arrival.gen === 0 || arrival.gen === lastGenRef.current) return
    lastGenRef.current = arrival.gen
    if (severityRank(arrival.peak) >= severityRank('HIGH')) playAlert()
  }, [arrival])
}
