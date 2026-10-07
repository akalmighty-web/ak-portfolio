// Vite plugin: search-engine output, all from src/seo.js and SITE_URL in src/config.js.
//
//  - every page's <head>: title, description, canonical URL, Open Graph /
//    Twitter link previews and JSON-LD structured data
//  - a static HTML page per route (/, /about, /projects, /contact and every
//    /projects/<slug>), each with its own head and its text as plain HTML, so
//    search engines see real content without running JavaScript (the app
//    replaces that text when it starts)
//  - sitemap.xml (new projects are added automatically) and robots.txt
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { EMAIL, SITE_URL, SOCIALS } from '../src/config.js'
import {
  ABOUT, NAME, PAGES, PERSON, PROJECTS, SITE_DESCRIPTION, WEBSITE, absolute, categoryLabel,
  pageMeta, pathForPage, pathForProject, projectMeta, projectSchema,
} from '../src/seo.js'
import { CATEGORIES } from '../src/data/projects.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const json = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

function head(meta, schemas, type = 'website') {
  const url = absolute(meta.path)
  const image = absolute(meta.image)
  return [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="author" content="${NAME}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(meta.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...schemas.map(json),
  ].join('\n    ')
}

const projectLinks = () =>
  CATEGORIES.map((c) => {
    const items = PROJECTS.filter((p) => p.category === c.id)
      .map((p) => `<li><a href="${pathForProject(p.slug)}">${esc(p.title)} – ${esc(c.label)}</a></li>`)
      .join('')
    return `<h3>${esc(c.label)}</h3><ul>${items}</ul>`
  }).join('')

const nav = () =>
  `<nav aria-label="Main"><ul>${PAGES.map((p, i) => `<li><a href="${pathForPage(i)}">${p.label}</a></li>`).join('')}</ul></nav>`

const contact = () =>
  `<h2>Contact</h2><p>Let's work together: <a href="mailto:${EMAIL}">${EMAIL}</a></p>` +
  `<p>${Object.entries(SOCIALS).map(([k, v]) => `<a href="${v}">${k[0].toUpperCase() + k.slice(1)}</a>`).join(' · ')}</p>`

/** The site's text as plain HTML (visually hidden; the app replaces it). */
function body(route) {
  if (route.project) {
    const p = route.project
    const text = (p.description || '').split(/\n{2,}/).map((b) => (b.startsWith('# ') ? `<h2>${esc(b.slice(2))}</h2>` : `<p>${esc(b)}</p>`)).join('')
    return (
      `<div class="sr-only"><h1>${esc(p.title)}</h1><p>${esc(categoryLabel(p.category))} project by ${NAME}</p>${text}` +
      (p.behance ? `<p><a href="${p.behance}">View ${esc(p.title)} on Behance</a></p>` : '') +
      `<p><a href="/projects">All projects by ${NAME}</a></p>${nav()}</div>`
    )
  }
  const h1 = route.page === 0 ? NAME : `${PAGES[route.page].label} – ${NAME}`
  return (
    `<div class="sr-only"><h1>${esc(h1)}</h1><p>${esc(SITE_DESCRIPTION)}</p>${nav()}` +
    `<h2>About</h2>${ABOUT.map((t) => `<p>${esc(t)}</p>`).join('')}` +
    `<h2>Projects</h2>${projectLinks()}${contact()}</div>`
  )
}

function pageFor(template, route) {
  const meta = route.project ? projectMeta(route.project) : pageMeta(route.page)
  const schemas = route.project ? [PERSON, projectSchema(route.project)] : route.page === 0 ? [PERSON, WEBSITE] : [PERSON]
  return template
    .replace(/<!-- seo:head[\s\S]*?<!-- \/seo:head -->/, `<!-- seo:head -->\n    ${head(meta, schemas, route.project ? 'article' : 'website')}\n    <!-- /seo:head -->`)
    .replace(/<!-- seo:body -->[\s\S]*?<!-- \/seo:body -->/, `<!-- seo:body -->${body(route)}<!-- /seo:body -->`)
}

function sitemap() {
  const today = new Date().toISOString().slice(0, 10)
  const url = (path, extra = '') => `  <url><loc>${absolute(path)}</loc><lastmod>${today}</lastmod>${extra}</url>`
  const images = (p) =>
    p.media
      .filter((m) => m.type === 'image')
      .map((m) => `<image:image><image:loc>${absolute(m.src)}</image:loc></image:image>`)
      .join('')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...PAGES.map((p, i) => url(pathForPage(i))),
    ...PROJECTS.map((p) => url(pathForProject(p.slug), images(p))),
    '</urlset>',
    '',
  ].join('\n')
}

export default function seoPlugin() {
  let outDir = 'dist'
  return {
    name: 'ak-seo',
    configResolved(config) {
      outDir = config.build.outDir
    },
    // the home page's head + text (dev server and dist/index.html)
    transformIndexHtml(html) {
      return pageFor(html, { page: 0 })
    },
    // after the build: one page per route, the sitemap and robots.txt
    closeBundle() {
      const template = readFileSync(join(outDir, 'index.html'), 'utf8')
      const write = (path, content) => {
        const file = join(outDir, path)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, content)
      }
      PAGES.forEach((p, i) => i > 0 && write(`${pathForPage(i)}/index.html`, pageFor(template, { page: i })))
      PROJECTS.forEach((p) => write(`${pathForProject(p.slug)}/index.html`, pageFor(template, { page: 2, project: p })))
      write('sitemap.xml', sitemap())
      write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
      console.log(`  seo: ${PAGES.length - 1 + PROJECTS.length} pre-rendered pages, sitemap.xml (${PAGES.length + PROJECTS.length} URLs), robots.txt`)
    },
  }
}
