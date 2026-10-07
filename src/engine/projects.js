import { PROJECTS } from '../data/projects'
import { store } from './store'

// Project switcher + project view state, shared by the cartridges (behind the
// hands), the tabs / arrow buttons (UI layer) and the project view.

export const projectsIn = (category) => PROJECTS.filter((p) => p.category === category)

/** The "Coming soon" cartridge that ends every category (no project view). */
export const COMING_SOON = { slug: 'coming-soon', title: 'Coming soon', soon: true }

/** What the cartridge switcher cycles through: the category's projects, then "Coming soon". */
const cartridgeLists = new Map()
export const cartridgesIn = (category) => {
  if (!cartridgeLists.has(category)) cartridgeLists.set(category, [...projectsIn(category), COMING_SOON])
  return cartridgeLists.get(category)
}

export const projectBySlug = (slug) => PROJECTS.find((p) => p.slug === slug) ?? null

/** Move the centre cartridge one step left (-1) or right (+1), wrapping around. */
export function stepProject(dir) {
  const { category, project } = store.get()
  const n = cartridgesIn(category).length
  if (n > 1) store.set({ project: (project + dir + n) % n, projectDir: dir })
}

export function setCategory(id) {
  if (id !== store.get().category) store.set({ category: id, project: 0, projectDir: 0 })
}

// ---- project view: each project has its own URL, #/projects/<slug> ----

const HASH = /^#\/projects\/([^/?#]+)/
export const slugFromHash = () => decodeURIComponent(location.hash.match(HASH)?.[1] ?? '')
let openedHere = false

/** Open a project (pushes a history entry, so the browser back button closes it). */
export function openProject(slug) {
  if (slugFromHash() === slug) return
  openedHere = true
  location.hash = `#/projects/${encodeURIComponent(slug)}`
}

/** Close the project view: go back if we opened it, otherwise just clear the URL. */
export function closeProject() {
  if (!slugFromHash()) return
  if (history.state?.akProject) history.back()
  else history.replaceState(null, '', location.pathname + location.search)
  store.set({ openSlug: null })
}

/** Keep store.openSlug in sync with the URL (also handles direct links and back/forward). */
export function bindProjectRoute() {
  const sync = () => {
    const slug = slugFromHash()
    const project = projectBySlug(slug)
    if (project) {
      // mark entries we pushed, so closeProject goes back instead of leaving the site
      if (openedHere) history.replaceState({ akProject: true }, '')
      openedHere = false
      const list = projectsIn(project.category)
      store.set({ openSlug: slug, category: project.category, project: list.indexOf(project) })
    } else {
      store.set({ openSlug: null })
    }
  }
  window.addEventListener('hashchange', sync)
  sync()
  return () => window.removeEventListener('hashchange', sync)
}
