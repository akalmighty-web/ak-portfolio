import { CATEGORIES } from '../data/projects'
import { EMAIL } from '../config'
import { NAME, PROJECTS, SITE_DESCRIPTION, pathForProject } from '../seo'
import { openProject, plainClick } from '../engine/projects'

/**
 * Visually hidden, but real text and links for search engines and screen
 * readers: who this is, every project (with its category) as a link to its own
 * page, and how to get in touch. The visible design draws these as graphics.
 */
export default function SeoText() {
  return (
    <div className="sr-only">
      <p>{SITE_DESCRIPTION}</p>
      <nav aria-label="All projects">
        <h2>Projects by {NAME}</h2>
        {CATEGORIES.map((c) => (
          <section key={c.id}>
            <h3>{c.label}</h3>
            <ul>
              {PROJECTS.filter((p) => p.category === c.id).map((p) => (
                <li key={p.slug}>
                  <a href={pathForProject(p.slug)} tabIndex={-1} onClick={(e) => plainClick(e) && (e.preventDefault(), openProject(p.slug))}>
                    {p.title} – {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <p>
        Contact {NAME}: <a href={`mailto:${EMAIL}`} tabIndex={-1}>{EMAIL}</a>
      </p>
    </div>
  )
}
