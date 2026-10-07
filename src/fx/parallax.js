import gsap from 'gsap'
import { setParallax } from '../engine/experience'
import { store } from '../engine/store'
import { finePointer, reducedMotion } from './env'

// Mouse depth parallax (mouse / trackpad only, off for reduced motion).
// The character and the UI drift a few px against the cursor at different
// depths; the pixel background has its own (bigger) drift in PixelBackground.
const CHARACTER = { x: 10, y: 6 } // max px
const UI = { x: 4, y: 3 }

export function bindParallax() {
  if (!finePointer() || reducedMotion()) return () => {}
  const ui = document.querySelector('.layer-ui')
  const char = { x: 0, y: 0 }
  const charX = gsap.quickTo(char, 'x', { duration: 1, ease: 'power3.out', onUpdate: () => setParallax(char.x, char.y) })
  const charY = gsap.quickTo(char, 'y', { duration: 1, ease: 'power3.out', onUpdate: () => setParallax(char.x, char.y) })
  const uiX = gsap.quickTo(ui, 'x', { duration: 1.2, ease: 'power3.out' })
  const uiY = gsap.quickTo(ui, 'y', { duration: 1.2, ease: 'power3.out' })

  const aim = (nx, ny) => {
    charX(nx * -CHARACTER.x)
    charY(ny * -CHARACTER.y)
    uiX(nx * -UI.x)
    uiY(ny * -UI.y)
  }
  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || store.get().openSlug) return
    aim((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2)
  }
  const settle = () => aim(0, 0)
  window.addEventListener('pointermove', onMove)
  document.documentElement.addEventListener('pointerleave', settle)
  const offStore = store.subscribe(() => store.get().openSlug && settle())
  return () => {
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', settle)
    offStore()
    gsap.set(ui, { clearProps: 'transform' })
    setParallax(0, 0)
  }
}
