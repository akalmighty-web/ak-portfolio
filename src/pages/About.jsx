import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { CV_URL } from '../config'
import { portraitPlacement } from '../engine/experience'
import { layoutBottom, usePortraitLayout } from '../engine/portraitLayout'
import { store } from '../engine/store'
import { trapFocus } from '../engine/focusTrap'
import { useViewport } from '../engine/viewport'
import { reducedMotion } from '../fx/env'
import { usePageReveal, usePageShown } from './usePage'

const INDEX = 1

const COPY = [
  "Hi, I'm Ananth Krishnan—a multidisciplinary designer and visual storyteller with over three years of experience across illustration, branding, UI/UX, concept art, motion, visual design, and AI-assisted creative workflows.",
  "I believe great design goes beyond aesthetics—it's about solving problems, telling compelling stories, and creating meaningful experiences. Whether designing interfaces, building brand identities, or crafting illustrations, I strive to create work that is thoughtful, functional, and memorable.",
  "Outside of design, I'm always exploring new creative tools, studying films, and drawing inspiration from everyday life to continuously refine my craft.",
]

// Phones held upright: the text and the CV button stay above the pointing hand
// (its thumb tops out at 42.8% of the frame) with at least HAND_GAP px to spare.
// Shorter screens first get slightly smaller text, then the last paragraph(s)
// go behind "Read more" (font px, paragraphs collapsed), in this order.
const HAND_TOP = 0.428
const HAND_GAP = 24
const FIT = [
  [13.5, 0],
  [13, 0],
  [12.5, 0],
  [12, 0],
  [13, 1],
  [12.5, 1],
  [12, 1],
  [12.5, 2],
  [12, 2],
  [11.5, 2],
]

/** About: the character points at the "Hi, I'm" intro and the CV button. */
export default function About() {
  const root = useRef(null)
  const shown = usePageShown(INDEX)
  const { portrait } = useViewport()
  const layout = usePortraitLayout()
  const [more, setMore] = useState(false)

  usePageReveal(root, shown, (q) =>
    gsap
      .timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(q('.about-title'), { autoAlpha: 0, y: 30, rotation: -4 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.8, ease: 'back.out(1.8)' })
      .fromTo(q('.about-copy p'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.12)
      .fromTo(q('.cv-button'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.32),
  )

  // portrait: the largest text (and fewest collapsed paragraphs) that keeps the
  // CV button HAND_GAP above the thumb
  useLayoutEffect(() => {
    const el = root.current
    if (!portrait) {
      el.dataset.collapse = '0'
      el.style.removeProperty('--about-font')
      return
    }
    const fit = () => {
      const f = portraitPlacement()
      if (!f) return
      const limit = f.y + HAND_TOP * f.h - HAND_GAP
      const button = el.querySelector('.cv-button')
      for (const [size, collapse] of FIT) {
        el.style.setProperty('--about-font', `${size}px`)
        el.dataset.collapse = collapse
        if (layoutBottom(button) <= limit) break
      }
    }
    fit()
    document.fonts.ready.then(fit)
  }, [portrait, layout])

  return (
    <section ref={root} className="page page-about" aria-hidden={!shown} data-shown={shown}>
      <h2 className="about-title" data-reveal>
        Hi, I’m
      </h2>
      <div className="about-copy">
        {COPY.map((text, i) => (
          <p key={text.slice(0, 12)} data-reveal>
            {text}
            {/* portrait, shorter screens: ends the last paragraph shown (styles/portrait.css) */}
            {i < COPY.length - 1 && (
              <>
                {' '}
                <button type="button" className="about-more" data-after={i + 1} aria-haspopup="dialog" onClick={() => setMore(true)}>
                  Read more
                </button>
              </>
            )}
          </p>
        ))}
      </div>
      <a className="cv-button" data-reveal href={CV_URL} download="Ananthkrishnan-CV-2026.pdf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3.5v11.5M7 10.5l5 5 5-5M4 16.5v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-2.5" />
        </svg>
        Download CV
      </a>
      {portrait && createPortal(<AboutSheet open={more} onClose={() => setMore(false)} />, document.body)}
    </section>
  )
}

/** Portrait "Read more": the whole About text in a sheet over the page. */
function AboutSheet({ open, onClose }) {
  const root = useRef(null)
  const first = useRef(true)

  useEffect(() => {
    const el = root.current
    const q = gsap.utils.selector(el)
    gsap.killTweensOf([el, ...q('.about-sheet-panel')])
    if (first.current) {
      first.current = false
      if (!open) return void gsap.set(el, { autoAlpha: 0 })
    }
    store.set({ sheetOpen: open })
    const calm = reducedMotion()
    if (open) {
      gsap.set(el, { visibility: 'inherit' }) // focusable straight away
      gsap.to(el, { opacity: 1, duration: 0.3 })
      if (!calm) gsap.fromTo(q('.about-sheet-panel'), { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'power4.out' })
      q('.about-sheet-close')[0]?.focus({ preventScroll: true })
      const onKey = (e) => e.key === 'Escape' && onClose()
      window.addEventListener('keydown', onKey)
      const untrap = trapFocus(el)
      return () => {
        window.removeEventListener('keydown', onKey)
        untrap()
      }
    }
    gsap.to(el, { autoAlpha: 0, duration: 0.3, delay: calm ? 0 : 0.15 })
    if (!calm) gsap.to(q('.about-sheet-panel'), { yPercent: 100, duration: 0.4, ease: 'power3.in' })
    if (el.contains(document.activeElement)) {
      const back = [...document.querySelectorAll('.about-more')].find((b) => b.offsetParent)
      back?.focus({ preventScroll: true })
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={root} className="about-sheet" role="dialog" aria-modal="true" aria-label="About Ananth" aria-hidden={!open}>
      <div className="about-sheet-backdrop" onClick={onClose} />
      <div className="about-sheet-panel" data-native-scroll>
        <button type="button" className="about-sheet-close" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <h3 className="about-sheet-title">Hi, I’m</h3>
        {COPY.map((text) => (
          <p key={text.slice(0, 12)}>{text}</p>
        ))}
      </div>
    </div>
  )
}
