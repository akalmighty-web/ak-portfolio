import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import logo from '../assets/svg/logo.svg?raw'
import { goTo } from '../engine/experience'
import { useStore } from '../engine/store'
import { PAGES } from '../config'
import { ArrowDoodle, SocialLinks } from './Icons'
import SoundToggle from './SoundToggle'

const CONTACT = PAGES.findIndex((p) => p.id === 'contact')

/** Global chrome: logo (top left), socials + "Let's Connect" (top right). */
export default function Header() {
  const root = useRef(null)
  const ready = useStore((s) => s.phase === 'ready')

  useEffect(() => {
    if (!ready) return
    const ctx = gsap.context(() => {
      gsap.from('.logo', { y: -16, autoAlpha: 0, duration: 0.8, ease: 'power3.out' })
      gsap.from('.sound-toggle--header, .socials li, .header-divider, .lets-connect', {
        y: -14,
        autoAlpha: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: 'power3.out',
        delay: 0.15,
      })
    }, root)
    return () => ctx.revert()
  }, [ready])

  return (
    <header ref={root} className="header" data-visible={ready}>
      <a className="logo" href="#" aria-label="Ananth Krishnan — home" onClick={(e) => (e.preventDefault(), goTo(0))} dangerouslySetInnerHTML={{ __html: logo }} />
      <div className="header-right">
        <SoundToggle className="sound-toggle--header" />
        <SocialLinks className="socials" />
        <span className="header-divider" aria-hidden="true" />
        <a className="lets-connect" href="#contact" onClick={(e) => (e.preventDefault(), goTo(CONTACT))}>
          <span>Let's</span>
          <span>Connect</span>
          <ArrowDoodle className="lets-connect-arrow" />
        </a>
      </div>
    </header>
  )
}
