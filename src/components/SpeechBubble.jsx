import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { useBubble } from '../fx/bubble'
import { reducedMotion } from '../fx/env'

/** Comic speech bubble for the easter eggs (hand-lettered, tail pointing down). */
export default function SpeechBubble() {
  const b = useBubble()
  const el = useRef(null)

  useLayoutEffect(() => {
    if (!b) return
    const node = el.current
    // keep it on screen
    const w = node.offsetWidth
    const left = Math.min(Math.max(b.x - w * 0.22, 12), window.innerWidth - w - 12)
    node.style.left = `${left}px`
    node.style.setProperty('--tail', `${Math.min(Math.max(b.x - left, 24), w - 24)}px`)
    if (!reducedMotion()) gsap.fromTo(node, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, ease: 'back.out(2.6)' })
  }, [b])

  if (!b) return null
  return (
    <div ref={el} key={b.key} className="speech-bubble" style={{ top: b.y }} role="status">
      {b.text}
    </div>
  )
}
