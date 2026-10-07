import { useSyncExternalStore } from 'react'
import { DEFAULT_CATEGORY } from '../data/projects'

// Tiny global store shared by the animation engine (plain JS) and React.
let state = {
  phase: 'preload', // preload -> intro -> ready
  page: 0, // index into PAGES the character is at / heading to
  arrived: false, // true while resting on a page's freeze frame
  loaded: 0, // 0..1 frame loading progress
  transition: { duration: 1.5, ease: 'power1.inOut' }, // timing of the current page change
  category: DEFAULT_CATEGORY, // Projects: active category tab
  project: 0, // Projects: index of the centre cartridge within that category
  projectDir: 0, // last switch: -1 / +1 (arrows or swipes), 0 (category)
  blocked: false, // the "rotate your phone" overlay is up: the page underneath waits
  openSlug: null, // slug of the project open in the project view (mirrors /projects/<slug>)
}
const subs = new Set()

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch }
    subs.forEach((f) => f())
  },
  subscribe(f) {
    subs.add(f)
    return () => subs.delete(f)
  },
}

export const useStore = (select) => useSyncExternalStore(store.subscribe, () => select(store.get()))
