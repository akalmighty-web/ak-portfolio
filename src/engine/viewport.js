import { useSyncExternalStore } from 'react'

// Phones, tablets and small windows get the desktop site itself: the stage is
// laid out at desktop size (1920×1080 design px) and scaled to fit the screen
// inside the safe areas. Like a desktop window, the stage takes the screen's
// shape where the desktop layout already supports it (wider than 16:9: taller
// is never needed; 16:9 down to 4:3: a little taller), so the character still
// reaches the screen edges instead of being cut off at a letterbox. Upright
// screens (portrait, "Continue anyway") get the 16:9 stage, sitting on the
// bottom edge, with the pixel background filling the space above.
// Regular desktop windows (mouse, landscape, 1024px+) are untouched.

export const STAGE = { width: 1920, height: 1080 }

const coarse = window.matchMedia('(hover: none) and (pointer: coarse)')
const fine = window.matchMedia('(pointer: fine)')

/** A touch-first device (phone / tablet), not a laptop with a touchscreen. */
export const isTouch = () => coarse.matches || (navigator.maxTouchPoints > 0 && !fine.matches)

/** A phone: touch-first and the screen's short side under 600 CSS px. */
export const isPhone = () => isTouch() && Math.min(window.screen.width, window.screen.height) < 600

const portrait = () => window.innerHeight > window.innerWidth

/** Is the stage scaled (rather than laid out to the window like on desktop)? */
const wantsScaled = () => isTouch() || window.innerWidth < 1024 || portrait()

// the notch / home-bar insets, read from CSS env() through a probe element
let probe
function safeInsets() {
  if (!probe) {
    probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
    document.body.append(probe)
  }
  const s = getComputedStyle(probe)
  return { top: parseFloat(s.paddingTop) || 0, right: parseFloat(s.paddingRight) || 0, bottom: parseFloat(s.paddingBottom) || 0, left: parseFloat(s.paddingLeft) || 0 }
}

let state = { scaled: false, scale: 1, portraitPhone: false }
const subs = new Set()

/** Re-measure the window and fit the stage. Runs before React renders and on every resize / rotation. */
function apply() {
  const scaled = wantsScaled()
  const root = document.documentElement
  root.classList.toggle('is-scaled', scaled)
  root.classList.toggle('is-touch', isTouch())
  let scale = 1
  if (scaled) {
    const inset = document.body ? safeInsets() : { top: 0, right: 0, bottom: 0, left: 0 }
    const w = window.innerWidth - inset.left - inset.right
    const h = window.innerHeight - inset.top - inset.bottom
    const aspect = w / h
    let sw = STAGE.width
    let sh = STAGE.height
    if (aspect >= sw / sh) sw = sh * aspect // wide phone: as on an ultra-wide monitor
    else if (aspect >= 4 / 3) sh = sw / aspect // tablet: as on a 16:10 / 4:3 monitor
    scale = Math.min(w / sw, h / sh)
    const upright = aspect < 4 / 3
    root.style.setProperty('--stage-w', `${sw}px`)
    root.style.setProperty('--stage-h', `${sh}px`)
    root.style.setProperty('--stage-px', `${Math.min(sw / 1440, sh / 900)}px`) // as --px on a desktop window this size
    root.style.setProperty('--stage-scale', scale)
    root.style.setProperty('--stage-x', `${inset.left + (w - sw * scale) / 2}px`)
    root.style.setProperty('--stage-y', `${inset.top + (upright ? h - sh * scale : (h - sh * scale) / 2)}px`)
  }
  const next = { scaled, scale, portraitPhone: isPhone() && portrait() }
  const changed = Object.keys(next).some((k) => next[k] !== state[k])
  state = next
  if (changed) subs.forEach((f) => f())
}

apply()
window.addEventListener('resize', apply)
window.addEventListener('orientationchange', () => setTimeout(apply, 60)) // iOS reports the new size a moment later
window.visualViewport?.addEventListener('resize', apply)
document.addEventListener('DOMContentLoaded', apply) // safe-area insets need the body

export const isScaled = () => state.scaled
/** On-screen size of one stage pixel (1 on desktop). */
export const stageScale = () => state.scale

/** Called whenever the stage mode, scale or phone orientation changes. */
export function onViewportChange(cb) {
  subs.add(cb)
  return () => subs.delete(cb)
}

export const useViewport = () => useSyncExternalStore(onViewportChange, () => state)
