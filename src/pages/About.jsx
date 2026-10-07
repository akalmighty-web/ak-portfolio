import { useRef } from 'react'
import gsap from 'gsap'
import { CV_URL } from '../config'
import { usePageReveal, usePageShown } from './usePage'

const INDEX = 1

/** About: the character points at the "Hi, I'm" intro and the CV button. */
export default function About() {
  const root = useRef(null)
  const shown = usePageShown(INDEX)

  usePageReveal(root, shown, (q) =>
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.about-title'), { autoAlpha: 0, y: 30, rotation: -4 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.8, ease: 'back.out(1.8)' })
      .fromTo(q('.about-copy p'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.12)
      .fromTo(q('.cv-button'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.32),
  )

  return (
    <section ref={root} className="page page-about" aria-hidden={!shown} data-shown={shown}>
      <h2 className="about-title" data-reveal>
        Hi, I’m
      </h2>
      <div className="about-copy">
        <p data-reveal>
          Hi, I'm Ananth Krishnan—a multidisciplinary designer and visual storyteller with over three years of experience
          across illustration, branding, UI/UX, concept art, motion, visual design, and AI-assisted creative workflows.
        </p>
        <p data-reveal>
          I believe great design goes beyond aesthetics—it's about solving problems, telling compelling stories, and creating
          meaningful experiences. Whether designing interfaces, building brand identities, or crafting illustrations, I strive
          to create work that is thoughtful, functional, and memorable.
        </p>
        <p data-reveal>
          Outside of design, I'm always exploring new creative tools, studying films, and drawing inspiration from everyday
          life to continuously refine my craft.
        </p>
      </div>
      <a className="cv-button" data-reveal href={CV_URL} download="Ananthkrishnan-CV-2026.pdf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3.5v11.5M7 10.5l5 5 5-5M4 16.5v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-2.5" />
        </svg>
        Download CV
      </a>
    </section>
  )
}
