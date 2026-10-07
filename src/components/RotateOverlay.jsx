import { useEffect, useRef, useState } from 'react'
import bg from '../assets/svg/pixel-bg.svg?raw'
import { store } from '../engine/store'
import { isPhone, useViewport } from '../engine/viewport'

// Portrait phones: "rotate your phone", over everything. "Continue anyway" is
// remembered for the visit (sessionStorage) and shows the scaled desktop view
// upright; turning the phone sideways hides it by itself. While it is up the
// frames keep downloading, but the logo loop and the intro wait (store.blocked).

const KEY = 'ak-portrait-ok'
const continued = () => {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
const background = bg.replace('<svg ', '<svg preserveAspectRatio="xMidYMax slice" ')

// set before the first render, so the preloader never starts behind the overlay
store.set({ blocked: isPhone() && window.innerHeight > window.innerWidth && !continued() })

export default function RotateOverlay() {
  const { portraitPhone } = useViewport()
  const [ok, setOk] = useState(continued)
  const button = useRef(null)
  const show = portraitPhone && !ok

  useEffect(() => {
    store.set({ blocked: show })
    if (show) button.current?.focus({ preventScroll: true })
  }, [show])

  if (!show) return null
  const go = () => {
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {}
    setOk(true)
  }
  return (
    <div className="rotate" role="dialog" aria-modal="true" aria-labelledby="rotate-title" aria-describedby="rotate-text">
      <div className="rotate-bg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: background }} />
      <div className="rotate-box">
        <svg className="rotate-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path className="rotate-arrow" d="M80 30a36 36 0 0 0-30-16M45 9l5 5-5 5" strokeWidth="4" />
          <g className="rotate-phone">
            <rect x="34" y="22" width="32" height="56" rx="7" strokeWidth="5" />
            <path d="M45 30h10" strokeWidth="4" />
            <circle cx="50" cy="69" r="2.5" fill="currentColor" stroke="none" />
          </g>
        </svg>
        <h2 id="rotate-title" className="rotate-title">
          Rotate your phone
        </h2>
        <p id="rotate-text" className="rotate-text">
          For the best experience, turn your phone sideways or view on a desktop.
        </p>
        <button ref={button} type="button" className="rotate-continue" onClick={go}>
          Continue anyway
        </button>
      </div>
    </div>
  )
}
