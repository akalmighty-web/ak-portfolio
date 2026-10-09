import { useSyncExternalStore } from 'react'
import { portraitPlacement } from './experience'
import { isPortrait, onViewportChange } from './viewport'

// Portrait phones: the frames are drawn at cover-fit (engine/frames.js), so
// every page's freeze frame sits in the same place. This publishes that place,
// so the UI tied to the character (Home stats, Projects cartridges, name and
// tabs) sits on the frame, and sizes the centre cartridge:
//   --fl --ft --fw --fh        frame left, top, width, height (px)
//   --cart-x --cart-y --cart-w centre cartridge: centre and width (px)

// Projects: the centre cartridge sits above the hands (Figma: 68% of the
// screen wide; its image, shadow included, ends at 47% of the frame, so the
// pins clear the fingertips); the side ones are held in the hands, tilted.
const CART = { width: 0.68, bottom: 0.47, aspect: 446 / 599 }
const TITLE_GAP = 10 // px between the PROJECTS title and the cartridge
export const SIDE_CART = { x: 0.1, y: 0.585, width: 0.4, rotation: 30 }

/** Bottom edge of an element as laid out (transforms ignored), in viewport px. */
export function layoutBottom(el) {
  let y = el.offsetHeight
  for (let n = el; n; n = n.offsetParent) y += n.offsetTop
  return y
}

let cartridge = null
let version = 0
const subs = new Set()

/** Projects (portrait): the centre cartridge, { x, y, w } (centre, width) and the frame, in px. */
export const portraitCartridge = () => cartridge

function update() {
  if (!isPortrait()) return
  const f = portraitPlacement()
  if (!f) return
  const root = document.documentElement.style
  root.setProperty('--fl', `${f.x.toFixed(1)}px`)
  root.setProperty('--ft', `${f.y.toFixed(1)}px`)
  root.setProperty('--fw', `${f.w.toFixed(1)}px`)
  root.setProperty('--fh', `${f.h.toFixed(1)}px`)
  // the centre cartridge: as big as the Figma frame has it, or smaller to fit under the title
  const title = document.querySelector('.page-projects .projects-title')
  const bottom = f.y + CART.bottom * f.h
  const room = bottom - (title ? layoutBottom(title) + TITLE_GAP : 0)
  const h = Math.max(70, Math.min(CART.width * window.innerWidth * CART.aspect, room))
  cartridge = { x: window.innerWidth / 2, y: bottom - h / 2, w: h / CART.aspect, frame: f }
  root.setProperty('--cart-x', `${cartridge.x.toFixed(1)}px`)
  root.setProperty('--cart-y', `${cartridge.y.toFixed(1)}px`)
  root.setProperty('--cart-w', `${cartridge.w.toFixed(1)}px`)
  version++
  subs.forEach((cb) => cb())
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
