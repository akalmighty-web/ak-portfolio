import { useEffect, useState } from 'react'
import { PAGES, SCROLL_HINT_DELAY } from '../config'
import { useStore } from '../engine/store'

/** "scroll for more": appears after 10s without scrolling, hides on any scroll. */
export default function ScrollHint() {
  const arrived = useStore((s) => s.phase === 'ready' && s.arrived)
  const page = useStore((s) => s.page)
  const viewOpen = useStore((s) => !!s.openSlug)
  const [idle, setIdle] = useState(false)
  // not on the last page, and not on Projects, where it would sit over the hands and cartridges
  const canScroll = page < PAGES.length - 1 && PAGES[page].id !== 'projects'

  useEffect(() => {
    setIdle(false)
    if (!arrived || !canScroll) return
    let timer
    const reset = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), SCROLL_HINT_DELAY * 1000)
    }
    const events = ['wheel', 'touchstart', 'keydown']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [arrived, canScroll, page])

  return (
    <div className="scroll-hint" data-visible={idle && !viewOpen} aria-hidden="true">
      <span className="scroll-mouse">
        <span className="scroll-dot" />
      </span>
      <span className="scroll-text hint-desktop">
        scroll
        <br />
        for more
      </span>
      <span className="scroll-text hint-mobile">swipe up</span>
      <svg className="scroll-arrow" viewBox="0 0 20 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v21M2.5 15.5 10 23l7.5-7.5" />
      </svg>
    </div>
  )
}
