import { SiderealTime } from 'astronomy-engine'
import { readSceneTime } from './useSceneTime'

/**
 * Module-level GAST cache — shared across ALL components.
 * SiderealTime() is an expensive astronomical calculation; calling it
 * once per second (not 60× per second) is sufficient for Earth rotation.
 */
let _cache: number = SiderealTime(new Date())
let _lastMs: number = 0

/**
 * Greenwich Apparent Sidereal Time (hours, 0–24) at the current scene time.
 *
 * Reads scene time internally rather than taking it as an argument: there are
 * nine call sites, several of them in pure helper modules with no access to
 * React state, and Earth's rotation must never disagree with its orbital
 * position about which instant is being drawn.
 *
 * The cache is keyed on distance from the last computed instant, so scrubbing
 * recomputes immediately instead of showing a stale rotation — a jump backwards
 * is just as much a cache miss as a second passing.
 */
export function getGAST(): number {
  const target = readSceneTime()
  if (Math.abs(target - _lastMs) >= 1000) {
    _cache  = SiderealTime(new Date(target))
    _lastMs = target
  }
  return _cache
}

/**
 * Convert GAST to the Earth mesh rotation.y value.
 * Matches CelestialBody's formula: -π/2 + GAST*(π/12)
 */
/**
 * Three.js SphereGeometry maps u=0.5 (Greenwich in a standard equirectangular
 * texture) to the local +X direction. GAST in radians = gast*(π/12) puts the
 * correct longitude facing the Sun with no additional offset.
 */
export function gastToRotY(gast: number): number {
  return gast * (Math.PI / 12)
}
