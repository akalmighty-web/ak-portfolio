import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ACHIEVEMENTS, nextToast, useAchievements } from '../fx/achievements'
import { reducedMotion } from '../fx/env'

const HOLD = 4.2 // seconds on screen

/** Pixel-art trophy (8×8 grid). */
const Trophy = () => (
  <svg className="ach-trophy" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="#ffc300" d="M1 0h6v1h1v2H7v1H6v1H5v1H3V5H2V4H1V3H0V1h1z" />
    <path fill="#fff2b3" d="M2 1h1v2H2z" />
    <path fill="#c98f00" d="M3 6h2v1h1v1H2V7h1z" />
    <path fill="#141414" d="M1 1v2h1V1zM6 1v2h1V1z" opacity="0.35" />
  </svg>
)

/** "🏆 Achievement unlocked" toast, game styled, with a secrets counter. */
export default function AchievementToast() {
  const { toast } = useAchievements()
  const el = useRef(null)

  useEffect(() => {
    if (!toast) return
    const node = el.current
    const calm = reducedMotion()
    const tl = gsap
      .timeline({ onComplete: nextToast })
      .fromTo(node, calm ? { autoAlpha: 0 } : { autoAlpha: 1, yPercent: 140 }, { autoAlpha: 1, yPercent: 0, duration: calm ? 0.3 : 0.45, ease: calm ? 'none' : 'steps(6)' })
      .fromTo(node.querySelectorAll('.ach-pip.is-new'), { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, '+=0.15')
      .to(node, calm ? { autoAlpha: 0, duration: 0.3 } : { yPercent: 140, duration: 0.35, ease: 'steps(5)' }, `+=${HOLD}`)
    return () => tl.kill()
  }, [toast])

  if (!toast) return null
  return (
    <div ref={el} className="ach-toast" role="status" aria-live="polite" key={toast.key}>
      <Trophy />
      <div className="ach-text">
        <p className="ach-label">Achievement unlocked</p>
        <p className="ach-name">{toast.name}</p>
        <p className="ach-count">
          <span className="ach-pips" aria-hidden="true">
            {ACHIEVEMENTS.map((a, i) => (
              <span key={a.id} className={`ach-pip${i < toast.count ? ' is-on' : ''}${i === toast.count - 1 ? ' is-new' : ''}`} />
            ))}
          </span>
          {toast.count}/{ACHIEVEMENTS.length} secrets found
        </p>
      </div>
    </div>
  )
}
