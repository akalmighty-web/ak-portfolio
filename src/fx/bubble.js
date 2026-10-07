import { useSyncExternalStore } from 'react'

// One comic speech bubble at a time, pointing at an element (or a point).

let bubble = null
let timer = 0
const subs = new Set()
const emit = () => subs.forEach((f) => f())

/** Show `text` above `target` (an element) or `at` ({ x, y } in px) for `duration` ms. */
export function showBubble({ text, target, at, duration = 2400 }) {
  const r = target?.getBoundingClientRect()
  const point = at ?? { x: r.left + r.width * 0.6, y: r.top + r.height * 0.08 }
  bubble = { text, x: point.x, y: point.y, key: Date.now() }
  clearTimeout(timer)
  timer = setTimeout(hideBubble, duration)
  emit()
}

export function hideBubble() {
  bubble = null
  emit()
}

export const useBubble = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => bubble,
  )
