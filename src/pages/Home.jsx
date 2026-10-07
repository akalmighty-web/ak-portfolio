import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import title from '../assets/svg/title.svg?raw'
import titleMl from '../assets/svg/title-ml.svg?raw'
import { usePageShown } from './usePage'
import { reducedMotion } from '../fx/env'
import { unlock } from '../fx/achievements'
import { sfx } from '../fx/sound'
import { STATS } from '../config'

const TAPS = 5 // taps on the title within TAP_WINDOW ms swap the language
const TAP_WINDOW = 2000

/** Home: big ANANTH title with halo, role tag (left), doodle note (right) and stats. */
export default function Home() {
  const root = useRef(null)
  const shown = usePageShown(0)
  const first = useRef(true)

  // gentle idle float on the halo; mouse hover (or a tap on a touch screen)
  // spins it once like a coin (taps also count for the Malayalam egg below)
  useEffect(() => {
    if (reducedMotion()) return
    const halo = root.current.querySelector('.home-title .halo')
    const wrap = root.current.querySelector('.home-title .halo-wrap')
    const t = gsap.to(halo, { y: -5, rotation: 1.6, transformOrigin: '50% 50%', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    let spinning = false
    const spin = () => {
      if (spinning) return
      spinning = true
      const turn = { a: 0 }
      gsap.to(turn, {
        a: Math.PI * 2,
        duration: 1.1,
        ease: 'power2.inOut',
        onUpdate: () => gsap.set(wrap, { scaleX: Math.cos(turn.a), transformOrigin: '50% 50%' }),
        onComplete: () => (spinning = false),
      })
    }
    const onEnter = (e) => e.pointerType === 'mouse' && spin()
    const onTouch = (e) => e.pointerType !== 'mouse' && spin()
    halo.addEventListener('pointerenter', onEnter)
    halo.addEventListener('pointerdown', onTouch)
    // the Malayalam title floats as one unit: its halo covers part of the first
    // letter, so it must never move separately from the text
    const ml = gsap.to(root.current.querySelector('.title-ml'), { y: -5, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    return () => {
      t.kill()
      ml.kill()
      halo.removeEventListener('pointerenter', onEnter)
      halo.removeEventListener('pointerdown', onTouch)
    }
  }, [])

  // easter egg: tap the title 5 times quickly to switch to Malayalam (and back).
  // A squash-and-pop flip; back to English on every page load.
  useEffect(() => {
    const h1 = root.current.querySelector('.home-title')
    const en = h1.querySelector('.title-en')
    const ml = h1.querySelector('.title-ml')
    let taps = []
    let lang = 'en'
    let busy = false
    const onTap = () => {
      if (busy) return
      const now = performance.now()
      taps = [...taps.filter((t) => now - t < TAP_WINDOW), now]
      if (taps.length < TAPS) {
        if (!reducedMotion()) gsap.fromTo(h1, { scale: 0.97 }, { scale: 1, duration: 0.25, ease: 'back.out(3)' })
        return
      }
      taps = []
      lang = lang === 'en' ? 'ml' : 'en'
      const [show, hide] = lang === 'ml' ? [ml, en] : [en, ml]
      sfx.pop()
      if (lang === 'ml') unlock('malayali')
      if (reducedMotion()) return void (gsap.set(hide, { autoAlpha: 0 }), gsap.set(show, { autoAlpha: 1 }))
      busy = true
      gsap
        .timeline({ onComplete: () => (busy = false) })
        .to(h1, { scaleY: 0.06, scaleX: 1.14, duration: 0.15, ease: 'power2.in', transformOrigin: '50% 60%' }) // squash
        .set(hide, { autoAlpha: 0 })
        .set(show, { autoAlpha: 1 })
        .to(h1, { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'back.out(3.2)' }) // pop
    }
    h1.addEventListener('click', onTap)
    return () => h1.removeEventListener('click', onTap)
  }, [])

  useEffect(() => {
    const q = gsap.utils.selector(root)
    gsap.killTweensOf(q('.home-title, .home-title .ink, .home-anim'))
    if (!shown) {
      gsap.to(q('.home-anim, .home-title'), { autoAlpha: 0, y: -12, duration: 0.35, ease: 'power2.in', stagger: 0.03 })
      return
    }
    const intro = first.current
    first.current = false
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.set(q('.home-title'), { autoAlpha: 1, y: 0 })
      .fromTo(q('.home-title .ink'), { clipPath: 'inset(-5% 100% -5% 0)' }, { clipPath: 'inset(-5% 0% -5% 0)', duration: intro ? 1.1 : 0.7, ease: 'power2.inOut' })
      .fromTo(q('.home-title .halo-wrap'), { y: -70, rotation: -14, autoAlpha: 0, transformOrigin: '50% 50%' }, { y: 0, rotation: 0, autoAlpha: 1, duration: 1, ease: 'back.out(2.2)' }, intro ? 0.55 : 0.2)
      .fromTo(q('.home-anim'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, intro ? 0.6 : 0.15)
      .fromTo(q('.tag-underline, .note-swoosh'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'power2.inOut', stagger: 0.15 }, '-=0.4')
    // the stats count up from 0 the first time (once per visit)
    if (intro && !reducedMotion()) {
      q('.stat-value').forEach((el, i) => {
        const n = { v: 0 }
        el.textContent = '0'
        tl.to(n, { v: STATS[i].value, duration: 1.3, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(n.v)) }, 0.9 + i * 0.18)
      })
    }
    return () => {
      tl.kill()
      q('.stat-value').forEach((el, i) => (el.textContent = STATS[i].value)) // interrupted: show the real numbers
    }
  }, [shown])

  return (
    <section ref={root} className="page page-home" aria-hidden={!shown}>
      <h1 className="home-title">
        <span className="sr-only">Ananth Krishnan</span>
        <span className="title-en" aria-hidden="true" dangerouslySetInnerHTML={{ __html: withHitArea(wrapHalo(title)) }} />
        <span className="title-ml" aria-hidden="true" dangerouslySetInnerHTML={{ __html: withHitArea(titleMl) }} />
      </h1>

      <p className="home-tag home-anim">
        <span className="tag-line1">Multi disciplinary designer</span>
        <span className="tag-line2">Concept artist</span>
        <svg className="tag-underline" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#FFC300" d="M2 10.5C40 6 90 4.2 150 4.4c52 .2 100 2.6 146 6.4 2 .2 2 2.6 0 2.5-30-1.4-62-2.4-96-2.2-30 .1-47 .8-76 2.2-34 1.5-68 2.6-120 4.2-3.4.1-5-2.4-2-3z" />
        </svg>
      </p>

      <ul className="home-stats">
        {STATS.map((st) => (
          <li key={st.label} className="stat home-anim">
            <span className="stat-num">
              <span className="stat-value">{st.value}</span>
              {/* the hand font's "+" glyph is empty: a drawn plus instead */}
              {st.suffix === '+' ? (
                <svg className="stat-plus" viewBox="0 0 40 40" aria-label="+" role="img">
                  <path d="M20.5 5.5c-.6 9.6-.9 19.4-.4 29.2M5.5 19.8c9.8-.7 19.4-.6 29.2.2" />
                </svg>
              ) : (
                st.suffix
              )}
            </span>
            {/* the last word goes on its own line */}
            <span className="stat-label">{st.label.replace(/ (\S+)$/, '\n$1')}</span>
          </li>
        ))}
      </ul>

      <div className="home-note home-anim" aria-label="Same kid, different worlds">
        <p aria-hidden="true">
          <span>“Same</span>
          <span>kid</span>
          <span>
            different <span className="note-smile">: )</span>
          </span>
          <span>worlds ”</span>
        </p>
        <svg className="note-swoosh" viewBox="0 0 110 50" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true">
          <path d="M3 47C30 30 62 13 106 3" strokeWidth="2.2" />
          <path d="M14 44c26-14 52-27 88-36" strokeWidth="1.4" />
        </svg>
      </div>
    </section>
  )
}

// an invisible rect behind the lettering, so a tap anywhere on the title counts
// (not only on the painted strokes): the Malayalam easter egg needs 5 quick taps
function withHitArea(svg) {
  const [x, y, w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/)
  return svg.replace(/(<svg[^>]*>)/, `$1<rect class="title-hit" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>`)
}

// wrap the halo path in a <g> so the drop-in and the idle float don't fight
function wrapHalo(svg) {
  return svg.replace(/(<path class="halo"[^>]*\/>)/, '<g class="halo-wrap">$1</g>')
}
