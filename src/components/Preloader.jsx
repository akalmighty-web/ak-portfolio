import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { onLogoReady, playIntro, whenFramesReady } from '../engine/experience'
import { store } from '../engine/store'

/**
 * Black screen with the logo loop. When the frames have loaded, the loop that
 * is currently playing finishes, then the intro takes over. While the "rotate
 * your phone" overlay is up (store.blocked) everything keeps downloading, but
 * the loop waits paused and the intro doesn't start; once the overlay goes, the
 * loop plays from the start and the intro follows it.
 */
export default function Preloader() {
  const root = useRef(null)
  const video = useRef(null)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const v = video.current
    let ready = false
    let done = false
    let fallback
    let blocked = store.get().blocked

    const handOff = () => {
      if (done) return
      done = true
      clearTimeout(fallback)
      playIntro()
      gsap.to(root.current, { autoAlpha: 0, duration: 0.5, ease: 'power1.out', onComplete: () => setGone(true) })
    }
    const onEnded = () => {
      if (blocked) return
      if (ready) handOff()
      else v.play().catch(() => {})
    }
    // frames ready (and not blocked): leave when this loop ends. If the video never
    // started (autoplay blocked / failed), don't wait for it; if it stalls, don't
    // wait longer than the rest of this loop.
    const arm = () => {
      clearTimeout(fallback)
      if (!ready || blocked || done) return
      const left = Number.isFinite(v.duration) ? v.duration - v.currentTime : 3
      fallback = setTimeout(handOff, v.paused || v.error ? 300 : (left + 0.5) * 1000)
    }

    whenFramesReady()?.then(() => {
      ready = true
      // already past the intro (dev deep link): leave immediately
      if (store.get().phase !== 'preload') return handOff()
      arm()
    })
    const offStore = store.subscribe(() => {
      const b = store.get().blocked
      if (b === blocked) return
      blocked = b
      if (blocked) {
        clearTimeout(fallback)
        v.pause()
      } else {
        v.currentTime = 0
        v.play().catch(() => {})
        arm()
      }
    })
    v.addEventListener('ended', onEnded)
    // the logo is on screen: the frames can start downloading
    if (v.readyState >= 2) onLogoReady()
    v.addEventListener('loadeddata', onLogoReady)
    v.addEventListener('error', onLogoReady)
    if (!blocked) v.play().catch(() => {})
    return () => {
      offStore()
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('loadeddata', onLogoReady)
      v.removeEventListener('error', onLogoReady)
      clearTimeout(fallback)
    }
  }, [])

  if (gone) return null
  return (
    <div ref={root} className="preloader" aria-label="Loading">
      <video ref={video} src="/media/logo-loop.mp4" muted playsInline preload="auto" />
    </div>
  )
}
