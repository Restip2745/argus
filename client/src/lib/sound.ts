/**
 * ARGUS audio — two cues, synthesised, no asset files.
 *
 * Deliberately minimal. A command room's presence is half auditory, but the
 * moment there are more than a couple of sounds they stop meaning anything and
 * start being noise. The budget is:
 *
 *   alert()   a CRITICAL/HIGH event arrived — low two-tone, the only sound
 *             allowed to interrupt you
 *   tick()    UI acknowledgement — barely audible, confirms the system heard you
 *
 * Browsers refuse to start an AudioContext before a user gesture, so the
 * context is created lazily and resumed on the first real interaction. Cues
 * fired before that are dropped rather than queued: a stale alert playing later
 * would be worse than a missed one.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let unlocked = false

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = 1
  master.connect(ctx.destination)
  return ctx
}

/**
 * Call from a user-gesture handler. Safe to call repeatedly.
 * Installs itself on first pointer/key event via `installUnlockHandlers`.
 */
export function unlock(): void {
  const c = context()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  unlocked = c.state === 'running' || c.state === 'suspended'
}

export function installUnlockHandlers(): () => void {
  const onGesture = () => unlock()
  window.addEventListener('pointerdown', onGesture, { passive: true })
  window.addEventListener('keydown', onGesture, { passive: true })
  return () => {
    window.removeEventListener('pointerdown', onGesture)
    window.removeEventListener('keydown', onGesture)
  }
}

export function isUnlocked(): boolean {
  return unlocked && ctx?.state === 'running'
}

/** One shaped sine/triangle blip. */
function blip(opts: {
  freq: number
  toFreq?: number
  duration: number
  volume: number
  type?: OscillatorType
  delay?: number
  attack?: number
}): void {
  const c = context()
  if (!c || !master) return
  const t0 = c.currentTime + (opts.delay ?? 0)
  const osc = c.createOscillator()
  const gain = c.createGain()

  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, t0)
  if (opts.toFreq != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.toFreq), t0 + opts.duration)
  }

  const attack = opts.attack ?? 0.006
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(opts.volume, t0 + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration)

  osc.connect(gain)
  gain.connect(master)
  osc.start(t0)
  osc.stop(t0 + opts.duration + 0.02)
}

export interface SoundSettings {
  enabled: boolean
  /** 0–1, applied on top of each cue's own level. */
  volume: number
}

let settings: SoundSettings = { enabled: false, volume: 0.6 }

export function configureSound(next: SoundSettings): void {
  settings = next
  if (master) master.gain.value = next.volume
}

function canPlay(): boolean {
  if (!settings.enabled) return false
  if (document.hidden) return false          // never sound into a background tab
  const c = context()
  return !!c && c.state === 'running'
}

/**
 * A CRITICAL/HIGH event arrived. Low, two-tone, descending — reads as "look up"
 * rather than "something broke". Deliberately below the frequency band of
 * typical notification chimes so it does not sound like a chat app.
 */
export function alert(): void {
  if (!canPlay()) return
  blip({ freq: 320, toFreq: 232, duration: 0.20, volume: 0.16, type: 'triangle' })
  blip({ freq: 232, toFreq: 190, duration: 0.34, volume: 0.13, type: 'sine', delay: 0.13 })
}

/** UI acknowledgement — should be felt more than heard. */
export function tick(): void {
  if (!canPlay()) return
  blip({ freq: 1180, toFreq: 900, duration: 0.045, volume: 0.035, type: 'sine', attack: 0.002 })
}

/** Fires a cue regardless of the enabled flag — for the settings preview button. */
export function preview(cue: 'alert' | 'tick'): void {
  const prev = settings.enabled
  settings = { ...settings, enabled: true }
  unlock()
  if (cue === 'alert') alert()
  else tick()
  settings = { ...settings, enabled: prev }
}
