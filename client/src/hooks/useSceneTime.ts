import { useEffect, useState } from 'react'
import { useAppStore } from '../store'

/**
 * The instant the UI is looking at.
 *
 * Every window calculation in the app must go through this rather than
 * `Date.now()`. If some widgets read the wall clock while others read scene
 * time, scrubbing back produces a display where the event list is in the past
 * and the severity census is in the present — numbers that cannot both be true.
 *
 * When live, this ticks once a second so relative times stay honest without
 * re-rendering the tree at frame rate.
 */
export interface SceneTime {
  /** Effective "now" in epoch ms. */
  now: number
  /** True when following the wall clock. */
  isLive: boolean
}

export function useSceneTime(): SceneTime {
  const sceneTime = useAppStore((s) => s.sceneTime)
  const [wallNow, setWallNow] = useState(() => Date.now())

  useEffect(() => {
    if (sceneTime !== null) return          // frozen — no need to tick
    const id = setInterval(() => setWallNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [sceneTime])

  return sceneTime === null
    ? { now: wallNow, isLive: true }
    : { now: sceneTime, isLive: false }
}

/**
 * Non-reactive read, for `useFrame` and other places that must not subscribe.
 */
export function readSceneTime(): number {
  return useAppStore.getState().sceneTime ?? Date.now()
}

/** Minute-resolution tick — for windows that do not need per-second churn. */
export function useSceneMinute(): { minuteTick: number; now: number; isLive: boolean } {
  const { now, isLive } = useSceneTime()
  return { minuteTick: Math.floor(now / 60_000), now, isLive }
}
