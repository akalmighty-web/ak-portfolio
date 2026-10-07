import { useEffect } from 'react'
import gsap from 'gsap'
import { useStore } from '../engine/store'

/** True while the character rests on page `index`'s freeze frame. */
export const usePageShown = (index) => useStore((s) => s.phase === 'ready' && s.page === index && s.arrived)

/**
 * Shared page in/out. `build(q)` returns the entrance timeline; on leaving,
 * everything marked [data-reveal] fades out quickly as the frames start moving.
 */
export function usePageReveal(root, shown, build) {
  useEffect(() => {
    const q = gsap.utils.selector(root)
    const els = q('[data-reveal]')
    gsap.killTweensOf(els)
    if (!shown) {
      gsap.to(els, { autoAlpha: 0, y: -10, duration: 0.3, ease: 'power2.in', stagger: 0.02, overwrite: true })
      return
    }
    const tl = build(q)
    return () => tl.kill()
  }, [shown]) // eslint-disable-line react-hooks/exhaustive-deps
}
