import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import bg from '../assets/svg/pixel-bg.svg?raw'
import { useStore } from '../engine/store'
import { finePointer, reducedMotion } from '../fx/env'

/**
 * Layer 1: subtle pixel background with light pointer + page parallax.
 * With a mouse, a gold-tinted copy of the same pixels shows through a soft
 * circle around the cursor while it moves (pixels "light up", then fade back).
 * Phones held upright show their own drawn background instead (.bg-portrait,
 * an image set in styles/portrait.css, so only they download it).
 */
export default function PixelBackground() {
  const root = useRef(null)
  const ready = useStore((s) => s.phase === 'ready')
  const page = useStore((s) => s.page)
  const glowOn = finePointer() && !reducedMotion()

  useEffect(() => {
    // cover the screen (on phones / tablets that includes the space around the scaled stage)
    root.current.querySelectorAll('svg').forEach((svg) => svg.setAttribute('preserveAspectRatio', 'xMidYMax slice'))
    const left = root.current.querySelectorAll('.bg-left')
    const right = root.current.querySelectorAll('.bg-right')
    const lx = gsap.quickTo(left, 'x', { duration: 1.2, ease: 'power3.out' })
    const rx = gsap.quickTo(right, 'x', { duration: 1.2, ease: 'power3.out' })
    const ly = gsap.quickTo(left, 'y', { duration: 1.2, ease: 'power3.out' })
    const ry = gsap.quickTo(right, 'y', { duration: 1.2, ease: 'power3.out' })
    const moveDepth = finePointer() && !reducedMotion()
    const onMove = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5
      lx(nx * -14)
      rx(nx * -22)
      if (moveDepth) {
        const ny = e.clientY / window.innerHeight - 0.5
        ly(ny * -8)
        ry(ny * -12)
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  // cursor glow: follows the pointer with a little lag; brightness builds with
  // movement and decays back to nothing when the mouse rests
  useEffect(() => {
    if (!glowOn) return
    const glow = root.current.querySelector('.bg-glow')
    const at = { x: -500, y: -500, e: 0 }
    const apply = () => {
      glow.style.setProperty('--gx', `${at.x}px`)
      glow.style.setProperty('--gy', `${at.y}px`)
      glow.style.setProperty('--ge', at.e.toFixed(3))
    }
    const gx = gsap.quickTo(at, 'x', { duration: 0.35, ease: 'power3.out', onUpdate: apply })
    const gy = gsap.quickTo(at, 'y', { duration: 0.35, ease: 'power3.out', onUpdate: apply })
    let last = null
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      if (last) at.e = Math.min(1, at.e + Math.hypot(e.clientX - last.x, e.clientY - last.y) / 90)
      last = { x: e.clientX, y: e.clientY }
      gx(e.clientX)
      gy(e.clientY)
    }
    const decay = () => {
      if (at.e < 0.005) return
      at.e *= 0.965
      apply()
    }
    window.addEventListener('pointermove', onMove)
    gsap.ticker.add(decay)
    return () => {
      window.removeEventListener('pointermove', onMove)
      gsap.ticker.remove(decay)
    }
  }, [glowOn])

  useEffect(() => {
    if (ready) gsap.to(root.current, { autoAlpha: 0.8, duration: 1.2, ease: 'power1.out' })
  }, [ready])

  useEffect(() => {
    gsap.to(root.current.querySelectorAll('svg, .bg-portrait'), { y: page * 8, duration: 1.6, ease: 'power2.inOut' })
  }, [page])

  return (
    <div ref={root} className="layer layer-bg" aria-hidden="true">
      <div className="bg-copy" dangerouslySetInnerHTML={{ __html: bg }} />
      {glowOn && <div className="bg-copy bg-glow" dangerouslySetInnerHTML={{ __html: bg }} />}
      <div className="bg-portrait" />
    </div>
  )
}
