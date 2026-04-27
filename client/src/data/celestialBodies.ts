import { Body } from 'astronomy-engine'
import type { CelestialBodyName } from '../types'

export interface BodyDef {
  id: CelestialBodyName
  /** astronomy-engine Body enum value; null = no ephemeris support */
  astronomyBody: Body | null
  /** Parent body for moons; null = heliocentric */
  orbitParent: CelestialBodyName | null
  label: string
  /** Rendered radius in scene units (Earth = 1.0). NOT to scale. */
  renderedRadius: number
  /** Sidereal rotation period in real hours. Negative = retrograde. 0 = tidally locked. */
  rotationPeriodHours: number
  /** Axial tilt in degrees (from ecliptic north) */
  axialTiltDeg: number
  /** For bodies without ephemeris: orbital radius around parent in scene units */
  orbitRadiusScene?: number
  /** For bodies without ephemeris: orbital period in Earth days */
  orbitPeriodDays?: number
  /** Fallback color (used until textures load) */
  color: string
  /** Is this a star (emissive, no shadow) */
  isStar?: boolean
  /** Has a ring system */
  hasRings?: boolean
  /** Diffuse texture path relative to /textures/ */
  texturePath?: string
  /** Night/city-lights emissive texture (Earth only) */
  nightTexturePath?: string
  /** High-res day texture for close-up LOD */
  hiResTexturePath?: string
  /** High-res night texture for close-up LOD */
  hiResNightTexturePath?: string
  /** Ring texture path (for ring geometry) */
  ringTexturePath?: string
  /** Navigation group — bodies in the same group are collapsed under a header in the solar nav */
  navGroup?: 'asteroid' | 'comet'
}

// ── Scale constants ───────────────────────────────────────────────────────────
/** 1 AU in scene units */
export const AU_SCALE = 150

/** Convert AU Vector (x,y,z) to Three.js scene coords.
 *  astronomy-engine returns J2000 equatorial (EQJ) coords.
 *  We remap: x→x, z_eqj→y_scene, -y_eqj→z_scene
 *  so the ecliptic plane lies near y≈0 with 23.44° tilt. */
export function auToScene(x: number, y: number, z: number): [number, number, number] {
  return [x * AU_SCALE, z * AU_SCALE, -y * AU_SCALE]
}

// ── Body definitions ──────────────────────────────────────────────────────────

export const BODIES: BodyDef[] = [
  // ── Star ──────────────────────────────────────────────────────────────────
  {
    id: 'sun',
    astronomyBody: Body.Sun,
    orbitParent: null,
    label: 'Sun',
    renderedRadius: 5.0,        // Visual; true scale would be 109x Earth
    rotationPeriodHours: 609.12,
    axialTiltDeg: 7.25,
    color: '#fff176',
    isStar: true,
    texturePath: '/textures/2k_sun.jpg',
  },

  // ── Planets ───────────────────────────────────────────────────────────────
  {
    id: 'mercury',
    astronomyBody: Body.Mercury,
    orbitParent: null,
    label: 'Mercury',
    renderedRadius: 0.38,
    rotationPeriodHours: 1407.6,
    axialTiltDeg: 0.03,
    color: '#b0a8a0',
    texturePath: '/textures/2k_mercury.jpg',
  },
  {
    id: 'venus',
    astronomyBody: Body.Venus,
    orbitParent: null,
    label: 'Venus',
    renderedRadius: 0.95,
    rotationPeriodHours: -5832.5,   // Retrograde
    axialTiltDeg: 177.4,
    color: '#e8c97e',
    texturePath: '/textures/2k_venus_surface.jpg',
  },
  {
    id: 'earth',
    astronomyBody: Body.Earth,
    orbitParent: null,
    label: 'Earth',
    renderedRadius: 1.0,
    rotationPeriodHours: 23.934,
    axialTiltDeg: 23.44,
    color: '#1a6496',
    texturePath:          '/textures/2k_earth_daymap.jpg',
    nightTexturePath:     '/textures/2k_earth_nightmap.jpg',
    hiResTexturePath:     '/textures/8k_earth_daymap.jpg',
    hiResNightTexturePath:'/textures/8k_earth_nightmap.jpg',
  },
  {
    id: 'mars',
    astronomyBody: Body.Mars,
    orbitParent: null,
    label: 'Mars',
    renderedRadius: 0.53,
    rotationPeriodHours: 24.623,
    axialTiltDeg: 25.19,
    color: '#c1440e',
    texturePath: '/textures/2k_mars.jpg',
  },
  {
    id: 'jupiter',
    astronomyBody: Body.Jupiter,
    orbitParent: null,
    label: 'Jupiter',
    renderedRadius: 11.2,
    rotationPeriodHours: 9.925,
    axialTiltDeg: 3.13,
    color: '#c88b3a',
    texturePath: '/textures/2k_jupiter.jpg',
  },
  {
    id: 'saturn',
    astronomyBody: Body.Saturn,
    orbitParent: null,
    label: 'Saturn',
    renderedRadius: 9.45,
    rotationPeriodHours: 10.656,
    axialTiltDeg: 26.73,
    color: '#e8d5a3',
    hasRings: true,
    texturePath: '/textures/2k_saturn.jpg',
    ringTexturePath: '/textures/2k_saturn_ring_alpha.png',
  },
  {
    id: 'uranus',
    astronomyBody: Body.Uranus,
    orbitParent: null,
    label: 'Uranus',
    renderedRadius: 4.0,
    rotationPeriodHours: -17.24,    // Retrograde
    axialTiltDeg: 97.77,
    color: '#7de8e8',
    texturePath: '/textures/2k_uranus.jpg',
  },
  {
    id: 'neptune',
    astronomyBody: Body.Neptune,
    orbitParent: null,
    label: 'Neptune',
    renderedRadius: 3.88,
    rotationPeriodHours: 16.11,
    axialTiltDeg: 28.32,
    color: '#3f54ba',
    texturePath: '/textures/2k_neptune.jpg',
  },

  // ── Dwarf planets ─────────────────────────────────────────────────────────
  {
    id: 'pluto',
    astronomyBody: Body.Pluto,
    orbitParent: null,
    label: 'Pluto',
    renderedRadius: 0.18,
    rotationPeriodHours: -153.3,    // Retrograde
    axialTiltDeg: 122.5,
    color: '#ccc1b7',
    // No official Pluto texture from SSS; use fallback color
  },
  {
    id: 'ceres',
    astronomyBody: null,            // Not in astronomy-engine
    orbitParent: null,
    label: 'Ceres',
    renderedRadius: 0.07,
    rotationPeriodHours: 9.07,
    axialTiltDeg: 4.0,
    orbitRadiusScene: 2.77 * AU_SCALE,
    orbitPeriodDays: 1681.6,
    color: '#a0a0a0',
    texturePath: '/textures/2k_ceres_fictional.jpg',
    navGroup: 'asteroid',
  },

  // ── Moons ─────────────────────────────────────────────────────────────────
  {
    id: 'moon',
    astronomyBody: Body.Moon,       // GeoMoon() gives geocentric position
    orbitParent: 'earth',
    label: 'Moon',
    renderedRadius: 0.27,
    rotationPeriodHours: 655.72,
    axialTiltDeg: 1.54,
    // Visual orbit radius — outside Earth's rendered radius (1.0) with good spacing
    orbitRadiusScene: 4.0,
    color: '#c8c8c8',
    texturePath: '/textures/2k_moon.jpg',
  },
  {
    id: 'titan',
    astronomyBody: null,
    orbitParent: 'saturn',
    label: 'Titan',
    renderedRadius: 0.40,
    rotationPeriodHours: 382.7,
    axialTiltDeg: 0.0,
    // Visual orbit radius — outside Saturn's rendered radius (9.45)
    orbitRadiusScene: 22.0,
    orbitPeriodDays: 15.945,
    color: '#c8a042',
  },
  // Jupiter moons — JupiterMoons() gives jovicentric direction; distance overridden visually
  {
    id: 'io',
    astronomyBody: null,
    orbitParent: 'jupiter',
    label: 'Io',
    renderedRadius: 0.29,
    rotationPeriodHours: 42.46,
    axialTiltDeg: 0.0,
    // Visual orbit radii scaled to be outside Jupiter's rendered radius (11.2)
    orbitRadiusScene: 14.5,
    orbitPeriodDays: 1.769,
    color: '#ffe045',
  },
  {
    id: 'europa',
    astronomyBody: null,
    orbitParent: 'jupiter',
    label: 'Europa',
    renderedRadius: 0.25,
    rotationPeriodHours: 85.23,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 18.0,
    orbitPeriodDays: 3.551,
    color: '#c8d0e0',
  },
  {
    id: 'ganymede',
    astronomyBody: null,
    orbitParent: 'jupiter',
    label: 'Ganymede',
    renderedRadius: 0.41,
    rotationPeriodHours: 171.71,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 23.0,
    orbitPeriodDays: 7.155,
    color: '#a0a8b0',
  },
  {
    id: 'callisto',
    astronomyBody: null,
    orbitParent: 'jupiter',
    label: 'Callisto',
    renderedRadius: 0.38,
    rotationPeriodHours: 400.54,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 30.0,
    orbitPeriodDays: 16.69,
    color: '#706860',
  },

  // ── Mars moons ────────────────────────────────────────────────────────────
  {
    id: 'phobos',
    astronomyBody: null,
    orbitParent: 'mars',
    label: 'Phobos',
    renderedRadius: 0.05,
    rotationPeriodHours: 7.65,      // Tidally locked to its orbital period
    axialTiltDeg: 0.0,
    orbitRadiusScene: 1.0,
    orbitPeriodDays: 0.319,
    color: '#9a8870',
  },
  {
    id: 'deimos',
    astronomyBody: null,
    orbitParent: 'mars',
    label: 'Deimos',
    renderedRadius: 0.04,
    rotationPeriodHours: 30.3,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 2.0,
    orbitPeriodDays: 1.263,
    color: '#a09080',
  },

  // ── Saturn moons (additional) ─────────────────────────────────────────────
  {
    id: 'mimas',
    astronomyBody: null,
    orbitParent: 'saturn',
    label: 'Mimas',
    renderedRadius: 0.06,
    rotationPeriodHours: 22.6,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 11.5,
    orbitPeriodDays: 0.942,
    color: '#c0b8b0',
  },
  {
    id: 'enceladus',
    astronomyBody: null,
    orbitParent: 'saturn',
    label: 'Enceladus',
    renderedRadius: 0.07,
    rotationPeriodHours: 32.9,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 13.0,
    orbitPeriodDays: 1.370,
    color: '#e8e8f0',              // Bright white — high albedo ice surface
  },
  {
    id: 'dione',
    astronomyBody: null,
    orbitParent: 'saturn',
    label: 'Dione',
    renderedRadius: 0.10,
    rotationPeriodHours: 65.7,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 15.0,
    orbitPeriodDays: 2.737,
    color: '#c8c0b8',
  },
  {
    id: 'rhea',
    astronomyBody: null,
    orbitParent: 'saturn',
    label: 'Rhea',
    renderedRadius: 0.12,
    rotationPeriodHours: 108.4,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 18.0,
    orbitPeriodDays: 4.518,
    color: '#c0b8b4',
  },

  // ── Uranus moons ──────────────────────────────────────────────────────────
  {
    id: 'miranda',
    astronomyBody: null,
    orbitParent: 'uranus',
    label: 'Miranda',
    renderedRadius: 0.07,
    rotationPeriodHours: 33.9,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 6.0,
    orbitPeriodDays: 1.413,
    color: '#a8a8a8',
  },
  {
    id: 'ariel',
    astronomyBody: null,
    orbitParent: 'uranus',
    label: 'Ariel',
    renderedRadius: 0.10,
    rotationPeriodHours: 60.5,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 8.0,
    orbitPeriodDays: 2.520,
    color: '#b0b8c0',
  },
  {
    id: 'umbriel',
    astronomyBody: null,
    orbitParent: 'uranus',
    label: 'Umbriel',
    renderedRadius: 0.10,
    rotationPeriodHours: 99.5,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 10.0,
    orbitPeriodDays: 4.144,
    color: '#706870',
  },
  {
    id: 'titania',
    astronomyBody: null,
    orbitParent: 'uranus',
    label: 'Titania',
    renderedRadius: 0.12,
    rotationPeriodHours: 208.9,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 13.0,
    orbitPeriodDays: 8.706,
    color: '#a8a8b0',
  },
  {
    id: 'oberon',
    astronomyBody: null,
    orbitParent: 'uranus',
    label: 'Oberon',
    renderedRadius: 0.12,
    rotationPeriodHours: 323.1,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 16.0,
    orbitPeriodDays: 13.463,
    color: '#909098',
  },

  // ── Neptune moons ─────────────────────────────────────────────────────────
  {
    id: 'triton',
    astronomyBody: null,
    orbitParent: 'neptune',
    label: 'Triton',
    renderedRadius: 0.20,
    rotationPeriodHours: -141.0,   // Retrograde rotation (tidally locked to retrograde orbit)
    axialTiltDeg: 0.0,
    orbitRadiusScene: 7.0,
    orbitPeriodDays: -5.877,       // Retrograde orbit
    color: '#b8d0d8',
  },

  // ── Dwarf planets (KBOs) ──────────────────────────────────────────────────
  {
    id: 'eris',
    astronomyBody: null,
    orbitParent: null,
    label: 'Eris',
    renderedRadius: 0.18,
    rotationPeriodHours: 25.9,
    axialTiltDeg: 44.0,
    orbitRadiusScene: 67.8 * AU_SCALE,
    orbitPeriodDays: 204199,        // ~559 years
    color: '#d8d8d8',
  },
  {
    id: 'makemake',
    astronomyBody: null,
    orbitParent: null,
    label: 'Makemake',
    renderedRadius: 0.13,
    rotationPeriodHours: 22.83,
    axialTiltDeg: 29.0,
    orbitRadiusScene: 45.4 * AU_SCALE,
    orbitPeriodDays: 111845,        // ~306 years
    color: '#c8b090',
  },
  {
    id: 'haumea',
    astronomyBody: null,
    orbitParent: null,
    label: 'Haumea',
    renderedRadius: 0.22,
    rotationPeriodHours: 3.92,     // Very fast rotation (elongated shape)
    axialTiltDeg: 28.2,
    orbitRadiusScene: 43.3 * AU_SCALE,
    orbitPeriodDays: 104025,        // ~285 years
    color: '#d0c8c0',
  },

  // ── Notable asteroids ─────────────────────────────────────────────────────
  {
    id: 'vesta',
    astronomyBody: null,
    orbitParent: null,
    label: 'Vesta',
    renderedRadius: 0.12,
    rotationPeriodHours: 5.34,
    axialTiltDeg: 29.0,
    orbitRadiusScene: 2.362 * AU_SCALE,
    orbitPeriodDays: 1325,          // 3.63 years
    color: '#a08870',
    navGroup: 'asteroid',
  },
  {
    id: 'apophis',
    astronomyBody: null,
    orbitParent: null,
    label: 'Apophis',
    renderedRadius: 0.04,
    rotationPeriodHours: 30.4,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 0.9226 * AU_SCALE,
    orbitPeriodDays: 324.8,
    color: '#908070',
    navGroup: 'asteroid',
  },
  {
    id: 'bennu',
    astronomyBody: null,
    orbitParent: null,
    label: 'Bennu',
    renderedRadius: 0.03,
    rotationPeriodHours: -4.30,    // Retrograde
    axialTiltDeg: 0.0,
    orbitRadiusScene: 1.126 * AU_SCALE,
    orbitPeriodDays: 435.9,
    color: '#786860',
    navGroup: 'asteroid',
  },

  // ── Comets ────────────────────────────────────────────────────────────────
  {
    id: 'halley',
    astronomyBody: null,
    orbitParent: null,
    label: "1P/Halley",
    renderedRadius: 0.05,
    rotationPeriodHours: 52.2,
    axialTiltDeg: 0.0,
    // Circular orbit approximation at semi-major axis; actual orbit is highly elliptical
    orbitRadiusScene: 17.8 * AU_SCALE,
    orbitPeriodDays: 27497,         // ~75.3 years
    color: '#c8e8ff',
    navGroup: 'comet',
  },
  {
    id: '67p',
    astronomyBody: null,
    orbitParent: null,
    label: '67P/C-G',
    renderedRadius: 0.04,
    rotationPeriodHours: 12.4,
    axialTiltDeg: 0.0,
    orbitRadiusScene: 3.46 * AU_SCALE,
    orbitPeriodDays: 2351,          // ~6.44 years
    color: '#c0b090',
    navGroup: 'comet',
  },

  // ── Interstellar (grouped under comets in nav) ────────────────────────────
  {
    id: '3i-atlas',
    astronomyBody: null,
    orbitParent: null,
    label: '3I/ATLAS',
    renderedRadius: 0.08,
    rotationPeriodHours: 10.0,
    axialTiltDeg: 0.0,
    // Approximate position near inner solar system — update when ephemeris available
    orbitRadiusScene: 2.0 * AU_SCALE,
    orbitPeriodDays: 0,             // Hyperbolic — no period
    color: '#aaeeff',
    navGroup: 'comet',
  },
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

export const BODY_MAP = new Map(BODIES.map((b) => [b.id, b]))

export function getBody(id: CelestialBodyName): BodyDef {
  const b = BODY_MAP.get(id)
  if (!b) throw new Error(`Unknown body: ${id}`)
  return b
}

/** Rendered radius with safe buffer for camera minDistance */
export const SAFE_BUFFER = 0.15
export function bodyMinDistance(id: CelestialBodyName): number {
  const r = BODY_MAP.get(id)?.renderedRadius ?? 1.0
  return r + SAFE_BUFFER
}

/** View distance when focusing: radius × factor (larger = pull further back) */
export const VIEW_FACTOR: Partial<Record<CelestialBodyName, number>> = {
  sun: 6, jupiter: 5, saturn: 5, uranus: 5, neptune: 5, earth: 8,
}
export function bodyViewDistance(id: CelestialBodyName): number {
  const r = BODY_MAP.get(id)?.renderedRadius ?? 1.0
  const factor = VIEW_FACTOR[id] ?? (r < 0.1 ? 20 : 6)
  return r * factor
}

/** Earth detail-layer threshold in scene units */
export const EARTH_DETAIL_THRESHOLD = 20.0
