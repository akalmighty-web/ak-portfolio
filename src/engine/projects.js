import { PAGES } from '../config'
import { PROJECTS } from '../data/projects'
import { pageMeta, pathForPage, pathForProject, projectMeta } from '../seo'
import { goTo } from './experience'
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

// ---- real page URLs: /, /about, /projects, /contact and /projects/<slug> ----
// Page changes replace the URL (the back button doesn't step through pages);
// opening a project pushes one, so the back button closes it. Old # links
// (#/projects/<slug>, #about, …) are turned into the new paths on arrival.

const PROJECTS_PAGE = PAGES.findIndex((p) => p.id === 'projects')

/** What a path points at: a page index and, for /projects/<slug>, the project. */
export function parseRoute(path = location.pathname) {
  const m = path.match(/^\/projects\/([^/]+)\/?$/)
  if (m) {
    const project = projectBySlug(decodeURIComponent(m[1]))
    return { page: PROJECTS_PAGE, project }
  }
  const page = PAGES.findIndex((p) => p.id !== 'home' && path.replace(/\/$/, '') === `/${p.id}`)
  return { page: page >= 0 ? page : 0, project: null }
}

function upgradeHashLink() {
  const hash = location.hash
  if (!hash) return
  const m = hash.match(/^#\/projects\/([^/?#]+)/)
  const id = hash.replace(/^#\/?/, '')
  const page = PAGES.findIndex((p) => p.id === id)
  const path = m ? pathForProject(decodeURIComponent(m[1])) : page >= 0 ? pathForPage(page) : null
  if (path) history.replaceState(null, '', path + location.search)
}

/** A plain left click (not ctrl / cmd / shift / middle): handle it in the page. */
export const plainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

const titleFor = (route) => (route.project ? projectMeta(route.project) : pageMeta(route.page)).title
const currentSlug = () => parseRoute().project?.slug ?? null

/** Open a project (pushes a history entry, so the browser back button closes it). */
export function openProject(slug) {
  if (currentSlug() === slug) return
  history.pushState({ akProject: true }, '', pathForProject(slug) + location.search)
  syncFromUrl()
}

/** Close the project view: go back if we opened it, otherwise just go to /projects. */
export function closeProject() {
  if (!currentSlug()) return
  if (history.state?.akProject) history.back()
  else {
    history.replaceState(null, '', pathForPage(store.get().page) + location.search)
    syncFromUrl()
  }
}

/** Keep the store (open project) and the tab title in step with the URL. */
function syncFromUrl() {
  const route = parseRoute()
  document.title = titleFor(route)
  const project = route.project
  if (project) {
    const list = projectsIn(project.category)
    store.set({ openSlug: project.slug, category: project.category, project: list.indexOf(project) })
  } else if (store.get().openSlug) store.set({ openSlug: null })
}

/**
 * Bind the URL: handle the address the visitor arrived on (after the intro,
 * go to that page / open that project), follow back / forward, and update the
 * path and title as pages change.
 */
export function bindRoutes() {
  upgradeHashLink()
  const start = parseRoute()
  syncFromUrl()
  let started = false
  const onStore = () => {
    const s = store.get()
    if (s.phase !== 'ready') return
    if (!started) {
      // the intro has just finished on Home: now go where the link pointed
      started = true
      if (start.page !== 0 && start.page !== s.page) queueMicrotask(() => goTo(start.page))
      return
    }
    if (!s.arrived || s.openSlug || parseRoute().project) return
    const path = pathForPage(s.page)
    if (location.pathname !== path) {
      history.replaceState(null, '', path + location.search)
      document.title = titleFor({ page: s.page, project: null })
    }
  }
  const offStore = store.subscribe(onStore)
  window.addEventListener('popstate', syncFromUrl)
  return () => {
    offStore()
    window.removeEventListener('popstate', syncFromUrl)
  }
}
