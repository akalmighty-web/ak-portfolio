// Everything search engines and link previews read: page titles, descriptions,
// canonical paths, alt texts and structured data. Used by the app (titles, alt
// text, the hidden text for screen readers) and at build time by
// scripts/prerender.js (one static HTML page per route + sitemap.xml).
import { EMAIL, PAGES, SITE_URL, SOCIALS } from './config'
import { PROJECTS, categoryLabel } from './data/projects'

export const NAME = 'Ananth Krishnan'
export const SITE_TITLE = 'Ananth Krishnan – Game Artist, Concept Artist & Illustrator'
export const SITE_DESCRIPTION =
  'Ananth Krishnan is a game artist, concept artist and illustrator from Kerala, India, creating game art, concept art, illustration and motion design.'
export const SHARE_IMAGE = '/og-image.jpg'

// the About text (the same words as on the About page)
export const ABOUT = [
  "Hi, I'm Ananth Krishnan—a multidisciplinary designer and visual storyteller with over three years of experience across illustration, branding, UI/UX, concept art, motion, visual design, and AI-assisted creative workflows.",
  "I believe great design goes beyond aesthetics—it's about solving problems, telling compelling stories, and creating meaningful experiences. Whether designing interfaces, building brand identities, or crafting illustrations, I strive to create work that is thoughtful, functional, and memorable.",
  "Outside of design, I'm always exploring new creative tools, studying films, and drawing inspiration from everyday life to continuously refine my craft.",
]

const PAGE_TEXT = {
  home: { title: SITE_TITLE, description: SITE_DESCRIPTION },
  about: {
    title: `About – ${NAME}`,
    description: `About ${NAME}: multidisciplinary designer, game artist and concept artist from Kerala, India — illustration, branding, UI/UX, concept art and motion.`,
  },
  projects: {
    title: `Projects – ${NAME}`,
    description: `Game art, concept art, illustration and AI animation projects by ${NAME}, game artist and concept artist from Kerala, India.`,
  },
  contact: {
    title: `Contact – ${NAME}`,
    description: `Get in touch with ${NAME}, game artist, concept artist and illustrator from Kerala, India, for projects, collaborations and opportunities.`,
  },
}

export const absolute = (path) => SITE_URL + path

/** URL path of a page (by index into PAGES) and of a project. */
export const pathForPage = (i) => (PAGES[i].id === 'home' ? '/' : `/${PAGES[i].id}`)
export const pathForProject = (slug) => `/projects/${encodeURIComponent(slug)}`

const category = (p) => categoryLabel(p.category)
const plain = (text) => text.replace(/^# /gm, '').replace(/\s+/g, ' ').trim()
const clip = (text, n = 155) => (text.length <= n ? text : text.slice(0, text.lastIndexOf(' ', n - 1)).replace(/[,;:–—-]$/, '') + '…')

/** Title, description, path and share image for a page or a project. */
export function pageMeta(i) {
  const t = PAGE_TEXT[PAGES[i].id]
  return { title: t.title, description: t.description, path: pathForPage(i), image: SHARE_IMAGE }
}
export function projectMeta(p) {
  const fallback = `${p.title} – ${category(p).toLowerCase()} by ${NAME}, game artist and concept artist from Kerala, India.`
  return {
    title: `${p.title} – ${NAME}`,
    description: p.description ? clip(plain(p.description)) : fallback,
    path: pathForProject(p.slug),
    image: p.og ?? SHARE_IMAGE,
  }
}

/** Alt text for a project's cartridge thumbnail and for its images. */
export const thumbnailAlt = (p) => `${p.title} – ${category(p).toLowerCase()} by ${NAME}`
export const mediaAlt = (p, i, n) => `${p.title} – ${category(p).toLowerCase()} by ${NAME} (${i + 1} of ${n})`

/** Structured data (JSON-LD): who the site is about, and the site itself. */
export const PERSON = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${SITE_URL}/#person`,
  name: NAME,
  alternateName: 'AK',
  jobTitle: 'Game Artist & Concept Artist',
  description: SITE_DESCRIPTION,
  url: `${SITE_URL}/`,
  image: absolute(SHARE_IMAGE),
  email: `mailto:${EMAIL}`,
  address: { '@type': 'PostalAddress', addressRegion: 'Kerala', addressCountry: 'IN' },
  knowsAbout: ['Game art', 'Concept art', 'Illustration', 'Motion design', 'UI/UX design', 'Branding'],
  sameAs: [SOCIALS.behance, SOCIALS.linkedin, SOCIALS.instagram, SOCIALS.artstation],
}
export const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: `${NAME} Portfolio`,
  alternateName: 'AK Portfolio',
  url: `${SITE_URL}/`,
  inLanguage: 'en',
  author: { '@id': `${SITE_URL}/#person` },
  publisher: { '@id': `${SITE_URL}/#person` },
}
export function projectSchema(p) {
  const m = projectMeta(p)
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    description: m.description,
    genre: category(p),
    url: absolute(m.path),
    image: absolute(m.image),
    creator: { '@id': `${SITE_URL}/#person` },
    ...(p.behance ? { sameAs: p.behance } : {}),
  }
}

export { PROJECTS, PAGES, categoryLabel }
