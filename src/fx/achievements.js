import { useSyncExternalStore } from 'react'
import { sfx } from './sound'

// Easter-egg achievements. Progress is kept in localStorage; each unlock shows
// a small game-style toast ("Achievement unlocked") with a secrets counter.

export const ACHIEVEMENTS = [
  { id: 'malayali', name: 'നമസ്കാരം! Malayali mode unlocked' },
  { id: 'technician', name: 'Retro technician' },
  { id: 'poke', name: 'Stop poking me!' },
  { id: 'angel', name: 'Fallen angel' },
  { id: 'end', name: 'You made it to the end!' },
]

const KEY = 'ak-achievements'
let found = (() => {
  try {
    // only ids that still exist count (older saves may hold removed secrets)
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id))
    return new Set((JSON.parse(localStorage.getItem(KEY)) || []).filter((id) => ids.has(id)))
  } catch {
    return new Set()
  }
})()
let toasts = [] // queued unlocks still to show
let snapshot = { found: found.size, toast: null }
const subs = new Set()
const emit = () => {
  snapshot = { found: found.size, toast: toasts[0] ?? null }
  subs.forEach((f) => f())
}

export function unlock(id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id)
  if (!a || found.has(id)) return false
  found.add(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]))
  } catch {}
  toasts.push({ ...a, count: found.size, key: `${id}-${Date.now()}` })
  sfx.fanfare()
  emit()
  return true
}

/** The toast component calls this when the current toast has finished. */
export function nextToast() {
  toasts = toasts.slice(1)
  emit()
}

export const useAchievements = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => snapshot,
  )

// dev only: start over
if (import.meta.env.DEV) {
  window.__akResetAchievements = () => {
    found = new Set()
    localStorage.removeItem(KEY)
    emit()
  }
}
