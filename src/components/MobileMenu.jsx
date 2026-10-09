import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { PAGES } from '../config'
import { goTo } from '../engine/experience'
import { plainClick } from '../engine/projects'
import { store, useStore } from '../engine/store'
import { trapFocus } from '../engine/focusTrap'
import { pathForPage } from '../seo'
import { reducedMotion } from '../fx/env'
import { SocialLinks, Underline } from './Icons'
import SoundToggle from './SoundToggle'

const HOME = PAGES.findIndex((p) => p.id === 'home')
const ORIGIN = 'calc(100% - var(--menu-x)) var(--menu-y)' // the menu button's centre

/**
 * Portrait phones, About onward (Home has its nav under the title): a small
 * menu button at the top right opening a full-screen menu with the pages
 * (the current one in red), the social icons and the sound toggle.
 */
export default function MobileMenu() {
  const ready = useStore((s) => s.phase === 'ready')
  const open = useStore((s) => s.menuOpen)
  const page = useStore((s) => s.page)
  const viewOpen = useStore((s) => !!s.openSlug)
  const overlay = useRef(null)
  const button = useRef(null)
  const first = useRef(true)

  const setOpen = (v) => store.set({ menuOpen: v })
  const go = (i) => {
    setOpen(false)
    goTo(i)
  }

  useEffect(() => {
    const el = overlay.current
    const q = gsap.utils.selector(el)
    gsap.killTweensOf([el, ...q('.mmenu-anim')])
    if (first.current) {
      first.current = false
      if (!open) return void gsap.set(el, { autoAlpha: 0 })
    }
    const calm = reducedMotion()
    if (open) {
      gsap.set(el, { autoAlpha: 1 })
      if (calm) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 })
      else {
        gsap.fromTo(el, { clipPath: `circle(0% at ${ORIGIN})` }, { clipPath: `circle(150% at ${ORIGIN})`, duration: 0.6, ease: 'power3.inOut' })
        gsap.fromTo(q('.mmenu-anim'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', delay: 0.18 })
      }
      q('.mmenu-item')[store.get().page]?.focus({ preventScroll: true })
      const onKey = (e) => e.key === 'Escape' && setOpen(false)
      window.addEventListener('keydown', onKey)
      const untrap = trapFocus(el.parentElement)
      return () => {
        window.removeEventListener('keydown', onKey)
        untrap()
      }
    }
    const hide = () => gsap.set(el, { autoAlpha: 0, clearProps: 'clipPath' })
    if (calm) gsap.to(el, { opacity: 0, duration: 0.2, onComplete: hide })
    else gsap.to(el, { clipPath: `circle(0% at ${ORIGIN})`, duration: 0.42, ease: 'power3.in', onComplete: hide })
    if (el.contains(document.activeElement)) button.current?.focus({ preventScroll: true })
  }, [open])

  // a project opening (or the visit being on Home) closes it
  useEffect(() => {
    if (viewOpen && store.get().menuOpen) setOpen(false)
  }, [viewOpen])

  const showButton = ready && !viewOpen && (page !== HOME || open)

  return (
    <div className="mmenu-root">
      <button
        ref={button}
        type="button"
        className={`mmenu-button${open ? ' is-open' : ''}`}
        data-visible={showButton}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mmenu"
        tabIndex={showButton ? 0 : -1}
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
      </button>

      <nav id="mmenu" ref={overlay} className="mmenu" aria-label="Main" aria-hidden={!open}>
        <ul className="mmenu-list">
          {PAGES.map((p, i) => (
            <li key={p.id} className="mmenu-anim">
              <a
                href={pathForPage(i)}
                className="mmenu-item"
                aria-current={i === page ? 'page' : undefined}
                tabIndex={open ? 0 : -1}
                onClick={(e) => plainClick(e) && (e.preventDefault(), go(i))}
              >
                <span className="mmenu-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="mmenu-label">
                  {p.label}
                  <Underline className="mmenu-underline" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mmenu-foot mmenu-anim">
          <SocialLinks className="mmenu-socials" order={['instagram', 'behance', 'artstation', 'linkedin']} />
          <SoundToggle className="sound-toggle--menu" />
        </div>
      </nav>
    </div>
  )
}
