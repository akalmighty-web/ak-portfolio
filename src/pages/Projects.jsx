import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { CATEGORIES } from '../data/projects'
import { cartridgesIn, setCategory, stepProject } from '../engine/projects'
import { store, useStore } from '../engine/store'
import { usePageReveal, usePageShown } from './usePage'

const INDEX = 2

const MIN_NAME_SCALE = 0.5 // long names shrink down to half size to stay on one line

/**
 * Projects: title, category tabs and the project switcher. The cartridges
 * themselves live in layer 2 (components/Cartridges), behind the hands; both
 * read the same category / project from the store.
 */
export default function Projects() {
  const root = useRef(null)
  const name = useRef(null)
  const shown = usePageShown(INDEX)
  const category = useStore((s) => s.category)
  const project = useStore((s) => s.project)
  const list = cartridgesIn(category) // the projects, then "Coming soon"
  const current = list[project]
  const canStep = list.length > 1
  const title = current?.title ?? 'Coming soon'
  const [shownTitle, setShownTitle] = useState(title)

  // the name changes in step with the cartridges: the old one eases out while
  // they start moving, the new one lands as they settle (~0.6s)
  useEffect(() => {
    if (title === shownTitle) return
    const el = name.current
    const d = store.get().projectDir
    gsap.killTweensOf(el)
    gsap.to(el, {
      autoAlpha: 0,
      xPercent: -d * 8,
      y: d ? 0 : 10,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setShownTitle(title)
        gsap.fromTo(el, { autoAlpha: 0, xPercent: d * 8, y: d ? 0 : -10 }, { autoAlpha: 1, xPercent: 0, y: 0, duration: 0.4, ease: 'power3.out' })
      },
    })
  }, [title]) // eslint-disable-line react-hooks/exhaustive-deps

  // fit the name on one line: measure its natural width and scale the font down
  useLayoutEffect(() => {
    const el = name.current
    const fit = () => {
      el.classList.remove('is-wrapped')
      el.style.setProperty('--name-scale', 1)
      const scale = el.clientWidth / el.scrollWidth
      if (scale >= 1) return
      if (scale >= MIN_NAME_SCALE) el.style.setProperty('--name-scale', scale * 0.98)
      else {
        // too long even at half size: two balanced lines instead
        el.classList.add('is-wrapped')
        el.style.setProperty('--name-scale', 0.62)
      }
    }
    fit()
    document.fonts.ready.then(fit)
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [shownTitle])

  usePageReveal(root, shown, (q) =>
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.projects-title'), { autoAlpha: 0, y: 30, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.6)' })
      .fromTo(q('.tab'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.15)
      .fromTo(q('.switcher'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.3),
  )

  const step = (d) => canStep && stepProject(d)

  return (
    <section ref={root} className="page page-projects" aria-hidden={!shown}>
      <h2 className="projects-title hand-title" data-reveal>
        Projects
      </h2>

      <div className="tabs" role="tablist" aria-label="Project categories">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            className="tab pill"
            aria-selected={c.id === category}
            data-reveal
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="switcher" data-reveal>
        <button type="button" className="switch-btn" aria-label="Previous project" disabled={!canStep} onClick={() => step(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 6 8.5 12l6 6" />
          </svg>
        </button>
        <p ref={name} className={`project-name${shownTitle === 'Coming soon' ? ' is-soon' : ''}`} aria-live="polite">
          {shownTitle}
        </p>
        <button type="button" className="switch-btn" aria-label="Next project" disabled={!canStep} onClick={() => step(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9.5 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  )
}
