import { useSyncExternalStore } from 'react'
import { PAGES } from '../config'
import { restingPlacement, setPortraitRoom } from './experience'
import { isPortrait, onViewportChange, safeInsets } from './viewport'

// Portrait phones: each page's text sits at the top of the screen and the
// character below it. This measures where the text ends (layout position, so
// the reveal animations don't count), lets the frame placement keep the
// character clear of it (engine/frames.js, FRAMING_PORTRAIT), then publishes
// where each page's freeze frame ends up, so the UI tied to the character
// (Home stats, Projects cartridges, name and tabs) sits on the frame:
//   --fl-<page> --ft-<page> --fw-<page> --fh-<page>   frame left, top, width, height (px)
//   --cart-x --cart-y --cart-w                        centre cartridge: centre and width (px)

const GAP = 14 // px between the text and the character

// the lowest text of each page (the character stays below it)
const TEXT = {
  home: '.nav, .page-home .home-tag, .page-home .home-note',
  about: '.page-about .about-copy, .page-about .cv-button',
  projects: '.page-projects .projects-title',
  contact: '.page-contact .footer',
}
// what sits at the bottom of the screen (the character stays above it)
const BOTTOM = {
  about: '.about-band',
  projects: '.page-projects .tabs',
}
const TABS_MARGIN = 16 // Projects: tabs above the bottom edge (+ safe area), and below the hands

// Projects: the centre cartridge sits on the hands (Figma: 68% of the frame
// wide, its pins at 50% down); the side ones are held in the hands, tilted.
const CART = { width: 0.68, bottom: 0.5, aspect: 446 / 599 }
export const SIDE_CART = { x: -0.03, y: 0.6, width: 0.46, rotation: 32 }

/** Bottom edge of an element as laid out (transforms ignored), in viewport px. */
function layoutBottom(el) {
  let y = el.offsetHeight
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop
  return y
}

let cartridge = null
let version = 0
const subs = new Set()

/** Projects (portrait): the centre cartridge, { x, y, w } (centre, width) and the frame, in px. */
export const portraitCartridge = () => cartridge

function measure() {
  const room = {}
  const inset = safeInsets()
  for (const p of PAGES) {
    const els = [...document.querySelectorAll(TEXT[p.id])]
    const clear = els.length ? Math.max(...els.map(layoutBottom)) + GAP : 0
    const bottom = BOTTOM[p.id] && document.querySelector(BOTTOM[p.id])
    let reserve = bottom ? bottom.offsetHeight : 0
    if (p.id === 'projects' && bottom) reserve += 2 * TABS_MARGIN + inset.bottom
    room[p.id] = { clear, reserve }
  }
  return room
}

function publish(room) {
  const root = document.documentElement.style
  for (const p of PAGES) {
    const f = restingPlacement(p.id)
    if (!f) return
    root.setProperty(`--fl-${p.id}`, `${f.x.toFixed(1)}px`)
    root.setProperty(`--ft-${p.id}`, `${f.y.toFixed(1)}px`)
    root.setProperty(`--fw-${p.id}`, `${f.w.toFixed(1)}px`)
    root.setProperty(`--fh-${p.id}`, `${f.h.toFixed(1)}px`)
  }
  // the centre cartridge: as big as the Figma frame has it, or smaller to fit under the title
  const f = restingPlacement('projects')
  const pins = f.y + CART.bottom * f.h
  const h = Math.max(70, Math.min(CART.width * f.w * CART.aspect, pins - room.projects.clear))
  cartridge = { x: f.x + f.w / 2, y: pins - h / 2, w: h / CART.aspect, frame: f }
  root.setProperty('--cart-x', `${cartridge.x.toFixed(1)}px`)
  root.setProperty('--cart-y', `${cartridge.y.toFixed(1)}px`)
  root.setProperty('--cart-w', `${cartridge.w.toFixed(1)}px`)
}

function update() {
  if (!isPortrait()) return
  const room = measure()
  setPortraitRoom(room)
  publish(room)
  version++
  subs.forEach((f) => f())
}

/** Measure now, once the fonts are in, and on every resize / rotation. */
export function bindPortraitLayout() {
  let raf = 0
  const later = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(update)
  }
  update()
  document.fonts?.ready.then(update)
  window.addEventListener('resize', later)
  const off = onViewportChange(later)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', later)
    off()
  }
}

/** Re-renders when the portrait layout was re-measured (returns a counter). */
export const usePortraitLayout = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => version,
  )
