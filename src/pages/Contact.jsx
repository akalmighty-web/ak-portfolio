import { useRef } from 'react'
import gsap from 'gsap'
import { EMAIL } from '../config'
import { SocialLinks } from '../components/Icons'
import { usePageReveal, usePageShown } from './usePage'

const INDEX = 3
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent("Let's work together")}`

/** Contact: the head peeks up from the bottom; email CTA, socials and footer. */
export default function Contact() {
  const root = useRef(null)
  const shown = usePageShown(INDEX)

  usePageReveal(root, shown, (q) =>
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.contact-line'), { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 })
      .fromTo(q('.mail-button'), { autoAlpha: 0, scale: 0.6, rotation: -12 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2)' }, 0.25)
      .fromTo(q('.contact-copy'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.35)
      .set(q('.follow'), { autoAlpha: 1, y: 0 }, 0.3)
      .fromTo(q('.follow-title'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.3)
      .fromTo(q('.follow-icons li'), { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(2.4)' }, 0.42)
      .fromTo(q('.footer'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 0.5),
  )

  return (
    <section ref={root} className="page page-contact" aria-hidden={!shown}>
      <h2 className="contact-title">
        <span className="contact-line contact-line--1" data-reveal>
          Let’s
          <a className="mail-button" data-reveal href={MAILTO} aria-label={`Email ${EMAIL}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M8.5 7H17v8.5" />
            </svg>
          </a>
        </span>
        <span className="contact-line contact-line--2" data-reveal>
          Work together
        </span>
      </h2>
      <p className="contact-copy" data-reveal>
        I'm always open to discussing new projects, creative ideas or opportunities to be part of your visions.
      </p>

      <div className="follow" data-reveal>
        <h3 className="follow-title hand-title">
          Follow me on
        </h3>
        <SocialLinks className="follow-icons" order={['instagram', 'behance', 'artstation', 'linkedin']} />
      </div>

      <footer className="footer" data-reveal>
        <nav className="footer-links" aria-label="Legal">
          <a href="/terms.html">Terms &amp; Conditions</a>
          <a href="/privacy.html">Privacy Policy</a>
        </nav>
        <p>© 2026 A.K.almighty portfolio All rights reserved</p>
      </footer>
    </section>
  )
}
