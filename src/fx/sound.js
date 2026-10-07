import { useSyncExternalStore } from 'react'
import { store } from '../engine/store'

// Optional 8-bit UI sounds, synthesized with Web Audio (no audio files).
// Off by default; the choice is remembered in localStorage. Short and quiet.

const KEY = 'ak-sound'
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) === 'on'
  } catch {
    return false
  }
})()
let ctx = null
const subs = new Set()

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export const soundOn = () => enabled

export function setSound(on) {
  enabled = on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {}
  if (on) {
    audio()
    sfx.click()
  }
  subs.forEach((f) => f())
}

export const useSoundOn = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => enabled,
  )

/** One chiptune note: square / triangle with a quick decay, optional pitch slide. */
function note({ freq, at = 0, dur = 0.07, type = 'square', gain = 0.035, slide }) {
  const c = audio()
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.005)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(amp).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const sfx = {
  // a tiny blip
  click() {
    if (!enabled) return
    note({ freq: 1320, dur: 0.035, gain: 0.025 })
  },
  // cartridge pushed into the slot: thunk, then a little power-on arpeggio
  insert() {
    if (!enabled) return
    note({ freq: 160, slide: 70, dur: 0.12, type: 'triangle', gain: 0.09 })
    note({ freq: 110, at: 0.42, dur: 0.06, type: 'square', gain: 0.03 })
    ;[523, 659, 784, 1047].forEach((f, i) => note({ freq: f, at: 0.5 + i * 0.06, dur: 0.08, gain: 0.025 }))
  },
  // page change: two soft triangle notes
  chime(up = true) {
    if (!enabled) return
    const [a, b] = up ? [784, 1175] : [1175, 784]
    note({ freq: a, dur: 0.1, type: 'triangle', gain: 0.05 })
    note({ freq: b, at: 0.08, dur: 0.16, type: 'triangle', gain: 0.045 })
  },
  // a playful two-step "pop" (title flip)
  pop() {
    if (!enabled) return
    note({ freq: 330, slide: 660, dur: 0.09, type: 'square', gain: 0.03 })
    note({ freq: 990, at: 0.1, dur: 0.08, type: 'triangle', gain: 0.04 })
  },
  // a burst of static (cartridge glitch)
  glitch() {
    if (!enabled) return
    const c = audio()
    const len = Math.floor(c.sampleRate * 0.25)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = c.createBufferSource()
    const amp = c.createGain()
    amp.gain.value = 0.04
    src.buffer = buf
    src.connect(amp).connect(c.destination)
    src.start()
  },
  // achievement fanfare (used by the achievements toast)
  fanfare() {
    if (!enabled) return
    ;[659, 784, 988, 1319].forEach((f, i) => note({ freq: f, at: i * 0.07, dur: i === 3 ? 0.22 : 0.08, gain: 0.03 }))
  },
}

/** UI sounds: a blip on buttons / links, a chime when the page changes. */
export function bindUiSounds() {
  const onClick = (e) => {
    const el = e.target.closest?.('button, a')
    if (!el || el.closest('.cartridge-inner, .sound-toggle')) return
    sfx.click()
  }
  let page = store.get().page
  const offStore = store.subscribe(() => {
    const s = store.get()
    if (s.page !== page && s.phase === 'ready') sfx.chime(s.page > page)
    page = s.page
  })
  document.addEventListener('click', onClick, true)
  return () => {
    document.removeEventListener('click', onClick, true)
    offStore()
  }
}
