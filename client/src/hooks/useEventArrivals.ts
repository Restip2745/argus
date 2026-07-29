import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { severityRank } from '../data/symbology'
import type { ArgusEvent } from '../types'

/**
 * Single source of truth for "an event just arrived".
 *
 * Arrival detection was previously reimplemented in ToastContainer and
 * EventStack with subtly different hydration guards. Anything that wants to
 * react to the arrival moment — a sound, a flash, a toast — reads it here, so
 * the cues fire together rather than drifting apart.
 *
 * The hydration guard matters: the initial REST load replaces the whole event
 * array at once, and treating that as 250 simultaneous arrivals would fire a
 * wall of toasts and sound on every page load.
 */
export interface Arrival {
  /** Monotonic counter — changes identity on every arrival batch. */
  gen: number
  events: ArgusEvent[]
  /** Highest severity in the batch, or null when nothing has arrived yet. */
  peak: string | null
}

const EMPTY: Arrival = { gen: 0, events: [], peak: null }

export function useEventArrivals(): Arrival {
  const events = useAppStore((s) => s.events)
  const [arrival, setArrival] = useState<Arrival>(EMPTY)

  const seenRef     = useRef<Set<string>>(new Set())
  const hydratedRef = useRef(false)
  const genRef      = useRef(0)

  useEffect(() => {
    const currentIds = new Set(events.map((e) => e.id))

    if (!hydratedRef.current) {
      seenRef.current = currentIds
      // Only consider ourselves hydrated once a non-empty set has landed, so
      // the bulk REST response is absorbed rather than announced.
      if (events.length > 0) hydratedRef.current = true
      return
    }

    const arriving = events.filter((e) => !seenRef.current.has(e.id))
    seenRef.current = currentIds
    if (arriving.length === 0) return

    genRef.current += 1
    const peak = arriving.reduce(
      (best, e) => (severityRank(e.intensity) > severityRank(best) ? e.intensity : best),
      'LOW' as string,
    )
    setArrival({ gen: genRef.current, events: arriving, peak })
  }, [events])

  return arrival
}
