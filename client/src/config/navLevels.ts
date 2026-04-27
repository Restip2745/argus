import { BODIES, type BodyDef } from '../data/celestialBodies'
import type { CelestialBodyName } from '../types'

export type NavLevelId = 'solar' | 'orbital' | 'surface'

export interface NavLevel {
  id: NavLevelId
  label: string
  minDistance: number
  candidates: (focusedBody: CelestialBodyName | null) => BodyDef[]
}

/** All heliocentric bodies (planets, dwarf planets, comets) + Sun */
const SOLAR_BODIES = BODIES.filter(
  (b) => b.orbitParent === null,
)

/** Get satellites of a given parent body */
function getSatellites(parentId: CelestialBodyName): BodyDef[] {
  return BODIES.filter((b) => b.orbitParent === parentId)
}

function getBody(id: CelestialBodyName): BodyDef | undefined {
  return BODIES.find((b) => b.id === id)
}

export const NAV_LEVELS: NavLevel[] = [
  {
    id: 'solar',
    label: 'SOLAR SYSTEM',
    minDistance: 80.0,
    candidates: () => SOLAR_BODIES,
  },
  {
    id: 'orbital',
    label: 'ORBITAL',
    minDistance: 8.0,
    candidates: (body) => {
      if (!body) return []
      const parent = getBody(body)
      if (!parent) return []
      return [parent, ...getSatellites(body)]
    },
  },
  {
    id: 'surface',
    label: 'SURFACE',
    minDistance: 0,
    candidates: (body) => {
      if (!body) return []
      const b = getBody(body)
      return b ? [b] : []
    },
  },
]

/** Determine the nav level based on camera distance to controls target */
export function determineNavLevel(cameraDistance: number): NavLevel {
  for (const level of NAV_LEVELS) {
    if (cameraDistance >= level.minDistance) {
      return level
    }
  }
  return NAV_LEVELS[NAV_LEVELS.length - 1]
}
