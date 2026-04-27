import { SiderealTime } from 'astronomy-engine'

/**
 * Module-level GAST cache — shared across ALL components.
 * SiderealTime() is an expensive astronomical calculation; calling it
 * once per second (not 60× per second) is sufficient for Earth rotation.
 */
let _cache: number = SiderealTime(new Date())
let _lastMs: number = 0

/**
 * Returns the current Greenwich Apparent Sidereal Time (hours, 0–24).
 * Recalculated at most once per second; subsequent calls within the same
 * second return the cached value instantly.
 */
export function getGAST(): number {
  const now = Date.now()
  if (now - _lastMs >= 1000) {
    _cache  = SiderealTime(new Date())
    _lastMs = now
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
