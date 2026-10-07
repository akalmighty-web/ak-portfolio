import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { BAND, PAGES } from '../config'
import { useStore } from '../engine/store'
import { reducedMotion } from '../fx/env'

// images prepared by scripts/build_band.py, named after their source file
const IMAGES = import.meta.glob('../assets/band/*.webp', { eager: true, query: '?url', import: 'default' })
const slug = (name) => name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const imageFor = (file) => IMAGES[`../assets/band/${slug(file)}.webp`]

const ABOUT = PAGES.findIndex((p) => p.id === 'about')
const SPEED = 0.5 // band heights per second: slow and calm
const COPIES = 3 // enough to fill the widest screen while one copy scrolls out

/** One run of the loop: [Worked with: logos] gap [Awards: laurels] gap. */
function Sequence({ hidden }) {
  // the logos are only needed on About: they load after the intro
  const load = useStore((s) => s.phase === 'ready')
  const src = (file) => (load ? imageFor(file) : undefined)
  return (
    <div className="band-seq" aria-hidden={hidden || undefined}>
      <div className="band-block">
        <span className="band-label">Worked with:</span>
        {BAND.workedWith.map((c) => (
          <img key={c.file} className="band-logo" src={src(c.file)} alt={hidden ? '' : c.name} draggable="false" />
        ))}
      </div>
      <div className="band-block">
        <span className="band-label">Awards:</span>
        {BAND.awards.map((a) => (
          <img key={a.file} className="band-laurel" src={src(a.file)} alt={hidden ? '' : `Official selection: ${a.name}`} data-name={a.name} draggable="false" />
        ))}
      </div>
    </div>
  )
}

/**
 * About: a band across the bottom, in front of the character: red blocks for
 * the companies and the award laurels, cut apart by white gaps, in one slow
 * seamless loop. The tooltip is rendered at the top level so it shows above
 * everything. Slides in when the
 * About page settles, out when leaving. Hover (or tap) pauses it; hovering a
 * laurel names the award.
 */
export default function AboutBand() {
  const root = useRef(null)
  const track = useRef(null)
  const loop = useRef(null)
  const shown = useStore((s) => s.phase === 'ready' && s.page === ABOUT && s.arrived)
  const [tip, setTip] = useState(null) // the award named in the tooltip
  const tipFor = useRef(null) // its laurel
  const tipRef = useRef(null)

  // the loop: move the track left by exactly one sequence, forever
  useEffect(() => {
    gsap.set(root.current, { yPercent: 105 }) // parked below the screen until About
    if (reducedMotion()) return
    const seq = track.current.firstElementChild
    const build = () => {
      const progress = loop.current?.progress() ?? 0
      const paused = loop.current?.paused() ?? true
      const scale = loop.current?.timeScale() ?? 1
      loop.current?.kill()
      const w = seq.offsetWidth
      if (!w) return
      const speed = SPEED * track.current.offsetHeight // px per second, in step with the band's size
      loop.current = gsap.fromTo(track.current, { x: 0 }, { x: -w, duration: w / speed, ease: 'none', repeat: -1, paused })
      loop.current.progress(progress).timeScale(scale)
    }
    const ro = new ResizeObserver(build) // re-measure as images load and on resize
    ro.observe(seq)
    return () => {
      ro.disconnect()
      loop.current?.kill()
      loop.current = null
    }
  }, [])

  // slide in when About settles, out when leaving; the loop only runs while shown
  useEffect(() => {
    const el = root.current
    gsap.killTweensOf(el)
    tipFor.current = null
    setTip(null)
    if (shown) {
      loop.current?.timeScale(1).play()
      if (reducedMotion()) gsap.fromTo(el, { autoAlpha: 0, yPercent: 0 }, { autoAlpha: 1, duration: 0.4 })
      else gsap.fromTo(el, { autoAlpha: 1, yPercent: 105 }, { yPercent: 0, duration: 0.8, ease: 'power3.out', delay: 0.15 })
    } else {
      const done = () => loop.current?.pause()
      if (reducedMotion()) gsap.to(el, { autoAlpha: 0, duration: 0.25, onComplete: done })
      else gsap.to(el, { yPercent: 105, duration: 0.35, ease: 'power2.in', onComplete: () => (gsap.set(el, { autoAlpha: 0 }), done()) })
    }
  }, [shown])

  // pause: eases to a stop on hover, toggles on tap
  useEffect(() => {
    const el = root.current
    let held = false // tapped to pause (touch)
    const ease = (to) => loop.current && gsap.to(loop.current, { timeScale: to, duration: to ? 0.6 : 0.35, ease: 'power2.out', overwrite: true })
    const show = (img) => {
      tipFor.current = img
      setTip(img?.dataset.name ?? null)
    }
    const onEnter = (e) => e.pointerType === 'mouse' && ease(0)
    const onLeave = (e) => {
      if (e.pointerType !== 'mouse') return
      ease(1)
      show(null)
    }
    const onOver = (e) => e.pointerType === 'mouse' && show(e.target.closest?.('.band-laurel'))
    const onTap = (e) => {
      if (e.pointerType === 'mouse') return
      const img = e.target.closest?.('.band-laurel')
      if (held && img && img !== tipFor.current) return show(img) // already paused: just name another award
      held = !held
      ease(held ? 0 : 1)
      show(held ? img : null)
    }
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointerover', onOver)
    el.addEventListener('pointerup', onTap)
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerover', onOver)
      el.removeEventListener('pointerup', onTap)
    }
  }, [])

  // keep the tooltip over its laurel while the loop eases to a stop
  useEffect(() => {
    if (!tip) return
    const el = root.current
    const tipEl = tipRef.current
    const follow = () => {
      const b = tipFor.current?.getBoundingClientRect()
      if (!b) return
      // centred on the laurel, just above the band, but kept on screen (the arrow still points at it)
      const x = b.left + b.width / 2
      const half = tipEl.offsetWidth / 2
      const at = Math.min(Math.max(x, half + 8), window.innerWidth - half - 8)
      tipEl.style.setProperty('--tip-x', `${at}px`)
      tipEl.style.setProperty('--tip-y', `${el.getBoundingClientRect().top - 10}px`)
      tipEl.style.setProperty('--tip-arrow', `${x - at}px`)
    }
    follow()
    gsap.ticker.add(follow)
    return () => gsap.ticker.remove(follow)
  }, [tip])

  return (
    <aside ref={root} className="about-band" aria-label="Worked with and awards" aria-hidden={!shown}>
      <div className="band-viewport">
        <div ref={track} className="band-track">
          {Array.from({ length: COPIES }, (_, i) => (
            <Sequence key={i} hidden={i > 0} />
          ))}
        </div>
      </div>
      {createPortal(
        <div ref={tipRef} className="band-tip" role="tooltip" data-visible={!!tip}>
          {tip}
        </div>,
        document.body,
      )}
    </aside>
  )
}
