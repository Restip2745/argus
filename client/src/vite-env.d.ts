/// <reference types="vite/client" />

// satellite.js is imported as ESM but has no bundled @types — stub the module
declare module 'satellite.js' {
  export type Kilometer = number
  export interface EciVec3<T extends number = number> { x: T; y: T; z: T }
  export interface GeodeticLocation { latitude: number; longitude: number; height: number }
  export interface SatRec { error: number; [k: string]: unknown }
  export interface PositionAndVelocity { position: EciVec3<Kilometer> | false; velocity: EciVec3<Kilometer> | false }

  export function twoline2satrec(tleLine1: string, tleLine2: string): SatRec
  export function propagate(satrec: SatRec, date: Date): PositionAndVelocity
  export function gstime(date: Date): number
  export function eciToEcf(positionEci: EciVec3<Kilometer>, gmst: number): EciVec3<Kilometer>
  export function eciToGeodetic(positionEci: EciVec3<Kilometer>, gmst: number): GeodeticLocation
  export function degreesLat(rad: number): number
  export function degreesLong(rad: number): number
}
