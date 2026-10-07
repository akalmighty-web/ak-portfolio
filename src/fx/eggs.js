import gsap from 'gsap'
import { EMAIL, PAGES } from '../config'
import { characterAlphaAt, frameToScreen, setParallax } from '../engine/experience'
import { stageScale } from '../engine/viewport'
import { store } from '../engine/store'
import { unlock } from './achievements'
import { showBubble } from './bubble'
import { finePointer, reducedMotion } from './env'
import { sfx } from './sound'

// Small easter eggs:
//  - poke the character on Home: he says something (5 pokes in a row: "Stop poking me!")
//  - click the logo's halo 5 times: it falls off, bounces and floats back ("Fallen angel")
//  - hidden tab: "👀 Player 2, come back!"
//  - first visit to Contact: "You made it to the end!"

const LINES = [
  'Hey! Scroll down 👇',
  'Same kid, different worlds',
  'Psst… the projects are two scrolls away',
  'I draw things. Lots of things.',
  'Coffee first, then concept art ☕',
  'Psst… my name has a secret ✨',
]
const HOME = PAGES.findIndex((p) => p.id === 'home')
const CONTACT = PAGES.findIndex((p) => p.id === 'contact')
const STREAK_GAP = 1600 // ms between clicks that still counts as "in a row"

/** Is the character (not the transparent part of the frame) under this screen point? */
const onCharacter = (x, y) => characterAlphaAt(x, y) > 40

const canPoke = () => {
  const s = store.get()
  return s.phase === 'ready' && s.page === HOME && s.arrived && !s.openSlug && !s.blocked
}

export function bindEggs() {
  const offs = []

  // ---- poke the character on Home ----
  const poke = { n: 0, t: 0, last: -1 }
  const onClick = (e) => {
    if (!canPoke() || e.target.closest('a, button, .pv, .rotate, .home-title')) return
    if (!onCharacter(e.clientX, e.clientY)) return
    const now = performance.now()
    poke.n = now - poke.t < STREAK_GAP ? poke.n + 1 : 1
    poke.t = now
    sfx.click()
    if (!reducedMotion()) {
      // a small flinch
      const j = { x: 0 }
      gsap.to(j, { keyframes: { x: [5, -4, 3, 0] }, duration: 0.3, ease: 'none', onUpdate: () => setParallax(j.x, 0) })
    }
    let text
    if (poke.n >= 5) {
      text = 'Stop poking me! 😤'
      poke.n = 0
      setTimeout(() => unlock('poke'), 700)
    } else {
      let i
      do i = Math.floor(Math.random() * LINES.length)
      while (i === poke.last)
      poke.last = i
      text = LINES[i]
    }
    // speak from just above his head (right side), wherever the frame is drawn
    const head = frameToScreen(0.6, 0.27) ?? { x: e.clientX, y: e.clientY - 8 }
    showBubble({ text, at: head, duration: 2200 })
  }
  window.addEventListener('click', onClick)
  offs.push(() => window.removeEventListener('click', onClick))

  // pointer cursor over the character on Home (mouse only, sampled sparingly)
  if (finePointer()) {
    let pending = false
    let pointing = false
    const onMove = (e) => {
      if (pending) return
      pending = true
      setTimeout(() => {
        pending = false
        const over = canPoke() && !e.target.closest?.('a, button') && onCharacter(e.clientX, e.clientY)
        if (over !== pointing) document.querySelector('.stage')?.classList.toggle('is-pokeable', (pointing = over))
      }, 120)
    }
    window.addEventListener('pointermove', onMove)
    offs.push(() => window.removeEventListener('pointermove', onMove))
  }

  // ---- knock the halo off the logo ----
  const halo = { n: 0, t: 0, busy: false }
  const onHalo = (e) => {
    const path = e.target.closest?.('.logo .halo')
    if (!path || halo.busy) return
    const now = performance.now()
    halo.n = now - halo.t < STREAK_GAP ? halo.n + 1 : 1
    halo.t = now
    if (reducedMotion()) {
      if (halo.n >= 5) (halo.n = 0), unlock('angel')
      return
    }
    if (halo.n < 5) {
      gsap.fromTo(path, { rotation: 0 }, { keyframes: { rotation: [-8, 6, -3, 0] }, duration: 0.35, transformOrigin: '50% 50%', ease: 'none' })
      return
    }
    halo.n = 0
    halo.busy = true
    // the logo is ~46 stage px wide for a 508-unit-wide drawing: work in the SVG's own units
    // (in stage px, so on a scaled phone stage it falls just as far relative to the page)
    const unit = 508 / (path.ownerSVGElement.getBoundingClientRect().width / stageScale())
    const drop = 150 * unit
    sfx.glitch()
    gsap
      .timeline({ onComplete: () => ((halo.busy = false), unlock('angel')) })
      .to(path, { keyframes: { rotation: [-14, 12, -10, 0] }, duration: 0.3, transformOrigin: '50% 50%', ease: 'none' }) // wobble
      .to(path, { y: drop, rotation: 28, duration: 0.45, ease: 'power2.in' }) // fall
      .to(path, { keyframes: { y: [drop - 40 * unit, drop, drop - 12 * unit, drop] }, rotation: 18, duration: 0.6, ease: 'none' }) // bounce
      .to(path, { y: drop - 20 * unit, rotation: 8, duration: 0.6, ease: 'sine.inOut' }, '+=0.5') // lift
      .to(path, { y: 0, rotation: 0, duration: 1.3, ease: 'sine.inOut' }) // float home
  }
  document.addEventListener('click', onHalo, true)
  offs.push(() => document.removeEventListener('click', onHalo, true))

  // ---- hidden tab ----
  let title = document.title
  const onVisibility = () => {
    if (document.hidden) (title = document.title), (document.title = '👀 Player 2, come back!')
    else document.title = title
  }
  document.addEventListener('visibilitychange', onVisibility)
  offs.push(() => document.removeEventListener('visibilitychange', onVisibility))

  // ---- first visit to Contact ----
  offs.push(
    store.subscribe(() => {
      const s = store.get()
      if (s.page === CONTACT && s.arrived) unlock('end')
    }),
  )

  return () => offs.forEach((off) => off())
}

/** A note in the browser console for curious developers and recruiters. */
export function consoleHello() {
  const art = [
    '     _    _  __',
    '    / \\  | |/ /',
    '   / _ \\ | \' / ',
    '  / ___ \\| . \\ ',
    ' /_/   \\_\\_|\\_\\',
  ].join('\n')
  console.log(`%c${art}`, 'color:#ff0346;font-family:monospace;font-weight:bold;line-height:1.1')
  console.log(
    '%cHi there, fellow tinkerer! 👋%c\nLike what you see? Let\'s build something together.\n%c' + EMAIL + '%c\n\n(psst… some things change if you tap them five times)',
    'font:700 14px/1.6 sans-serif;color:#111',
    'font:13px/1.6 sans-serif;color:#444',
    'font:700 13px/1.6 monospace;color:#ff0346;background:#fff0f3;padding:2px 6px;border-radius:4px',
    'font:12px/1.6 monospace;color:#999',
  )
}
