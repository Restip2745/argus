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

/**
 * Coarse "now", for consumers whose derived work is expensive rather than
 * displayed — event filtering, choropleth aggregation, marker clustering.
 * None of that cares about wall-clock precision (the coarsest window is a
 * 6h range filter), but re-deriving it every second was the actual cost:
 * ticking once a second doesn't just re-render, it re-sorts and re-filters
 * the full event list in every one of that hook's several call sites. This
 * has its own interval — separate from useSceneTime's — so it only fires
 * once a minute while live, instead of piggybacking on a per-second tick
 * meant for a visible clock.
 *
 * When scrubbed to a past instant this is exact and immediate, same as
 * useSceneTime: a frozen instant isn't ticking at all, so there's no churn
 * to coarsen, and rounding a deliberately-picked instant would be wrong.
 */
export function useSceneTimeCoarse(): SceneTime {
  const sceneTime = useAppStore((s) => s.sceneTime)
  const [wallNow, setWallNow] = useState(() => Date.now())

  useEffect(() => {
    if (sceneTime !== null) return          // frozen — no need to tick
    const id = setInterval(() => setWallNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [sceneTime])

  return sceneTime === null
    ? { now: wallNow, isLive: true }
    : { now: sceneTime, isLive: false }
}
