/**
 * Table sounds, synthesized with the Web Audio API — no asset files, so the
 * build stays self-contained. The context is created lazily on the first sound
 * (which always follows a user gesture, so browsers won't block it).
 */
export type Sfx = 'card' | 'chip' | 'correct' | 'miss' | 'levelup'

let ctx: AudioContext | null = null
let enabled = false

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  } catch {
    ctx = null
  }
  return ctx
}

interface Tone {
  freq: number
  start: number
  dur: number
  gain: number
  type?: OscillatorType
  /** slide to this frequency over the tone */
  glide?: number
}

function play(tones: Tone[]): void {
  const ac = audio()
  if (!ac) return
  if (ac.state === 'suspended') void ac.resume()
  const now = ac.currentTime
  for (const t of tones) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = t.type ?? 'sine'
    osc.frequency.setValueAtTime(t.freq, now + t.start)
    if (t.glide) {
      osc.frequency.exponentialRampToValueAtTime(t.glide, now + t.start + t.dur)
    }
    // quick attack, exponential decay — reads as a soft percussive blip
    gain.gain.setValueAtTime(0.0001, now + t.start)
    gain.gain.exponentialRampToValueAtTime(t.gain, now + t.start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur)
    osc.connect(gain).connect(ac.destination)
    osc.start(now + t.start)
    osc.stop(now + t.start + t.dur + 0.02)
  }
}

const VOICES: Record<Sfx, Tone[]> = {
  card: [{ freq: 1750, glide: 700, start: 0, dur: 0.055, gain: 0.05, type: 'triangle' }],
  chip: [
    { freq: 1200, start: 0, dur: 0.05, gain: 0.05, type: 'square' },
    { freq: 1600, start: 0.05, dur: 0.05, gain: 0.04, type: 'square' },
  ],
  correct: [
    { freq: 660, start: 0, dur: 0.1, gain: 0.07 },
    { freq: 990, start: 0.08, dur: 0.16, gain: 0.06 },
  ],
  miss: [{ freq: 240, glide: 160, start: 0, dur: 0.22, gain: 0.06, type: 'sawtooth' }],
  levelup: [
    { freq: 523, start: 0, dur: 0.12, gain: 0.06 },
    { freq: 659, start: 0.1, dur: 0.12, gain: 0.06 },
    { freq: 784, start: 0.2, dur: 0.2, gain: 0.07 },
    { freq: 1047, start: 0.3, dur: 0.28, gain: 0.05 },
  ],
}

export function sfx(kind: Sfx): void {
  play(VOICES[kind])
}
