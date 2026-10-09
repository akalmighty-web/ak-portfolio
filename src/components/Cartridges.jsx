import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import cartridgeUrl from '../assets/svg/cartridge.svg'
import { PAGES } from '../config'
import { CATEGORIES } from '../data/projects'
import { cartridgesIn, openProject, stepProject } from '../engine/projects'
import { useStore } from '../engine/store'
import { thumbnailAlt } from '../seo'
import { finePointer, reducedMotion } from '../fx/env'
import { sfx } from '../fx/sound'
import { showBubble } from '../fx/bubble'
import { unlock } from '../fx/achievements'
import { isPortrait, useViewport } from '../engine/viewport'
import { SIDE_CART, portraitCartridge, usePortraitLayout } from '../engine/portraitLayout'

const PROJECTS_PAGE = PAGES.findIndex((p) => p.id === 'projects')

/**
 * Layer 2 (behind the canvas, so the hands cover them): the project
 * cartridges. The centre one sits between the hands; the neighbours are
 * smaller, tilted and partly hidden behind them, as in the Figma frame.
 *
 * Every category keeps its own set mounted (thumbnails decoded up front), so
 * switching tabs cross-fades one set out while the next rises in: the screen
 * never goes empty.
 */
export default function Cartridges() {
  const root = useRef(null)
  const shown = useStore((s) => s.phase === 'ready' && s.page === PROJECTS_PAGE && s.arrived)
  const category = useStore((s) => s.category)
  const viewOpen = useStore((s) => !!s.openSlug)
  const [tabHidden, setTabHidden] = useState(document.hidden)

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    // decode every thumbnail now, so no cartridge ever shows an empty screen
    root.current.querySelectorAll('.cartridge-screen img').forEach((img) => img.decode?.().catch(() => {}))
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // whole carousel in/out with the page
  useEffect(() => {
    if (shown) gsap.fromTo(root.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' })
    else gsap.to(root.current, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
  }, [shown])

  return (
    <div ref={root} className={`cartridges${tabHidden || viewOpen ? ' is-paused' : ''}`} aria-hidden={!shown}>
      {CATEGORIES.map((c) => (
        <CartridgeSet key={c.id} category={c.id} active={c.id === category} shown={shown} />
      ))}
    </div>
  )
}

// Where a cartridge sits for a given offset from the centre one.
// x/y are percentages of the cartridge's own size (Figma: 522px apart).
function slot(off) {
  if (isPortrait()) return slotPortrait(off)
  const a = Math.abs(off)
  return {
    xPercent: -50 + off * 88.6,
    yPercent: -50 + Math.min(a, 1) * 5,
    scale: a === 0 ? 1 : a === 1 ? 0.77 : 0.6,
    rotation: gsap.utils.clamp(-1, 1, off) * 6,
    autoAlpha: a >= 2 ? 0 : 1,
    zIndex: 10 - a,
  }
}

// Phones held upright: the centre cartridge rests on the hands, the side ones
// are held in them, tilted and mostly hidden (engine/portraitLayout.js has the
// sizes). Offsets are percentages of the cartridge's own size, as above.
function slotPortrait(off) {
  const a = Math.abs(off)
  const c = portraitCartridge()
  if (!a || !c) return { xPercent: -50, yPercent: -50, scale: 1, rotation: 0, autoAlpha: 1, zIndex: 10 }
  const f = c.frame
  const side = Math.sign(off)
  const h = c.w * (446 / 599)
  const x = f.x + (side < 0 ? SIDE_CART.x : 1 - SIDE_CART.x) * f.w - c.x
  const y = f.y + SIDE_CART.y * f.h - c.y
  return {
    xPercent: -50 + ((a >= 2 ? 1.8 : 1) * x * 100) / c.w, // two away: out past the screen edge
    yPercent: -50 + (y * 100) / h,
    scale: (SIDE_CART.width * f.w) / c.w,
    rotation: side * SIDE_CART.rotation,
    autoAlpha: a >= 2 ? 0 : 1,
    zIndex: 10 - a,
  }
}

// How far a cartridge is pushed into its "console slot" (% of its height).
// The slot line is the bottom of the connector pins (10% above the image's
// bottom edge, which is shadow): everything below it is clipped away, so the
// cartridge disappears into the slot instead of sliding over the UI.
const SLOT_LINE = 10
const depths = new WeakMap()
function insertDepth(tilt) {
  if (!depths.has(tilt)) {
    const slot = tilt.closest('.cartridge').querySelector('.cartridge-slot')
    let p = 0
    const d = {
      get p() {
        return p
      },
      set p(v) {
        p = v
        const cut = v + SLOT_LINE * Math.min(1, v / 6) // ease the cut in so the resting shadow never jumps
        gsap.set(tilt, { yPercent: v, clipPath: v > 0 ? `inset(-20% -20% ${cut}% -20%)` : 'none' })
        gsap.set(slot, { opacity: Math.min(1, Math.max(0, v / 14)) })
      },
    }
    depths.set(tilt, d)
  }
  return depths.get(tilt)
}

// Shortest signed distance from the centre index, wrapping around the list.
function offsetOf(i, centre, n) {
  let d = (((i - centre) % n) + n) % n
  if (d > n / 2) d -= n
  return d
}

function CartridgeSet({ category, active, shown }) {
  const root = useRef(null)
  const list = cartridgesIn(category) // the projects, then "Coming soon"
  const centre = useStore((s) => s.project)
  const lastOff = useRef(new Map())
  const wasActive = useRef(null)
  const { portrait } = useViewport()
  const layout = usePortraitLayout()

  const cards = () => [...root.current.querySelectorAll('.cartridge')]

  // place the cards for a centre index; slide unless `instant`
  const place = (c, instant) => {
    const n = list.length
    cards().forEach((el, i) => {
      const off = offsetOf(i, c, n)
      const prev = lastOff.current.get(el)
      lastOff.current.set(el, off)
      gsap.killTweensOf(el)
      if (instant || prev === undefined) return gsap.set(el, slot(off))
      if (prev === off) return
      if (Math.abs(off - prev) > 1) {
        // wrapped round: carry on out of the side it was heading to, come back in from the other
        const exit = off > prev ? -2 : 2
        gsap
          .timeline()
          .to(el, { ...slot(exit), duration: 0.3, ease: 'power2.in' })
          .set(el, slot(-exit))
          .to(el, { ...slot(off), duration: 0.45, ease: 'power3.out' })
      } else {
        // the incoming centre cartridge leads and slides in on top of the outgoing
        // one, so the centre is always covered (never an empty gap between them)
        const { zIndex, ...to } = slot(off)
        const incoming = off === 0
        const outgoing = prev === 0
        gsap.set(el, { zIndex: incoming ? 12 : outgoing ? 9 : zIndex })
        gsap.to(el, {
          ...to,
          duration: incoming ? 0.55 : 0.65,
          ease: incoming ? 'power3.out' : outgoing ? 'power2.inOut' : 'power3.inOut',
          delay: outgoing ? 0.05 : 0,
          onComplete: () => gsap.set(el, { zIndex }),
        })
      }
    })
  }

  useLayoutEffect(() => {
    const el = root.current
    const first = wasActive.current === null
    const activated = active && wasActive.current === false
    const deactivated = !active && wasActive.current === true
    wasActive.current = active
    if (active) place(centre, first || activated) // a set that just became active starts in place
    if (first) return void gsap.set(el, { autoAlpha: active ? 1 : 0 })
    if (activated) {
      gsap.killTweensOf(el)
      gsap.fromTo(el, { autoAlpha: 0, yPercent: 12 }, { autoAlpha: 1, yPercent: 0, duration: 0.6, delay: 0.08, ease: 'power3.out' })
    } else if (deactivated) {
      gsap.killTweensOf(el)
      gsap.to(el, { autoAlpha: 0, yPercent: 10, duration: 0.42, ease: 'power2.in' })
    }
  }, [active, centre]) // eslint-disable-line react-hooks/exhaustive-deps

  // the screen changed shape (or turned): every cartridge straight to its new place
  const placed = useRef(false)
  useLayoutEffect(() => {
    if (!placed.current) return void (placed.current = true)
    if (active) place(centre, true)
  }, [portrait, layout]) // eslint-disable-line react-hooks/exhaustive-deps

  // arriving on the page: the visible set rises in from behind the hands
  useEffect(() => {
    if (shown && active) gsap.fromTo(cards(), { y: 140 }, { y: 0, duration: 0.8, stagger: { each: 0.06, from: 'center' }, ease: 'power3.out' })
  }, [shown]) // eslint-disable-line react-hooks/exhaustive-deps

  // the centre cartridge is "inserted" into the console, then its project opens;
  // a side one is brought to the centre
  const inserting = useRef(false)
  const onPick = (i, e) => {
    const off = offsetOf(i, centre, list.length)
    if (off !== 0) return stepProject(Math.sign(off))
    if (list[i].soon) return onSoon(e) // nothing to open: the easter egg instead
    if (inserting.current) return
    const slug = list[i].slug
    if (reducedMotion()) return openProject(slug)
    inserting.current = true
    sfx.insert()
    const tilt = cards()[i].querySelector('.cartridge-tilt')
    const depth = insertDepth(tilt)
    gsap.killTweensOf([tilt, depth])
    gsap.to(tilt, { rotationX: 0, rotationY: 0, duration: 0.14, ease: 'power2.out' })
    gsap
      .timeline({ onComplete: () => ((inserting.current = false), openProject(slug)) })
      .to(depth, { p: -6, duration: 0.14, ease: 'power2.out' }) // lift off
      .to(depth, { p: 46, duration: 0.3, ease: 'power3.in' }) // push down into the slot
      .to(depth, { p: 40, duration: 0.07, ease: 'power1.out' }) // small bump
      .to(depth, { p: 44, duration: 0.09, ease: 'power1.in' })
  }

  // easter egg: poke the "Coming soon" cartridge three times and its owner
  // blows on it (as one did), the screen glitches... and it's still coming soon
  const pokes = useRef({ n: 0, t: 0 })
  const onSoon = (e) => {
    const card = e.currentTarget
    const now = performance.now()
    const p = pokes.current
    p.n = now - p.t < 1600 ? p.n + 1 : 1
    p.t = now
    sfx.click()
    if (!reducedMotion()) gsap.fromTo(card, { rotation: 0 }, { keyframes: { rotation: [-3, 3, -2, 1, 0] }, duration: 0.4, ease: 'none', clearProps: 'transform' })
    if (p.n < 3) return
    p.n = 0
    showBubble({ text: '*blows on cartridge*', target: card, duration: 1900 })
    setTimeout(() => {
      const screen = card.querySelector('.cartridge-screen')
      sfx.glitch()
      if (!reducedMotion()) {
        screen.classList.add('is-glitching')
        setTimeout(() => screen.classList.remove('is-glitching'), 750)
      }
      setTimeout(() => unlock('technician'), 900)
    }, 1100)
  }

  // thumbnails are only needed on Projects: they load after the intro, so they
  // don't compete with the logo loop and the intro frames
  const loadImages = useStore((s) => s.phase === 'ready')

  // closing the project view: the cartridge pops back up
  const viewOpen = useStore((s) => !!s.openSlug)
  useEffect(() => {
    if (viewOpen) return
    root.current.querySelectorAll('.cartridge-tilt').forEach((tilt) => {
      const depth = insertDepth(tilt)
      if (depth.p) gsap.to(depth, { p: 0, duration: 0.7, delay: 0.35, ease: 'back.out(1.6)' })
    })
  }, [viewOpen])

  // 3D tilt toward the cursor (centre cartridge); the glare and light streak
  // on the screen follow the tilt. On a touch screen a tap tilts it toward the
  // finger, then the click opens the project as usual.
  const tiltTo = (e, i) => {
    if (inserting.current || reducedMotion()) return
    if (offsetOf(i, centre, list.length) !== 0) return
    const btn = e.currentTarget
    const r = btn.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const tilt = btn.querySelector('.cartridge-tilt')
    gsap.to(tilt, { rotationY: (px - 0.5) * 2 * 9, rotationX: (0.5 - py) * 2 * 7, transformPerspective: 900, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
    const screen = btn.querySelector('.cartridge-screen')
    screen.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`)
    screen.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`)
    screen.style.setProperty('--tilt', ((px - 0.5) * 2).toFixed(3))
    screen.classList.add('is-tilted')
  }
  const onTiltMove = (e, i) => e.pointerType === 'mouse' && finePointer() && tiltTo(e, i)
  const onTiltDown = (e, i) => e.pointerType !== 'mouse' && tiltTo(e, i)
  const onTiltLeave = (e) => {
    if (inserting.current) return
    const btn = e.currentTarget
    gsap.to(btn.querySelector('.cartridge-tilt'), { rotationX: 0, rotationY: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' })
    const screen = btn.querySelector('.cartridge-screen')
    screen.style.setProperty('--tilt', 0)
    screen.classList.remove('is-tilted')
  }

  return (
    <div ref={root} className="cartridge-set" aria-hidden={!active}>
      {list.map((p, i) => {
        const isCentre = shown && active && i === centre // (re)starts the light streak
        if (p.soon)
          return (
            <div key={p.slug} className="cartridge is-empty" data-slug={p.slug}>
              <button
                type="button"
                className="cartridge-inner"
                tabIndex={isCentre ? 0 : -1}
                aria-label={isCentre ? 'Coming soon' : 'Show Coming soon'}
                onClick={(e) => onPick(i, e)}
              >
                <span className="cartridge-screen">
                  <span className="coming-soon">
                    <span className="coming-soon-text">Coming soon</span>
                    <span className="coming-soon-sub">insert cartridge_</span>
                  </span>
                </span>
                <img className="cartridge-body" src={cartridgeUrl} alt="" draggable="false" />
              </button>
            </div>
          )
        return (
          <div key={p.slug} className={`cartridge${isCentre ? ' is-active' : ''}`} data-slug={p.slug}>
            <span className="cartridge-slot" aria-hidden="true" />
            <button
              type="button"
              className="cartridge-inner"
              tabIndex={isCentre ? 0 : -1}
              aria-label={isCentre ? `Open ${p.title}` : `Show ${p.title}`}
              onClick={(e) => onPick(i, e)}
              onPointerMove={(e) => onTiltMove(e, i)}
              onPointerDown={(e) => onTiltDown(e, i)}
              onPointerLeave={onTiltLeave}
            >
              <span className="cartridge-tilt">
                <span className="cartridge-screen">
                  <img src={loadImages ? p.thumbnail.src : undefined} srcSet={loadImages ? p.thumbnail.srcset : undefined} sizes="(min-width: 900px) 480px, 60vw" alt={thumbnailAlt(p)} draggable="false" />
                </span>
                <img className="cartridge-body" src={cartridgeUrl} alt="" draggable="false" />
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
