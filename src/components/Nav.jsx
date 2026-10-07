import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { NAV_MOVE, PAGES } from '../config'
import { goTo, onFrame } from '../engine/experience'
import { useStore } from '../engine/store'
import { plainClick } from '../engine/projects'
import { pathForPage } from '../seo'
import { Underline } from './Icons'

gsap.registerPlugin(Flip)

const smooth = (t) => t * t * (3 - 2 * t)
const [MOVE_START, MOVE_END] = NAV_MOVE
const progressAt = (frame) => smooth(gsap.utils.clamp(0, 1, (frame - MOVE_START) / (MOVE_END - MOVE_START)))

/**
 * Home / About / Projects / Contact, as one row with equal gaps. On Home the
 * row sits under the title, opened up in the middle around the character's
 * head; from About onward it is fixed at the top centre.
 *
 * The move is one GSAP Flip of the whole row (row + items, nested), built
 * paused, whose progress is a function of the frame being shown. So the nav
 * travels exactly with the character, in either direction and at any speed.
 */
export default function Nav() {
  const root = useRef(null)
  const page = useStore((s) => s.page)
  const ready = useStore((s) => s.phase === 'ready')

  useEffect(() => {
    const row = root.current
    let flip = null
    let frame = 0

    // Only the row element is flipped, so all four items share one vertical
    // position and stay level the whole way. The spacing inside the row (the
    // gap left for the head on Home) closes in the same timeline.
    const build = () => {
      flip?.kill()
      gsap.set(row, { clearProps: 'transform,--nav-head-room,--nav-shift' })
      row.classList.replace('nav--top', 'nav--home')
      const style = getComputedStyle(row)
      const headRoom = parseFloat(getComputedStyle(row.querySelector('.nav-item--projects')).marginLeft)
      const shift = parseFloat(style.paddingLeft)
      const state = Flip.getState(row)
      row.classList.replace('nav--home', 'nav--top')
      flip = Flip.from(state, { duration: 1, ease: 'none', paused: true })
      flip.fromTo(
        row,
        { '--nav-head-room': `${headRoom}px`, '--nav-shift': `${shift}px` },
        { '--nav-head-room': '0px', '--nav-shift': '0px', duration: 1, ease: 'none' },
        0,
      )
      flip.progress(progressAt(frame))
    }

    const unsubscribe = onFrame((f) => {
      frame = f
      flip?.progress(progressAt(f))
    })
    // measure once the hand font is in, and again whenever the layout scales
    document.fonts.ready.then(build)
    window.addEventListener('resize', build)
    return () => {
      unsubscribe()
      window.removeEventListener('resize', build)
      flip?.kill()
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    gsap.fromTo(
      root.current.querySelectorAll('.nav-label'),
      { yPercent: 110 },
      { yPercent: 0, duration: 0.9, stagger: 0.07, ease: 'power4.out', delay: 0.35 },
    )
  }, [ready])

  return (
    <nav ref={root} className="nav nav--home" data-visible={ready} aria-label="Main">
      {PAGES.map((p, i) => (
        <a
          key={p.id}
          href={pathForPage(i)}
          className={`nav-item nav-item--${p.id}`}
          aria-current={i === page ? 'page' : undefined}
          onClick={(e) => plainClick(e) && (e.preventDefault(), goTo(i))}
        >
          <span className="nav-mask">
            <span className="nav-label">{p.label}</span>
          </span>
          <Underline className="nav-underline" />
        </a>
      ))}
    </nav>
  )
}
