import { isMoving, next, prev } from './experience'
import { stepProject } from './projects'
import { PAGES } from '../config'
import { store } from './store'

// One gesture = one page. A trackpad keeps firing inertial wheel events long
// after the finger lifts, so once a page change starts we ignore wheel input
// until the animation has finished AND the wheel has been quiet for QUIET ms.
const QUIET = 200
const SWIPE = 40

export function bindInput() {
  let lastWheel = 0
  let blocked = false
  let touchY = null

  const gesture = (dir) => {
    blocked = true
    dir > 0 ? next() : prev()
  }

  // while a project is open (or the rotate overlay is up), the page underneath doesn't react
  const viewOpen = () => !!store.get().openSlug || store.get().blocked

  const onWheel = (e) => {
    if (viewOpen() || e.target.closest?.('[data-native-scroll]')) return
    e.preventDefault()
    const now = performance.now()
    const gap = now - lastWheel
    lastWheel = now
    if (Math.abs(e.deltaY) < 2) return
    if (blocked) {
      if (isMoving() || gap < QUIET) return
      blocked = false
    }
    gesture(Math.sign(e.deltaY))
  }

  let touchX = null
  const onTouchStart = (e) => {
    touchY = e.touches[0].clientY
    touchX = e.touches[0].clientX
  }
  const onTouchMove = (e) => {
    if (!e.target.closest?.('[data-native-scroll]')) e.preventDefault()
  }
  const onTouchEnd = (e) => {
    if (touchY === null || viewOpen()) return
    const dy = touchY - e.changedTouches[0].clientY
    const dx = touchX - e.changedTouches[0].clientX
    touchY = null
    if (e.target.closest?.('[data-native-scroll]')) return
    // Projects: a sideways swipe flips through the cartridges
    const s = store.get()
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE) {
      if (PAGES[s.page].id === 'projects' && s.arrived) stepProject(Math.sign(dx))
      return
    }
    if (Math.abs(dy) > SWIPE && !isMoving()) gesture(Math.sign(dy))
  }

  const onKey = (e) => {
    if (viewOpen() || e.target.closest?.('input, textarea, [data-native-scroll]') || isMoving()) return
    // Space presses a focused button / link (and arrows move between tabs): don't turn the page
    if (e.key === ' ' && e.target.closest?.('button, a[href], [role="tab"]')) return
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) (e.preventDefault(), next())
    if (['ArrowUp', 'PageUp'].includes(e.key)) (e.preventDefault(), prev())
  }

  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('keydown', onKey)
  return () => {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('keydown', onKey)
  }
}
