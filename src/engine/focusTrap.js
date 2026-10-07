const FOCUSABLE = 'a[href], button:not([disabled]), iframe, video[controls], [tabindex]:not([tabindex="-1"])'

/**
 * Keep keyboard focus inside `container` (a dialog or an open menu): Tab from
 * the last element wraps to the first and Shift+Tab the other way. Returns a
 * function that removes the trap.
 */
export function trapFocus(container) {
  const visible = (e) => e.offsetParent !== null || e === document.activeElement
  const onKey = (e) => {
    if (e.key !== 'Tab') return
    const items = [...container.querySelectorAll(FOCUSABLE)].filter((el) => visible(el) && el.tabIndex >= 0)
    if (!items.length) return
    const first = items[0]
    const last = items.at(-1)
    const inside = container.contains(document.activeElement)
    if (e.shiftKey && (document.activeElement === first || !inside)) (e.preventDefault(), last.focus())
    else if (!e.shiftKey && (document.activeElement === last || !inside)) (e.preventDefault(), first.focus())
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}
